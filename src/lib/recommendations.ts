import type { MangaVolume } from "@/data/manga";
import { franchiseKey } from "@/lib/franchise";
import { isBook, isMerch, withVariantSummary } from "@/lib/variants";

/**
 * "Picked for you": recommendations from what this shopper has viewed.
 *
 * Pure and deterministic — the same history and catalogue always give the
 * same row, so it can be tested without a browser. Signals, strongest first:
 *
 *  1. Continue a series: the next unread volumes after the furthest one viewed.
 *  2. The box set of a series they keep coming back to.
 *  3. Same franchise across types: figures/posters for a series they read,
 *     and volume 1 of the series behind a figure they looked at.
 *  4. Books sharing the genres of the books they viewed.
 *  5. Other figures/posters of the same type they browsed.
 *
 * Each viewed product contributes by how recent it is (halving every three
 * days) and how often it was revisited. Anything already viewed, already in
 * the cart, or out of stock is left out.
 */

export interface ViewSignal {
  id: string;
  at: number;
  count: number;
}

export interface Recommendation {
  item: MangaVolume;
  score: number;
  /** Id of the viewed product that contributed most, for "because you viewed…". */
  becauseOf: string;
}

const HALF_LIFE_MS = 3 * 24 * 60 * 60 * 1000;

function weightOf(view: ViewSignal, now: number): number {
  const age = Math.max(0, now - view.at);
  const recency = Math.pow(0.5, age / HALF_LIFE_MS);
  const revisits = 1 + Math.log2(Math.max(1, view.count));
  return recency * revisits;
}

export function recommend(
  catalogue: MangaVolume[],
  views: ViewSignal[],
  options: { now: number; exclude?: Iterable<string>; limit?: number }
): Recommendation[] {
  const { now, limit = 8 } = options;
  const byId = new Map(catalogue.map((v) => [v.id, withVariantSummary(v)]));
  const viewed = views.filter((v) => byId.has(v.id));
  if (viewed.length === 0) return [];

  const viewedIds = new Set(viewed.map((v) => v.id));
  const excluded = new Set([...(options.exclude || [])].map((id) => String(id).split("~")[0]));
  const scores = new Map<string, { score: number; best: number; becauseOf: string }>();

  const add = (id: string, points: number, source: string) => {
    if (points <= 0 || viewedIds.has(id) || excluded.has(id)) return;
    const item = byId.get(id);
    if (!item || item.stock <= 0) return;
    const entry = scores.get(id) || { score: 0, best: 0, becauseOf: source };
    entry.score += points;
    if (points > entry.best) {
      entry.best = points;
      entry.becauseOf = source;
    }
    scores.set(id, entry);
  };

  // Group the catalogue once.
  const booksBySeries = new Map<string, MangaVolume[]>();
  const merchByFranchise = new Map<string, MangaVolume[]>();
  const seriesKeyToSlug = new Map<string, string>();
  for (const item of byId.values()) {
    if (isBook(item)) {
      const list = booksBySeries.get(item.seriesSlug) || [];
      list.push(item);
      booksBySeries.set(item.seriesSlug, list);
      seriesKeyToSlug.set(franchiseKey(item.seriesTitle), item.seriesSlug);
    } else {
      const key = franchiseKey(item.merch?.franchise);
      if (!key) continue;
      const list = merchByFranchise.get(key) || [];
      list.push(item);
      merchByFranchise.set(key, list);
    }
  }

  // Per series: the furthest volume viewed and the total interest in it.
  const seriesInterest = new Map<string, { weight: number; furthest: number; source: string }>();
  const genreWeight = new Map<string, number>();
  const typeWeight = new Map<string, { weight: number; source: string }>();

  for (const view of viewed) {
    const item = byId.get(view.id)!;
    const w = weightOf(view, now);
    if (isBook(item)) {
      const s = seriesInterest.get(item.seriesSlug) || { weight: 0, furthest: -1, source: item.id };
      s.weight += w;
      if (item.format !== "Box Set" && Number(item.volumeNumber) > s.furthest) {
        s.furthest = Number(item.volumeNumber);
        s.source = item.id;
      }
      seriesInterest.set(item.seriesSlug, s);
      for (const g of item.genre || []) genreWeight.set(g.toLowerCase(), (genreWeight.get(g.toLowerCase()) || 0) + w);
    } else {
      const key = franchiseKey(item.merch?.franchise);
      // Merch of the same franchise.
      for (const other of merchByFranchise.get(key) || []) add(other.id, 55 * w, item.id);
      // The series behind it: start at volume 1.
      const slug = seriesKeyToSlug.get(key);
      if (slug) {
        const first = (booksBySeries.get(slug) || [])
          .filter((b) => b.format !== "Box Set")
          .sort((a, b) => Number(a.volumeNumber) - Number(b.volumeNumber))[0];
        if (first) add(first.id, 45 * w, item.id);
      }
      const t = typeWeight.get(item.productType || "") || { weight: 0, source: item.id };
      t.weight += w;
      typeWeight.set(item.productType || "", t);
    }
  }

  for (const [slug, interest] of seriesInterest) {
    const books = booksBySeries.get(slug) || [];
    const volumes = books.filter((b) => b.format !== "Box Set").sort((a, b) => Number(a.volumeNumber) - Number(b.volumeNumber));
    // 1. The next volumes after the furthest one viewed.
    const next = volumes.filter((b) => Number(b.volumeNumber) > interest.furthest).slice(0, 3);
    next.forEach((b, i) => add(b.id, (100 - i * 20) * interest.weight, interest.source));
    // 2. The box set, once the series has real interest (several volumes or revisits).
    if (interest.weight >= 1.5) {
      for (const box of books.filter((b) => b.format === "Box Set")) add(box.id, 70 * interest.weight, interest.source);
    }
    // 3. Figures and posters of this series.
    const title = books[0]?.seriesTitle;
    for (const m of merchByFranchise.get(franchiseKey(title)) || []) add(m.id, 50 * interest.weight, interest.source);
  }

  // 4. Books sharing genres, starting points of other series only.
  if (genreWeight.size > 0) {
    for (const [slug, books] of booksBySeries) {
      if (seriesInterest.has(slug)) continue;
      const volumes = books.filter((b) => b.format !== "Box Set").sort((a, b) => Number(a.volumeNumber) - Number(b.volumeNumber));
      const first = volumes[0];
      if (!first) continue;
      const overlap = (first.genre || []).reduce((sum, g) => sum + (genreWeight.get(g.toLowerCase()) || 0), 0);
      const source = viewed.find((v) => isBook(byId.get(v.id)!))?.id || viewed[0].id;
      // Capped so a similar series never outranks continuing the one being read.
      add(first.id, Math.min(40, 12 * overlap) + (Number(first.rating) || 0), source);
    }
  }

  // 5. More of the product type they browse.
  for (const [type, t] of typeWeight) {
    for (const item of byId.values()) {
      if (isMerch(item) && item.productType === type) add(item.id, 15 * t.weight + (item.isFeatured ? 3 : 0), t.source);
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1].score - a[1].score || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id, entry]) => ({ item: byId.get(id)!, score: entry.score, becauseOf: entry.becauseOf }));
}
