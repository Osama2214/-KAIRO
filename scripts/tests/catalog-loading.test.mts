import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { requestCatalogIndex, requestCatalogDetails } from "@/lib/catalogRequests";
import { productWithDetails, slimVolume, hasOmittedDetails } from "@/lib/catalogDetails";
import { seedStorefrontFromServer, useStorefrontStore, ensureCatalogDetails, isMergingCatalogDetails } from "@/store/useStorefrontStore";
import type { MangaVolume } from "@/data/manga";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const product = { id: "new-after-build", title: "New volume", synopsis: "Full description", synopsisAr: "وصف", previewPages: ["sample.webp"], price: 120, stock: 3, seriesSlug: "new-series" } as MangaVolume;
const reply = (data: unknown, status = 200) => new Response(JSON.stringify({ success: status === 200, data }), { status });

test("a small complete index and products added after build are ready immediately", () => {
  seedStorefrontFromServer({ volumes: [slimVolume(product)], series: [] });
  assert.equal(useStorefrontStore.getInitialState().catalogLoaded, true);
  assert.equal(useStorefrontStore.getState().catalogLoaded, true);
  assert.equal(useStorefrontStore.getInitialState().volumes[0].id, product.id);
});

test("an intentionally empty catalogue stays empty", () => {
  seedStorefrontFromServer({ volumes: [], series: [] });
  assert.deepEqual(useStorefrontStore.getInitialState().volumes, []);
  assert.deepEqual(useStorefrontStore.getState().volumes, []);
});

test("concurrent catalogue requests share one fetch and accept an empty index", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return reply({ volumes: [], series: [] }); };
  const [first, second] = await Promise.all([requestCatalogIndex(), requestCatalogIndex()]);
  assert.equal(calls, 1);
  assert.deepEqual(first.volumes, []);
  assert.equal(first, second);
});

test("network and HTTP failures are retryable, never valid empty catalogues", async () => {
  globalThis.fetch = async () => { throw new TypeError("offline"); };
  await assert.rejects(requestCatalogIndex(), /offline/);
  globalThis.fetch = async () => reply({ volumes: [], series: [] }, 503);
  await assert.rejects(requestCatalogIndex(), /503/);
  globalThis.fetch = async () => reply({ volumes: [slimVolume(product)], series: [] });
  assert.equal(((await requestCatalogIndex()).volumes as MangaVolume[])[0].id, product.id);
});

test("malformed and null responses cannot mark the catalogue complete", async () => {
  for (const data of [null, {}, { volumes: [] }]) {
    globalThis.fetch = async () => reply(data);
    await assert.rejects(requestCatalogIndex());
  }
});

test("reader requests only the selected product and encodes the id", async () => {
  let url = "";
  globalThis.fetch = async (input) => {
    url = String(input);
    return reply({ details: [{ id: "a/b?c", synopsis: "text", previewPages: [] }] });
  };
  await requestCatalogDetails("a/b?c");
  assert.equal(url, "/api/storefront?view=details&id=a%2Fb%3Fc");
});

test("missing details are an error, not a permanently empty preview", async () => {
  globalThis.fetch = async () => reply({ details: [] });
  await assert.rejects(requestCatalogDetails(product.id));
});

test("selected product renders independently of a missing index entry", () => {
  assert.equal(productWithDetails(product, undefined), product);
  const resolved = productWithDetails(product, { ...slimVolume(product), price: 150, stock: 2 });
  assert.equal(resolved.price, 150);
  assert.equal(resolved.stock, 2);
  assert.equal(resolved.synopsis, product.synopsis);
  assert.deepEqual(resolved.previewPages, product.previewPages);
  assert.equal(hasOmittedDetails(resolved), false);
});

test("fully loaded curator edits override route text, including deliberate blanks", () => {
  const resolved = productWithDetails(product, { ...product, synopsis: "", previewPages: [] });
  assert.equal(resolved.synopsis, "");
  assert.deepEqual(resolved.previewPages, []);
});

test("detail hydration is deduplicated and identified as server data, not an edit", async () => {
  useStorefrontStore.setState({ volumes: [slimVolume(product)], series: [] });
  let calls = 0;
  let hydrationFlag = false;
  const stop = useStorefrontStore.subscribe(() => { hydrationFlag = isMergingCatalogDetails(); });
  globalThis.fetch = async () => { calls++; return reply({ details: [product] }); };
  await Promise.all([ensureCatalogDetails(product.id), ensureCatalogDetails(product.id)]);
  stop();
  assert.equal(calls, 1);
  assert.equal(hydrationFlag, true);
  assert.equal(isMergingCatalogDetails(), false);
  assert.equal(useStorefrontStore.getState().volumes[0].synopsis, product.synopsis);
  await ensureCatalogDetails(product.id);
  assert.equal(calls, 1);
});
