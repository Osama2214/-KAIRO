import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { AUTHORIZED_ADMIN_EMAILS } from "@/config/adminConfig";

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  "kairo_master_curator_super_secret_hmac_2026_994827_kairo_archive";

function isCuratorAuthorized(token: string | null | undefined): boolean {
  if (!token || !token.includes(".")) return false;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now() || payload.role !== "admin") {
      return false;
    }
    return AUTHORIZED_ADMIN_EMAILS.some(
      (e) => e.trim().toLowerCase() === (payload.sub || "").toLowerCase()
    );
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Guard administrative API routes (except the verification endpoint itself)
  if (pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/verify-pin")) {
    const cookieToken = request.cookies.get("kairo_curator_session")?.value;
    const authHeader = request.headers.get("authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const token = cookieToken || bearerToken;

    if (!isCuratorAuthorized(token)) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED_CURATOR",
          message: "Access Denied: Master Curator administrative authorization required.",
        },
        { status: 401 }
      );
    }
  }

  // 2. Add hardened security headers to all responses
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, audio, video files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|webp|svg|gif|mp3|mp4)$).*)",
  ],
};
