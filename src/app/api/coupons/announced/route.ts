import { NextResponse } from "next/server";
import { announcedCoupon } from "@/lib/couponEngine";

/**
 * The coupon the shop is currently advertising, if any.
 *
 * Read by the announcement bar. Only the parts a shopper needs are returned —
 * how many times it has been claimed and who it is restricted to are the shop's
 * business, not the visitor's.
 *
 * Public on purpose: an advertised coupon is, by definition, one the shop wants
 * everyone to see. Codes that are not advertised never appear here.
 */
export async function GET() {
  try {
    const coupon = await announcedCoupon();
    if (!coupon) {
      return NextResponse.json(
        { success: true, coupon: null },
        { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
      );
    }

    const { code, label, percentOff, amountOff, freeShipping, expiresAt } = coupon;
    return NextResponse.json(
      { success: true, coupon: { code, label, percentOff, amountOff, freeShipping, expiresAt } },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("GET /api/coupons/announced error:", error);
    // A shop that cannot read its own promotions advertises none.
    return NextResponse.json({ success: true, coupon: null }, { status: 200 });
  }
}
