import { NextResponse } from "next/server";
import { getOrCreateWelcomeCoupon } from "@/lib/couponStore";
import { patronSession } from "@/lib/patronAuth";

export async function GET(request: Request) {
  try {
    const session = patronSession(request);
    if (!session.valid || !session.email) return NextResponse.json({ success: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const coupon = await getOrCreateWelcomeCoupon(session.email);
    // No coupon means this patron is not eligible; the client treats a missing
    // coupon as "no offer" and renders nothing.
    return NextResponse.json({ success: true, coupon: coupon ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Welcome coupon error:", error);
    return NextResponse.json({ success: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
