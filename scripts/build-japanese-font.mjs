/**
 * Rebuilds the Shippori Mincho subset that ships with the site.
 *
 * A Japanese face carries thousands of glyphs, and Google serves it split into
 * ~122 unicode ranges per weight. Because Japanese text is scattered all over
 * the storefront — genre watermarks, series titles, the decorative kanji — a
 * single page pulls dozens of those ranges and pays 14-72KB for each one, even
 * when it only needs a character or two out of it. Measured on the home page
 * that came to 131 files and 3.9MB, far more than every image put together.
 *
 * So instead of the whole face, we ship exactly the characters the site can
 * actually render: every CJK character found in the source and in the live
 * catalogue, plus ASCII, since `font-serif` wraps ordinary latin copy too.
 * Anything outside that set falls back to the system's Japanese serif, which is
 * why the CSS stack in globals.css names real ones before bare `serif`.
 *
 * Re-run this whenever the catalogue gains Japanese text that is not already
 * covered — a new series title, say — and commit the two woff2 files with it.
 *
 * Usage:
 *   node scripts/build-japanese-font.mjs           # report only
 *   node scripts/build-japanese-font.mjs --apply   # rewrites src/app/fonts
 *
 * DATABASE_URL is read from the environment or from .env.local. Without it the
 * script still runs, covering the source but not the live catalogue, and says so.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const APPLY = process.argv.includes("--apply");
const FONT_DIR = join("src", "app", "fonts");
const WEIGHTS = [400, 700];

/** Kana, kanji, CJK punctuation and the full-width forms. */
const CJK =
  /[　-〿぀-ゟ゠-ヿ㐀-䶿一-鿿豈-﫿＀-￯]/;

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

function collect(text, into) {
  for (const char of String(text)) if (CJK.test(char)) into.add(char);
}

function walkValue(node, into) {
  if (typeof node === "string") return collect(node, into);
  if (Array.isArray(node)) return node.forEach((child) => walkValue(child, into));
  if (node && typeof node === "object") return Object.values(node).forEach((child) => walkValue(child, into));
}

function walkSource(dir, into) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!/^(node_modules|\.next|\.git)$/.test(entry.name)) walkSource(path, into);
    } else if (/\.(tsx?|css|json)$/.test(entry.name)) {
      collect(readFileSync(path, "utf8"), into);
    }
  }
}

const fromSource = new Set();
walkSource("src", fromSource);

const fromCatalogue = new Set();
const url = databaseUrl();
if (url) {
  const sql = neon(url);
  const storefront = await sql`SELECT payload FROM kairo_storefront_data WHERE id = 1`;
  walkValue(storefront[0]?.payload, fromCatalogue);
  const items = await sql`SELECT payload FROM kairo_catalog_items`;
  walkValue(items.map((row) => row.payload), fromCatalogue);
} else {
  console.warn("DATABASE_URL not found — covering the source only, not the live catalogue.\n");
}

let latin = "";
for (let code = 0x20; code < 0x7f; code += 1) latin += String.fromCharCode(code);
const punctuation = "—–…‘’“”·×";

const characters = [...new Set([...latin, ...punctuation, ...fromSource, ...fromCatalogue])].join("");

console.log(`CJK in the source    : ${fromSource.size}`);
console.log(`CJK in the catalogue : ${fromCatalogue.size}`);
console.log(`characters to embed  : ${[...characters].length}`);

// Google returns one @font-face per weight, each pointing at a woff2 holding
// only the requested characters. The Chrome UA is what selects woff2 over ttf.
const params = new URLSearchParams({
  family: `Shippori Mincho:wght@${WEIGHTS.join(";")}`,
  text: characters,
});
const cssResponse = await fetch(`https://fonts.googleapis.com/css2?${params}`, {
  headers: {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  },
});
if (!cssResponse.ok) {
  console.error(`Google Fonts refused the request: ${cssResponse.status} ${cssResponse.statusText}`);
  process.exit(1);
}
const css = await cssResponse.text();

const blocks = css.split("@font-face").slice(1);
const downloads = [];
for (const block of blocks) {
  const weight = Number(/font-weight:\s*(\d+)/.exec(block)?.[1]);
  const source = /url\((https:\/\/[^)]+)\)/.exec(block)?.[1];
  if (!weight || !source) continue;
  downloads.push({ weight, source });
}

const missing = WEIGHTS.filter((weight) => !downloads.some((entry) => entry.weight === weight));
if (missing.length) {
  console.error(`Google Fonts did not return weight(s): ${missing.join(", ")}`);
  process.exit(1);
}

let total = 0;
for (const { weight, source } of downloads) {
  const response = await fetch(source);
  const bytes = Buffer.from(await response.arrayBuffer());
  // "wOF2" — anything else means we were handed a format the browser cannot use.
  if (bytes.subarray(0, 4).toString("latin1") !== "wOF2") {
    console.error(`Weight ${weight} came back in an unexpected format.`);
    process.exit(1);
  }
  total += bytes.length;
  const file = join(FONT_DIR, `shippori-mincho-${weight}.woff2`);
  const before = existsSync(file) ? statSync(file).size : 0;
  console.log(`  ${weight}: ${(bytes.length / 1024).toFixed(1)}KB${before ? ` (was ${(before / 1024).toFixed(1)}KB)` : ""}`);
  if (APPLY) writeFileSync(file, bytes);
}

console.log(`\ntotal: ${(total / 1024).toFixed(1)}KB across ${downloads.length} files`);
if (!APPLY) console.log("\n(dry run — pass --apply to write them)");
