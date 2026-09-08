import { NextResponse } from "next/server";
import { getAllServerOrders, ServerOrder } from "@/lib/orderStore";
import { isTrustedOrigin } from "@/lib/serverAuth";
import { checkRateLimitKey, getClientIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ success: false, message: "Invalid request origin." }, { status: 403 });
    }

    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimitKey(`orders_check:ip:${clientIp}`, 60, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ success: false, message: "Rate limit exceeded." }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const orderIds = Array.isArray(body?.orderIds)
      ? body.orderIds.map((id: unknown) => String(id).trim()).filter(Boolean).slice(0, 30)
      : [];

    if (orderIds.length === 0) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const allOrders = await getAllServerOrders();
    const idSet = new Set(orderIds);
    const matchedOrders: ServerOrder[] = allOrders.filter((o) => idSet.has(o.id));

    return NextResponse.json({
      success: true,
      orders: matchedOrders,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("POST /api/orders/status-check error:", error);
    return NextResponse.json({ success: false, message: "Failed to check order statuses." }, { status: 500 });
  }
}
