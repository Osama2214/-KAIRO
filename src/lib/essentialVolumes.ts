import type { MangaVolume } from "@/data/manga";
import { isBook, isMerch } from "@/lib/variants";

/**
 * Extracts only the initial essential products needed for server-rendering
 * the above-the-fold and home sections (Hero, Trending, New Releases, Box Sets, Deals, Merch).
 *
 * This reduces the initial Root Layout HTML payload by ~90% (from 500 items down to ~35-45 items).
 * The full catalog is hydrated on-demand in the background by StorefrontDataSync via /api/storefront.
 */
export function extractEssentialVolumes(
  volumes: MangaVolume[],
  snapshot?: Record<string, unknown> | null
): MangaVolume[] {
  if (!Array.isArray(volumes) || volumes.length <= 45) return volumes;

  const essentialIds = new Set<string>();

  // 1. Hero featured volume
  const hero = snapshot?.hero as { featuredVolumeId?: string } | undefined;
  if (hero?.featuredVolumeId) {
    essentialIds.add(hero.featuredVolumeId);
  }

  // 2. Trending picks (curated or top-rated)
  const trending = snapshot?.trending as { minCards?: number } | undefined;
  const minTrending = Math.max(8, Math.min(16, trending?.minCards ?? 10));
  const trendingPicks = volumes.filter((v) => v.isTrending);
  trendingPicks.slice(0, minTrending).forEach((v) => essentialIds.add(v.id));
  if (trendingPicks.length < minTrending) {
    const fillers = volumes
      .filter((v) => !essentialIds.has(v.id))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, minTrending - trendingPicks.length);
    fillers.forEach((v) => essentialIds.add(v.id));
  }

  // 3. New releases
  const newReleases = volumes.filter((v) => v.isNewRelease && isBook(v));
  newReleases.slice(0, 8).forEach((v) => essentialIds.add(v.id));
  if (newReleases.length < 8) {
    volumes
      .filter((v) => isBook(v) && v.format !== "Box Set" && !essentialIds.has(v.id))
      .sort((a, b) => String(b.publishDate || "").localeCompare(String(a.publishDate || "")))
      .slice(0, 8 - newReleases.length)
      .forEach((v) => essentialIds.add(v.id));
  }

  // 4. Box sets
  volumes
    .filter((v) => v.format === "Box Set")
    .slice(0, 8)
    .forEach((v) => essentialIds.add(v.id));

  // 5. Active deals
  volumes
    .filter((v) => Number(v.promo?.percent) > 0 && v.stock > 0)
    .slice(0, 8)
    .forEach((v) => essentialIds.add(v.id));

  // 6. Merch showcase (figures/posters)
  const shopConfig = snapshot?.shopShowcase as { productIds?: string[] } | undefined;
  (shopConfig?.productIds || []).forEach((id) => essentialIds.add(id));
  volumes
    .filter((v) => isMerch(v) && !essentialIds.has(v.id))
    .slice(0, 8)
    .forEach((v) => essentialIds.add(v.id));

  const essentialList = volumes.filter((v) => essentialIds.has(v.id));
  return essentialList.length >= 20 ? essentialList : volumes.slice(0, 40);
}
