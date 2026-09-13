// @ts-nocheck — integration test; needs DATABASE_URL pointing at a NON-production branch.
/**
 *   DATABASE_URL=<test branch> node --experimental-strip-types --import ./scripts/tests/alias-loader.mjs --test scripts/tests/catalogue.integration.mts
 */
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL || "";
if (!process.env.ALLOW_TEST_DB) throw new Error("Set ALLOW_TEST_DB=1 to confirm DATABASE_URL is a test branch.");
const sql = neon(url);
const store = await import("../../src/lib/storefrontDataStore.ts");

const [{ payload: original }] = await sql`SELECT payload FROM kairo_storefront_data WHERE id = 1`;
const originalRows = await sql`SELECT id, stock, active FROM kairo_catalog_items`;

const poster = {
  id: "test-poster-naruto", title: "Test Naruto Poster", productType: "poster", format: "Poster",
  seriesSlug: "", seriesTitle: "", volumeNumber: 0, japaneseTitle: "", author: "", artist: "", isbn: "", pages: 0,
  price: 0, stock: 0, rating: 0, reviewCount: 0, coverImage: "", synopsis: "Test", publishDate: "2026-09-13", genre: [], previewPages: [],
  merch: { franchise: "Naruto", paperType: "Matte 200gsm" },
  variants: [
    { sku: "a3", label: "A3", labelAr: "A3", price: 150, originalPrice: 200, stock: 3 },
    { sku: "a2", label: "A2", price: 250, stock: 1 },
  ],
};

after(async () => {
  await sql`UPDATE kairo_storefront_data SET payload = ${JSON.stringify(original)}::jsonb WHERE id = 1`;
  await sql`DELETE FROM kairo_catalog_items WHERE id LIKE 'test-poster-naruto%'`;
  for (const r of originalRows) await sql`UPDATE kairo_catalog_items SET stock = ${r.stock}, active = ${r.active} WHERE id = ${r.id}`;
});

test("save writes one row per variant and no parent row", async () => {
  await store.saveStorefrontData({ ...original, volumes: [...original.volumes, poster] });
  const rows = await sql`SELECT id, price::float AS price, stock, active FROM kairo_catalog_items WHERE id LIKE 'test-poster-naruto%' ORDER BY id`;
  assert.deepEqual(rows.map((r) => [r.id, r.price, r.stock, r.active]), [["test-poster-naruto~a2", 250, 1, true], ["test-poster-naruto~a3", 150, 3, true]]);
  const total = await sql`SELECT COUNT(*)::int n FROM kairo_catalog_items WHERE active`;
  assert.equal(total[0].n, original.volumes.length + 2, "books all still active");
});

test("read returns variant stock and product summary", async () => {
  const data = await store.getStorefrontData();
  const p = data.volumes.find((v) => v.id === poster.id);
  assert.equal(p.stock, 4); assert.equal(p.price, 150); assert.equal(p.variants[1].stock, 1);
});

test("reserve one variant only; parent id is rejected; overselling is rejected", async () => {
  const reserved = await store.reserveCatalogItems([{ id: "test-poster-naruto~a3", quantity: 2 }, { id: original.volumes[0].id, quantity: 1 }]);
  assert.equal(reserved[0].variantLabel, "A3"); assert.equal(reserved[0].price, 150);
  const [a3] = await sql`SELECT stock FROM kairo_catalog_items WHERE id = 'test-poster-naruto~a3'`;
  const [a2] = await sql`SELECT stock FROM kairo_catalog_items WHERE id = 'test-poster-naruto~a2'`;
  assert.equal(a3.stock, 1); assert.equal(a2.stock, 1);
  await assert.rejects(store.reserveCatalogItems([{ id: "test-poster-naruto", quantity: 1 }]), /no longer available/);
  await assert.rejects(store.reserveCatalogItems([{ id: "test-poster-naruto~a2", quantity: 2 }]), /enough stock/);
  const [a2b] = await sql`SELECT stock FROM kairo_catalog_items WHERE id = 'test-poster-naruto~a2'`;
  assert.equal(a2b.stock, 1, "failed reservation changed nothing");
  const data = await store.getStorefrontData();
  assert.equal(data.volumes.find((v) => v.id === poster.id).variants[0].stock, 1, "storefront reflects the sale");
});

test("promo applies to the variant price at reservation", async () => {
  const promo = { percent: 10, endsAt: "2999-01-01T00:00:00Z" };
  const [{ payload }] = await sql`SELECT payload FROM kairo_storefront_data WHERE id = 1`;
  await store.saveStorefrontData({ ...payload, volumes: payload.volumes.map((v) => v.id === poster.id ? { ...v, promo, variants: v.variants.map((x) => ({ ...x, stock: 5 })) } : v) });
  const [r] = await store.reserveCatalogItems([{ id: "test-poster-naruto~a2", quantity: 1 }]);
  assert.equal(r.price, 225);
});

test("restore puts stock back on the variant", async () => {
  const [before] = await sql`SELECT stock FROM kairo_catalog_items WHERE id = 'test-poster-naruto~a2'`;
  await store.restoreCatalogItems([{ volumeId: "test-poster-naruto~a2", quantity: 1 }]);
  const [afterRow] = await sql`SELECT stock FROM kairo_catalog_items WHERE id = 'test-poster-naruto~a2'`;
  assert.equal(afterRow.stock, before.stock + 1);
});

test("removing the product deactivates its variant rows", async () => {
  await store.saveStorefrontData(original);
  const rows = await sql`SELECT active FROM kairo_catalog_items WHERE id LIKE 'test-poster-naruto%'`;
  assert.ok(rows.length === 2 && rows.every((r) => r.active === false));
});
