import "server-only";

import crypto from "crypto";

const COOKIE_NAME = "kairo_patron_session";

/** Core token verification — works with any token string */
export function verifyPatronToken(token: string | undefined): { valid: boolean; email?: string } {
  const secret = process.env.PATRON_SESSION_SECRET;
  if (!secret || secret.length < 10 || !token) return { valid: false };
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return { valid: false };
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return { valid: false };
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (decoded.role !== "patron" || !decoded.verified || !decoded.exp || decoded.exp < Date.now() || typeof decoded.email !== "string") return { valid: false };
    return { valid: true, email: decoded.email.toLowerCase() };
  } catch {
    return { valid: false };
  }
}

/**
 * PRIMARY: Read session using Next.js cookies() API.
 * This is the correct App Router approach — always use this in route handlers.
 */
export async function patronSessionFromCookies(): Promise<{ valid: boolean; email?: string }> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return verifyPatronToken(token);
}

/** LEGACY: Read session from raw Request headers (kept for middleware compatibility) */
export function patronSession(request: Request): { valid: boolean; email?: string } {
  const token = request.headers.get("cookie")?.split(";").map((p) => p.trim())
    .find((p) => p.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  return verifyPatronToken(token);
}

export function createVerifiedPatronToken(uid: string, email: string): string | null {
  const secret = process.env.PATRON_SESSION_SECRET;
  if (!secret || secret.length < 10) return null;
  const payload = Buffer.from(JSON.stringify({
    uid,
    email: email.toLowerCase(),
    role: "patron",
    verified: true,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })).toString("base64url");
  return `${payload}.${crypto.createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
