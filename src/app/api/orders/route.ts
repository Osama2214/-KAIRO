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
import { DEFAULT_GOVERNORATE_RATES } from "@/data/governorates";
import { curatorSession, isTrustedOrigin } from "@/lib/serverAuth";
import { patronSession } from "@/lib/patronAuth";
import { redeemCoupon, releaseCoupon } from "@/lib/couponEngine";
import { CatalogReservationError, reserveCatalogItems, restoreCatalogItems } from "@/lib/storefrontDataStore";
import { validateEgyptianPhone } from "@/lib/security";
import { createOrderId } from "@/lib/orderId";
import {
  GUEST_ORDER_COOKIE,
  GUEST_ORDER_COOKIE_MAX_AGE,
  createGuestOrderToken,
  guestOrderIdsFromRequest,
} from "@/lib/guestOrderToken";

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
    const rateCheck = await checkRateLimitKey(`order_create:ip:${clientIp}`, 6, 10 * 60 * 1000);
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
    if (!body || !Array.isArray(body.items) || body.items.length === 0 || body.items.length > 20) {
      return NextResponse.json(
        { success: false, message: "Invalid order data. Cart items are required." },
        { status: 400 }
      );
    }

    // The order reference is minted here, never accepted from the browser. A
    // client-supplied id let anyone overwrite an existing order through the
    // upsert in saveServerOrder, and the old 4-digit random space collided
    // between real customers after roughly a hundred orders.
    const orderId = createOrderId();

    const customerEmail = String(body.customerEmail || "").toLowerCase().trim();
    const rawCustomerPhone = String(body.customerPhone || "").trim();
    const customerName = String(body.customerName || "").trim();
    const customerAddress = String(body.customerAddress || "").trim();

    if (!customerName || customerName.length < 2) {
      return NextResponse.json({ success: false, message: "A valid customer name is required." }, { status: 400 });
    }

    if (!customerAddress || customerAddress.length < 5) {
      return NextResponse.json({ success: false, message: "A detailed delivery address in Egypt is required." }, { status: 400 });
    }

    const phoneValidation = validateEgyptianPhone(rawCustomerPhone);
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        { success: false, message: phoneValidation.message || "A valid 11-digit Egyptian mobile number is required." },
        { status: 400 }
      );
    }
    const customerPhone = phoneValidation.normalized || rawCustomerPhone;

    // 1. Reserve stock and calculate price from Neon catalogue data only.
    const requestedItems: Array<{ id: string; quantity: number }> = body.items.map((it: Record<string, unknown>) => ({
      id: String(it.volumeId || it.id || ""),
      quantity: Number(it.quantity) || 1,
    }));
    let reservedCatalogItems;
    try {
      reservedCatalogItems = await reserveCatalogItems(requestedItems);
    } catch (error) {
      if (error instanceof CatalogReservationError) {
        return NextResponse.json({ success: false, message: error.message }, { status: 409 });
      }
      throw error;
    }
    const quantityById = new Map<string, number>(
      requestedItems.map((item: { id: string; quantity: number }) => [
        item.id,
        Math.min(10, Math.max(1, Math.floor(item.quantity || 1))),
      ])
    );
    const validatedItems = reservedCatalogItems.map((catalogItem) => ({
      id: catalogItem.id,
      volumeId: catalogItem.id,
      title: catalogItem.title,
      seriesTitle: catalogItem.seriesTitle,
      volumeNumber: catalogItem.volumeNumber,
      coverImage: catalogItem.coverImage,
      format: catalogItem.format,
      // Figures and posters: which product and which option was bought, so the
      // order, invoice and email can say "Poster — A3" instead of "Vol. 0".
      ...(catalogItem.parentId
        ? {
            productType: catalogItem.productType,
            parentId: catalogItem.parentId,
            variantLabel: catalogItem.variantLabel,
            variantLabelAr: catalogItem.variantLabelAr,
          }
        : {}),
      price: Number(catalogItem.price),
      quantity: Number(quantityById.get(catalogItem.id) || 1),
    }));
    const computedSubtotal = validatedItems.reduce((total: number, item) => total + item.price * item.quantity, 0);

    // 2. Authoritative Coupon Validation & One-Time Use Enforcement
    let discountPercent = 0;
    let couponAmountOff = 0;
    let couponFreeShipping = false;
    let appliedCoupon: string | undefined = undefined;
    let couponMessage: string | undefined = undefined;

    const rawCode = String(body.appliedCoupon || "").trim().toUpperCase();
    if (rawCode) {
      const session = patronSession(request);
      // A coupon is claimed by the signed-in patron, not by data sent by the
      // browser: redemption is recorded against their address so "once each"
      // means something.
      if (!session.valid || !session.email || session.email !== customerEmail) {
        couponMessage = "Sign in to use this code.";
      } else {
        const value = await redeemCoupon(rawCode, session.email, orderId);
        if (value === null) {
          couponMessage = "This voucher is invalid, expired, or has already been used.";
        } else {
          discountPercent = value.percentOff;
          couponAmountOff = value.amountOff;
          couponFreeShipping = value.freeShipping;
          appliedCoupon = rawCode;
        }
      }
    }

    // A coupon may take off a percentage, a fixed amount, or both; the pair is
    // capped at the subtotal so no order can be worth less than nothing.
    const percentDiscount = Math.round(((computedSubtotal * discountPercent) / 100) * 100) / 100;
    const discountAmount = Math.min(
      computedSubtotal,
      Math.round((percentDiscount + couponAmountOff) * 100) / 100
    );
    const netMerchandise = Math.max(0, computedSubtotal - discountAmount);

    // 3. Authoritative Governorate Shipping & Net-Value Free Shipping Calculation
    const governorate = String(body.customerGovernorate || "Cairo").trim();
    const govShippingRate =
      DEFAULT_GOVERNORATE_RATES[governorate] ??
      Object.entries(DEFAULT_GOVERNORATE_RATES).find(([k]) =>
        governorate.toLowerCase().includes(k.toLowerCase())
      )?.[1] ??
      65;

    // Free shipping threshold: 500 EGP calculated on NET merchandise value
    // (after discount) — or granted outright by the coupon.
    const isFreeShipping = couponFreeShipping || netMerchandise >= 500;
    const shippingCost = isFreeShipping ? 0 : govShippingRate;

    // 4. Authoritative Final Total
    const finalTotal = Math.max(0, netMerchandise + shippingCost);

    // 5. Electronic Payment Hold & Expiration Timestamp (36 Hours = 1.5 Days)
    const paymentMethod = String(body.paymentMethod || "cash").toLowerCase();
    const isElectronic = paymentMethod === "wallet" || paymentMethod === "instapay";
    const paymentSenderDetail = body.paymentSenderDetail ? String(body.paymentSenderDetail).trim().slice(0, 100) : undefined;

    if (isElectronic && (!paymentSenderDetail || paymentSenderDetail.length < 3)) {
      return NextResponse.json(
        { success: false, message: "Please provide your transfer phone number or InstaPay reference for payment verification." },
        { status: 400 }
      );
    }

    const now = Date.now();
    const expiresAt = isElectronic ? now + PAYMENT_HOLD_TIMEOUT_MS : undefined;

    const initialTimeline = isElectronic
      ? [
          "Order Placed",
          "Pending Electronic Payment Verification (Hold: 36 Hours)",
        ]
      : ["Order Placed", "Confirmed", "Preparing Dispatch"];

    const sanitizedOrder: ServerOrder = {
      id: orderId,
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
      paymentSenderDetail,
      customerName: String(customerName).slice(0, 100),
      customerPhone: customerPhone.slice(0, 30),
      customerEmail: customerEmail.slice(0, 100),
      customerAddress: String(customerAddress).slice(0, 250),
      customerGovernorate: governorate.slice(0, 50),
      timeline: initialTimeline,
      // Courier fields are set by the curator when the parcel actually ships.
      trackingNumber: "",
      trackingUrl: undefined,
      courier: "Egypt Tracked Express",
      estimatedDelivery: String(body.estimatedDelivery || "24-48h").slice(0, 100),
      createdAt: now,
      expiresAt,
    };

    // Stock is already decremented and the coupon already marked used. If the
    // write fails now, both must be given back — otherwise a transient database
    // error silently destroyed inventory and burned the patron's one coupon.
    let saved;
    try {
      saved = await saveServerOrder(sanitizedOrder);
    } catch (saveError) {
      await Promise.allSettled([
        restoreCatalogItems(validatedItems),
        ...(appliedCoupon ? [releaseCoupon(orderId)] : []),
      ]);
      throw saveError;
    }

    // Wait for dispatch to start and settle before the serverless response ends.
    // Vercel may freeze work scheduled after a response is returned.
    const { sendAdminNewOrderNotification, sendCustomerOrderStatusUpdateEmail } = await import("@/lib/email");
    await Promise.allSettled([
      sendAdminNewOrderNotification(saved),
      ...(saved.customerEmail ? [sendCustomerOrderStatusUpdateEmail(saved)] : []),
    ]);

    const response = NextResponse.json({
      success: true,
      order: saved,
      couponNotice: couponMessage,
      message: isElectronic
        ? "Order registered. Please transfer payment within 36 hours (1.5 days) to avoid automatic cancellation."
        : "Order placed and archived in central system.",
    });

    // Record ownership of this order in an HttpOnly cookie so a returning guest
    // can be shown their own delivery details without any of it being stored in
    // the browser where scripts — or the next person on this device — can read it.
    const guestToken = createGuestOrderToken([saved.id, ...guestOrderIdsFromRequest(request)]);
    if (guestToken) {
      response.cookies.set(GUEST_ORDER_COOKIE, guestToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: GUEST_ORDER_COOKIE_MAX_AGE,
      });
    }

    return response;
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

    // This value becomes an href in the customer's shipping e-mail, so restrict
    // it to real web URLs rather than trusting whatever was typed.
    if (updates.trackingUrl !== undefined) {
      const candidate = String(updates.trackingUrl || "").trim().slice(0, 300);
      if (!candidate) {
        updates.trackingUrl = undefined;
      } else if (/^https?:\/\//i.test(candidate)) {
        updates.trackingUrl = candidate;
      } else {
        return NextResponse.json(
          { success: false, message: "Tracking link must be an http(s) URL." },
          { status: 400 }
        );
      }
    }
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
