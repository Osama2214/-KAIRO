// Merges the Demon Slayer rows into the live storefront payload in Neon,
// doing exactly what saveStorefrontData does: write the payload row, then
// upsert kairo_catalog_items and deactivate anything no longer in the payload.
// Runs as a dry run unless --apply is passed.
import fs from "node:fs";
import { neon } from "@neondatabase/serverless";

const SP = "C:/Users/pc/AppData/Local/Temp/claude/C--Users-pc-Desktop-KAIRO/8789bbbe-7dbf-4621-aa74-904d658eed7b/scratchpad";
const APPLY = process.argv.includes("--apply");

const env = fs.readFileSync("C:/Users/pc/Desktop/KAIRO/.env.local", "utf8");
const sql = neon(env.match(/^DATABASE_URL=(.+)$/m)[1].trim());

const ds = JSON.parse(fs.readFileSync(`${SP}/na_payload.json`, "utf8"));

const rows = await sql`SELECT payload FROM kairo_storefront_data WHERE id = 1`;
const payload = rows[0].payload;

const beforeVolumes = payload.volumes.length;
const beforeSeries = payload.series.length;

// Idempotent: drop any previous Demon Slayer rows before adding this build.
const volumes = payload.volumes.filter((v) => v.seriesSlug !== "nana").concat(ds.volumes);
const series = payload.series.filter((s) => s.slug !== "nana").concat([ds.series]);
const next = { ...payload, volumes, series };

console.log(`volumes ${beforeVolumes} -> ${volumes.length}`);
console.log(`series  ${beforeSeries} -> ${series.length} (${series.map((s) => s.slug).join(", ")})`);
console.log("payload size:", (JSON.stringify(next).length / 1024).toFixed(0) + "kb (limit 1500kb)");

const sample = volumes.find((v) => v.id === "na-001");
console.log("sample:", sample.id, "|", sample.title, "|", sample.price, "/", sample.originalPrice,
  "| stock", sample.stock, "|", sample.coverImage);

if (!APPLY) {
  console.log("\nDRY RUN — nothing written. Re-run with --apply to write.");
  process.exit(0);
}

fs.writeFileSync(`${SP}/neon-payload-prewrite-na.json`, JSON.stringify(payload, null, 1), "utf8");

await sql`
  INSERT INTO kairo_storefront_data (id, payload, updated_at)
  VALUES (1, ${JSON.stringify(next)}::jsonb, NOW())
  ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
`;

const items = volumes.map((v) => ({ id: v.id, payload: v, price: v.price, stock: Math.max(0, Math.floor(v.stock)) }));
await sql`
  WITH incoming AS (
    SELECT id, payload, price, stock
    FROM jsonb_to_recordset(${JSON.stringify(items)}::jsonb)
      AS item(id TEXT, payload JSONB, price NUMERIC, stock INTEGER)
  ), upserted AS (
    INSERT INTO kairo_catalog_items (id, payload, price, stock, active, updated_at)
    SELECT id, payload, price, stock, TRUE, NOW() FROM incoming
    ON CONFLICT (id) DO UPDATE SET
      payload = EXCLUDED.payload,
      price = EXCLUDED.price,
      stock = EXCLUDED.stock,
      active = TRUE,
      updated_at = NOW()
    RETURNING id
  )
  UPDATE kairo_catalog_items
  SET active = FALSE, updated_at = NOW()
  WHERE active = TRUE AND id NOT IN (SELECT id FROM incoming)
`;

const check = await sql`SELECT COUNT(*)::int AS n FROM kairo_catalog_items WHERE active = TRUE AND id LIKE 'na-%'`;
console.log("\nwritten. active nana catalog items:", check[0].n);
