import { NextResponse } from "next/server";
import crypto from "crypto";
import { checkRateLimitKey, getClientIp } from "@/lib/rateLimit";
import { AUTHORIZED_ADMIN_EMAILS } from "@/config/adminConfig";

const PATRON_SECRET =
  process.env.PATRON_SESSION_SECRET ||
  "kairo_patron_secret_signing_key_2026_salt_8832941_tokyo_archive";

function computeClientFingerprint(request: Request): string {
  const ua = request.headers.get("user-agent") || "unknown";
  return crypto.createHash("sha256").update(ua).digest("hex").slice(0, 16);
}

function generatePatronToken(uid: string, email: string, request: Request): string {
  const payload = {
    uid,
    email: email.toLowerCase(),
    role: "patron", // Strictly patron, never admin
    fp: computeClientFingerprint(request),
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", PATRON_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function verifyPatronToken(token: string, request: Request): { valid: boolean; user?: { uid: string; email: string } } {
  if (!token || !token.includes(".")) return { valid: false };
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return { valid: false };

  const expectedSignature = crypto
    .createHmac("sha256", PATRON_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false };
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) {
      return { valid: false };
    }

    // Anti-Cookie Theft: Fingerprint match
    const currentFp = computeClientFingerprint(request);
    if (payload.fp && payload.fp !== currentFp) {
      return { valid: false };
    }

    return { valid: true, user: { uid: payload.uid, email: payload.email } };
  } catch {
    return { valid: false };
  }
}

/**
 * Establish secure HttpOnly signed session
 */
export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    // 1. Rate limit session establishment: max 10 per 5 minutes per IP
    const rateCheck = checkRateLimitKey(`session:ip:${clientIp}`, 10, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: "Too many session attempts. Please wait." },
        { status: 429 }
      );
    }

    // 2. Strict Origin / Host verification
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      const cleanOrigin = origin.replace(/^https?:\/\//, "");
      if (cleanOrigin !== host && !cleanOrigin.startsWith(host)) {
        return NextResponse.json(
          { success: false, message: "Cross-origin session creation forbidden." },
          { status: 403 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));
    const uid = (body.uid || "").toString().trim();
    const email = (body.email || "").toString().trim().toLowerCase();

    if (!uid || !email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Valid User ID and email are required." },
        { status: 400 }
      );
    }

    // 3. Prevent Privilege Escalation: Admin emails CANNOT be claimed via patron session
    const isAdminEmail = AUTHORIZED_ADMIN_EMAILS.some((e) => e.toLowerCase() === email);
    if (isAdminEmail) {
      return NextResponse.json(
        {
          success: false,
          message: "Curator administrator credentials cannot be issued through patron session endpoint. Please authenticate via /admin PIN.",
        },
        { status: 403 }
      );
    }

    const token = generatePatronToken(uid, email, request);
    const response = NextResponse.json({
      success: true,
      user: { uid, email },
      message: "Patron session authenticated securely.",
    });

    response.cookies.set("kairo_patron_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json({ success: false, message: "Failed to establish session." }, { status: 500 });
  }
}

/**
 * Check active HttpOnly session status
 */
export async function GET(request: Request) {
  try {
    const cookieToken = request.headers.get("cookie")?.split(";")
      .find((c) => c.trim().startsWith("kairo_patron_session="))
      ?.split("=")[1];

    if (!cookieToken) {
      return NextResponse.json({ valid: false, message: "No active patron session." }, { status: 401 });
    }

    const verification = verifyPatronToken(cookieToken, request);
    if (!verification.valid) {
      return NextResponse.json({ valid: false, message: "Invalid or expired session token." }, { status: 401 });
    }

    return NextResponse.json({
      valid: true,
      user: verification.user,
      message: "Session authenticated.",
    });
  } catch {
    return NextResponse.json({ valid: false, message: "Session verification error." }, { status: 500 });
  }
}

/**
 * Logout and completely destroy session cookies
 */
export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: "Patron session destroyed.",
  });

  response.cookies.set("kairo_patron_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
