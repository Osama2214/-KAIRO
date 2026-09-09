import { NextResponse } from "next/server";
import { getServerOrdersByIds } from "@/lib/orderStore";
import { isTrustedOrigin } from "@/lib/serverAuth";
import { patronSession } from "@/lib/patronAuth";
import { checkRateLimitKey, getClientIp } from "@/lib/rateLimit";

/**
 * Returns live status for orders the caller can prove they own.
 *
 * Signed-in patrons are matched against the e-mail in their session cookie.
 * Guests must present the reference they were given at checkout — which is now
 * 64 bits of server entropy, so it cannot be guessed. Either way the response
 * is trimmed to status fields: this endpoint used to hand back full delivery
 * addresses and phone numbers to anyone who asked.
 */
export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ success: false, message: "Invalid request origin." }, { status: 403 });
    }

    const clientIp = getClientIp(request);
    const rateCheck = await checkRateLimitKey(`orders_check:ip:${clientIp}`, 60, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ success: false, message: "Rate limit exceeded." }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const orderIds = Array.isArray(body?.orderIds)
      ? body.orderIds.map((id: unknown) => String(id).trim().slice(0, 64)).filter(Boolean).slice(0, 30)
      : [];

    if (orderIds.length === 0) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const session = patronSession(request);
    const matched = await getServerOrdersByIds(orderIds);

    // A patron sees their own orders; a guest sees only orders with no owner.
    const visible = matched.filter((order) => {
      const owner = order.customerEmail?.trim().toLowerCase();
      if (!owner) return true;
      return session.valid && session.email === owner;
    });

    return NextResponse.json(
      {
        success: true,
        orders: visible.map((order) => ({
          id: order.id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          timeline: order.timeline,
          trackingNumber: order.trackingNumber,
          trackingUrl: order.trackingUrl,
          courier: order.courier,
          estimatedDelivery: order.estimatedDelivery,
          expiresAt: order.expiresAt,
          updatedAt: order.updatedAt,
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("POST /api/orders/status-check error:", error);
    return NextResponse.json({ success: false, message: "Failed to check order statuses." }, { status: 500 });
  }
}
