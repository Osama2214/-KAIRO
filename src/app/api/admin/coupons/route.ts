import { NextResponse } from "next/server";
import { deleteCoupon, listCoupons, saveCoupon } from "@/lib/couponEngine";
import { curatorSession, isTrustedOrigin } from "@/lib/serverAuth";

/**
 * The console's coupon list.
 *
 * Every method here is curator-only. Read included: the list carries how many
 * times each code has been claimed and which are restricted, which is the shop's
 * own business — the public endpoints expose only what a shopper needs.
 */

async function authorised(request: Request): Promise<boolean> {
  if (!isTrustedOrigin(request)) return false;
  return (await curatorSession(request)).valid;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await authorised(request))) {
    return NextResponse.json({ success: false, message: "Curator authorization required." }, { status: 403 });
  }
  try {
    return NextResponse.json(
      { success: true, coupons: await listCoupons() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/admin/coupons error:", error);
    return NextResponse.json({ success: false, message: "Could not load vouchers." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!(await authorised(request))) {
    return NextResponse.json({ success: false, message: "Curator authorization required." }, { status: 403 });
  }
  try {
    const body = await request.json().catch(() => null);
    if (!body?.code) {
      return NextResponse.json({ success: false, message: "A voucher code is required." }, { status: 400 });
    }

    const result = await saveCoupon({
      code: String(body.code),
      label: body.label ? String(body.label) : "",
      percentOff: Number(body.percentOff) || 0,
      amountOff: Number(body.amountOff) || 0,
      freeShipping: Boolean(body.freeShipping),
      startsAt: body.startsAt ? Number(body.startsAt) : null,
      expiresAt: body.expiresAt ? Number(body.expiresAt) : null,
      maxTotalUses: body.maxTotalUses ? Number(body.maxTotalUses) : null,
      announce: Boolean(body.announce),
      active: body.active !== false,
      newCustomersOnly: Boolean(body.newCustomersOnly),
    });

    // A rejected voucher is the curator's mistake to see, not a server fault.
    return NextResponse.json(
      { success: result.ok, message: result.message },
      { status: result.ok ? 200 : 400 }
    );
  } catch (error) {
    console.error("PUT /api/admin/coupons error:", error);
    return NextResponse.json({ success: false, message: "Could not save that voucher." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!(await authorised(request))) {
    return NextResponse.json({ success: false, message: "Curator authorization required." }, { status: 403 });
  }
  try {
    const body = await request.json().catch(() => null);
    if (!body?.code) {
      return NextResponse.json({ success: false, message: "A voucher code is required." }, { status: 400 });
    }
    await deleteCoupon(String(body.code));
    return NextResponse.json({ success: true, message: `Voucher ${String(body.code).toUpperCase()} removed.` });
  } catch (error) {
    console.error("DELETE /api/admin/coupons error:", error);
    return NextResponse.json({ success: false, message: "Could not remove that voucher." }, { status: 503 });
  }
}
