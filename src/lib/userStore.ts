import "server-only";

import crypto from "crypto";
import { neon } from "@neondatabase/serverless";
import { isAuthorizedAdminEmail } from "@/config/adminConfig";

export interface DBUser {
  id: string;
  email: string;
  password_hash: string;
  role: "admin" | "customer";
  name: string;
  phone: string;
  address: string;
  governorate: string;
  city?: string;
  delivery_notes?: string;
  created_at: number;
}

export interface SanitizedUser {
  id: string;
  email: string;
  role: "admin" | "customer";
  name: string;
  phone: string;
  address: string;
  governorate: string;
  city?: string;
  deliveryNotes?: string;
  joinedDate: string;
}

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;
let schemaReady: Promise<void> | null = null;

export function hashUserPassword(password: string, salt = crypto.randomBytes(16)): string {
  const digest = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${digest.toString("hex")}`;
}

export function verifyUserPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.startsWith("scrypt$")) return false;
  const parts = storedHash.split("$");
  if (parts.length !== 3) return false;
  const [, saltHex, digestHex] = parts;
  const expected = Buffer.from(digestHex, "hex");
  const derived = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

export async function ensureUserSchema(): Promise<void> {
  if (!sql) throw new Error("DATABASE_URL is required for user persistence.");
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS kairo_users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'customer',
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          address TEXT NOT NULL,
          governorate TEXT NOT NULL,
          city TEXT,
          delivery_notes TEXT,
          created_at BIGINT NOT NULL
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS kairo_users_email_idx ON kairo_users (LOWER(email))`;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

export async function getUserByEmail(email: string): Promise<DBUser | null> {
  if (!sql) return null;
  await ensureUserSchema();
  const normalized = email.trim().toLowerCase();
  const rows = await sql`
    SELECT id, email, password_hash, role, name, phone, address, governorate, city, delivery_notes, created_at
    FROM kairo_users
    WHERE LOWER(email) = ${normalized}
    LIMIT 1
  `;
  return (rows[0] as DBUser) || null;
}

export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  phone: string;
  address: string;
  governorate: string;
  city?: string;
  deliveryNotes?: string;
  role?: "admin" | "customer";
}): Promise<SanitizedUser> {
  if (!sql) throw new Error("Database connection unavailable.");
  await ensureUserSchema();

  const normalized = data.email.trim().toLowerCase();
  const id = `AV-${Math.floor(10000 + Math.random() * 90000)}`;
  const passwordHash = hashUserPassword(data.password);
  const now = Date.now();
  // An address on the curator allow-list is an admin from the moment it
  // registers; promoting it by hand afterwards was easy to forget.
  const role = data.role || ((await isAuthorizedAdminEmail(normalized)) ? "admin" : "customer");

  await sql`
    INSERT INTO kairo_users (
      id, email, password_hash, role, name, phone, address, governorate, city, delivery_notes, created_at
    ) VALUES (
      ${id}, ${normalized}, ${passwordHash}, ${role}, ${data.name.trim()},
      ${data.phone.trim()}, ${data.address.trim()}, ${data.governorate.trim()},
      ${data.city?.trim() || null}, ${data.deliveryNotes?.trim() || null}, ${now}
    )
  `;

  return {
    id,
    email: normalized,
    role,
    name: data.name.trim(),
    phone: data.phone.trim(),
    address: data.address.trim(),
    governorate: data.governorate.trim(),
    city: data.city?.trim(),
    deliveryNotes: data.deliveryNotes?.trim(),
    joinedDate: new Date(now).toISOString().split("T")[0],
  };
}

export function toSanitizedUser(user: DBUser): SanitizedUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    phone: user.phone,
    address: user.address,
    governorate: user.governorate,
    city: user.city || undefined,
    deliveryNotes: user.delivery_notes || undefined,
    joinedDate: new Date(Number(user.created_at)).toISOString().split("T")[0],
  };
}

export async function updateUserPassword(email: string, newPassword: string): Promise<boolean> {
  if (!sql) return false;
  await ensureUserSchema();
  const normalized = email.trim().toLowerCase();
  const passwordHash = hashUserPassword(newPassword);
  const res = await sql`
    UPDATE kairo_users
    SET password_hash = ${passwordHash}
    WHERE LOWER(email) = ${normalized}
    RETURNING id
  `;
  return res.length > 0;
}

/**
 * Finds an existing patron by email, or provisions one for a federated (OAuth)
 * sign-in. Without a persisted row, /api/auth/me cannot resolve the session on
 * the next page load and the patron appears signed out after every refresh.
 */
export async function upsertOAuthUser(data: {
  email: string;
  name?: string;
  phone?: string;
  address?: string;
  governorate?: string;
}): Promise<SanitizedUser> {
  if (!sql) throw new Error("Database connection unavailable.");
  await ensureUserSchema();

  const normalized = data.email.trim().toLowerCase();
  const existing = await getUserByEmail(normalized);
  if (existing) return toSanitizedUser(existing);

  return createUser({
    email: normalized,
    // OAuth patrons never sign in with a password; store an unguessable one so
    // the credentials path can never match this row.
    password: crypto.randomBytes(32).toString("hex"),
    name: data.name?.trim() || normalized.split("@")[0],
    phone: data.phone?.trim() || "",
    address: data.address?.trim() || "",
    governorate: data.governorate?.trim() || "Cairo",
  });
}
