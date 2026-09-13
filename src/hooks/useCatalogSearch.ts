"use client";

import { useDeferredValue, useEffect, useMemo } from "react";
import type { MangaVolume } from "@/data/manga";
import { buildSearchIndex, searchIndex } from "@/lib/search";
import { ensureCatalogDetails } from "@/store/useStorefrontStore";

/**
 * Ranked catalogue search for a list that is already filtered by tab/genre.
 *
 * The index is rebuilt only when the catalogue changes, not on every keystroke,
 * and the query runs through `useDeferredValue` so typing stays responsive
 * while React renders the results at a lower priority.
 */
export function useCatalogSearch<T extends Partial<MangaVolume>>(items: T[], query: string): T[] {
  const deferredQuery = useDeferredValue(query);
  const index = useMemo(() => buildSearchIndex(items), [items]);

  // Pages load products without their synopses (lib/catalogDetails.ts), and a
  // search is expected to find words inside them. The first time anyone types,
  // fetch them once; the store updates, `items` follows, and the index above is
  // rebuilt with the full text.
  const searching = query.trim().length > 0;
  useEffect(() => {
    if (searching) void ensureCatalogDetails().catch(() => {});
  }, [searching]);

  return useMemo(() => {
    if (!deferredQuery.trim()) return items;
    return searchIndex(index, deferredQuery).map((result) => result.item);
  }, [index, deferredQuery, items]);
}
