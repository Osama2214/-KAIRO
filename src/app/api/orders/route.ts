import { NextResponse } from "next/server";
import {
  getAllServerOrders,
  getServerOrdersByCustomerEmail,
  saveServerOrder,
  updateServerOrderStatus,
  ServerOrder,
  PAYMENT_HOLD_TIMEOUT_MS,
} from "@/lib/orderStore";
import { checkRateLimitKey, getClientIp } from "@/lib/rateLimit";
import { ALL_VOLUMES } from "@/data/manga";
import { DEFAULT_GOVERNORATE_RATES } from "@/data/governorates";
import { curatorSession, isTrustedOrigin } from "@/lib/serverAuth";
import { patronSession } from "@/lib/patronAuth";
import { redeemWelcomeCoupon } from "@/lib/couponStore";

/**
 * GET: Retrieve orders from central server database
 * - If called by Curator (admin cookie present): returns all central orders
 * - If called by customer with ?email=...: returns only orders belonging to that email
 */
export async function GET(request: Request) {
  try {
    if (!(await curatorSession(request)).valid) {
      return NextResponse.json({ success: false, message: "Curator authorization required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const allOrders = await getAllServerOrders();
    return NextResponse.json({ success: true, orders: allOrders, total: allOrders.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve orders." },
      { status: 500 }
    );
  }
}

/**
 * GET: Retrieve the authenticated Google patron's own central orders.
 * The e-mail is taken from the signed HttpOnly session, never from the URL.
 */
export async function getMyOrders(request: Request) {
  const session = patronSession(request);
  if (!session.valid || !session.email) {
    return NextResponse.json(
      { success: false, message: "Sign in with Google to view live order updates." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const orders = await getServerOrdersByCustomerEmail(session.email);
    return NextResponse.json(
      { success: true, orders, total: orders.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/orders/mine error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve your orders." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

/**
 * POST: Create a new order with authoritative server-side price, coupon, and inventory calculations
 */
export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) return NextResponse.json({ success: false, message: "Invalid request origin." }, { status: 403 });
    const clientIp = getClientIp(request);

    // Rate limiting: Max 6 orders per 10 minutes per IP
    const rateCheck = checkRateLimitKey(`order_create:ip:${clientIp}`, 6, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Order submission frequency limit exceeded. Please wait a few minutes.",
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.id || !Array.isArray(body.items) || body.items.length === 0 || body.items.length > 20) {
      return NextResponse.json(
        { success: false, message: "Invalid order data. Cart items and order ID are required." },
        { status: 400 }
      );
    }

    const customerEmail = String(body.customerEmail || "").toLowerCase().trim();
    const customerPhone = String(body.customerPhone || "").trim();

    // 1. Authoritative Item Pricing & Subtotal Calculation
    let computedSubtotal = 0;
    const validatedItems = body.items.map((it: Record<string, unknown>) => {
      const volId = String(it.volumeId || it.id || "");
      const canon = ALL_VOLUMES.find((v) => v.id === volId);
      if (!canon) throw new Error("Invalid catalogue item");
      const unitPrice = canon.price;
      const qty = Math.min(10, Math.max(1, Math.floor(Number(it.quantity) || 1)));
      computedSubtotal += unitPrice * qty;

      return {
        id: volId.slice(0, 64),
        volumeId: volId.slice(0, 64),
        title: canon?.title || String(it.title || "Manga Volume").slice(0, 120),
        seriesTitle: canon?.seriesTitle || String(it.seriesTitle || "").slice(0, 120),
        volumeNumber: canon?.volumeNumber ?? it.volumeNumber ?? 1,
        coverImage: canon?.coverImage || String(it.coverImage || "").slice(0, 500),
        format: canon?.format || String(it.format || "Tankōbon").slice(0, 50),
        price: unitPrice,
        quantity: qty,
      };
    });

    // 2. Authoritative Coupon Validation & One-Time Use Enforcement
    let discountPercent = 0;
    let appliedCoupon: string | undefined = undefined;
    let couponMessage: string | undefined = undefined;

    const rawCode = String(body.appliedCoupon || "").trim().toUpperCase();
    if (rawCode) {
      const session = patronSession(request);
      const orderId = String(body.id).trim().slice(0, 32);
      // A coupon belongs to the signed-in patron, not to data sent by the browser.
      if (!session.valid || !session.email || session.email !== customerEmail) {
        couponMessage = "Sign in with the coupon owner to use this code.";
      } else {
        const redeemedDiscount = await redeemWelcomeCoupon(rawCode, session.email, orderId);
        if (redeemedDiscount === null) {
          couponMessage = "This coupon is invalid, expired, or has already been used.";
        } else {
          discountPercent = redeemedDiscount;
          appliedCoupon = rawCode;
        }
      }
    }

    const discountAmount = Math.round(((computedSubtotal * discountPercent) / 100) * 100) / 100;
    const netMerchandise = Math.max(0, computedSubtotal - discountAmount);

    // 3. Authoritative Governorate Shipping & Net-Value Free Shipping Calculation
    const governorate = String(body.customerGovernorate || "Cairo").trim();
    const govShippingRate =
      DEFAULT_GOVERNORATE_RATES[governorate] ??
      Object.entries(DEFAULT_GOVERNORATE_RATES).find(([k]) =>
        governorate.toLowerCase().includes(k.toLowerCase())
      )?.[1] ??
      65;

    // Free shipping threshold: 500 EGP calculated on NET merchandise value (after discount)
    const isFreeShipping = netMerchandise >= 500;
    const shippingCost = isFreeShipping ? 0 : govShippingRate;

    // 4. Authoritative Final Total
    const finalTotal = Math.max(0, netMerchandise + shippingCost);

    // 5. Electronic Payment Hold & Expiration Timestamp (36 Hours = 1.5 Days)
    const paymentMethod = String(body.paymentMethod || "cash").toLowerCase();
    const isElectronic = paymentMethod === "wallet" || paymentMethod === "instapay";
    const now = Date.now();
    const expiresAt = isElectronic ? now + PAYMENT_HOLD_TIMEOUT_MS : undefined;

    const initialTimeline = isElectronic
      ? [
          "Order Placed",
          "Pending Electronic Payment Verification (Hold: 36 Hours)",
        ]
      : ["Order Placed", "Confirmed", "Preparing Dispatch"];

    const sanitizedOrder: ServerOrder = {
      id: String(body.id).trim().slice(0, 32),
      date: new Date().toISOString().split("T")[0],
      items: validatedItems,
      subtotal: Math.round(computedSubtotal * 100) / 100,
      shippingCost,
      discountAmount,
      appliedCoupon,
      total: Math.round(finalTotal * 100) / 100,
      status: isElectronic ? "Pending Payment" : "Confirmed",
      paymentMethod,
      paymentStatus: isElectronic ? "Pending Verification" : "Pending Collection",
      paymentSenderDetail: body.paymentSenderDetail
        ? String(body.paymentSenderDetail).slice(0, 100)
        : undefined,
      customerName: String(body.customerName || "Collector").slice(0, 100),
      customerPhone: customerPhone.slice(0, 30),
      customerEmail: customerEmail.slice(0, 100),
      customerAddress: String(body.customerAddress || "").slice(0, 250),
      customerGovernorate: governorate.slice(0, 50),
      timeline: initialTimeline,
      trackingNumber: String(body.trackingNumber || "").slice(0, 50),
      trackingUrl: body.trackingUrl ? String(body.trackingUrl).slice(0, 300) : undefined,
      courier: String(body.courier || "Egypt Tracked Express").slice(0, 100),
      estimatedDelivery: String(body.estimatedDelivery || "24-48h").slice(0, 100),
      createdAt: now,
      expiresAt,
    };

    const saved = await saveServerOrder(sanitizedOrder);

    // Wait for dispatch to start and settle before the serverless response ends.
    // Vercel may freeze work scheduled after a response is returned.
    const { sendAdminNewOrderNotification, sendCustomerOrderStatusUpdateEmail } = await import("@/lib/email");
    await Promise.allSettled([
      sendAdminNewOrderNotification(saved),
      ...(saved.customerEmail ? [sendCustomerOrderStatusUpdateEmail(saved)] : []),
    ]);

    return NextResponse.json({
      success: true,
      order: saved,
      couponNotice: couponMessage,
      message: isElectronic
        ? "Order registered. Please transfer payment within 36 hours (1.5 days) to avoid automatic cancellation."
        : "Order placed and archived in central system.",
    });
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save order to server database." },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Curator status & timeline updates
 */
export async function PATCH(request: Request) {
  try {
    if (!isTrustedOrigin(request) || !(await curatorSession(request)).valid) {
      return NextResponse.json(
        { success: false, message: "Curator administrator authorization required." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.orderId) {
      return NextResponse.json(
        { success: false, message: "orderId is required." },
        { status: 400 }
      );
    }

    const rawUpdates = body.updates && typeof body.updates === "object" ? body.updates : {};
    const allowedFields = ["status", "paymentStatus", "timeline", "trackingNumber", "trackingUrl", "courier", "estimatedDelivery"];
    const updates = Object.fromEntries(Object.entries(rawUpdates).filter(([key]) => allowedFields.includes(key)));
    const result = await updateServerOrderStatus(String(body.orderId).slice(0, 32), updates);

    if (!result) {
      return NextResponse.json(
        { success: false, message: `Order #${body.orderId} not found.` },
        { status: 404 }
      );
    }

    const { updated, previous } = result;

    const { sendCustomerOrderStatusUpdateEmail, sendCustomerOrderShippedEmail } = await import("@/lib/email");
    const isNowShipped = updated.status === "Shipped";
    const wasShipped = previous.status === "Shipped";
    const newTrackingAdded =
      isNowShipped &&
      ((updated.trackingNumber && updated.trackingNumber !== previous.trackingNumber) ||
        (updated.trackingUrl && updated.trackingUrl !== previous.trackingUrl));

    if ((isNowShipped && !wasShipped) || newTrackingAdded) {
      await sendCustomerOrderShippedEmail(updated);
    } else if (updated.status !== previous.status) {
      await sendCustomerOrderStatusUpdateEmail(updated, previous.status);
    }

    return NextResponse.json({
      success: true,
      order: updated,
      message: `Order #${body.orderId} successfully updated.`,
    });
  } catch (error) {
    console.error("PATCH /api/orders error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update order on server." },
      { status: 500 }
    );
  }
}
