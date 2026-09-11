import { NextResponse } from "next/server";
import { checkCoupon } from "@/lib/couponEngine";
import { patronSession } from "@/lib/patronAuth";
import { checkRateLimitKey, getClientIp } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/serverAuth";

/**
 * Tells the cart whether a code is worth staging, and what it would take off.
 *
 * Only ever advisory. The cart shows a preview with this, and the order route
 * decides again at checkout, because a coupon can expire or be claimed by
 * someone else in between.
 *
 * Rate limited because this is the one endpoint that says whether a code exists:
 * without a limit it would be a way to discover codes by guessing.
 */
export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ success: false, message: "Invalid request origin." }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rate = await checkRateLimitKey(`coupon:check:${ip}`, 20, 5 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, message: "Too many attempts. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const code = String(body?.code || "").trim();
    if (!code) {
      return NextResponse.json({ success: false, message: "Enter a voucher code." }, { status: 400 });
    }

    const session = patronSession(request);
    const result = await checkCoupon(code, session.valid ? session.email ?? null : null);

    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: result.reason },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Only what the cart needs to show a preview — the rest of the row (usage
    // counts, scheduling, who it is restricted to) is the shop's business.
    const { code: accepted, label, percentOff, amountOff, freeShipping } = result.coupon;
    return NextResponse.json(
      { success: true, coupon: { code: accepted, label, percentOff, amountOff, freeShipping } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("POST /api/coupons/check error:", error);
    return NextResponse.json({ success: false, message: "Could not check that code." }, { status: 503 });
  }
}
