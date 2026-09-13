// @ts-nocheck — run with node --experimental-strip-types, not part of the app build.
/**
 * Unit checks for src/lib/variants.ts and its interplay with bundles.
 *   node --experimental-strip-types scripts/tests/variants.test.mts
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { toCatalogRows, withVariantSummary, applyVariantStock, validateProduct, validateCatalogue, variantRowId, parentIdOf, indexCatalogRows, isMerch } from "../../src/lib/variants.ts";
import { expandToPhysicalUnits, indexById } from "../../src/lib/bundle.ts";

const book = { id: "nr-001", title: "Book", price: 100, originalPrice: 120, stock: 5, format: "Manga" } as any;
const box = { id: "nr-box", title: "Box", price: 150, stock: 0, format: "Box Set", bundleOf: ["nr-001"] } as any;
const poster = {
  id: "poster-naruto", title: "Naruto Poster", productType: "poster", format: "Poster", price: 0, stock: 0,
  promo: { percent: 10, endsAt: "2999-01-01T00:00:00Z" },
  variants: [
    { sku: "a3", label: "A3", price: 150, originalPrice: 200, stock: 4 },
    { sku: "a2", label: "A2", price: 250, stock: 2 },
  ],
} as any;

test("books pass through; each variant becomes a row", () => {
  const rows = toCatalogRows([book, box, poster]);
  assert.deepEqual(rows.map((r) => r.id), ["nr-001", "nr-box", "poster-naruto~a3", "poster-naruto~a2"]);
  const a3 = rows[2];
  assert.equal(a3.price, 150); assert.equal(a3.originalPrice, 200); assert.equal(a3.stock, 4);
  assert.equal(a3.parentId, "poster-naruto"); assert.equal(a3.variantLabel, "A3");
  assert.equal((a3 as any).variants, undefined); assert.equal(a3.bundleOf, undefined);
  assert.deepEqual(a3.promo, poster.promo, "variant inherits the product offer");
});

test("summary = cheapest price, total stock", () => {
  const s = withVariantSummary(poster);
  assert.equal(s.price, 150); assert.equal(s.originalPrice, 200); assert.equal(s.stock, 6);
  assert.equal(withVariantSummary(book), book);
  assert.equal(withVariantSummary({ ...poster, variants: [] }).stock, 0);
});

test("live stock is written back per variant", () => {
  const [b, p] = applyVariantStock([book, poster], new Map([["poster-naruto~a2", 0], ["nr-001", 99]]));
  assert.equal(b, book, "books untouched here (handled by caller)");
  assert.equal(p.variants![1].stock, 0); assert.equal(p.variants![0].stock, 4); assert.equal(p.stock, 4);
});

test("ids", () => {
  assert.equal(variantRowId("x", "a3"), "x~a3");
  assert.equal(parentIdOf("x~a3"), "x"); assert.equal(parentIdOf("nr-001"), "nr-001");
  assert.ok(indexCatalogRows([book, poster]).has("poster-naruto~a2"));
  assert.equal(isMerch(book), false); assert.equal(isMerch(poster), true);
});

test("validation", () => {
  assert.deepEqual(validateProduct(poster), []);
  assert.deepEqual(validateProduct(book), []);
  assert.ok(validateProduct({ ...poster, variants: [] }).length);
  assert.ok(validateProduct({ ...poster, variants: [poster.variants[0], { ...poster.variants[0] }] }).some((e) => e.includes("twice")));
  assert.ok(validateProduct({ ...poster, variants: [{ sku: "A 3", label: "x", price: 1, stock: 1 }] }).length);
  assert.ok(validateProduct({ ...poster, variants: [{ sku: "a3", label: "x", price: 0, stock: 1 }] }).length);
  assert.ok(validateProduct({ ...poster, variants: [{ sku: "a3", label: "x", price: 5, stock: 1.5 }] }).length);
  assert.ok(validateProduct({ ...poster, variants: [{ sku: "a3", label: "", price: 5, stock: 1 }] }).length);
  assert.ok(validateProduct({ ...poster, id: "a~b" }).length);
  assert.ok(validateProduct({ ...poster, id: "x".repeat(62) }).length, "row id too long");
  assert.ok(validateProduct({ ...book, variants: poster.variants }).length, "books cannot have variants");
  assert.ok(validateCatalogue([book, book]).some((e) => e.includes("more than one")));
  assert.ok(validateCatalogue([poster, { ...box, bundleOf: ["poster-naruto"] }]).some((e) => e.includes("only contain books")));
  assert.deepEqual(validateCatalogue([book, box, poster]), []);
});

test("reservation expansion works on variant rows", () => {
  const byId = indexById(toCatalogRows([book, box, poster]) as any);
  const { units, unknown } = expandToPhysicalUnits([{ id: "poster-naruto~a3", quantity: 2 }, { id: "nr-box", quantity: 1 }, { id: "nr-001", quantity: 1 }], byId);
  assert.deepEqual(unknown, []);
  assert.equal(units.get("poster-naruto~a3"), 2); assert.equal(units.get("nr-001"), 2); assert.equal(units.has("poster-naruto"), false);
  assert.deepEqual(expandToPhysicalUnits([{ id: "poster-naruto", quantity: 1 }], byId).unknown, ["poster-naruto"], "parent is not purchasable");
});
