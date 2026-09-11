import "server-only";

import { unstable_cache } from "next/cache";
import { getStorefrontData } from "@/lib/storefrontDataStore";

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
 */

/** Busted the moment a curator saves, so an edit is never waiting on a timer. */
export const STOREFRONT_CACHE_TAG = "kairo-storefront";

const loadSnapshot = unstable_cache(
  async (): Promise<Record<string, unknown> | null> => {
    try {
      return await getStorefrontData();
    } catch {
      // A database hiccup must not take the shop down: the page still renders
      // from the bundled catalogue, exactly as it did before.
      return null;
    }
  },
  ["kairo-storefront-snapshot"],
  {
    tags: [STOREFRONT_CACHE_TAG],
    // A ceiling rather than the mechanism — saves invalidate the tag directly.
    revalidate: 30,
  }
);

export function getStorefrontSnapshot(): Promise<Record<string, unknown> | null> {
  return loadSnapshot();
}
