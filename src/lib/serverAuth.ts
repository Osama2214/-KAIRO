import "server-only";

import crypto from "crypto";
import { AUTHORIZED_ADMIN_EMAILS } from "@/config/adminConfig";

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

function isAuthorizedEmail(email: unknown): email is string {
  return typeof email === "string" && AUTHORIZED_ADMIN_EMAILS.some(
    (allowed) => allowed.trim().toLowerCase() === email.trim().toLowerCase()
  );
}

export function createCuratorToken(email: string, request: Request): string | null {
  const secret = sessionSecret();
  if (!secret || !isAuthorizedEmail(email)) return null;

  const payload = Buffer.from(JSON.stringify({
    sub: email.toLowerCase(), role: "admin", fp: fingerprint(request),
    iat: Date.now(), exp: Date.now() + SESSION_DURATION_MS,
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyCuratorToken(token: string | null | undefined, request: Request): { valid: boolean; email?: string } {
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
    if (decoded.role !== "admin" || !decoded.exp || decoded.exp < Date.now() || decoded.fp !== fingerprint(request) || !isAuthorizedEmail(decoded.sub)) {
      return { valid: false };
    }
    return { valid: true, email: decoded.sub };
  } catch {
    return { valid: false };
  }
}

export function curatorSession(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  return verifyCuratorToken(token, request);
}

/** Reject cross-site state-changing browser requests. */
export function isTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  return Boolean(host) && origin === `${protocol}://${host}`;
}

export function noStoreJson(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...(init?.headers || {}) },
  });
}
