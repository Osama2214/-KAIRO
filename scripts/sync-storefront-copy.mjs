/**
 * Updates the hero copy stored in Neon so the live site matches the code.
 *
 * The storefront CMS payload lives in `kairo_storefront_data` and takes
 * precedence over the defaults in the source, so a code change alone does not
 * alter what visitors see. This script rewrites only the specific labels that
 * changed and leaves the rest of the payload untouched.
 *
 * Usage:
 *   node scripts/sync-storefront-copy.mjs            # dry run, shows the diff
 *   node scripts/sync-storefront-copy.mjs --apply    # writes the change
 *
 * DATABASE_URL is read from the environment or from .env.local.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const APPLY = process.argv.includes("--apply");

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

/** Only these keys are rewritten. Anything else in the payload is preserved. */
const UPDATES = {
  heroContent: {
    stat2Label: "Premium Quality Editions",
  },
  heroArabicContent: {
    stat1Label: "مجلّد في الأرشيف",
    stat2Label: "إصدارات بأعلى جودة",
    stat3Label: "توصيل لكل محافظات مصر",
  },
};

const url = databaseUrl();
if (!url) {
  console.error("DATABASE_URL not found. Set it in the environment or in .env.local.");
  process.exit(1);
}

const sql = neon(url);
const rows = await sql`SELECT payload FROM kairo_storefront_data WHERE id = 1`;
if (!rows[0]) {
  console.error("No storefront row found (kairo_storefront_data id=1). Nothing to update.");
  process.exit(1);
}

const payload = typeof rows[0].payload === "string" ? JSON.parse(rows[0].payload) : rows[0].payload;

const backup = `storefront-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(backup, JSON.stringify(payload, null, 2), "utf8");
console.log(`Backup written to ${backup}\n`);

let changes = 0;
const next = { ...payload };
for (const [section, fields] of Object.entries(UPDATES)) {
  const current = next[section];
  if (!current || typeof current !== "object") {
    console.log(`· ${section}: not present in the payload, skipped`);
    continue;
  }
  const updated = { ...current };
  for (const [key, value] of Object.entries(fields)) {
    if (updated[key] === value) {
      console.log(`· ${section}.${key}: already up to date`);
      continue;
    }
    console.log(`✎ ${section}.${key}`);
    console.log(`    from: ${updated[key]}`);
    console.log(`      to: ${value}`);
    updated[key] = value;
    changes++;
  }
  next[section] = updated;
}

if (changes === 0) {
  console.log("\nNothing to change.");
  process.exit(0);
}

if (!APPLY) {
  console.log(`\n${changes} change(s) pending. Re-run with --apply to write them.`);
  process.exit(0);
}

await sql`
  UPDATE kairo_storefront_data
  SET payload = ${JSON.stringify(next)}::jsonb, updated_at = NOW()
  WHERE id = 1
`;
console.log(`\nApplied ${changes} change(s). The storefront API caches for 30s, so allow a moment.`);
