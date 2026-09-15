import "server-only";

import { unstable_cache } from "next/cache";
import { getStorefrontData, STOREFRONT_CACHE_TAG } from "@/lib/storefrontDataStore";

/**
 * The catalogue, read on the server so a page can be rendered with what the
 * shop actually sells.
 *
 * Without this the store starts from the copy of the catalogue compiled into
 * the JS bundle, which is a snapshot of the database taken when the build ran.
 * Every product a curator has touched since then rendered in its build-time
 * form and only corrected itself once `/api/storefront` came back — so a
 * changed cover, price or banner visibly flickered from old to new on every
 * page load, and a product added after the build did not exist at all until
 * the fetch landed.
 *
 * Every read of the catalogue that does not need to be authoritative goes
 * through here. The whole payload leaves Neon on each uncached read, and on
 * 2026-09-13 reads that bypassed this cache (metadata, the root layout's store
 * profile, the API) used the project's entire 5 GB monthly transfer in a day.
 * Checkout, cancellations and curator saves still read the table directly.
 */

/** Busted the moment a curator saves, so an edit is never waiting on a timer. */
export { STOREFRONT_CACHE_TAG };

const loadSnapshot = unstable_cache(
  // Errors are thrown, not returned, so a database hiccup is never cached for
  // the whole revalidate window.
  async (): Promise<Record<string, unknown> | null> => getStorefrontData(),
  ["kairo-storefront-snapshot"],
  {
    tags: [STOREFRONT_CACHE_TAG],
    // A ceiling rather than the mechanism — saves, orders and cancellations
    // invalidate the tag directly.
    revalidate: 3600,
  }
);

/** The cached catalogue, or null when local development has no database. */
export async function getStorefrontSnapshot(): Promise<Record<string, unknown> | null> {
  try {
    return await loadSnapshot();
  } catch {
    return null;
  }
}

/** The cached catalogue, throwing when it cannot be read, for callers that must fail closed. */
export function readStorefrontSnapshot(): Promise<Record<string, unknown> | null> {
  return loadSnapshot();
}
