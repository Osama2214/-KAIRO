/**
 * KAIRO Archive Server-Side Admin PIN Store
 * Holds authoritative administrator PIN hash on the server runtime.
 * Prevents client-side manipulation or injection of expected hashes.
 */

import crypto from "crypto";
import { PIN_SALT } from "@/config/adminConfig";

declare global {
  var __kairo_server_pin_hash: string | undefined;
}

export function computePinHash(pin: string): string {
  return crypto.createHash("sha256").update(PIN_SALT + pin.trim()).digest("hex");
}

function getStoredPinHash(): string {
  const configuredPin = process.env.ADMIN_PIN;
  if (!configuredPin || configuredPin.length < 10) {
    throw new Error("ADMIN_PIN must be configured as a 10+ character Vercel Secret.");
  }
  if (!globalThis.__kairo_server_pin_hash) {
    globalThis.__kairo_server_pin_hash = computePinHash(configuredPin);
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

export function updateServerPin(_newPin: string): boolean {
  void _newPin;
  return false;
}

export function getCurrentPinHash(): string {
  return getStoredPinHash();
}
