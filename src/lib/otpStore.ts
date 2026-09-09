import "server-only";

import crypto from "crypto";
import { neon } from "@neondatabase/serverless";

/**
 * MANGA WORLD Archive OTP Store
 *
 * Codes live in Neon, not process memory. On Vercel `send-otp` and `verify-otp`
 * routinely execute on different lambda instances, so an in-memory map meant a
 * patron could receive a code and then be told "no active verification code
 * found" — registration and password reset failed at random. Every cold start
 * also silently discarded pending codes.
 *
 * Codes are stored as salted SHA-256 digests so a database read cannot be
 * replayed against a patron's inbox.
 */

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;
let schemaReady: Promise<void> | null = null;

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 45 * 1000;
const PREVIOUS_CODE_GRACE_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface OtpRecord {
  code_hash: string;
  previous_code_hash: string | null;
  previous_expires_at: string | number | null;
  expires_at: string | number;
  attempts: number;
  last_sent_at: string | number;
}

declare global {
  var __mangaworld_otp_store: Map<string, OtpRecord> | undefined;
}

const memoryStore = globalThis.__mangaworld_otp_store || new Map<string, OtpRecord>();
globalThis.__mangaworld_otp_store = memoryStore;

function digest(email: string, code: string): string {
  const secret = process.env.PATRON_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || "manga-world-otp";
  return crypto.createHmac("sha256", secret).update(`${email.toLowerCase()}:${code}`).digest("hex");
}

async function ensureSchema(): Promise<void> {
  if (!sql) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS kairo_otp_codes (
          email TEXT PRIMARY KEY,
          code_hash TEXT NOT NULL,
          previous_code_hash TEXT,
          previous_expires_at BIGINT,
          expires_at BIGINT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_sent_at BIGINT NOT NULL
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS kairo_otp_codes_expires_at_idx ON kairo_otp_codes (expires_at)`;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

async function readRecord(key: string): Promise<OtpRecord | null> {
  if (!sql) return memoryStore.get(key) || null;
  await ensureSchema();
  const rows = await sql`
    SELECT code_hash, previous_code_hash, previous_expires_at, expires_at, attempts, last_sent_at
    FROM kairo_otp_codes WHERE email = ${key}
  `;
  return (rows[0] as OtpRecord) || null;
}

/**
 * Stores an OTP for an email with a 45s resend throttle and 10min expiry.
 * The previous code stays valid for 5 minutes so out-of-order delivery does not
 * strand a patron holding a still-recent message.
 */
export async function saveOtp(email: string, code: string): Promise<{ success: boolean; message?: string; waitSec?: number }> {
  const key = email.toLowerCase().trim();
  const now = Date.now();
  const existing = await readRecord(key);

  if (existing && now - Number(existing.last_sent_at) < RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (now - Number(existing.last_sent_at))) / 1000);
    return { success: false, message: `Please wait ${waitSec} seconds before requesting a new code.`, waitSec };
  }

  const record: OtpRecord = {
    code_hash: digest(key, code),
    previous_code_hash: existing?.code_hash ?? null,
    previous_expires_at: existing ? now + PREVIOUS_CODE_GRACE_MS : null,
    expires_at: now + CODE_TTL_MS,
    attempts: 0,
    last_sent_at: now,
  };

  if (!sql) {
    memoryStore.set(key, record);
    return { success: true };
  }

  await ensureSchema();
  await sql`
    INSERT INTO kairo_otp_codes (email, code_hash, previous_code_hash, previous_expires_at, expires_at, attempts, last_sent_at)
    VALUES (${key}, ${record.code_hash}, ${record.previous_code_hash}, ${record.previous_expires_at},
            ${record.expires_at}, 0, ${record.last_sent_at})
    ON CONFLICT (email) DO UPDATE SET
      code_hash = EXCLUDED.code_hash,
      previous_code_hash = EXCLUDED.previous_code_hash,
      previous_expires_at = EXCLUDED.previous_expires_at,
      expires_at = EXCLUDED.expires_at,
      attempts = 0,
      last_sent_at = EXCLUDED.last_sent_at
  `;
  return { success: true };
}

async function discard(key: string): Promise<void> {
  memoryStore.delete(key);
  if (!sql) return;
  await ensureSchema();
  await sql`DELETE FROM kairo_otp_codes WHERE email = ${key}`;
}

async function bumpAttempts(key: string, record: OtpRecord): Promise<number> {
  const next = Number(record.attempts) + 1;
  if (!sql) {
    memoryStore.set(key, { ...record, attempts: next });
    return next;
  }
  await ensureSchema();
  const rows = await sql`
    UPDATE kairo_otp_codes SET attempts = attempts + 1 WHERE email = ${key} RETURNING attempts
  `;
  return rows[0] ? Number(rows[0].attempts) : next;
}

/**
 * Verifies a submitted code against the stored record, accepting the newest
 * code or the previous one inside its grace window. A verified code is deleted
 * so it cannot be replayed.
 */
export async function verifyOtp(email: string, inputCode: string): Promise<{ success: boolean; message?: string }> {
  const key = email.toLowerCase().trim();
  const record = await readRecord(key);

  if (!record) {
    return { success: false, message: "No active verification code found for this email. Please request a code." };
  }

  if (Date.now() > Number(record.expires_at)) {
    await discard(key);
    return { success: false, message: "Verification code has expired. Please request a new code." };
  }

  const attempts = await bumpAttempts(key, record);
  if (attempts > MAX_ATTEMPTS) {
    await discard(key);
    return { success: false, message: "Too many incorrect attempts. Code invalidated for security. Please request a new one." };
  }

  const cleanInput = inputCode.trim().replace(/\D/g, "");
  const submitted = digest(key, cleanInput);
  const matchesCurrent = crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(record.code_hash));
  const matchesPrevious = Boolean(
    record.previous_code_hash &&
      Date.now() < Number(record.previous_expires_at || 0) &&
      crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(record.previous_code_hash))
  );

  if (!matchesCurrent && !matchesPrevious) {
    const remaining = Math.max(0, MAX_ATTEMPTS - attempts);
    return {
      success: false,
      message: `Incorrect code. ${remaining} attempt(s) remaining. Make sure to use the latest code in your inbox.`,
    };
  }

  await discard(key);
  return { success: true };
}
