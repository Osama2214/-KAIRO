import { NextResponse } from "next/server";
import { isAuthorizedAdminEmail } from "@/config/adminConfig";
import { MAX_PIN_ATTEMPTS, PIN_LOCKOUT_MS } from "@/config/adminPublic";
import { verifyAdminPin } from "@/lib/adminSecurityStore";
import { checkRateLimitKey, resetRateLimitKey, getClientIp } from "@/lib/rateLimit";
import { createCuratorToken, isTrustedOrigin } from "@/lib/serverAuth";

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ success: false, message: "Invalid request origin." }, { status: 403 });
    }
    const clientIp = getClientIp(request);
    const body = await request.json().catch(() => ({}));
    const email = (body.email || "").toString().trim().toLowerCase();
    const pin = (body.pin || "").toString().trim();

    if (!email || !pin) {
      return NextResponse.json(
        { success: false, message: "Email and Security PIN are required." },
        { status: 400 }
      );
    }

    // 1. IP-level rate limiting (max 15 attempts per 15 minutes per IP)
    const ipCheck = await checkRateLimitKey(`pin:ip:${clientIp}`, 15, PIN_LOCKOUT_MS);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          locked: true,
          remainingSec: ipCheck.resetSeconds,
          message: `Too many attempts from this network. Lockout active for ${Math.ceil(ipCheck.resetSeconds / 60)} minute(s).`,
        },
        { status: 429 }
      );
    }

    // 2. Email-level rate limiting & lockout
    const emailKey = `pin:email:${email}`;
    const emailCheck = await checkRateLimitKey(emailKey, MAX_PIN_ATTEMPTS, PIN_LOCKOUT_MS);
    if (!emailCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          locked: true,
          remainingSec: emailCheck.resetSeconds,
          remainingAttempts: 0,
          message: `Security Lockout Active for ${email}. Try again in ${Math.ceil(emailCheck.resetSeconds / 60)} minute(s).`,
        },
        { status: 429 }
      );
    }

    // 3. Check if email is on the authorized curator admin list
    if (!(await isAuthorizedAdminEmail(email))) {
      return NextResponse.json(
        {
          success: false,
          unauthorized: true,
          message: "Access Denied: This account lacks curator administrative privileges.",
        },
        { status: 403 }
      );
    }

    // 4. Verify PIN strictly against authoritative server PIN store
    const isMatch = await verifyAdminPin(pin);

    if (isMatch) {
      // Clear failed rate limit counters upon successful verification
      await resetRateLimitKey(emailKey);
      await resetRateLimitKey(`pin:ip:${clientIp}`);

      // Issue signed curator session token bound to client fingerprint
      const token = await createCuratorToken(email, request);
      if (!token) {
        return NextResponse.json({ success: false, message: "Admin session configuration is incomplete." }, { status: 503 });
      }

      const response = NextResponse.json({
        success: true,
        message: "Master Curator authentication verified. Welcome to ANIMEVERSE Admin Console.",
      });

      // Set hardened HTTP-Only security cookie
      response.cookies.set("kairo_curator_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 24 * 60 * 60, // 24 hours
      });

      return response;
    } else {
      const remaining = emailCheck.remaining;
      if (remaining === 0) {
        return NextResponse.json(
          {
            success: false,
            locked: true,
            remainingSec: Math.ceil(PIN_LOCKOUT_MS / 1000),
            remainingAttempts: 0,
            message: `Maximum attempts reached (${MAX_PIN_ATTEMPTS}/${MAX_PIN_ATTEMPTS}). Security Lockout active for 15 minutes.`,
          },
          { status: 429 }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            locked: false,
            remainingAttempts: remaining,
            message: `Invalid Security PIN. Access denied. (${remaining} attempt${remaining === 1 ? "" : "s"} remaining before security lockout)`,
          },
          { status: 401 }
        );
      }
    }
  } catch (error) {
    console.error("API /api/admin/verify-pin error:", error);
    return NextResponse.json(
      { success: false, message: "Curator verification failed due to an internal security error." },
      { status: 500 }
    );
  }
}
