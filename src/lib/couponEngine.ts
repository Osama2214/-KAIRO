import "server-only";

import { neon } from "@neondatabase/serverless";

/**
 * Curator-defined discount codes.
 *
 * Replaces the single hard-coded welcome coupon, which could only ever be one
 * private code per patron at a fixed 20% — the console's own "voucher code"
 * field was display text that discounted nothing, and the percentage a client
 * sent was ignored in favour of a constant. Here the console owns the code, the
 * wording, what it takes off, how long it runs and who may see it.
 *
 * Every decision that touches money is made in this file against the database.
 * The browser may stage a code; only `redeemCoupon` decides what it is worth,
 * and it does so in one statement so two checkouts cannot both claim the last
 * use of the same coupon.
 */

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;
let schemaReady: Promise<void> | null = null;

export interface Coupon {
  code: string;
  /** Shown to the shopper wherever the coupon appears. */
  label: string;
  /** Percentage off the merchandise subtotal, 0 when unused. */
  percentOff: number;
  /** Fixed amount off in EGP, 0 when unused. */
  amountOff: number;
  freeShipping: boolean;
  /** Null means "already running" / "no end". */
  startsAt: number | null;
  expiresAt: number | null;
  /** Null means unlimited; otherwise redemptions stop at this many. */
  maxTotalUses: number | null;
  /** How many times it has been redeemed, across every patron. */
  timesUsed: number;
  /** Whether it is advertised in the announcement bar. */
  announce: boolean;
  active: boolean;
  /** Restricts it to patrons with no previous order — how "welcome" is expressed. */
  newCustomersOnly: boolean;
}

/** What a coupon takes off a specific order. */
export interface CouponValue {
  percentOff: number;
  amountOff: number;
  freeShipping: boolean;
}

async function ensureSchema(): Promise<void> {
  if (!sql) throw new Error("DATABASE_URL is required for coupons.");
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS kairo_coupons (
          code TEXT PRIMARY KEY,
          label TEXT NOT NULL DEFAULT '',
          percent_off SMALLINT NOT NULL DEFAULT 0 CHECK (percent_off BETWEEN 0 AND 100),
          amount_off NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_off >= 0),
          free_shipping BOOLEAN NOT NULL DEFAULT FALSE,
          starts_at BIGINT,
          expires_at BIGINT,
          max_total_uses INTEGER CHECK (max_total_uses IS NULL OR max_total_uses > 0),
          announce BOOLEAN NOT NULL DEFAULT FALSE,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          new_customers_only BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      // One row per patron per coupon is what makes "once each" enforceable:
      // the primary key refuses the second attempt rather than the code doing
      // its own counting.
      await sql`
        CREATE TABLE IF NOT EXISTS kairo_coupon_redemptions (
          code TEXT NOT NULL,
          email TEXT NOT NULL,
          order_id TEXT NOT NULL,
          redeemed_at BIGINT NOT NULL,
          PRIMARY KEY (code, email)
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS kairo_coupon_redemptions_order_idx ON kairo_coupon_redemptions (order_id)`;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

type Row = Record<string, unknown>;

function toCoupon(row: Row): Coupon {
  return {
    code: String(row.code),
    label: String(row.label ?? ""),
    percentOff: Number(row.percent_off ?? 0),
    amountOff: Number(row.amount_off ?? 0),
    freeShipping: Boolean(row.free_shipping),
    startsAt: row.starts_at === null || row.starts_at === undefined ? null : Number(row.starts_at),
    expiresAt: row.expires_at === null || row.expires_at === undefined ? null : Number(row.expires_at),
    maxTotalUses:
      row.max_total_uses === null || row.max_total_uses === undefined ? null : Number(row.max_total_uses),
    timesUsed: Number(row.times_used ?? 0),
    announce: Boolean(row.announce),
    active: Boolean(row.active),
    newCustomersOnly: Boolean(row.new_customers_only),
  };
}

/** Every coupon, newest first — the console's list. */
export async function listCoupons(): Promise<Coupon[]> {
  await ensureSchema();
  const rows = await sql!`
    SELECT c.*, (SELECT COUNT(*) FROM kairo_coupon_redemptions r WHERE r.code = c.code) AS times_used
    FROM kairo_coupons c
    ORDER BY c.created_at DESC
  `;
  return rows.map(toCoupon);
}

/** The coupon a shopper should be told about, if any is running and advertised. */
export async function announcedCoupon(): Promise<Coupon | null> {
  await ensureSchema();
  const now = Date.now();
  const rows = await sql!`
    SELECT c.*, (SELECT COUNT(*) FROM kairo_coupon_redemptions r WHERE r.code = c.code) AS times_used
    FROM kairo_coupons c
    WHERE c.announce = TRUE AND c.active = TRUE
      AND (c.starts_at IS NULL OR c.starts_at <= ${now})
      AND (c.expires_at IS NULL OR c.expires_at > ${now})
    ORDER BY c.created_at DESC
    LIMIT 1
  `;
  if (!rows[0]) return null;
  const coupon = toCoupon(rows[0]);
  // A coupon that has run out is not worth advertising.
  if (coupon.maxTotalUses !== null && coupon.timesUsed >= coupon.maxTotalUses) return null;
  return coupon;
}

export type CouponCheck =
  | { ok: true; coupon: Coupon }
  | { ok: false; reason: string };

/**
 * Whether this patron could use this code right now — for the cart to preview
 * with. The answer is advisory: `redeemCoupon` decides again at checkout, since
 * anything could change in between.
 */
export async function checkCoupon(code: string, email: string | null): Promise<CouponCheck> {
  await ensureSchema();
  const clean = code.trim().toUpperCase();
  if (!clean) return { ok: false, reason: "Enter a voucher code." };

  const rows = await sql!`
    SELECT c.*, (SELECT COUNT(*) FROM kairo_coupon_redemptions r WHERE r.code = c.code) AS times_used
    FROM kairo_coupons c WHERE c.code = ${clean}
  `;
  if (!rows[0]) return { ok: false, reason: "That voucher code is not recognised." };

  const coupon = toCoupon(rows[0]);
  const now = Date.now();

  if (!coupon.active) return { ok: false, reason: "This voucher is no longer available." };
  if (coupon.startsAt !== null && coupon.startsAt > now) {
    return { ok: false, reason: "This voucher has not started yet." };
  }
  if (coupon.expiresAt !== null && coupon.expiresAt <= now) {
    return { ok: false, reason: "This voucher has expired." };
  }
  if (coupon.maxTotalUses !== null && coupon.timesUsed >= coupon.maxTotalUses) {
    return { ok: false, reason: "This voucher has been fully claimed." };
  }

  // Everything below is about a specific patron, so an anonymous cart gets the
  // benefit of the doubt and is told to sign in at checkout instead.
  if (!email) return { ok: true, coupon };

  const normalized = email.trim().toLowerCase();
  const already = await sql!`
    SELECT 1 FROM kairo_coupon_redemptions WHERE code = ${clean} AND email = ${normalized} LIMIT 1
  `;
  if (already.length) return { ok: false, reason: "You have already used this voucher." };

  if (coupon.newCustomersOnly) {
    const prior = await sql!`
      SELECT 1 FROM kairo_orders WHERE LOWER(customer_email) = ${normalized} LIMIT 1
    `;
    if (prior.length) return { ok: false, reason: "This voucher is for first orders only." };
  }

  return { ok: true, coupon };
}

/**
 * Claims the coupon for this patron and order, and returns what it is worth.
 *
 * The insert is the lock. Two orders racing for a patron's single use of a code
 * both try to write the same primary key, and only one succeeds; the total-use
 * cap is checked in the same statement against the rows already committed, so a
 * coupon capped at 100 cannot be redeemed 101 times by concurrent checkouts.
 */
export async function redeemCoupon(
  code: string,
  email: string,
  orderId: string
): Promise<CouponValue | null> {
  const check = await checkCoupon(code, email);
  if (!check.ok) return null;

  const clean = code.trim().toUpperCase();
  const normalized = email.trim().toLowerCase();
  const claimed = await sql!`
    INSERT INTO kairo_coupon_redemptions (code, email, order_id, redeemed_at)
    SELECT ${clean}, ${normalized}, ${orderId}, ${Date.now()}
    WHERE (
      SELECT max_total_uses FROM kairo_coupons WHERE code = ${clean}
    ) IS NULL OR (
      SELECT COUNT(*) FROM kairo_coupon_redemptions WHERE code = ${clean}
    ) < (
      SELECT max_total_uses FROM kairo_coupons WHERE code = ${clean}
    )
    ON CONFLICT (code, email) DO NOTHING
    RETURNING code
  `;
  if (!claimed.length) return null;

  return {
    percentOff: check.coupon.percentOff,
    amountOff: check.coupon.amountOff,
    freeShipping: check.coupon.freeShipping,
  };
}

/**
 * Hands a claim back when the order it was claimed for could not be saved.
 * Without it a server error would burn a patron's one use of a code on an order
 * that never existed.
 */
export async function releaseCoupon(orderId: string): Promise<void> {
  if (!orderId) return;
  await ensureSchema();
  await sql!`DELETE FROM kairo_coupon_redemptions WHERE order_id = ${orderId}`;
}

export interface CouponInput {
  code: string;
  label?: string;
  percentOff?: number;
  amountOff?: number;
  freeShipping?: boolean;
  startsAt?: number | null;
  expiresAt?: number | null;
  maxTotalUses?: number | null;
  announce?: boolean;
  active?: boolean;
  newCustomersOnly?: boolean;
}

/** Creates or updates a coupon from the console. */
export async function saveCoupon(input: CouponInput): Promise<{ ok: boolean; message: string }> {
  await ensureSchema();
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    return { ok: false, message: "Codes are 3-32 characters: letters, numbers, dashes or underscores." };
  }

  const percentOff = Math.max(0, Math.min(100, Math.round(Number(input.percentOff) || 0)));
  const amountOff = Math.max(0, Math.round((Number(input.amountOff) || 0) * 100) / 100);
  const freeShipping = Boolean(input.freeShipping);
  if (!percentOff && !amountOff && !freeShipping) {
    return { ok: false, message: "A voucher has to do something: a percentage, an amount, or free delivery." };
  }

  const startsAt = input.startsAt ?? null;
  const expiresAt = input.expiresAt ?? null;
  if (startsAt !== null && expiresAt !== null && expiresAt <= startsAt) {
    return { ok: false, message: "The end date has to come after the start date." };
  }

  await sql!`
    INSERT INTO kairo_coupons (
      code, label, percent_off, amount_off, free_shipping,
      starts_at, expires_at, max_total_uses, announce, active, new_customers_only
    ) VALUES (
      ${code}, ${input.label?.trim() ?? ""}, ${percentOff}, ${amountOff}, ${freeShipping},
      ${startsAt}, ${expiresAt}, ${input.maxTotalUses ?? null},
      ${Boolean(input.announce)}, ${input.active !== false}, ${Boolean(input.newCustomersOnly)}
    )
    ON CONFLICT (code) DO UPDATE SET
      label = EXCLUDED.label,
      percent_off = EXCLUDED.percent_off,
      amount_off = EXCLUDED.amount_off,
      free_shipping = EXCLUDED.free_shipping,
      starts_at = EXCLUDED.starts_at,
      expires_at = EXCLUDED.expires_at,
      max_total_uses = EXCLUDED.max_total_uses,
      announce = EXCLUDED.announce,
      active = EXCLUDED.active,
      new_customers_only = EXCLUDED.new_customers_only
  `;
  return { ok: true, message: `Voucher ${code} saved.` };
}

/**
 * Removes a coupon. Its redemption history stays: those rows are what explain
 * why past orders were discounted, and deleting them would leave an order
 * unable to account for its own total.
 */
export async function deleteCoupon(code: string): Promise<void> {
  await ensureSchema();
  await sql!`DELETE FROM kairo_coupons WHERE code = ${code.trim().toUpperCase()}`;
}
