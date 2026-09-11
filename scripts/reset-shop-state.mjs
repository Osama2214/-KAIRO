/**
 * Clears the trial data the shop accumulated while it was being built, and puts
 * every book back to a known stock level.
 *
 * What it removes: every order, every customer account that is not an
 * administrator, every welcome coupon, and any pending OTP codes.
 *
 * What it never touches: `kairo_admin_emails` (who may reach the console),
 * `kairo_admin_security` (the PIN), the administrator rows in `kairo_users`,
 * the media library, and catalogue rows that are already inactive — those are
 * products a curator removed and reviving them would put them back on sale.
 *
 * Stock is written in both places on purpose. `kairo_catalog_items.stock` is
 * what checkout reserves against, but `syncCatalogItems` rewrites that table
 * from `kairo_storefront_data.payload.volumes[].stock` on every CMS save — so
 * setting only the first would be undone the next time a curator pressed save.
 *
 * Box sets are deliberately skipped. A bundle has no stock of its own: it is
 * computed by `applyBundleFacts` as the smallest stock among its members, so
 * writing a number onto it would be overwritten on the next read anyway.
 *
 * Usage:
 *   node scripts/reset-shop-state.mjs           # report only
 *   node scripts/reset-shop-state.mjs --apply   # performs the deletion
 *
 * DATABASE_URL is read from the environment or from .env.local.
 */
import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const APPLY = process.argv.includes("--apply");
const STOCK = 100;

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (existsSync(".env.local")) {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const match = /^DATABASE_URL\s*=\s*(.+)$/.exec(line.trim());
      if (match) return match[1].replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

const url = databaseUrl();
if (!url) {
  console.error("DATABASE_URL not found. Set it in the environment or in .env.local.");
  process.exit(1);
}
const sql = neon(url);

const isBundle = (volume) => Array.isArray(volume?.bundleOf) && volume.bundleOf.length > 0;

// ---------------------------------------------------------------- who stays
const adminRows = await sql`SELECT LOWER(email) AS email FROM kairo_admin_emails`;
const adminEmails = new Set(adminRows.map((row) => row.email));
const envAdmin = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
if (envAdmin) adminEmails.add(envAdmin);

const users = await sql`SELECT id, email, role FROM kairo_users ORDER BY created_at`;
const keep = users.filter((u) => u.role === "admin" || adminEmails.has(u.email.toLowerCase()));
const remove = users.filter((u) => !keep.includes(u));

// A wiped console is worthless if nobody can sign into it afterwards.
if (keep.length === 0) {
  console.error("Stopping: no administrator account would survive this.");
  process.exit(1);
}

// ------------------------------------------------------------- what changes
/** Some tables are only created the first time a feature is used. */
async function tableExists(name) {
  const rows = await sql`SELECT to_regclass(${`public.${name}`}) IS NOT NULL AS present`;
  return Boolean(rows[0]?.present);
}

const orders = await sql`SELECT COUNT(*)::int AS n FROM kairo_orders`;
const coupons = await sql`SELECT COUNT(*)::int AS n FROM kairo_welcome_coupons`;
const hasOtp = await tableExists("kairo_otp_codes");
const otps = hasOtp ? await sql`SELECT COUNT(*)::int AS n FROM kairo_otp_codes` : [{ n: 0 }];

const items = await sql`SELECT id, stock, active, payload FROM kairo_catalog_items`;
const activeBooks = items.filter((row) => row.active && !isBundle(row.payload));
const bundles = items.filter((row) => isBundle(row.payload));
const inactive = items.filter((row) => !row.active);

const storefront = await sql`SELECT payload FROM kairo_storefront_data WHERE id = 1`;
const payload = storefront[0]?.payload;
if (!payload) {
  console.error("Stopping: no storefront payload found, so stock could only be set in one place.");
  process.exit(1);
}
const payloadVolumes = Array.isArray(payload.volumes) ? payload.volumes : [];
const payloadBooks = payloadVolumes.filter((volume) => !isBundle(volume));

console.log("will delete");
console.log(`  orders                  : ${orders[0].n}`);
console.log(`  customer accounts       : ${remove.length}${remove.length ? ` → ${remove.map((u) => u.email).join(", ")}` : ""}`);
console.log(`  welcome coupons         : ${coupons[0].n}`);
console.log(`  pending OTP codes       : ${hasOtp ? otps[0].n : "table does not exist yet"}`);
console.log("\nwill keep");
console.log(`  admin accounts          : ${keep.map((u) => u.email).join(", ")}`);
console.log(`  admin allow-list        : ${adminRows.length} address(es), untouched`);
console.log(`  inactive catalogue rows : ${inactive.length}, untouched`);
console.log(`\nwill set stock to ${STOCK}`);
console.log(`  kairo_catalog_items     : ${activeBooks.length} book(s)`);
console.log(`  payload.volumes         : ${payloadBooks.length} book(s)`);
console.log(`  bundles skipped         : ${bundles.length} → ${bundles.map((b) => b.id).join(", ")} (stock is derived from their members)`);

if (!APPLY) {
  console.log("\n(dry run — pass --apply to perform it)");
  process.exit(0);
}

// ------------------------------------------------------------------ perform
await sql`DELETE FROM kairo_orders`;
console.log("\ndeleted all orders");

if (remove.length) {
  await sql`DELETE FROM kairo_users WHERE id = ANY(${remove.map((u) => u.id)})`;
  console.log(`deleted ${remove.length} customer account(s)`);
}

await sql`DELETE FROM kairo_welcome_coupons`;
if (hasOtp) await sql`DELETE FROM kairo_otp_codes`;
console.log(`deleted coupons${hasOtp ? " and pending OTP codes" : ""}`);

const bookIds = activeBooks.map((row) => row.id);
if (bookIds.length) {
  await sql`UPDATE kairo_catalog_items SET stock = ${STOCK}, updated_at = NOW() WHERE id = ANY(${bookIds})`;
  console.log(`set stock on ${bookIds.length} catalogue row(s)`);
}

const nextPayload = {
  ...payload,
  volumes: payloadVolumes.map((volume) => (isBundle(volume) ? volume : { ...volume, stock: STOCK })),
};
await sql`UPDATE kairo_storefront_data SET payload = ${JSON.stringify(nextPayload)}::jsonb, updated_at = NOW() WHERE id = 1`;
console.log(`set stock on ${payloadBooks.length} payload volume(s)`);

// -------------------------------------------------------------------- check
const after = await sql`SELECT COUNT(*)::int AS n FROM kairo_catalog_items WHERE active = TRUE AND stock <> ${STOCK}`;
const remaining = await sql`SELECT COUNT(*)::int AS n FROM kairo_orders`;
const stillThere = await sql`SELECT email, role FROM kairo_users ORDER BY created_at`;
console.log(`\norders remaining            : ${remaining[0].n}`);
console.log(`accounts remaining          : ${stillThere.map((u) => `${u.email} (${u.role})`).join(", ")}`);
console.log(`active rows not at ${STOCK}     : ${after[0].n} (the ${bundles.length} bundles are expected here until their members are read back)`);
