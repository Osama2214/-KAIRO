/** Read-only production verification. Start Next with the same KAIRO_DIST_DIR first. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const base = process.env.AUDIT_URL || "http://127.0.0.1:3100";
const buildDir = process.env.KAIRO_DIST_DIR || ".next-verify";
const response = await fetch(`${base}/api/storefront`);
assert.equal(response.status, 200);
const indexText = await response.text();
const { data } = JSON.parse(indexText);
assert.ok(Array.isArray(data.volumes));
assert.ok(data.volumes.every((v) => v.detailsOmitted && !v.synopsis && v.previewPages.length === 0));

const routes = data.volumes.map((volume) => ({
  volume,
  route: `${volume.productType === "figure" || volume.productType === "poster" ? "shop" : "manga"}/${volume.id}`,
}));
let verified = 0;
for (const { route } of routes) {
  const html = await readFile(path.join(buildDir, "server/app", `${route}.html`), "utf8");
  assert.match(html, /<h1[\s>]/, `${route}: no product heading`);
  assert.ok(!html.includes('name="robots" content="noindex"'), `${route}: cached as missing`);
  verified++;
}

const book = routes.find(({ volume }) => !["figure", "poster"].includes(volume.productType));
const merch = routes.find(({ volume }) => ["figure", "poster"].includes(volume.productType));
const samples = [...new Set([book?.route, merch?.route, routes[Math.floor(routes.length / 2)]?.route, routes.at(-1)?.route].filter(Boolean))];
const http = [];
for (const route of samples) {
  const start = performance.now();
  const result = await fetch(`${base}/${route}`);
  const html = await result.text();
  assert.equal(result.status, 200, route);
  assert.match(html, /<h1[\s>]/);
  assert.ok(!html.includes('name="robots" content="noindex"'), route);
  http.push({ route, status: result.status, localMs: Math.round(performance.now() - start) });
}

const detailResult = await fetch(`${base}/api/storefront?view=details&id=${encodeURIComponent(book.volume.id)}`);
const detailText = await detailResult.text();
const detailData = JSON.parse(detailText).data;
assert.equal(detailData.details.length, 1);
assert.equal(detailData.details[0].id, book.volume.id);
const missingDetail = await fetch(`${base}/api/storefront?view=details&id=__audit_missing_product__`);
assert.equal(missingDetail.status, 404);
const missing = await fetch(`${base}/manga/__audit_missing_product__`);
const missingHtml = await missing.text();
// Streaming can send 200 before a route resolves; noindex is the absence signal.
assert.ok(missing.status === 404 || missingHtml.includes('name="robots" content="noindex"'));

const homepage = await (await fetch(base)).text();
assert.ok(!homepage.includes('classList.add("intro-pending")'));
const scripts = [...new Set([...homepage.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]))];
let scriptBytes = 0;
let scriptGzip = 0;
for (const url of scripts) {
  const body = Buffer.from(await (await fetch(new URL(url, base))).arrayBuffer());
  scriptBytes += body.length;
  scriptGzip += gzipSync(body).length;
}
const result = {
  generatedAt: new Date().toISOString(),
  products: data.volumes.length,
  verifiedProductHtml: verified,
  catalogue: { rawBytes: Buffer.byteLength(indexText), gzipBytes: gzipSync(indexText).length },
  oneProductDetails: { rawBytes: Buffer.byteLength(detailText), gzipBytes: gzipSync(detailText).length },
  homepage: { rawBytes: Buffer.byteLength(homepage), gzipBytes: gzipSync(homepage).length, initialScripts: scripts.length, scriptBytes, scriptGzip },
  http,
  missingProduct: { status: missing.status, noindex: missingHtml.includes('name="robots" content="noindex"') },
  note: "Local production HTTP/HTML checks and gzip estimates; not a throttled mobile or real-user Web Vitals measurement.",
};
await writeFile("performance-results.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
