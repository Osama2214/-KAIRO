import "server-only";

import crypto from "crypto";

/**
 * Proof that this browser placed a given guest order.
 *
 * Guest checkout has no account, so without something server-signed the only
 * way to recognise a returning guest was to keep their order — name, phone,
 * delivery address — in localStorage. This cookie replaces that: it is
 * HttpOnly (JavaScript cannot read it), carries nothing but order references,
 * and lets /api/orders/lookup return the full record to the browser that
 * actually placed it while anyone else holding the reference sees only
 * shipping status.
 */

const COOKIE_NAME = "kairo_guest_orders";
const MAX_REFS = 20;
const TTL_MS = 90 * 24 * 60 * 60 * 1000;

export const GUEST_ORDER_COOKIE = COOKIE_NAME;
export const GUEST_ORDER_COOKIE_MAX_AGE = Math.floor(TTL_MS / 1000);

function secret(): string | null {
  const value = process.env.PATRON_SESSION_SECRET;
  return value && value.length >= 10 ? value : null;
}

function sign(payload: string, key: string): string {
  return crypto.createHmac("sha256", key).update(payload).digest("base64url");
}

/** Builds a signed cookie value covering `ids` (most recent first). */
export function createGuestOrderToken(ids: string[]): string | null {
  const key = secret();
  if (!key) return null;
  const unique = [...new Set(ids.filter(Boolean))].slice(0, MAX_REFS);
  if (unique.length === 0) return null;
  const payload = Buffer.from(
    JSON.stringify({ ids: unique, exp: Date.now() + TTL_MS })
  ).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

/** Returns the order references this browser can prove it placed. */
export function readGuestOrderToken(token: string | undefined): string[] {
  const key = secret();
  if (!key || !token) return [];
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return [];

  const expected = Buffer.from(sign(payload, key));
  const submitted = Buffer.from(signature);
  if (submitted.length !== expected.length || !crypto.timingSafeEqual(submitted, expected)) return [];

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!decoded.exp || decoded.exp < Date.now() || !Array.isArray(decoded.ids)) return [];
    return decoded.ids.filter((id: unknown): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

/** Reads the cookie straight off a request. */
export function guestOrderIdsFromRequest(request: Request): string[] {
  const raw = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  return readGuestOrderToken(raw);
}
