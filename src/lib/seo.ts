import "server-only";

import { cache } from "react";
import { ALL_SERIES, ALL_VOLUMES, MangaVolume, Series } from "@/data/manga";

/**
 * Canonical site origin. Every page used to inherit one hard-coded title and
 * description from the root layout, and without a metadataBase the relative
 * Open Graph image paths resolved to nothing — so shared links (WhatsApp in
 * particular) rendered no preview at all.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
  // The stable alias for the production deployment. `VERCEL_URL` is the
  // per-deployment hostname, which changes on every push, so it would hand
  // crawlers a canonical that stops existing the next time we deploy.
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "https://animeverse-store.vercel.app"
);

export const SITE_NAME = "AnimeVerse";
// A purpose-built 1200x630 card. The raw logo is a ~2.85:1 banner, which
// crawlers letterbox or crop badly in the preview slot.
export const DEFAULT_OG_IMAGE = "/animeverse-og.png";

/**
 * Reads the live catalogue for metadata, falling back to the bundled data if
 * the database is unreachable. Cached per request so a page and its layout
 * never query twice.
 */
export const getCatalog = cache(async (): Promise<{ volumes: MangaVolume[]; series: Series[] }> => {
  try {
    const { getStorefrontData } = await import("@/lib/storefrontDataStore");
    const data = await getStorefrontData();
    const volumes = Array.isArray(data?.volumes) && data.volumes.length > 0
      ? (data.volumes as MangaVolume[])
      : ALL_VOLUMES;
    const series = Array.isArray(data?.series) && data.series.length > 0
      ? (data.series as Series[])
      : ALL_SERIES;
    return { volumes, series };
  } catch {
    return { volumes: ALL_VOLUMES, series: ALL_SERIES };
  }
});

/** Absolute URL for an image path that may already be absolute. */
export function absoluteImage(src: string | undefined): string {
  if (!src) return `${SITE_URL}${DEFAULT_OG_IMAGE}`;
  return /^https?:\/\//.test(src) ? src : `${SITE_URL}${src.startsWith("/") ? src : `/${src}`}`;
}

/** Trims a synopsis to a usable meta description. */
export function metaDescription(text: string | undefined, fallback: string): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  return clean.length > 155 ? `${clean.slice(0, 152).trimEnd()}…` : clean;
}
