import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSyncExternalStore } from "react";
import { MangaVolume } from "@/data/manga";

interface WishlistState {
  items: MangaVolume[];
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
    }),
    {
      name: "kairo_wishlist_storage",
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
