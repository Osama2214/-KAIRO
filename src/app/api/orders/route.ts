import { NextResponse } from "next/server";
import {
  getAllServerOrders,
  saveServerOrder,
  updateServerOrderStatus,
  ServerOrder,
  PAYMENT_HOLD_TIMEOUT_MS,
} from "@/lib/orderStore";
import { checkRateLimitKey, getClientIp } from "@/lib/rateLimit";
import { ALL_VOLUMES } from "@/data/manga";
import { DEFAULT_GOVERNORATE_RATES } from "@/data/governorates";

/**
 * GET: Retrieve orders from central server database
 * - If called by Curator (admin cookie present): returns all central orders
 * - If called by customer with ?email=...: returns only orders belonging to that email
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterEmail = searchParams.get("email")?.toLowerCase().trim();
    const cookieHeader = request.headers.get("cookie") || "";
    const isCurator = cookieHeader.includes("kairo_curator_session=");

    const allOrders = await getAllServerOrders();

    if (filterEmail && !isCurator) {
      // Customer querying their own orders
      const userOrders = allOrders.filter(
        (o) => o.customerEmail?.toLowerCase() === filterEmail
      );
      return NextResponse.json({ success: true, orders: userOrders });
    }

    // Return all orders for curator
    return NextResponse.json({ success: true, orders: allOrders, total: allOrders.length });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve orders." },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new order with authoritative server-side price, coupon, and inventory calculations
 */
export async function POST(request: Request) {
  try {
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
    if (!body || !body.id || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid order data. Cart items and order ID are required." },
        { status: 400 }
      );
    }

    const customerEmail = String(body.customerEmail || "").toLowerCase().trim();
    const customerPhone = String(body.customerPhone || "").trim();
    const cleanPhoneDigits = customerPhone.replace(/\D/g, "");

    // 1. Authoritative Item Pricing & Subtotal Calculation
    let computedSubtotal = 0;
    const validatedItems = body.items.map((it: Record<string, unknown>) => {
      const volId = String(it.volumeId || it.id || "");
      const canon = ALL_VOLUMES.find((v) => v.id === volId);
      const unitPrice = canon ? canon.price : Math.max(0, Number(it.price) || 0);
      const qty = Math.max(1, Math.floor(Number(it.quantity) || 1));
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
      const isWelcomeCode =
        rawCode.endsWith("-FIRST20") || rawCode === "WELCOME20" || rawCode === "PATRON20";

      if (isWelcomeCode) {
        // Enforce ONE-TIME use: Check if this email or phone has ever ordered before
        const allOrders = await getAllServerOrders();
        const hasOrderedBefore = allOrders.some((o) => {
          const emailMatch =
            customerEmail && o.customerEmail && o.customerEmail.toLowerCase() === customerEmail;
          const phoneMatch =
            cleanPhoneDigits &&
            o.customerPhone &&
            o.customerPhone.replace(/\D/g, "") === cleanPhoneDigits;
          const isNotCancelled = !o.status.toLowerCase().includes("cancelled");
          return (emailMatch || phoneMatch) && isNotCancelled;
        });

        if (hasOrderedBefore) {
          couponMessage = "Welcome voucher was not applied: this discount is valid for first-time orders only.";
        } else {
          discountPercent = 20;
          appliedCoupon = rawCode;
        }
      } else if (rawCode === "KAIRO20" || rawCode === "KAIRO-PATRON20") {
        discountPercent = 20;
        appliedCoupon = rawCode;
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
    const isFreeShipping = netMerchandise >= 500 || (discountPercent > 0 && body.freeShippingGranted);
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
      date: body.date || new Date().toISOString().split("T")[0],
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

    // 6. Asynchronously trigger emails in background (without blocking response)
    (async () => {
      try {
        const { sendAdminNewOrderNotification, sendCustomerOrderStatusUpdateEmail } = await import("@/lib/email");
        // Dispatch admin alert
        await sendAdminNewOrderNotification(saved);
        // Dispatch customer registration/confirmation notice
        if (saved.customerEmail) {
          await sendCustomerOrderStatusUpdateEmail(saved);
        }
      } catch (mailErr) {
        console.error("[ORDER EMAIL DISPATCH ERROR]:", mailErr);
      }
    })();

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
    const cookieHeader = request.headers.get("cookie") || "";
    const isCurator = cookieHeader.includes("kairo_curator_session=");

    // Require curator session to update order status in production
    if (!isCurator && process.env.NODE_ENV === "production") {
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

    let result = await updateServerOrderStatus(body.orderId, body.updates || {});
    
    // If order was not yet in central server storage (e.g. legacy/client-created order),
    // but the client provided fullOrder details, upsert it now!
    if (!result && body.fullOrder) {
      const full = body.fullOrder;
      const enrichedOrder: ServerOrder = {
        id: body.orderId,
        date: full.date || new Date().toISOString().split("T")[0],
        items: Array.isArray(full.items) ? full.items : [],
        subtotal: Number(full.subtotal) || 0,
        shippingCost: Number(full.shippingCost) || 0,
        discountAmount: full.discountAmount,
        appliedCoupon: full.appliedCoupon,
        total: Number(full.total) || 0,
        status: (body.updates?.status || full.status || "Confirmed") as string,
        paymentMethod: full.paymentMethod || "cash",
        paymentStatus: body.updates?.paymentStatus || full.paymentStatus || "Pending Collection",
        paymentSenderDetail: full.paymentSenderDetail,
        customerName: full.customerName || "Collector",
        customerPhone: full.customerPhone,
        customerEmail: full.customerEmail,
        customerAddress: full.customerAddress,
        customerGovernorate: full.customerGovernorate,
        timeline: Array.isArray(full.timeline) ? full.timeline : ["Order Placed"],
        trackingNumber: body.updates?.trackingNumber || full.trackingNumber || "",
        trackingUrl: body.updates?.trackingUrl || full.trackingUrl || "",
        courier: body.updates?.courier || full.courier || "Egypt Tracked Express",
        estimatedDelivery: body.updates?.estimatedDelivery || full.estimatedDelivery || "24-48h",
        ...body.updates,
      };
      
      const saved = await saveServerOrder(enrichedOrder);
      result = {
        updated: saved,
        previous: { ...saved, status: full.status || "Confirmed", trackingNumber: full.trackingNumber || "" },
      };
    }

    if (!result) {
      return NextResponse.json(
        { success: false, message: `Order #${body.orderId} not found.` },
        { status: 404 }
      );
    }

    const { updated, previous } = result;

    // Asynchronously dispatch notification emails to customer based on changes
    (async () => {
      try {
        const { sendCustomerOrderStatusUpdateEmail, sendCustomerOrderShippedEmail } = await import("@/lib/email");
        
        const isNowShipped = updated.status === "Shipped";
        const wasShipped = previous.status === "Shipped";
        const newTrackingAdded =
          isNowShipped &&
          ((updated.trackingNumber && updated.trackingNumber !== previous.trackingNumber) ||
            (updated.trackingUrl && updated.trackingUrl !== previous.trackingUrl));

        if ((isNowShipped && !wasShipped) || newTrackingAdded) {
          // If order transitioned to Shipped or tracking details were updated
          await sendCustomerOrderShippedEmail(updated);
        } else if (updated.status !== previous.status) {
          // Status updated to any other stage (Confirmed, Processing, Delivered, Cancelled)
          await sendCustomerOrderStatusUpdateEmail(updated, previous.status);
        }
      } catch (err) {
        console.error("[ORDER UPDATE EMAIL ERROR]:", err);
      }
    })();

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

