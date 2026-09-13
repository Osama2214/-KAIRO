import type { MangaVolume, Series } from "@/data/manga";
import { isBook, isMerch, withVariantSummary } from "@/lib/variants";

/**
 * An anime/manga franchise as a shopper thinks of it: the books of a series
 * plus the figures and posters of the same name.
 *
 * Figures and posters carry the franchise as free text ("Naruto"), so they are
 * matched to a series by a normalised name — case, spaces and punctuation
 * ignored — against its title or its romaji title.
 */

export function franchiseKey(name: string | undefined | null): string {
  return String(name || "").toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "");
}

function seriesKeys(series: Series): string[] {
  return [franchiseKey(series.title), franchiseKey(series.romajiTitle)].filter(Boolean);
}

/** Figures and posters that belong to a series. */
export function merchForSeries(volumes: MangaVolume[], series: Series): MangaVolume[] {
  const keys = new Set(seriesKeys(series));
  return volumes.filter((v) => isMerch(v) && keys.has(franchiseKey(v.merch?.franchise))).map(withVariantSummary);
}

export interface Franchise {
  key: string;
  name: string;
  nameAr?: string;
  image: string;
  /** Set when the franchise has a series page. */
  seriesSlug?: string;
  bookCount: number;
  merchCount: number;
  /** Where the franchise card leads: the series page, or the shop filtered to it. */
  href: string;
}

/**
 * Every franchise the shop sells something from, biggest first. Series with
 * no books in stock and no merchandise are left out.
 */
export function buildFranchises(volumes: MangaVolume[], seriesList: Series[]): Franchise[] {
  const byKey = new Map<string, Franchise>();

  for (const series of seriesList) {
    const bookCount = volumes.filter((v) => isBook(v) && v.seriesSlug === series.slug && v.format !== "Box Set").length;
    const key = franchiseKey(series.title);
    if (!key) continue;
    byKey.set(key, {
      key,
      name: series.title,
      image: series.bannerImage || series.featuredImage,
      seriesSlug: series.slug,
      bookCount,
      merchCount: 0,
      href: `/series/${series.slug}`,
    });
  }

  const aliasToKey = new Map<string, string>();
  for (const series of seriesList) for (const alias of seriesKeys(series)) aliasToKey.set(alias, franchiseKey(series.title));

  for (const item of volumes) {
    if (!isMerch(item)) continue;
    const raw = item.merch?.franchise?.trim();
    const alias = franchiseKey(raw);
    if (!alias) continue;
    const key = aliasToKey.get(alias) || alias;
    const entry = byKey.get(key);
    if (entry) {
      entry.merchCount += 1;
      if (!entry.nameAr && item.merch?.franchiseAr) entry.nameAr = item.merch.franchiseAr;
    } else {
      byKey.set(key, {
        key,
        name: raw!,
        nameAr: item.merch?.franchiseAr,
        image: item.coverImage,
        bookCount: 0,
        merchCount: 1,
        href: `/shop?franchise=${encodeURIComponent(alias)}`,
      });
    }
  }

  return [...byKey.values()]
    .filter((f) => f.bookCount + f.merchCount > 0)
    .sort((a, b) => b.bookCount + b.merchCount - (a.bookCount + a.merchCount));
}
