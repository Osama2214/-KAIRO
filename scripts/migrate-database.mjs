// Copies the whole public schema (tables, keys, indexes, rows) from
// DATABASE_URL to NEW_DATABASE_URL, for handing the store to a new Neon
// account. The source is only read.
//
//   node scripts/migrate-database.mjs            copy into an empty target
//   node scripts/migrate-database.mjs --replace  drop the target's tables first
//
// Optional: OLD_MEDIA_BASE and NEW_MEDIA_BASE rewrite image links inside every
// text/json value while copying (e.g. the old r2.dev URL -> the new bucket).
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = { ...process.env };
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
if (!env.DATABASE_URL || !env.NEW_DATABASE_URL) throw new Error("DATABASE_URL and NEW_DATABASE_URL are required");
if (new URL(env.DATABASE_URL).hostname === new URL(env.NEW_DATABASE_URL).hostname) throw new Error("source and target are the same database");

const replace = process.argv.includes("--replace");
const oldBase = (env.OLD_MEDIA_BASE || "").replace(/\/+$/, "");
const newBase = (env.NEW_MEDIA_BASE || "").replace(/\/+$/, "");
const src = neon(env.DATABASE_URL);
const dst = neon(env.NEW_DATABASE_URL);
const q = (name) => `"${name.replace(/"/g, '""')}"`;

const tables = (await src`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1`).map((r) => r.table_name);
const existing = (await dst`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`).map((r) => r.table_name);
if (existing.length && !replace) throw new Error(`target already has tables (${existing.join(", ")}); rerun with --replace`);
if (replace) for (const t of existing) await dst.query(`DROP TABLE IF EXISTS ${q(t)} CASCADE`);

// 1. Tables with columns, defaults and NOT NULL.
for (const table of tables) {
  const cols = await src`
    SELECT a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type, a.attnotnull AS notnull,
           pg_get_expr(d.adbin, d.adrelid) AS def
    FROM pg_attribute a
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = ${`public.${table}`}::regclass AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY a.attnum`;
  const body = cols.map((c) => `${q(c.name)} ${c.type}${c.def ? ` DEFAULT ${c.def}` : ""}${c.notnull ? " NOT NULL" : ""}`).join(", ");
  await dst.query(`CREATE TABLE ${q(table)} (${body})`);
}

// 2. Primary keys, uniques and checks now; foreign keys after the rows.
const constraints = await src`
  SELECT c.conrelid::regclass::text AS tbl, c.conname AS name, c.contype AS type, pg_get_constraintdef(c.oid) AS def
  FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
  WHERE n.nspname = 'public' AND c.contype IN ('p', 'u', 'c', 'f')
  ORDER BY c.contype = 'f', 1`;
const addConstraint = (c) => dst.query(`ALTER TABLE ${q(c.tbl.replace(/^public\./, "").replace(/"/g, ""))} ADD CONSTRAINT ${q(c.name)} ${c.def}`);
for (const c of constraints.filter((c) => c.type !== "f")) await addConstraint(c);

// 3. Rows, in batches, typed by the target table itself.
const rewrite = (value) => {
  if (!oldBase || !newBase || value === null) return value;
  return JSON.parse(JSON.stringify(value).split(oldBase).join(newBase));
};
const counts = {};
for (const table of tables) {
  // row_to_json keeps timestamps as Postgres text; a JS Date would drop microseconds.
  const rows = (await src.query(`SELECT row_to_json(t) AS r FROM ${q(table)} t`)).map((row) => row.r);
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200).map(rewrite);
    await dst.query(`INSERT INTO ${q(table)} SELECT * FROM json_populate_recordset(NULL::${q(table)}, $1::json)`, [JSON.stringify(batch)]);
  }
  counts[table] = rows.length;
}

for (const c of constraints.filter((c) => c.type === "f")) await addConstraint(c);

// 4. Remaining indexes (the ones not created by a constraint).
const indexes = await src`
  SELECT i.indexname AS name, i.indexdef AS def FROM pg_indexes i
  WHERE i.schemaname = 'public'
    AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conname = i.indexname)`;
for (const idx of indexes) await dst.query(idx.def.replace(/\bON public\./, "ON "));

// 5. Verify.
let ok = true;
for (const table of tables) {
  const [{ n }] = await dst.query(`SELECT count(*)::int AS n FROM ${q(table)}`);
  const same = n === counts[table];
  ok &&= same;
  console.log(`${same ? "ok " : "BAD"} ${table}: ${counts[table]} -> ${n}`);
}
if (oldBase && newBase) {
  const host = new URL(oldBase).hostname;
  for (const table of tables) {
    const [{ n }] = await dst.query(`SELECT count(*)::int AS n FROM ${q(table)} t WHERE t::text LIKE $1`, [`%${host}%`]);
    if (n) { ok = false; console.log(`BAD ${table}: ${n} rows still point at ${host}`); }
  }
}
console.log(`${constraints.length} constraints, ${indexes.length} extra indexes`);
console.log(ok ? "MIGRATION OK" : "MIGRATION HAS PROBLEMS");
process.exit(ok ? 0 : 1);
