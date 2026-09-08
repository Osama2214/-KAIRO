import { NextResponse } from "next/server";
import { changeAdminPin } from "@/lib/adminSecurityStore";
import { curatorSession, isTrustedOrigin } from "@/lib/serverAuth";
import { checkRateLimitKey, getClientIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request) || !(await curatorSession(request)).valid) {
      return NextResponse.json({ success: false, message: "Valid curator authorization required." }, { status: 401 });
    }
    const clientIp = getClientIp(request);
    if (!checkRateLimitKey(`pin_change:${clientIp}`, 5, 15 * 60 * 1000).allowed) {
      return NextResponse.json({ success: false, message: "Too many PIN-change attempts. Please wait." }, { status: 429 });
    }
    const body = await request.json().catch(() => ({}));
    const currentPin = String(body.currentPin || "").trim();
    const newPin = String(body.newPin || "").trim();
    if (!currentPin || newPin.length < 10 || newPin.length > 64) {
      return NextResponse.json({ success: false, message: "New PIN must be 10–64 characters." }, { status: 400 });
    }
    if (currentPin === newPin) {
      return NextResponse.json({ success: false, message: "Choose a different PIN." }, { status: 400 });
    }
    const changed = await changeAdminPin(currentPin, newPin);
    if (!changed) return NextResponse.json({ success: false, message: "Current PIN is incorrect." }, { status: 403 });

    const response = NextResponse.json({ success: true, reauthRequired: true, message: "PIN updated. Sign in again with the new PIN." });
    response.cookies.set("kairo_curator_session", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0, expires: new Date(0) });
    return response;
  } catch (error) {
    console.error("Change PIN API error:", error);
    return NextResponse.json({ success: false, message: "Unable to update the PIN." }, { status: 500 });
  }
}
