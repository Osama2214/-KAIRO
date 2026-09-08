import { NextResponse } from "next/server";
import { getUserByEmail, verifyUserPassword, toSanitizedUser } from "@/lib/userStore";
import { createVerifiedPatronToken } from "@/lib/patronAuth";
import { isTrustedOrigin } from "@/lib/serverAuth";
import { checkRateLimitKey, resetRateLimitKey, getClientIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ success: false, message: "Invalid request origin." }, { status: 403 });
    }

    const clientIp = getClientIp(request);
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "Invalid credentials." }, { status: 400 });
    }

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Email and password are required." }, { status: 400 });
    }

    // IP-level rate limiting
    const ipCheck = checkRateLimitKey(`login:ip:${clientIp}`, 15, 15 * 60 * 1000);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { success: false, message: `Too many login attempts from this network. Try again in ${Math.ceil(ipCheck.resetSeconds / 60)} minutes.` },
        { status: 429 }
      );
    }

    // Account-level rate limiting
    const accountKey = `login:account:${email}`;
    const accountCheck = checkRateLimitKey(accountKey, 5, 15 * 60 * 1000);
    if (!accountCheck.allowed) {
      return NextResponse.json(
        { success: false, message: `Account temporarily locked due to consecutive failed attempts. Please try again in ${Math.ceil(accountCheck.resetSeconds / 60)} minutes.` },
        { status: 429 }
      );
    }

    const user = await getUserByEmail(email);
    if (!user || !verifyUserPassword(password, user.password_hash)) {
      const remaining = accountCheck.remaining;
      return NextResponse.json(
        {
          success: false,
          message: remaining === 0
            ? "Account locked for 15 minutes due to too many failed attempts."
            : `Invalid email or password. (${remaining} attempt${remaining === 1 ? "" : "s"} remaining)`,
        },
        { status: 401 }
      );
    }

    // Login success: reset rate limiter
    resetRateLimitKey(accountKey);

    const sanitized = toSanitizedUser(user);
    const token = createVerifiedPatronToken(sanitized.id, sanitized.email);
    if (!token) {
      return NextResponse.json({ success: false, message: "Authentication configuration error." }, { status: 503 });
    }

    const response = NextResponse.json({
      success: true,
      user: sanitized,
      message: "Signed in successfully.",
    });

    response.cookies.set("kairo_patron_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json({ success: false, message: "Failed to authenticate." }, { status: 500 });
  }
}
