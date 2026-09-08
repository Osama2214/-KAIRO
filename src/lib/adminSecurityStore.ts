import "server-only";

import crypto from "crypto";
import { neon } from "@neondatabase/serverless";

type SecurityState = { pin_hash: string; session_version: number };

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;
let schemaReady: Promise<void> | null = null;

function hashPin(pin: string, salt = crypto.randomBytes(16)): string {
  const digest = crypto.scryptSync(pin, salt, 64);
  return `scrypt$${salt.toString("hex")}$${digest.toString("hex")}`;
}

function matchesPin(pin: string, storedHash: string): boolean {
  const [algorithm, saltHex, digestHex] = storedHash.split("$");
  if (algorithm !== "scrypt" || !saltHex || !digestHex) return false;
  const expected = Buffer.from(digestHex, "hex");
  const derived = crypto.scryptSync(pin, Buffer.from(saltHex, "hex"), expected.length);
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

async function ensureSchema(): Promise<void> {
  if (!sql) throw new Error("DATABASE_URL is required for admin security settings.");
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS kairo_admin_security (
          id SMALLINT PRIMARY KEY CHECK (id = 1),
          pin_hash TEXT NOT NULL,
          session_version INTEGER NOT NULL DEFAULT 1,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      const bootstrapPin = process.env.ADMIN_PIN;
      if (!bootstrapPin || bootstrapPin.length < 10) {
        throw new Error("ADMIN_PIN must be configured as a 10+ character Vercel Secret before first admin sign-in.");
      }
      await sql`
        INSERT INTO kairo_admin_security (id, pin_hash, session_version)
        VALUES (1, ${hashPin(bootstrapPin)}, 1)
        ON CONFLICT (id) DO NOTHING
      `;
    })().catch((error) => { schemaReady = null; throw error; });
  }
  await schemaReady;
}

async function state(): Promise<SecurityState> {
  await ensureSchema();
  const rows = await sql!`SELECT pin_hash, session_version FROM kairo_admin_security WHERE id = 1`;
  const row = rows[0] as SecurityState | undefined;
  if (!row) throw new Error("Admin security settings could not be loaded.");
  return row;
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  if (!pin || typeof pin !== "string") return false;
  return matchesPin(pin.trim(), (await state()).pin_hash);
}

export async function getAdminSessionVersion(): Promise<number> {
  return (await state()).session_version;
}

export async function changeAdminPin(currentPin: string, newPin: string): Promise<boolean> {
  if (!currentPin || !newPin || newPin.length < 10 || newPin.length > 64) return false;
  const current = await state();
  if (!matchesPin(currentPin.trim(), current.pin_hash)) return false;
  const result = await sql!`
    UPDATE kairo_admin_security
    SET pin_hash = ${hashPin(newPin.trim())}, session_version = session_version + 1, updated_at = NOW()
    WHERE id = 1 AND pin_hash = ${current.pin_hash}
    RETURNING id
  `;
  return result.length > 0;
}
