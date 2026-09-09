import { NextResponse } from "next/server";
import { getServerOrdersByIds, ServerOrder } from "@/lib/orderStore";
import { isTrustedOrigin } from "@/lib/serverAuth";
import { patronSession } from "@/lib/patronAuth";
import { checkRateLimitKey, getClientIp } from "@/lib/rateLimit";
import { guestOrderIdsFromRequest } from "@/lib/guestOrderToken";

/**
 * Resolves order references into order records.
 *
 * Guest orders used to be kept in localStorage in full — name, phone, delivery
 * address, e-mail and payment reference sat at rest in the browser of every
 * shared or borrowed device. The browser now keeps only the reference and the
 * details are fetched here for the life of the page.
 *
 * Full records go to the browser that can prove it owns the order: a signed-in
 * patron whose e-mail matches, or a guest holding the HttpOnly cookie issued at
 * checkout. Anyone else merely possesses a reference, so they get what "track
 * my order" needs — items, totals, status, timeline, courier — and no personal
 * data is returned.
 */
/**
 * An explicit allow-list rather than an omit-list, so any personal field added
 * to ServerOrder later is excluded by default instead of leaking silently.
 */
function withoutCustomerData(order: ServerOrder) {
  return {
    id: order.id,
    date: order.date,
    items: order.items,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    discountAmount: order.discountAmount,
    appliedCoupon: order.appliedCoupon,
    total: order.total,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    timeline: order.timeline,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    courier: order.courier,
    estimatedDelivery: order.estimatedDelivery,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    expiresAt: order.expiresAt,
  };
}

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ success: false, message: "Invalid request origin." }, { status: 403 });
    }

    const clientIp = getClientIp(request);
    const rateCheck = await checkRateLimitKey(`orders_lookup:ip:${clientIp}`, 30, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ success: false, message: "Rate limit exceeded." }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const orderIds = Array.isArray(body?.orderIds)
      ? body.orderIds.map((id: unknown) => String(id).trim().slice(0, 64)).filter(Boolean).slice(0, 30)
      : [];

    if (orderIds.length === 0) {
      return NextResponse.json({ success: true, orders: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const session = patronSession(request);
    const ownedByThisBrowser = new Set(guestOrderIdsFromRequest(request));
    const orders = await getServerOrdersByIds(orderIds);

    const visible = orders.map((order) => {
      const owner = order.customerEmail?.trim().toLowerCase();
      const isPatron = Boolean(session.valid && session.email && owner && session.email === owner);
      const isGuestOwner = ownedByThisBrowser.has(order.id);
      return isPatron || isGuestOwner ? order : withoutCustomerData(order);
    });

    return NextResponse.json(
      { success: true, orders: visible },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("POST /api/orders/lookup error:", error);
    return NextResponse.json({ success: false, message: "Failed to load orders." }, { status: 500 });
  }
}
