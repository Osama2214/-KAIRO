import { test } from "node:test";
import assert from "node:assert/strict";
import { recommend } from "@/lib/recommendations";
import type { MangaVolume } from "@/data/manga";

const NOW = Date.parse("2026-09-13T12:00:00Z");
const DAY = 86_400_000;

function book(series: string, n: number, extra: Partial<MangaVolume> = {}): MangaVolume {
  return {
    id: `${series}-${n}`, seriesSlug: series, seriesTitle: series[0].toUpperCase() + series.slice(1),
    volumeNumber: n, title: `${series} ${n}`, price: 100, stock: 10, format: "Paperback",
    genre: series === "naruto" ? ["Action", "Ninja"] : series === "bleach" ? ["Action", "Supernatural"] : ["Romance"],
    coverImage: "x", ...extra,
  } as unknown as MangaVolume;
}
function figure(id: string, franchise: string, stock = 5): MangaVolume {
  return {
    id, title: id, productType: "figure", format: "Figure", price: 0, stock: 0, coverImage: "x",
    merch: { franchise }, variants: [{ sku: "std", label: "Standard", price: 900, stock }],
  } as unknown as MangaVolume;
}

const catalogue = [
  ...[1, 2, 3, 4, 5].map((n) => book("naruto", n)),
  book("naruto", 0, { id: "naruto-box", format: "Box Set" }),
  ...[1, 2].map((n) => book("bleach", n)),
  ...[1, 2].map((n) => book("romance", n)),
  figure("fig-naruto", "NARUTO"),
  figure("fig-bleach", "Bleach"),
  figure("fig-naruto-soldout", "Naruto", 0),
];

test("no history, no recommendations", () => {
  assert.deepEqual(recommend(catalogue, [], { now: NOW }), []);
});

test("continues the series after the furthest volume viewed", () => {
  const recs = recommend(catalogue, [{ id: "naruto-2", at: NOW, count: 1 }], { now: NOW });
  assert.equal(recs[0].item.id, "naruto-3");
  assert.equal(recs[0].becauseOf, "naruto-2");
  const ids = recs.map((r) => r.item.id);
  assert.ok(!ids.includes("naruto-1"), "earlier volumes are not pushed");
  assert.ok(!ids.includes("naruto-2"), "viewed item excluded");
  assert.ok(ids.includes("fig-naruto"), "matching figure suggested (case-insensitive franchise)");
  assert.ok(!ids.includes("fig-naruto-soldout"), "sold out excluded");
  assert.ok(ids.indexOf("bleach-1") < ids.indexOf("romance-1") || !ids.includes("romance-1"), "genre overlap ranks higher");
});

test("box set appears once interest is strong", () => {
  const weak = recommend(catalogue, [{ id: "naruto-1", at: NOW, count: 1 }], { now: NOW }).map((r) => r.item.id);
  assert.ok(!weak.includes("naruto-box"));
  const strong = recommend(catalogue, [
    { id: "naruto-1", at: NOW, count: 1 },
    { id: "naruto-2", at: NOW, count: 2 },
  ], { now: NOW }).map((r) => r.item.id);
  assert.ok(strong.includes("naruto-box"));
});

test("a figure view leads to volume 1 of its series", () => {
  const ids = recommend(catalogue, [{ id: "fig-bleach", at: NOW, count: 1 }], { now: NOW }).map((r) => r.item.id);
  assert.equal(ids[0], "bleach-1");
});

test("recent views outweigh old ones and cart items are excluded", () => {
  const recs = recommend(catalogue, [
    { id: "bleach-1", at: NOW, count: 1 },
    { id: "naruto-1", at: NOW - 14 * DAY, count: 1 },
  ], { now: NOW, exclude: ["bleach-2"] });
  const ids = recs.map((r) => r.item.id);
  assert.ok(!ids.includes("bleach-2"));
  assert.equal(ids[0], "fig-bleach");
});
