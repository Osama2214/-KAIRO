// @ts-nocheck — node --import ./scripts/tests/alias-loader.mjs --test scripts/tests/cart-lines.test.mts
import assert from "node:assert/strict";
import { test } from "node:test";

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { describeLine, lineHref, productHref, volumeBadgeLabel } = await import("../../src/lib/utils.ts");
const { useCartStore } = await import("../../src/store/useCartStore.ts");

const book = { id: "nr-001", title: "The Tests of the Ninja", seriesTitle: "Naruto", volumeNumber: 1, price: 100, stock: 5, format: "Manga", coverImage: "c" };
const poster = { id: "poster-x", title: "Naruto Poster", productType: "poster", format: "Poster", price: 150, stock: 6, coverImage: "p",
  variants: [{ sku: "a3", label: "A3", labelAr: "مقاس A3", price: 150, stock: 2 }, { sku: "a2", label: "A2", price: 250, stock: 0 }] };

test("labels: books unchanged, merch named by variant", () => {
  assert.deepEqual(describeLine({ ...book }), { eyebrow: "Naruto", title: "Vol. 1 — The Tests of the Ninja", detail: "Manga" });
  const line = { title: "Naruto Poster", productType: "poster", parentId: "poster-x", variantLabel: "A3", variantLabelAr: "مقاس A3", volumeNumber: 0 };
  assert.deepEqual(describeLine(line), { eyebrow: "Poster", title: "Naruto Poster — A3", detail: "Poster" });
  assert.equal(describeLine(line, true).title, "Naruto Poster — مقاس A3");
  assert.equal(lineHref({ volumeId: "poster-x~a3", parentId: "poster-x" }), "/shop/poster-x");
  assert.equal(lineHref({ volumeId: "poster-x~a3" }), "/shop/poster-x");
  assert.equal(lineHref({ volumeId: "nr-001" }), "/manga/nr-001");
  assert.equal(productHref(poster), "/shop/poster-x"); assert.equal(productHref(book), "/manga/nr-001");
  assert.equal(volumeBadgeLabel({ ...book }, false), "VOL. 01");
  assert.equal(volumeBadgeLabel({ volumeNumber: 0, productType: "figure" }, true), "فيجر");
});

test("cart: book as before; merch needs a valid in-stock variant", () => {
  const cart = useCartStore.getState();
  cart.clearCart();
  cart.addItem(book, 2);
  cart.addItem(poster, 1);                 // no variant → ignored
  cart.addItem(poster, 1, "zz");           // unknown → ignored
  cart.addItem(poster, 1, "a2");           // out of stock → ignored
  cart.addItem(poster, 5, "a3");           // clamped to 2
  const items = useCartStore.getState().items;
  assert.equal(items.length, 2);
  const p = items.find((i) => i.volumeId === "poster-x~a3");
  assert.equal(p.quantity, 2); assert.equal(p.price, 150); assert.equal(p.variantLabel, "A3"); assert.equal(p.parentId, "poster-x"); assert.equal(p.maxStock, 2);
  cart.addItem(poster, 1, "a3");
  assert.equal(useCartStore.getState().items.find((i) => i.volumeId === "poster-x~a3").quantity, 2, "still capped");
  assert.equal(useCartStore.getState().getSubtotal(), 2 * 100 + 2 * 150);
});

test("cart: hydrate resolves variant rows, drops removed variants, follows price/stock", () => {
  const cart = useCartStore.getState();
  const updated = { ...poster, variants: [{ ...poster.variants[0], price: 175, stock: 1 }] };
  cart.hydrateFromCatalog([book, updated]);
  const p = useCartStore.getState().items.find((i) => i.volumeId === "poster-x~a3");
  assert.equal(p.price, 175); assert.equal(p.quantity, 1); assert.equal(p.maxStock, 1);
  cart.hydrateFromCatalog([book, { ...poster, variants: [poster.variants[1]] }]);
  assert.equal(useCartStore.getState().items.some((i) => i.volumeId === "poster-x~a3"), false);
  assert.equal(useCartStore.getState().items.length, 1);
});
