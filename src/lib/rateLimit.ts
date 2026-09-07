/**
 * KAIRO Archive Server-Side Rate Limiter
 * Provides sliding-window IP and identifier rate limiting for security-sensitive API routes.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

declare global {
  var __kairo_rate_limit_store: Map<string, RateLimitRecord> | undefined;
}

const rateLimitStore = globalThis.__kairo_rate_limit_store || new Map<string, RateLimitRecord>();
globalThis.__kairo_rate_limit_store = rateLimitStore;

/**
 * Periodically purge expired records to prevent memory leakage
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  const interval = setInterval(cleanupExpired, 5 * 60 * 1000);
  if (interval.unref) interval.unref();
}

/**
 * Resolves client IP address from standard proxy headers
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0].trim();
    if (ip) return ip;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  return "127.0.0.1";
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Checks and increments rate limit for a specific key
 * @param key Unique key (e.g. "otp:ip:1.2.3.4" or "pin:user@kairo.eg")
 * @param maxAttempts Maximum allowed requests within window
 * @param windowMs Time window in milliseconds
 */
export function checkRateLimitKey(
  key: string,
  maxAttempts: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || record.resetAt <= now) {
    // New or expired window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      limit: maxAttempts,
      remaining: maxAttempts - 1,
      resetSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= maxAttempts) {
    const resetSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      allowed: false,
      limit: maxAttempts,
      remaining: 0,
      resetSeconds,
    };
  }

  record.count += 1;
  const remaining = Math.max(0, maxAttempts - record.count);
  const resetSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));

  return {
    allowed: true,
    limit: maxAttempts,
    remaining,
    resetSeconds,
  };
}

/**
 * Resets rate limit for a specific key (e.g. upon successful authentication)
 */
export function resetRateLimitKey(key: string) {
  rateLimitStore.delete(key);
}
