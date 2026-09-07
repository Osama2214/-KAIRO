import { create } from "zustand";
import { MangaVolume } from "@/data/manga";

interface UIState {
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;

  isReaderOpen: boolean;
  activeReaderVolume: MangaVolume | null;
  openReader: (volume: MangaVolume) => void;
  closeReader: () => void;

  introSeen: boolean;
  setIntroSeen: (seen: boolean) => void;

  isIntroActive: boolean;
  playIntro: () => void;
  closeIntro: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isCartOpen: false,
  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

  isSearchOpen: false,
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),

  isReaderOpen: false,
  activeReaderVolume: null,
  openReader: (volume: MangaVolume) => set({ isReaderOpen: true, activeReaderVolume: volume }),
  closeReader: () => set({ isReaderOpen: false, activeReaderVolume: null }),

  introSeen: false,
  setIntroSeen: (seen: boolean) => set({ introSeen: seen }),

  isIntroActive: false,
  playIntro: () => set({ isIntroActive: true }),
  closeIntro: () => set({ isIntroActive: false }),
}));
