import "server-only";

import crypto from "crypto";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;
let schemaReady: Promise<void> | null = null;

export type WelcomeCoupon = { code: string; expiresAt: number; used: boolean; discountPercent: number };

async function ensureSchema(): Promise<void> {
  if (!sql) throw new Error("DATABASE_URL is required for server-issued coupons.");
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS kairo_welcome_coupons (
          code TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          discount_percent SMALLINT NOT NULL DEFAULT 20 CHECK (discount_percent BETWEEN 1 AND 100),
          expires_at BIGINT NOT NULL,
          used_at BIGINT,
          used_order_id TEXT
        )
      `;
    })().catch((error) => { schemaReady = null; throw error; });
  }
  await schemaReady;
}

function normalize(row: Record<string, unknown>): WelcomeCoupon {
  return { code: String(row.code), expiresAt: Number(row.expires_at), used: row.used_at !== null && row.used_at !== undefined, discountPercent: Number(row.discount_percent) };
}

export async function getOrCreateWelcomeCoupon(email: string): Promise<WelcomeCoupon> {
  await ensureSchema();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await sql!`SELECT code, expires_at, used_at, discount_percent FROM kairo_welcome_coupons WHERE email = ${normalizedEmail}`;
  if (existing[0]) return normalize(existing[0]);

  const coupon = `KAIRO-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  try {
    const created = await sql!`
      INSERT INTO kairo_welcome_coupons (code, email, expires_at)
      VALUES (${coupon}, ${normalizedEmail}, ${expiresAt})
      RETURNING code, expires_at, used_at, discount_percent
    `;
    return normalize(created[0]);
  } catch {
    const concurrent = await sql!`SELECT code, expires_at, used_at, discount_percent FROM kairo_welcome_coupons WHERE email = ${normalizedEmail}`;
    if (!concurrent[0]) throw new Error("Unable to issue welcome coupon.");
    return normalize(concurrent[0]);
  }
}

export async function redeemWelcomeCoupon(code: string, email: string, orderId: string): Promise<number | null> {
  await ensureSchema();
  const now = Date.now();
  const rows = await sql!`
    UPDATE kairo_welcome_coupons
    SET used_at = ${now}, used_order_id = ${orderId}
    WHERE code = ${code.trim().toUpperCase()} AND email = ${email.trim().toLowerCase()}
      AND used_at IS NULL AND expires_at > ${now}
    RETURNING discount_percent
  `;
  return rows[0] ? Number(rows[0].discount_percent) : null;
}
