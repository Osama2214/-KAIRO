import "server-only";

import { neon } from "@neondatabase/serverless";

/**
 * =======================================================================
 * 🏛️ ANIMEVERSE — Admin Access Configuration (SERVER ONLY)
 * =======================================================================
 *
 * This module must never be imported from client code: it names the real
 * people who can reach the curator console. `import "server-only"` turns any
 * such import into a build error rather than a silent bundle leak.
 *
 * The allow-list lives in Neon (`kairo_admin_emails`) so the console's own
 * "add administrator" control actually grants access. It used to be this
 * hard-coded array alone, which meant adding someone in the UI changed nothing
 * but a client-side list: the new address still could not sign in, and the
 * server's list overwrote the UI on the next session check.
 *
 * The master PIN is not here. It lives as a scrypt hash in Neon
 * (`kairo_admin_security`), bootstrapped from the ADMIN_PIN environment
 * variable — see `lib/adminSecurityStore.ts`.
 *
 * Client-safe constants are in `adminPublic.ts`.
 */

/**
 * 🛡️ Initial administrator emails.
 *
 * These seed the table the first time it is created. Afterwards the database
 * is authoritative, so an address removed through the console stays removed.
 */
const SEED_ADMIN_EMAILS: string[] = [
  "animeversebooks@gmail.com",
  "osamahamad261981@gmail.com",
];

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;
let schemaReady: Promise<void> | null = null;

function normalise(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

/** The ADMIN_EMAIL secret is the break-glass account: always allowed, never removable. */
function envAdminEmail(): string {
  return normalise(process.env.ADMIN_EMAIL);
}

async function ensureSchema(): Promise<void> {
  if (!sql) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS kairo_admin_emails (
          email TEXT PRIMARY KEY,
          added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      // Seed only into an empty table, so a deliberate removal is not undone
      // on the next cold start.
      const existing = await sql`SELECT COUNT(*)::int AS count FROM kairo_admin_emails`;
      if (existing[0]?.count === 0) {
        await sql`
          INSERT INTO kairo_admin_emails (email)
          SELECT jsonb_array_elements_text(${JSON.stringify(SEED_ADMIN_EMAILS)}::jsonb)
          ON CONFLICT (email) DO NOTHING
        `;
      }
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

/**
 * Resolves the full authorized set: the stored list plus the ADMIN_EMAIL
 * override. Falls back to the seed list when no database is configured, so
 * local development works without one.
 */
export async function authorizedAdminEmails(): Promise<string[]> {
  const envAdmin = envAdminEmail();

  if (!sql) {
    const list = SEED_ADMIN_EMAILS.map(normalise);
    return envAdmin && !list.includes(envAdmin) ? [...list, envAdmin] : list;
  }

  try {
    await ensureSchema();
    const rows = await sql`SELECT email FROM kairo_admin_emails ORDER BY added_at`;
    const list = rows.map((row) => normalise(row.email)).filter(Boolean);
    if (envAdmin && !list.includes(envAdmin)) list.push(envAdmin);
    // Never hand back an empty allow-list: that would lock everyone out.
    return list.length > 0 ? list : SEED_ADMIN_EMAILS.map(normalise);
  } catch (error) {
    console.error("Admin allow-list read failed, falling back to seed list:", error);
    const list = SEED_ADMIN_EMAILS.map(normalise);
    return envAdmin && !list.includes(envAdmin) ? [...list, envAdmin] : list;
  }
}

/**
 * True when `email` may hold a curator session.
 */
export async function isAuthorizedAdminEmail(email: unknown): Promise<boolean> {
  const candidate = normalise(email);
  if (!candidate) return false;
  return (await authorizedAdminEmails()).includes(candidate);
}

/** Adds an address to the console's allow-list. */
export async function addAuthorizedAdminEmail(email: unknown): Promise<{ ok: boolean; message: string }> {
  const candidate = normalise(email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(candidate)) {
    return { ok: false, message: "That is not a valid email address." };
  }
  if (!sql) return { ok: false, message: "No database is configured for the admin list." };

  await ensureSchema();
  await sql`INSERT INTO kairo_admin_emails (email) VALUES (${candidate}) ON CONFLICT (email) DO NOTHING`;
  return { ok: true, message: `${candidate} can now sign in to the curator console.` };
}

/**
 * Removes an address. The last remaining administrator and the ADMIN_EMAIL
 * break-glass account are both refused, so the console cannot be locked shut.
 */
export async function removeAuthorizedAdminEmail(email: unknown): Promise<{ ok: boolean; message: string }> {
  const candidate = normalise(email);
  if (!candidate) return { ok: false, message: "No email supplied." };
  if (!sql) return { ok: false, message: "No database is configured for the admin list." };

  if (candidate === envAdminEmail()) {
    return { ok: false, message: "That address is set as ADMIN_EMAIL and cannot be removed here." };
  }

  await ensureSchema();
  const rows = await sql`SELECT email FROM kairo_admin_emails`;
  if (rows.length <= 1) {
    return { ok: false, message: "At least one administrator must remain." };
  }

  const deleted = await sql`DELETE FROM kairo_admin_emails WHERE email = ${candidate} RETURNING email`;
  if (deleted.length === 0) return { ok: false, message: "That address is not on the list." };
  return { ok: true, message: `${candidate} no longer has curator access.` };
}
