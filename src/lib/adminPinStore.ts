/**
 * KAIRO Archive Server-Side Admin PIN Store
 * Holds authoritative administrator PIN hash on the server runtime.
 * Prevents client-side manipulation or injection of expected hashes.
 */

import crypto from "crypto";
import { DEFAULT_ADMIN_PIN, PIN_SALT } from "@/config/adminConfig";

declare global {
  var __kairo_server_pin_hash: string | undefined;
}

export function computePinHash(pin: string): string {
  return crypto.createHash("sha256").update(PIN_SALT + pin.trim()).digest("hex");
}

function getStoredPinHash(): string {
  if (!globalThis.__kairo_server_pin_hash) {
    globalThis.__kairo_server_pin_hash = computePinHash(DEFAULT_ADMIN_PIN);
  }
  return globalThis.__kairo_server_pin_hash;
}

export function verifyServerPin(pin: string): boolean {
  if (!pin || typeof pin !== "string") return false;
  const currentExpected = getStoredPinHash();
  const submittedHash = computePinHash(pin);

  const bufSubmitted = Buffer.from(submittedHash);
  const bufExpected = Buffer.from(currentExpected);

  if (bufSubmitted.length !== bufExpected.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufSubmitted, bufExpected);
}

export function updateServerPin(newPin: string): boolean {
  if (!newPin || newPin.trim().length < 4) return false;
  const newHash = computePinHash(newPin);
  globalThis.__kairo_server_pin_hash = newHash;
  return true;
}

export function getCurrentPinHash(): string {
  return getStoredPinHash();
}
