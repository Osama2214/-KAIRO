import { NextResponse } from "next/server";
import crypto from "crypto";
import { AUTHORIZED_ADMIN_EMAILS } from "@/config/adminConfig";

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  "kairo_master_curator_super_secret_hmac_2026_994827_kairo_archive";

function computeClientFingerprint(request: Request): string {
  const ua = request.headers.get("user-agent") || "unknown";
  return crypto.createHash("sha256").update(ua).digest("hex").slice(0, 16);
}

function verifyCuratorToken(token: string, request: Request): { valid: boolean; email?: string } {
  if (!token || !token.includes(".")) return { valid: false };

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return { valid: false };

  const expectedSignature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  // Constant-time comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return { valid: false };
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return { valid: false };
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) {
      return { valid: false };
    }
    if (payload.role !== "admin") {
      return { valid: false };
    }

    // Anti-Session Hijacking Fingerprint Check:
    // Verify client user-agent hash matches token payload
    const currentFp = computeClientFingerprint(request);
    if (payload.fp && payload.fp !== currentFp) {
      return { valid: false };
    }

    const isAuthorized = AUTHORIZED_ADMIN_EMAILS.some(
      (e) => e.trim().toLowerCase() === (payload.sub || "").toLowerCase()
    );
    if (!isAuthorized) {
      return { valid: false };
    }

    return { valid: true, email: payload.sub };
  } catch {
    return { valid: false };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const authHeader = request.headers.get("authorization") || "";
    const cookieToken = request.headers.get("cookie")?.split(";")
      .find((c) => c.trim().startsWith("kairo_curator_session="))
      ?.split("=")[1];

    const token =
      body.token ||
      (authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null) ||
      cookieToken;

    if (!token) {
      return NextResponse.json({ valid: false, message: "No token provided." }, { status: 401 });
    }

    const verification = verifyCuratorToken(token, request);
    if (!verification.valid) {
      return NextResponse.json(
        { valid: false, message: "Invalid, tampered, or expired curator session." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: verification.email,
      message: "Valid curator session.",
    });
  } catch {
    return NextResponse.json(
      { valid: false, message: "Session check failed." },
      { status: 500 }
    );
  }
}

/**
 * Log out curator and purge cookie
 */
export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: "Curator session terminated.",
  });

  response.cookies.set("kairo_curator_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
