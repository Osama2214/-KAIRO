import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFranchises } from "@/lib/franchise";
import type { MangaVolume, Series } from "@/data/manga";

function series(extra: Partial<Series> = {}): Series {
  return {
    slug: "one-piece",
    title: "One Piece",
    japaneseTitle: "",
    romajiTitle: "One Piece",
    author: "Eiichiro Oda",
    artist: "Eiichiro Oda",
    genres: ["Adventure"],
    description: "",
    quote: "",
    bannerImage: "banner.webp",
    featuredImage: "featured.webp",
    status: "Ongoing",
    totalVolumes: 1,
    volumes: [],
    ...extra,
  };
}

const volume = {
  id: "one-piece-1",
  productType: "book",
  seriesSlug: "one-piece",
  seriesTitle: "One Piece",
  format: "Manga",
} as MangaVolume;

test("Shop by Franchise prefers a series card image", () => {
  const [franchise] = buildFranchises([volume], [series({ franchiseImage: "card.webp" })]);
  assert.equal(franchise.image, "card.webp");
});

test("Shop by Franchise falls back to the banner when no card image is set", () => {
  const [franchise] = buildFranchises([volume], [series({ franchiseImage: "  " })]);
  assert.equal(franchise.image, "banner.webp");
});
