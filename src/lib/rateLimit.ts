import "server-only";

import { neon } from "@neondatabase/serverless";

/**
 * ANIMEVERSE Archive Server-Side Rate Limiter
 *
 * Counters live in Neon rather than process memory. On Vercel each request may
 * land on a different lambda instance and every cold start begins with an empty
 * map, so an in-memory limiter let brute-force attempts through simply by
 * spreading across instances. The in-memory path below remains only as a local
 * development fallback when DATABASE_URL is unset.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

declare global {
  var __animeverse_rate_limit_store: Map<string, RateLimitRecord> | undefined;
}

const memoryStore = globalThis.__animeverse_rate_limit_store || new Map<string, RateLimitRecord>();
globalThis.__animeverse_rate_limit_store = memoryStore;

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;
let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (!sql) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS kairo_rate_limits (
          key TEXT PRIMARY KEY,
          count INTEGER NOT NULL,
          reset_at BIGINT NOT NULL
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS kairo_rate_limits_reset_at_idx ON kairo_rate_limits (reset_at)`;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function cleanupExpiredMemory() {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (record.resetAt <= now) memoryStore.delete(key);
  }
}

if (typeof setInterval !== "undefined") {
  const interval = setInterval(cleanupExpiredMemory, 5 * 60 * 1000);
  if (interval.unref) interval.unref();
}

/**
 * Resolves client IP address from headers the hosting platform sets itself.
 */
export function getClientIp(request: Request): string {
  // The former first choice here was `cf-connecting-ip`, which this
  // deployment's edge never writes — so a caller could send a fresh value on
  // every request and get a fresh bucket each time, defeating the limiter.
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    const ip = vercelIp.split(",")[0].trim();
    if (ip) return ip;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // Vercel rewrites x-forwarded-for, so its first entry is the true client.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0].trim();
    if (ip) return ip;
  }

  return "unknown";
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

function result(count: number, resetAt: number, maxAttempts: number, now: number): RateLimitResult {
  const resetSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
  return {
    allowed: count <= maxAttempts,
    limit: maxAttempts,
    remaining: Math.max(0, maxAttempts - count),
    resetSeconds,
  };
}

function checkInMemory(key: string, maxAttempts: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || record.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return result(1, now + windowMs, maxAttempts, now);
  }

  if (record.count >= maxAttempts) return result(maxAttempts + 1, record.resetAt, maxAttempts, now);

  record.count += 1;
  return result(record.count, record.resetAt, maxAttempts, now);
}

/**
 * Atomically increments the counter for a key and reports whether the caller is
 * still within the window.
 *
 * @param key Unique key (e.g. "login:ip:1.2.3.4" or "pin:email:user@animeverse.eg")
 * @param maxAttempts Maximum allowed requests within the window
 * @param windowMs Window length in milliseconds
 */
export async function checkRateLimitKey(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  if (!sql) return checkInMemory(key, maxAttempts, windowMs);

  try {
    await ensureSchema();
    // A single statement so concurrent requests cannot both read a stale count.
    const rows = await sql`
      INSERT INTO kairo_rate_limits (key, count, reset_at)
      VALUES (${key}, 1, ${now + windowMs})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN kairo_rate_limits.reset_at <= ${now} THEN 1 ELSE kairo_rate_limits.count + 1 END,
        reset_at = CASE WHEN kairo_rate_limits.reset_at <= ${now} THEN ${now + windowMs} ELSE kairo_rate_limits.reset_at END
      RETURNING count, reset_at
    `;
    const row = rows[0];
    if (!row) return checkInMemory(key, maxAttempts, windowMs);
    return result(Number(row.count), Number(row.reset_at), maxAttempts, now);
  } catch (error) {
    console.error("Rate limit store unavailable, falling back to memory:", error);
    return checkInMemory(key, maxAttempts, windowMs);
  }
}

/**
 * Clears a key's counter, e.g. after a successful authentication.
 */
export async function resetRateLimitKey(key: string): Promise<void> {
  memoryStore.delete(key);
  if (!sql) return;
  try {
    await ensureSchema();
    await sql`DELETE FROM kairo_rate_limits WHERE key = ${key}`;
  } catch (error) {
    console.error("Failed to reset rate limit key:", error);
  }
}
