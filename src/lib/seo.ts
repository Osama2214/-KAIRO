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
  "https://www.animeverse-store.com"
);

export const SITE_NAME = "AnimeVerse";
// A purpose-built 1200x630 card. The raw logo is a ~2.85:1 banner, which
// crawlers letterbox or crop badly in the preview slot.
export const DEFAULT_OG_IMAGE = "/animeverse-og.png";

/**
 * Reads the live catalogue once per render. Infrastructure failures must
 * propagate: substituting demo data would cache real products as missing.
 */
export const getCatalog = cache(async (): Promise<{ volumes: MangaVolume[]; series: Series[] }> => {
  try {
    const { getStorefrontSnapshot } = await import("@/lib/storefrontSnapshot");
    const data = await getStorefrontSnapshot();
    const volumes = Array.isArray(data?.volumes) ? (data.volumes as MangaVolume[]) : ALL_VOLUMES;
    const series = Array.isArray(data?.series) ? (data.series as Series[]) : ALL_SERIES;
    return { volumes, series };
  } catch {
    // Local development can intentionally run without a database. The bundled
    // catalogue remains a valid offline fallback; a partial server response is
    // never used because the snapshot cache returns whole payloads only.
    return { volumes: ALL_VOLUMES, series: ALL_SERIES };
  }
});

export interface StoreProfile {
  email: string;
  phone: string;
  sameAs: string[];
}

/** Pull the small public profile from a catalogue snapshot already in hand. */
export function storeProfileFromSnapshot(data: Record<string, unknown> | null | undefined): StoreProfile {
  const editorial = (data?.editorialConfig || {}) as Record<string, unknown>;
  const text = (key: string) => (typeof editorial[key] === "string" ? String(editorial[key]).trim() : "");
  return {
    email: text("contactEmail"),
    phone: text("contactPhone"),
    sameAs: ["instagramUrl", "facebookUrl", "tiktokUrl", "youtubeUrl", "xUrl"]
      .map(text)
      .filter((url) => /^https?:\/\/\S+$/i.test(url)),
  };
}

/** The store's public contact details and social profiles, as the curator set them. */
export const getStoreProfile = cache(async (): Promise<StoreProfile> => {
  try {
    const { readStorefrontSnapshot } = await import("@/lib/storefrontSnapshot");
    return storeProfileFromSnapshot(await readStorefrontSnapshot());
  } catch {
    return { email: "", phone: "", sameAs: [] };
  }
});

/** schema.org BreadcrumbList for a page's trail, root first. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: `${SITE_URL}${step.path}`,
    })),
  };
}

/** Serialises structured data for a <script type="application/ld+json">. */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

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
