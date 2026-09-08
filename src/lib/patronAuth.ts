import "server-only";

import crypto from "crypto";

export function patronSession(request: Request): { valid: boolean; email?: string } {
  const secret = process.env.PATRON_SESSION_SECRET;
  const token = request.headers.get("cookie")?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith("kairo_patron_session="))?.slice("kairo_patron_session=".length);
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

export function createVerifiedPatronToken(uid: string, email: string): string | null {
  const secret = process.env.PATRON_SESSION_SECRET;
  if (!secret || secret.length < 10) return null;
  const payload = Buffer.from(JSON.stringify({ uid, email: email.toLowerCase(), role: "patron", verified: true, iat: Date.now(), exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${crypto.createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
