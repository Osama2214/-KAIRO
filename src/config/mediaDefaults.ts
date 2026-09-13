/**
 * Fallback artwork, served from our own media bucket.
 *
 * These used to be hard-coded Amazon, Unsplash and CloudFront URLs, so every
 * newly created volume, series or genre entered the catalogue pointing at a
 * host we do not control — one that can rate-limit us, change the artwork, or
 * disappear. Next's optimiser also only accepts hosts listed in next.config,
 * so an outside URL is one config edit away from rendering nothing at all.
 *
 * The bucket's public base is repeated literally here (as it is throughout the
 * seed catalogue) rather than read from an env var, because these constants are
 * imported by client components.
 */
const MEDIA_BASE = "https://pub-bcd1e08babc14c4dae45de0caa3e4b0f.r2.dev/media";

/** Portrait 2:3 placeholder for a volume cover, genre card, or series poster. */
export const PLACEHOLDER_COVER = `${MEDIA_BASE}/placeholder-cover.webp`;

/** Wide placeholder for series banners and other letterboxed artwork. */
export const PLACEHOLDER_BANNER = `${MEDIA_BASE}/placeholder-banner.webp`;

/** Decorative cover used by the intro animation's mock product card. */
export const INTRO_SHOWCASE_COVER = `${MEDIA_BASE}/b70624d97a61116d9e01c948f14c172d500a5d0a.webp`;
