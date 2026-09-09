import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { isAuthorizedAdminEmail } from "@/config/adminConfig";

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;

function isCuratorAuthorized(token: string | null | undefined): boolean {
  if (!SESSION_SECRET || SESSION_SECRET.length < 32 || !token || !token.includes(".")) return false;
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
    return isAuthorizedAdminEmail(payload.sub);
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Guard administrative and order-data API routes (except PIN verification itself).
  const isProtectedOrderOperation = pathname === "/api/orders" && request.method !== "POST";
  if ((pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/verify-pin")) || isProtectedOrderOperation) {
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
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Google Identity Services completes sign-in through a cross-origin popup.
  // This preserves same-origin isolation while allowing the popup to return its result.
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
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
