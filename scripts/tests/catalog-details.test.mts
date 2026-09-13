import { test } from "node:test";
import assert from "node:assert/strict";
import { detailsOf, hasOmittedDetails, mergeDetails, restoreOmittedDetails, slimVolume } from "@/lib/catalogDetails";
import type { MangaVolume } from "@/data/manga";

const full = {
  id: "nr-003", title: "Bridge of Courage", price: 100, stock: 5, coverImage: "c.webp",
  synopsis: "English text", synopsisAr: "نص عربي", previewPages: ["p1", "p2"],
} as unknown as MangaVolume;

test("slim drops long text, keeps the rest, and marks the product", () => {
  const slim = slimVolume(full);
  assert.equal(slim.synopsis, "");
  assert.deepEqual(slim.previewPages, []);
  assert.equal(slim.synopsisAr, undefined);
  assert.equal(slim.title, "Bridge of Courage");
  assert.ok(hasOmittedDetails(slim));
  assert.ok(!hasOmittedDetails(full));
});

test("merge restores details only onto marked products", () => {
  const slim = slimVolume(full);
  const other = { ...full, id: "x", synopsis: "edited" } as MangaVolume;
  const merged = mergeDetails([slim, other], [detailsOf(full), { id: "x", synopsis: "server", previewPages: [] }]);
  assert.equal(merged[0].synopsis, "English text");
  assert.deepEqual(merged[0].previewPages, ["p1", "p2"]);
  assert.ok(!hasOmittedDetails(merged[0]));
  assert.equal(merged[1].synopsis, "edited", "an unmarked (possibly edited) product is left alone");
  assert.equal(mergeDetails([other], [detailsOf(full)])[0], other);
});

test("a save of a slim product keeps the stored text", () => {
  const edited = { ...slimVolume(full), price: 90 };
  const [saved] = restoreOmittedDetails([edited], [full]) as MangaVolume[];
  assert.equal(saved.price, 90);
  assert.equal(saved.synopsis, "English text");
  assert.equal(saved.synopsisAr, "نص عربي");
  assert.deepEqual(saved.previewPages, ["p1", "p2"]);
  assert.ok(!hasOmittedDetails(saved));
});

test("a save of a fully loaded product is taken as sent", () => {
  const edited = { ...full, synopsis: "New text" };
  const [saved] = restoreOmittedDetails([edited], [full]) as MangaVolume[];
  assert.equal(saved.synopsis, "New text");
});
