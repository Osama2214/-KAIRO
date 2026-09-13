import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * What this shopper has looked at, kept only in their own browser.
 *
 * It feeds the home page's "picked for you" row. Nothing here leaves the
 * device, it holds product ids and times only, and it is capped so it never
 * grows without bound.
 */

export interface ProductView {
  id: string;
  /** Last time the product page was opened (ms). */
  at: number;
  /** How many separate visits, capped. */
  count: number;
}

const MAX_ENTRIES = 40;
/** Re-opening the same page within this window is one visit, not several. */
const SAME_VISIT_MS = 30 * 60 * 1000;

interface BrowsingHistoryState {
  views: ProductView[];
  recordView: (id: string) => void;
  clearHistory: () => void;
}

export const useBrowsingHistoryStore = create<BrowsingHistoryState>()(
  persist(
    (set, get) => ({
      views: [],
      recordView: (id) => {
        if (!id) return;
        const now = Date.now();
        const existing = get().views.find((v) => v.id === id);
        const updated: ProductView = existing
          ? { id, at: now, count: now - existing.at > SAME_VISIT_MS ? Math.min(20, existing.count + 1) : existing.count }
          : { id, at: now, count: 1 };
        set({ views: [updated, ...get().views.filter((v) => v.id !== id)].slice(0, MAX_ENTRIES) });
      },
      clearHistory: () => set({ views: [] }),
    }),
    {
      name: "kairo_browsing_history",
      partialize: (state) => ({ views: state.views }),
      merge: (persisted, current) => {
        const stored = (persisted as { views?: unknown } | undefined)?.views;
        if (!Array.isArray(stored)) return current;
        const views = stored
          .filter((v): v is ProductView => Boolean(v && typeof v.id === "string" && Number.isFinite(v.at)))
          .map((v) => ({ id: v.id, at: Number(v.at), count: Math.max(1, Math.min(20, Number(v.count) || 1)) }))
          .slice(0, MAX_ENTRIES);
        return { ...current, views };
      },
    }
  )
);
