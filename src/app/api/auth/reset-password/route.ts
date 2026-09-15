import { NextResponse } from "next/server";
import { updateUserPassword, getUserByEmail } from "@/lib/userStore";
import { verifyOtp } from "@/lib/otpStore";
import { isTrustedOrigin } from "@/lib/serverAuth";
import { checkRateLimitKey, getClientIp } from "@/lib/rateLimit";

function validatePassword(password: string): boolean {
  return typeof password === "string" && password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ success: false, message: "Invalid request origin." }, { status: 403 });
    }

    const clientIp = getClientIp(request);
    const rateCheck = await checkRateLimitKey(`reset_pass:ip:${clientIp}`, 10, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: "Too many password reset attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "Invalid request payload." }, { status: 400 });
    }

    const email = String(body.email || "").trim().toLowerCase();
    const otp = String(body.otp || "").trim();
    const newPassword = String(body.newPassword || "");

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ success: false, message: "Email, verification code, and new password are required." }, { status: 400 });
    }

    if (!validatePassword(newPassword)) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters long and contain both letters and numbers." },
        { status: 400 }
      );
    }

    // 1. Verify OTP server-side
    const otpVerification = await verifyOtp(email, otp);
    if (!otpVerification.success) {
      return NextResponse.json(
        { success: false, message: otpVerification.message || "Invalid or expired verification code." },
        { status: 400 }
      );
    }

    // 2. Check user existence
    const user = await getUserByEmail(email);
    if (!user) {
      // Keep recovery responses generic so a valid OTP cannot be used to
      // enumerate which email addresses have accounts.
      return NextResponse.json({ success: false, message: "Invalid or expired recovery request." }, { status: 400 });
    }

    // 3. Update password in Neon DB
    const updated = await updateUserPassword(email, newPassword);
    if (!updated) {
      return NextResponse.json({ success: false, message: "Failed to update password." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully in archive database.",
    });
  } catch (error) {
    console.error("POST /api/auth/reset-password error:", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
