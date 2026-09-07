/**
 * KAIRO Security & Cryptography Utilities
 * Provides:
 * - SHA-256 salted password hashing
 * - Secure Cookie session management (Strict SameSite, Secure)
 * - XSS prevention & HTML escaping for DOM / iframe rendering
 * - Input sanitization & validation
 * - Brute-force protection & rate limiting
 */

import { PIN_SALT } from "@/config/adminConfig";

const SALT = "kairo_patron_sec_salt_2026_";
const RATE_LIMIT_KEY = "kairo_auth_rate_limit";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000; // 60 seconds lockout after 5 consecutive failures

/**
 * Computes a SHA-256 hash of a string with a fixed cryptographic salt
 */
export async function hashPassword(password: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    // Deterministic fallback for non-crypto / SSR contexts
    let hash = 0;
    const str = SALT + password;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `kro_h_${Math.abs(hash)}`;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(SALT + password);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Sets a secure session cookie backed by server-side HttpOnly cookie
 */
export async function setSessionCookie(userId: string, email: string, days = 7) {
  const cleanEmail = email.toLowerCase().trim();

  // 1. Establish hardened HttpOnly cookie via server API
  if (typeof fetch !== "undefined") {
    try {
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: userId, email: cleanEmail }),
      });
    } catch {
      // Offline fallback
    }
  }

  // 2. Client-side state fallback
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  
  const payload = {
    uid: userId,
    email: cleanEmail,
    iat: Date.now(),
    exp: expires.getTime(),
  };
  
  const token = typeof window !== "undefined" && window.btoa 
    ? window.btoa(encodeURIComponent(JSON.stringify(payload))) 
    : "";

  document.cookie = `kairo_session=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict${isSecure ? "; Secure" : ""}`;
}

/**
 * Clears both client and server session cookies thoroughly upon logout
 */
export async function clearSessionCookie() {
  // 1. Destroy server-side HttpOnly cookies for both patron and curator
  if (typeof fetch !== "undefined") {
    try {
      await Promise.allSettled([
        fetch("/api/auth/session", { method: "DELETE" }),
        fetch("/api/admin/verify-session", { method: "DELETE" }),
      ]);
    } catch {
      // Ignore network errors on logout
    }
  }

  // 2. Clear client-accessible cookies
  if (typeof document === "undefined") return;
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `kairo_session=; Max-Age=0; path=/; SameSite=Strict; expires=Thu, 01 Jan 1970 00:00:00 GMT${isSecure ? "; Secure" : ""}`;
  document.cookie = `kairo_curator_session=; Max-Age=0; path=/; SameSite=Strict; expires=Thu, 01 Jan 1970 00:00:00 GMT${isSecure ? "; Secure" : ""}`;
}

/**
 * Reads and verifies the current session cookie
 */
export function getSessionCookie(): { uid: string; email: string; exp: number } | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, val] = cookie.trim().split("=");
    if (name === "kairo_session" && val) {
      try {
        const decoded = decodeURIComponent(atob(val));
        const parsed = JSON.parse(decoded);
        if (parsed.exp && parsed.exp > Date.now()) {
          return parsed;
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Escapes characters to prevent HTML/XSS injection when interpolating strings into HTML
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Strips dangerous HTML control tags from raw user text
 */
export function sanitizeInput(str: string): string {
  if (!str) return "";
  return str
    .replace(/<[^>]*>?/gm, "") // remove all HTML tags
    .replace(/javascript:/gi, "") // remove javascript protocol
    .trim();
}

/**
 * Validates password strength (min 8 characters, letters & digits)
 */
export function validatePassword(password: string): { isValid: boolean; valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, valid: false, message: "Password must be at least 8 characters long." };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { isValid: false, valid: false, message: "Password must contain both letters and numbers." };
  }
  return { isValid: true, valid: true };
}

/**
 * Validates RFC-compliant email address format
 */
export function validateEmail(email: string): boolean {
  if (!email || !email.trim()) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Checks if an email is currently rate-limited due to too many failed attempts
 */
export function checkRateLimit(email: string): { allowed: boolean; remainingSeconds?: number } {
  if (typeof window === "undefined") return { allowed: true };
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return { allowed: true };
    const records = JSON.parse(raw);
    const key = email.toLowerCase().trim();
    const record = records[key];

    if (record && record.lockedUntil && record.lockedUntil > Date.now()) {
      const remainingSeconds = Math.ceil((record.lockedUntil - Date.now()) / 1000);
      return { allowed: false, remainingSeconds };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

/**
 * Records a failed login attempt and locks account if threshold exceeded
 */
export function recordFailedAttempt(email: string): {
  locked: boolean;
  remainingAttempts: number;
  remainingSeconds?: number;
} {
  if (typeof window === "undefined") return { locked: false, remainingAttempts: MAX_ATTEMPTS };
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const records = raw ? JSON.parse(raw) : {};
    const key = email.toLowerCase().trim();
    const record = records[key] || { attempts: 0 };

    if (record.lockedUntil && record.lockedUntil <= Date.now()) {
      record.attempts = 0;
      delete record.lockedUntil;
    }

    record.attempts = (record.attempts || 0) + 1;

    if (record.attempts >= MAX_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCKOUT_MS;
      records[key] = record;
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(records));
      return {
        locked: true,
        remainingAttempts: 0,
        remainingSeconds: Math.ceil(LOCKOUT_MS / 1000),
      };
    }

    records[key] = record;
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(records));
    return {
      locked: false,
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - record.attempts),
    };
  } catch {
    return { locked: false, remainingAttempts: MAX_ATTEMPTS };
  }
}

/**
 * Resets failed attempts after a successful login
 */
export function resetRateLimit(email: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return;
    const records = JSON.parse(raw);
    delete records[email.toLowerCase().trim()];
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

export interface EmailValidationResult {
  valid: boolean;
  message?: string;
  suggestion?: string;
  reason?: string;
}

/**
 * Validates real email existence via DNS MX lookup and disposable domain check
 */
export async function verifyEmailAddress(email: string): Promise<EmailValidationResult> {
  const cleanEmail = (email || "").trim();
  if (!cleanEmail) {
    return { valid: false, message: "Please enter an email address." };
  }

  // Fast client-side regex check first
  if (!validateEmail(cleanEmail)) {
    return {
      valid: false,
      message: "Invalid email format. Must follow name@domain.com.",
    };
  }

  try {
    const res = await fetch("/api/validate-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail }),
    });

    const data: EmailValidationResult = await res.json();
    return data;
  } catch {
    // Fallback if offline
    return { valid: true };
  }
}

/**
 * Dispatches an OTP verification code to the given email
 */
export async function sendOtpEmail(
  email: string,
  purpose: "REGISTER" | "RESET_PASSWORD" = "REGISTER"
): Promise<{ success: boolean; message: string; code?: string; waitSec?: number }> {
  try {
    const res = await fetch("/api/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), purpose }),
    });
    const data = await res.json();
    return data;
  } catch {
    return { success: false, message: "Network error sending verification code." };
  }
}

/**
 * Verifies the 6-digit OTP code against the server
 */
export async function verifyOtpCode(email: string, code: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
    });
    const data = await res.json();
    return data;
  } catch {
    return { success: false, message: "Network error verifying code." };
  }
}

/**
 * Computes a SHA-256 hash of an admin PIN with salt
 */
export async function hashAdminPin(pin: string): Promise<string> {
  const clean = pin.trim();
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    let hash = 0;
    const str = PIN_SALT + clean;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `kro_pin_${Math.abs(hash)}`;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(PIN_SALT + clean);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface AdminPinVerificationResult {
  success: boolean;
  message?: string;
  token?: string;
  pinHash?: string;
  locked?: boolean;
  lockedUntil?: number;
  remainingAttempts?: number;
  remainingSec?: number;
}

/**
 * Verifies admin PIN securely through the server API with brute-force protection
 */
export async function verifyAdminPinWithServer(
  email: string,
  pin: string,
  _deprecatedHash?: string
): Promise<AdminPinVerificationResult> {
  try {
    const res = await fetch("/api/admin/verify-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        pin: pin.trim(),
      }),
    });
    const data = await res.json();
    return data;
  } catch {
    return {
      success: false,
      message: "Network error connecting to security server. Please try again.",
    };
  }
}

/**
 * Updates administrator Security PIN via authenticated server endpoint
 */
export async function changeAdminPinWithServer(
  currentPin: string,
  newPin: string
): Promise<{ success: boolean; message: string; newPinHash?: string }> {
  try {
    const res = await fetch("/api/admin/change-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPin: currentPin.trim(),
        newPin: newPin.trim(),
      }),
    });
    const data = await res.json();
    return data;
  } catch {
    return {
      success: false,
      message: "Network error updating Security PIN. Please try again.",
    };
  }
}

