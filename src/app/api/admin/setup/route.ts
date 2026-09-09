import { NextResponse } from "next/server";
import crypto from "crypto";
import { createUser, getUserByEmail, updateUserPassword } from "@/lib/userStore";
import { createVerifiedPatronToken } from "@/lib/patronAuth";
import { createCuratorToken, isTrustedOrigin } from "@/lib/serverAuth";
import { isAuthorizedAdminEmail } from "@/config/adminConfig";
import { checkRateLimitKey, getClientIp } from "@/lib/rateLimit";

/**
 * One-time bootstrap for the curator account.
 *
 * The previous version accepted the literal PIN "1234" no matter what
 * ADMIN_PIN was configured to, ran without an origin check or rate limit, and
 * reset the password of whatever email the caller named — then handed back both
 * a patron and a curator cookie. That was an unauthenticated admin takeover.
 */
function timingSafeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ success: false, message: "Invalid request origin." }, { status: 403 });
    }

    const clientIp = getClientIp(request);
    const rateCheck = await checkRateLimitKey(`admin_setup:ip:${clientIp}`, 5, 60 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: "Too many setup attempts. Please try again later." },
        { status: 429 }
      );
    }

    // Fail closed: no configured PIN means no bootstrap, never a default one.
    const expectedPin = process.env.ADMIN_PIN?.trim();
    if (!expectedPin || expectedPin.length < 10) {
      return NextResponse.json(
        { success: false, message: "ADMIN_PIN must be configured as a 10+ character secret before setup." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const pin = String(body.pin || "").trim();

    if (!timingSafeEquals(pin, expectedPin)) {
      return NextResponse.json({ success: false, message: "Invalid Master PIN." }, { status: 403 });
    }

    // Only an address already on the curator allow-list may be bootstrapped.
    if (!isAuthorizedAdminEmail(email)) {
      return NextResponse.json(
        { success: false, message: "This email is not on the curator allow-list." },
        { status: 403 }
      );
    }

    if (password.length < 12 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { success: false, message: "Admin password must be at least 12 characters with letters and numbers." },
        { status: 400 }
      );
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      await updateUserPassword(email, password);
    } else {
      await createUser({
        email,
        password,
        name: "Master Curator",
        phone: "",
        address: "",
        governorate: "Cairo",
        role: "admin",
      });
    }

    const user = existing ? existing : await getUserByEmail(email);
    const patronToken = user ? createVerifiedPatronToken(user.id, email) : null;
    const curatorToken = await createCuratorToken(email, request);

    const response = NextResponse.json({
      success: true,
      message: `Admin account ready for ${email}.`,
      email,
    });

    if (patronToken) {
      response.cookies.set("kairo_patron_session", patronToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        // Must match every other patron-session issuer: a "strict" cookie is
        // withheld on cross-site navigations and reads as a signed-out patron.
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    if (curatorToken) {
      response.cookies.set("kairo_curator_session", curatorToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 8 * 60 * 60,
      });
    }

    return response;
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ success: false, message: "Setup failed" }, { status: 500 });
  }
}
