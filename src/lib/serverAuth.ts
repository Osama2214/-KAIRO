import "server-only";

import crypto from "crypto";
import { isAuthorizedAdminEmail } from "@/config/adminConfig";
import { getAdminSessionVersion } from "@/lib/adminSecurityStore";

const SESSION_COOKIE = "kairo_curator_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

function sessionSecret(): string | null {
  const value = process.env.ADMIN_SESSION_SECRET;
  return value && value.length >= 32 ? value : null;
}

function fingerprint(request: Request): string {
  return crypto
    .createHash("sha256")
    .update(request.headers.get("user-agent") || "unknown")
    .digest("hex")
    .slice(0, 16);
}

const isAuthorizedEmail = isAuthorizedAdminEmail;

export async function createCuratorToken(email: string, request: Request): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret || !isAuthorizedEmail(email)) return null;
  const sessionVersion = await getAdminSessionVersion();

  const payload = Buffer.from(JSON.stringify({
    sub: email.toLowerCase(), role: "admin", fp: fingerprint(request),
    iat: Date.now(), exp: Date.now() + SESSION_DURATION_MS, sv: sessionVersion,
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export async function verifyCuratorToken(token: string | null | undefined, request: Request): Promise<{ valid: boolean; email?: string }> {
  const secret = sessionSecret();
  if (!secret || !token) return { valid: false };
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return { valid: false };
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const submitted = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (submitted.length !== expectedBuffer.length || !crypto.timingSafeEqual(submitted, expectedBuffer)) return { valid: false };

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (decoded.role !== "admin" || !decoded.exp || decoded.exp < Date.now() || decoded.fp !== fingerprint(request) || !isAuthorizedEmail(decoded.sub) || decoded.sv !== await getAdminSessionVersion()) {
      return { valid: false };
    }
    return { valid: true, email: decoded.sub };
  } catch {
    return { valid: false };
  }
}

export async function curatorSession(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  return verifyCuratorToken(token, request);
}

/** Reject cross-site state-changing browser requests with strict origin verification. */
export function isTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";

  const cleanOrigin = origin.trim().replace(/\/+$/, "");
  const allowed = new Set<string>([
    "https://manga-world-rosy-five.vercel.app",
  ]);

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (configured) allowed.add(configured);

  const vercelUrl = process.env.VERCEL_URL?.trim().replace(/\/+$/, "");
  if (vercelUrl) {
    allowed.add(`https://${vercelUrl.replace(/^https?:\/\//, "")}`);
  }

  // Development origins
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:3000");
    allowed.add("http://127.0.0.1:3000");
  }

  if (allowed.has(cleanOrigin)) return true;

  // Fallback to verified forwarding host matching
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  return Boolean(host) && cleanOrigin === `${protocol}://${host}`;
}

export function noStoreJson(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...(init?.headers || {}) },
  });
}
