import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSyncExternalStore } from "react";
import { MangaVolume } from "@/data/manga";

interface WishlistState {
  items: MangaVolume[];
  hydrateFromCatalog: (volumes: MangaVolume[]) => void;
  addItem: (volume: MangaVolume) => void;
  removeItem: (volumeId: string) => void;
  toggleWishlist: (volume: MangaVolume) => boolean;
  isInWishlist: (volumeId: string) => boolean;
  clearWishlist: () => void;
  getTotalItems: () => number;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (volume: MangaVolume) => {
        const currentItems = get().items;
        if (!currentItems.some((item) => item.id === volume.id)) {
          set({ items: [volume, ...currentItems] });
        }
      },

      removeItem: (volumeId: string) => {
        set({ items: get().items.filter((item) => item.id !== volumeId) });
      },

      toggleWishlist: (volume: MangaVolume) => {
        const currentItems = get().items;
        const exists = currentItems.some((item) => item.id === volume.id);
        if (exists) {
          set({ items: currentItems.filter((item) => item.id !== volume.id) });
          return false;
        } else {
          set({ items: [volume, ...currentItems] });
          return true;
        }
      },

      isInWishlist: (volumeId: string) => {
        return get().items.some((item) => item.id === volumeId);
      },

      clearWishlist: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        return get().items.length;
      },

      /**
       * Restores the saved volumes from the live catalogue. Only ids persist,
       * so a wishlist never shows a stale price or a delisted product.
       */
      hydrateFromCatalog: (volumes: MangaVolume[]) => {
        if (!Array.isArray(volumes) || volumes.length === 0) return;
        const byId = new Map(volumes.map((volume) => [volume.id, volume]));
        set({
          items: get().items.flatMap((item) => {
            const volume = byId.get(item.id);
            return volume ? [volume] : [];
          }),
        });
      },
    }),
    {
      name: "kairo_wishlist_storage",
      // Ids only. The full volume records — including prices — are rebuilt
      // from the catalogue by hydrateFromCatalog once it loads.
      partialize: (state) => ({ items: state.items.map((item) => ({ id: item.id })) }),
      merge: (persisted, current) => {
        const stored = (persisted as { items?: Array<{ id?: string }> } | undefined)?.items;
        if (!Array.isArray(stored)) return current;
        return {
          ...current,
          items: stored
            .filter((item): item is { id: string } => typeof item?.id === "string")
            .map((item) => ({ id: item.id }) as MangaVolume),
        };
      },
    }
  )
);

// SSR-safe hook helper to prevent Next.js hydration mismatches
const emptySubscribe = () => () => {};
export function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
