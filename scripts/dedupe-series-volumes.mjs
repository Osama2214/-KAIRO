/**
 * Removes the duplicated volume lists stored inside each series.
 *
 * `kairo_storefront_data` kept every product twice: once in the flat `volumes`
 * list and again inside `series[].volumes`. The copies had drifted — 31 volumes
 * carried different ratings and review counts depending on which list you read,
 * and the Jujutsu Kaisen box set was missing from the nested one — so the code
 * now derives a series' volumes from the flat list on arrival and never stores
 * them. This clears what the table already holds.
 *
 * It refuses to touch anything it cannot account for: every nested volume must
 * exist in the flat list first, or the nested copy holds something unique and
 * deleting it would lose data.
 *
 * Usage:
 *   node scripts/dedupe-series-volumes.mjs           # report only
 *   node scripts/dedupe-series-volumes.mjs --apply   # writes the change
 *
 * DATABASE_URL is read from the environment or from .env.local.
 */
import { readFileSync, existsSync } from "node:fs";
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

const url = databaseUrl();
if (!url) {
  console.error("DATABASE_URL not found. Set it in the environment or in .env.local.");
  process.exit(1);
}

const sql = neon(url);
const rows = await sql`SELECT payload FROM kairo_storefront_data WHERE id = 1`;
if (!rows[0]) {
  console.error("No storefront row found (kairo_storefront_data id=1).");
  process.exit(1);
}

const payload = rows[0].payload;
const volumes = Array.isArray(payload.volumes) ? payload.volumes : [];
const series = Array.isArray(payload.series) ? payload.series : [];
const byId = new Map(volumes.map((volume) => [volume.id, volume]));

const before = JSON.stringify(payload).length;
let nested = 0;
const orphans = [];
const drifted = [];

for (const entry of series) {
  for (const volume of entry.volumes || []) {
    nested += 1;
    const flat = byId.get(volume.id);
    if (!flat) {
      orphans.push(`${entry.slug}/${volume.id}`);
      continue;
    }
    const fields = Object.keys({ ...flat, ...volume }).filter(
      (key) => JSON.stringify(flat[key]) !== JSON.stringify(volume[key])
    );
    if (fields.length) drifted.push(`${volume.id} (${fields.join(", ")})`);
  }
}

console.log(`volumes in the flat list : ${volumes.length}`);
console.log(`nested copies            : ${nested}`);
console.log(`drifted from the flat one: ${drifted.length}`);
if (drifted.length) console.log(`  e.g. ${drifted.slice(0, 5).join(" | ")}`);
console.log(`present only when nested : ${orphans.length ? orphans.join(", ") : "none"}`);

console.log("\nvolume count per series, before → after:");
for (const entry of series) {
  const derived = volumes.filter((volume) => volume.seriesSlug === entry.slug).length;
  const was = (entry.volumes || []).length;
  console.log(`  ${String(entry.slug).padEnd(16)} ${was} → ${derived}${was === derived ? "" : "   (the flat list is the correct one)"}`);
}

if (orphans.length) {
  console.log("\nStopping: those volumes exist only in a nested copy, so this would lose them.");
  process.exit(1);
}

const next = {
  ...payload,
  series: series.map(({ volumes: _nested, ...rest }) => rest),
};
const after = JSON.stringify(next).length;
console.log(`\npayload: ${(before / 1024).toFixed(1)}KB → ${(after / 1024).toFixed(1)}KB (${Math.round((1 - after / before) * 100)}% smaller)`);

if (!APPLY) {
  console.log("\n(dry run — pass --apply to write it)");
  process.exit(0);
}

await sql`UPDATE kairo_storefront_data SET payload = ${JSON.stringify(next)}::jsonb, updated_at = NOW() WHERE id = 1`;
console.log("\nDone. Series now derive their volumes from the catalogue.");
