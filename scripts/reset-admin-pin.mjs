/**
 * Clears the stored curator PIN so it is rebuilt from `ADMIN_PIN`.
 *
 * The PIN lives in `kairo_admin_security` as a scrypt hash, which cannot be
 * reversed — there is no way to read a forgotten one back out. What can be done
 * is to remove the row: `ensureSchema` in `lib/adminSecurityStore.ts` inserts it
 * from the `ADMIN_PIN` environment variable whenever it is missing, so the next
 * sign-in re-seeds it from there.
 *
 * Sessions are invalidated as a side effect. `session_version` goes back to 1,
 * and every curator token signed against the old version stops being accepted —
 * which is what you want after losing control of the PIN anyway.
 *
 * Nothing else is touched: the admin allow-list, the catalogue, orders and
 * media all live in other tables.
 *
 * Usage:
 *   node scripts/reset-admin-pin.mjs           # report only
 *   node scripts/reset-admin-pin.mjs --apply   # clears the row
 *
 * Afterwards, sign in with whatever `ADMIN_PIN` is set to — locally that is
 * `.env.local`; on Vercel it is the project's environment variables, and if the
 * two differ each deployment takes its own value.
 */
import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const APPLY = process.argv.includes("--apply");

function fromEnvFile(key) {
  if (!existsSync(".env.local")) return null;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = new RegExp(`^${key}\\s*=\\s*(.+)$`).exec(line.trim());
    if (match) return match[1].replace(/^["']|["']$/g, "");
  }
  return null;
}

const url = process.env.DATABASE_URL || fromEnvFile("DATABASE_URL");
if (!url) {
  console.error("DATABASE_URL not found. Set it in the environment or in .env.local.");
  process.exit(1);
}

// Only its length is reported. The value itself is never printed: this script's
// output can end up in a terminal log or a screenshot.
const bootstrapPin = process.env.ADMIN_PIN || fromEnvFile("ADMIN_PIN");
if (!bootstrapPin) {
  console.error("ADMIN_PIN is not set, so clearing the row would lock the console entirely.");
  console.error("Set ADMIN_PIN (10+ characters) in .env.local first, then run this again.");
  process.exit(1);
}
if (bootstrapPin.length < 10) {
  console.error(`ADMIN_PIN is ${bootstrapPin.length} characters; the server requires at least 10.`);
  process.exit(1);
}

const sql = neon(url);
const rows = await sql`SELECT session_version, updated_at FROM kairo_admin_security WHERE id = 1`;

if (!rows[0]) {
  console.log("No stored PIN — the next sign-in will seed one from ADMIN_PIN already.");
  process.exit(0);
}

console.log(`stored PIN     : present (session version ${rows[0].session_version}, set ${rows[0].updated_at})`);
console.log(`ADMIN_PIN      : set, ${bootstrapPin.length} characters`);
console.log("\nafter this runs");
console.log("  the PIN becomes whatever ADMIN_PIN holds");
console.log("  any signed-in curator session is invalidated");
console.log("  admin allow-list, catalogue, orders and media are untouched");

if (!APPLY) {
  console.log("\n(dry run — pass --apply to clear it)");
  process.exit(0);
}

await sql`DELETE FROM kairo_admin_security WHERE id = 1`;
const after = await sql`SELECT COUNT(*)::int AS n FROM kairo_admin_security`;
console.log(`\ncleared. rows remaining: ${after[0].n}`);
console.log("Sign in with the value of ADMIN_PIN from .env.local.");
