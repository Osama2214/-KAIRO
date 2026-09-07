import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otpStore";
import { checkRateLimitKey, getClientIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    // 1. IP-level rate limiting: max 15 verification attempts per 15 minutes per IP
    const ipCheck = checkRateLimitKey(`verify_otp:ip:${clientIp}`, 15, 15 * 60 * 1000);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many verification attempts from this network. Please wait ${Math.ceil(ipCheck.resetSeconds / 60)} minute(s).`,
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const cleanEmail = (body.email || "").toString().trim().toLowerCase();
    const cleanCode = (body.code || "").toString().trim();

    if (!cleanEmail || !cleanCode) {
      return NextResponse.json(
        { success: false, message: "Email and verification code are required." },
        { status: 400 }
      );
    }

    const result = verifyOtp(cleanEmail, cleanCode);
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email successfully verified. Proceeding with patron account registration.",
    });
  } catch (error) {
    console.error("API /api/verify-otp error:", error);
    return NextResponse.json(
      { success: false, message: "Verification failed due to a server error." },
      { status: 500 }
    );
  }
}
