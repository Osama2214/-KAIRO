"use client";

import { useDeferredValue, useMemo } from "react";
import type { MangaVolume } from "@/data/manga";
import { buildSearchIndex, searchIndex } from "@/lib/search";

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

  // Search the lightweight product fields already present (titles, series,
  // aliases, creators, ISBN, genres). Typing must not download every synopsis.

  return useMemo(() => {
    if (!deferredQuery.trim()) return items;
    return searchIndex(index, deferredQuery).map((result) => result.item);
  }, [index, deferredQuery, items]);
}
