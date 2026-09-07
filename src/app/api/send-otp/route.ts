import { NextResponse } from "next/server";
import crypto from "crypto";
import { saveOtp } from "@/lib/otpStore";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimitKey, getClientIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    // 1. IP-level rate limiting: max 6 OTP requests per 10 minutes per IP
    const ipCheck = checkRateLimitKey(`send_otp:ip:${clientIp}`, 6, 10 * 60 * 1000);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many verification code requests from this network. Please wait ${Math.ceil(ipCheck.resetSeconds / 60)} minute(s).`,
          waitSec: ipCheck.resetSeconds,
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = (body.email || "").toString().trim().toLowerCase();
    const purpose = body.purpose === "RESET_PASSWORD" ? "RESET_PASSWORD" : "REGISTER";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Valid email address is required." },
        { status: 400 }
      );
    }

    // 2. Cryptographically secure 6-digit numeric OTP code
    const code = crypto.randomInt(100000, 1000000).toString();

    // 3. Store OTP server-side with 45s cooldown and 10min expiry
    const saveResult = saveOtp(email, code);
    if (!saveResult.success) {
      return NextResponse.json(
        { success: false, message: saveResult.message, waitSec: saveResult.waitSec },
        { status: 429 }
      );
    }

    // 4. Dispatch real email via SMTP / Gmail / Resend
    const dispatchResult = await sendVerificationEmail({ to: email, code, purpose });

    if (!dispatchResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: dispatchResult.message || "Failed to deliver email. Please check your email address.",
        },
        { status: 500 }
      );
    }

    // Return success to client WITHOUT leaking the code
    return NextResponse.json({
      success: true,
      email,
      message: `A 6-digit verification code has been dispatched to ${email}. Please check your inbox or spam folder.`,
    });
  } catch (error) {
    console.error("API /api/send-otp error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to dispatch verification code." },
      { status: 500 }
    );
  }
}
