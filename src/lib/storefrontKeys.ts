/**
 * Every part of the storefront a curator can edit, and the only keys the
 * server will store.
 *
 * This list was written out three times — in the sync component, in the store's
 * own `syncToNeon`, and again as the server's allow-list — and the copies had
 * already begun to drift. A key added to one of them would be saved by the
 * automatic push and silently dropped by the Sync button, or accepted by the
 * client and discarded by the server, with nothing to say so.
 */
export const STOREFRONT_DATA_KEYS = [
  "volumes",
  "series",
  "genres",
  "formats",
  "heroContent",
  "announcement",
  "shippingConfig",
  "editorialConfig",
  "featuredSeriesConfig",
  "genreBentoConfig",
  "trendingConfig",
  "boxSetsConfig",
  "tickerConfig",
  "newReleasesConfig",
  "mangaDiscoveryConfig",
  "heroArabicContent",
  "announcementArabic",
  "shippingArabicConfig",
  "editorialArabicConfig",
  "newReleasesArabicConfig",
  "mangaDiscoveryArabicConfig",
  "trendingArabicConfig",
  "boxSetsArabicConfig",
  "tickerArabicConfig",
  "genreBentoArabicConfig",
] as const;

export type StorefrontDataKey = (typeof STOREFRONT_DATA_KEYS)[number];
