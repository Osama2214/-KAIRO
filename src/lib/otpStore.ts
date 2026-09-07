/**
 * KAIRO Archive In-Memory OTP Store
 * Provides secure server-side OTP generation, storage, rate-limiting, and verification.
 */

interface OtpRecord {
  code: string;
  previousCode?: string;
  previousCodeExpiresAt?: number;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

declare global {
  var __kairo_otp_store: Map<string, OtpRecord> | undefined;
}

const otpStore = globalThis.__kairo_otp_store || new Map<string, OtpRecord>();
globalThis.__kairo_otp_store = otpStore;

/**
 * Saves an OTP for an email with 45s resend throttling and 10min expiry.
 * Preserves the previous code for a 5-minute grace period to avoid out-of-order email issues.
 */
export function saveOtp(email: string, code: string): { success: boolean; message?: string; waitSec?: number } {
  const key = email.toLowerCase().trim();
  const existing = otpStore.get(key);
  const now = Date.now();

  // Resend cooldown check: 45 seconds
  if (existing && now - existing.lastSentAt < 45 * 1000) {
    const waitSec = Math.ceil((45 * 1000 - (now - existing.lastSentAt)) / 1000);
    return {
      success: false,
      message: `Please wait ${waitSec} seconds before requesting a new code.`,
      waitSec,
    };
  }

  const previousCode = existing?.code;
  const previousCodeExpiresAt = existing ? now + 5 * 60 * 1000 : undefined; // 5 min grace

  otpStore.set(key, {
    code,
    previousCode,
    previousCodeExpiresAt,
    expiresAt: now + 10 * 60 * 1000, // 10 minutes expiry
    attempts: 0, // Fresh attempts for new code
    lastSentAt: now,
  });

  // Masked log for security
  if (process.env.NODE_ENV !== "production") {
    console.log(`[OTP STORE] Generated OTP for ${key} (Code dispatched securely)`);
  }
  return { success: true };
}

/**
 * Verifies an entered OTP code against the stored record.
 * Accepts either the newest code or the previous code if within 5-minute grace period.
 */
export function verifyOtp(email: string, inputCode: string): { success: boolean; message?: string } {
  const key = email.toLowerCase().trim();
  const entry = otpStore.get(key);

  if (!entry) {
    return {
      success: false,
      message: "No active verification code found for this email. Please request a code.",
    };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key);
    return {
      success: false,
      message: "Verification code has expired. Please request a new code.",
    };
  }

  entry.attempts += 1;

  if (entry.attempts > 5) {
    otpStore.delete(key);
    return {
      success: false,
      message: "Too many incorrect attempts. Code invalidated for security. Please request a new one.",
    };
  }

  const cleanInput = inputCode.trim().replace(/\D/g, "");
  const isCurrentMatch = entry.code === cleanInput;
  const isPreviousMatch = !!(
    entry.previousCode &&
    entry.previousCode === cleanInput &&
    Date.now() < (entry.previousCodeExpiresAt || 0)
  );

  if (!isCurrentMatch && !isPreviousMatch) {
    const remaining = Math.max(0, 5 - entry.attempts);
    return {
      success: false,
      message: `Incorrect code. ${remaining} attempt(s) remaining. Make sure to use the latest code in your inbox.`,
    };
  }

  // Code is verified! Remove from store so it cannot be re-used
  otpStore.delete(key);
  return { success: true };
}
