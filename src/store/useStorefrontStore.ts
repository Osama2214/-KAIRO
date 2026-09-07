import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MangaVolume, Series, GenreInfo, ALL_VOLUMES, ALL_SERIES, GENRES } from "@/data/manga";
import { DEFAULT_ADMIN_PIN, DEFAULT_PIN_HASH, AUTHORIZED_ADMIN_EMAILS } from "@/config/adminConfig";
import { DEFAULT_GOVERNORATE_RATES } from "@/data/governorates";

export interface HeroContent {
  badgeText: string;
  headlineLine1: string;
  headlineHighlight: string;
  headlineLine2: string;
  headline?: string;
  subheadline: string;
  japaneseWatermark1: string;
  japaneseWatermark2: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
  featuredVolumeId: string;
}

export interface AnnouncementConfig {
  enabled: boolean;
  text: string;
  voucherCode: string;
  discountPercent: number;
}

export interface ShippingConfig {
  hubName: string;
  dispatchBadgeText: string;
  guaranteeBadgeText: string;
  deliveryEstimate: string;
  standardShippingCost: number;
  governorateRates: Record<string, number>;
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  perk1Title: string;
  perk1Desc: string;
  perk2Title: string;
  perk2Desc: string;
  perk3Title: string;
  perk3Desc: string;
}

export interface EditorialConfig {
  siteTagline: string;
  footerQuote: string;
  contactEmail: string;
  authenticityGuaranteeText: string;
  shippingPolicyText: string;
  returnPolicyText: string;
  footerDescription: string;
  hubCities: string;
}

export interface FeaturedSeriesConfig {
  seriesSlug: string;
  badgeText: string;
  customTitle?: string;
  customDescription?: string;
  ctaText: string;
  ctaLink?: string;
  customImage?: string;
}

export interface CollectionConfig {
  headline: string;
  badgeText: string;
  price: number;
  volumeId1: string;
  volumeId2: string;
  volumeId3: string;
  primaryCtaText: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
}

export interface GenreBentoConfig {
  badgeText: string;
  title: string;
  description: string;
}

export interface TrendingConfig {
  badgeText: string;
  headline: string;
  autoplayEnabled: boolean;
  autoplaySpeed: number; // in milliseconds
}

export interface NewReleasesConfig {
  badgeText: string;
  headline: string;
  viewAllText: string;
}

export interface MangaDiscoveryConfig {
  badgeText: string;
  title: string;
  description: string;
  searchPlaceholder: string;
  catalogLinkText: string;
  defaultTab: "POPULAR" | "TOP_RATED" | "BEST_SELLERS" | "RECENTLY_ADDED";
  displayCount: number;
}

const DEFAULT_TRENDING_CONFIG: TrendingConfig = {
  badgeText: "CURATED SELECTION",
  headline: "TRENDING NOW",
  autoplayEnabled: true,
  autoplaySpeed: 3800,
};

const DEFAULT_NEW_RELEASES_CONFIG: NewReleasesConfig = {
  badgeText: "JUST ARCHIVED",
  headline: "NEW RELEASES",
  viewAllText: "VIEW COMPLETE ARCHIVE",
};

const DEFAULT_HERO_CONTENT: HeroContent = {
  badgeText: "CHAPTER 01 — 物語の始まり",
  headlineLine1: "DISCOVER",
  headlineHighlight: "YOUR NEXT",
  headlineLine2: "STORY",
  headline: "DISCOVER YOUR NEXT STORY",
  subheadline: "Manga, light novels, and stories worth getting lost in. From pristine First Editions and oversize Deluxe hardcovers to complete collector slipcase box sets.",
  japaneseWatermark1: "回路・物語の始まり",
  japaneseWatermark2: "精神と物質の調和",
  primaryCtaText: "EXPLORE MANGA",
  primaryCtaLink: "/manga",
  secondaryCtaText: "NEW RELEASES",
  secondaryCtaLink: "#new-releases",
  stat1Value: "1,400+",
  stat1Label: "Volumes Archived",
  stat2Value: "100%",
  stat2Label: "Licensed Imports",
  stat3Value: "24-48h",
  stat3Label: "All Egypt Delivery",
  featuredVolumeId: "tokyo-ghoul-1",
};

const DEFAULT_ANNOUNCEMENT: AnnouncementConfig = {
  enabled: true,
  text: "INAUGURAL PATRON GRANT — RECEIVE 20% OFF YOUR FIRST CURATED ARCHIVE WITH VOUCHER",
  voucherCode: "KAIRO20",
  discountPercent: 20,
};

const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  hubName: "6TH OF OCTOBER • EGYPT",
  dispatchBadgeText: "Dispatched from 6th of October (All Egypt)",
  guaranteeBadgeText: "Authenticity Guaranteed",
  deliveryEstimate: "24-48h",
  standardShippingCost: 65,
  governorateRates: DEFAULT_GOVERNORATE_RATES,
  freeShippingEnabled: true,
  freeShippingThreshold: 500,
  perk1Title: "EGYPT-WIDE EXPRESS DISPATCH",
  perk1Desc: "Central archive hub in 6th of October City. Direct delivery to all Egyptian governorates with protective reinforced slip-sleeves.",
  perk2Title: "AUTHENTIC JAPANESE EDITIONS",
  perk2Desc: "100% licensed Tankōbon, Kanzenban, and oversized collector hardcovers.",
  perk3Title: "COLLECTOR REPLACEMENT GUARANTEE",
  perk3Desc: "Corner protection assurance. We replace any volume damaged during transit.",
};

const DEFAULT_EDITORIAL: EditorialConfig = {
  siteTagline: "Japanese Manga & Editorial Storefront",
  footerQuote: "In the quiet chambers between panels, human truths linger. KAIRO stands as an altar to physical print, Japanese craft, and uncompromising sequential art.",
  contactEmail: "concierge@kairo.archive",
  authenticityGuaranteeText: "Every single volume in the KAIRO archive is sourced directly from certified Tokyo and Kyoto publishing houses. We guarantee 100% genuine Kodansha, Shueisha, Shogakukan, and Dark Horse editorial pressings.",
  shippingPolicyText: "Orders are hand-packaged using archival protective sleeves, reinforced corner bumpers, and moisture-resistant sealing. Dispatched daily across Cairo, Giza, Alexandria, and all Egyptian governorates.",
  returnPolicyText: "We honor a 14-day archival integrity inspection. If your volume arrives with any structural binding defect, spine dent, or print anomaly, our concierge provides immediate replacement.",
  footerDescription: "An editorial archive celebrating sequential art, Japanese literary epics, and tactile physical printing craftsmanship.",
  hubCities: "6TH OF OCTOBER • CAIRO • ALEXANDRIA • ALL EGYPT",
};

const DEFAULT_FEATURED_SERIES: FeaturedSeriesConfig = {
  seriesSlug: "jujutsu-kaisen",
  badgeText: "FEATURED SERIES — 呪術廻戦",
  customTitle: "",
  customDescription: "",
  ctaText: "EXPLORE SERIES ARCHIVE",
  ctaLink: "/series/jujutsu-kaisen",
  customImage: "",
};

const DEFAULT_COLLECTION_CONFIG: CollectionConfig = {
  headline: "THE COLLECTION",
  badgeText: "COMPLETE ARCHIVE • VOL. 01–03",
  price: 29.99,
  volumeId1: "jjk-01",
  volumeId2: "jjk-02",
  volumeId3: "jjk-03",
  primaryCtaText: "ADD SET TO CART",
  secondaryCtaText: "DISCOVER ALL BOXSETS",
  secondaryCtaLink: "/manga?format=Box+Set",
};

const DEFAULT_GENRE_BENTO: GenreBentoConfig = {
  badgeText: "CATEGORY DIRECTORY",
  title: "EXPLORE YOUR GENRE",
  description: "Curated reading lists across 9 canonical categories.",
};

const DEFAULT_MANGA_DISCOVERY_CONFIG: MangaDiscoveryConfig = {
  badgeText: "INSTANT ARCHIVAL LOOKUP",
  title: "FIND YOUR NEXT MANGA",
  description: "Query across titles, authors, genres, or ISBN registry.",
  searchPlaceholder: "Search manga, author, or series... (e.g. Eiichiro Oda, Dark Fantasy, Solo Leveling)",
  catalogLinkText: "GO TO COMPLETE MANGA CATALOG",
  defaultTab: "POPULAR",
  displayCount: 4,
};

export const DEFAULT_FORMATS: string[] = [
  "Manga",
  "Deluxe Edition",
  "Box Set",
  "Light Novel",
];

export type LiveEditTarget =
  | { type: "volume"; volumeId: string }
  | { type: "series"; seriesSlug: string }
  | { type: "new-series" }
  | { type: "hero" }
  | { type: "hero-card" }
  | { type: "trending" }
  | { type: "new-releases" }
  | { type: "genre-bento" }
  | { type: "announcement" }
  | { type: "featured-series" }
  | { type: "featured-series-card" }
  | { type: "collection" }
  | { type: "shipping" }
  | { type: "editorial" }
  | { type: "manga-discovery" }
  | { type: "genre-card"; genreId: string };

export interface StorefrontState {
  // Data
  volumes: MangaVolume[];
  series: Series[];
  genres: GenreInfo[];
  formats: string[];

  // CMS Content
  heroContent: HeroContent;
  announcement: AnnouncementConfig;
  shippingConfig: ShippingConfig;
  editorialConfig: EditorialConfig;
  featuredSeriesConfig: FeaturedSeriesConfig;
  collectionConfig: CollectionConfig;
  genreBentoConfig: GenreBentoConfig;
  trendingConfig: TrendingConfig;
  newReleasesConfig: NewReleasesConfig;
  mangaDiscoveryConfig: MangaDiscoveryConfig;

  // Admin Access & Live Visual Editor
  isAdminAuthenticated: boolean;
  isVisualEditorActive: boolean;
  activeLiveEditTarget: LiveEditTarget | null;
  adminPin?: string;
  adminPinHash: string;
  adminSessionToken?: string | null;
  adminEmails: string[];

  // Live Visual Editor Actions
  setVisualEditorActive: (active: boolean) => void;
  openLiveEdit: (target: LiveEditTarget) => void;
  closeLiveEdit: () => void;

  // Catalog Actions
  addVolume: (volume: MangaVolume) => void;
  updateVolume: (id: string, updates: Partial<MangaVolume>) => void;
  deleteVolume: (id: string) => void;
  duplicateVolume: (id: string) => MangaVolume | null;
  deductStock: (items: { volumeId: string; quantity: number }[]) => void;

  // Series Actions
  addSeries: (series: Series) => void;
  updateSeries: (slug: string, updates: Partial<Series>) => void;
  deleteSeries: (slug: string) => void;

  // CMS Content Actions
  updateHeroContent: (updates: Partial<HeroContent>) => void;
  updateAnnouncement: (updates: Partial<AnnouncementConfig>) => void;
  updateShippingConfig: (updates: Partial<ShippingConfig>) => void;
  updateEditorialConfig: (updates: Partial<EditorialConfig>) => void;
  updateFeaturedSeriesConfig: (updates: Partial<FeaturedSeriesConfig>) => void;
  updateCollectionConfig: (updates: Partial<CollectionConfig>) => void;
  updateGenreBentoConfig: (updates: Partial<GenreBentoConfig>) => void;
  updateTrendingConfig: (updates: Partial<TrendingConfig>) => void;
  updateNewReleasesConfig: (updates: Partial<NewReleasesConfig>) => void;
  updateMangaDiscoveryConfig: (updates: Partial<MangaDiscoveryConfig>) => void;
  addGenre: (genre: GenreInfo) => void;
  updateGenre: (id: string, updates: Partial<GenreInfo>) => void;
  deleteGenre: (id: string) => void;
  addFormat: (format: string) => void;

  // Admin Auth Actions
  loginAdmin: (pin: string, userEmail?: string) => boolean;
  loginAdminWithToken: (token: string, pinHash?: string) => void;
  logoutAdmin: () => void;
  updateAdminPin: (newPin: string) => void;
  updateAdminPinHash: (newHash: string) => void;
  addAdminEmail: (email: string) => void;
  removeAdminEmail: (email: string) => void;
  isAuthorizedAdmin: (email?: string) => boolean;

  // Utilities
  resetToDefaults: () => void;
  exportData: () => string;
  importData: (jsonStr: string) => boolean;
}

export const useStorefrontStore = create<StorefrontState>()(
  persist(
    (set, get) => ({
      volumes: ALL_VOLUMES,
      series: ALL_SERIES,
      genres: GENRES,
      formats: DEFAULT_FORMATS,
      heroContent: DEFAULT_HERO_CONTENT,
      announcement: DEFAULT_ANNOUNCEMENT,
      shippingConfig: DEFAULT_SHIPPING_CONFIG,
      editorialConfig: DEFAULT_EDITORIAL,
      featuredSeriesConfig: DEFAULT_FEATURED_SERIES,
      collectionConfig: DEFAULT_COLLECTION_CONFIG,
      genreBentoConfig: DEFAULT_GENRE_BENTO,
      trendingConfig: DEFAULT_TRENDING_CONFIG,
      newReleasesConfig: DEFAULT_NEW_RELEASES_CONFIG,
      mangaDiscoveryConfig: DEFAULT_MANGA_DISCOVERY_CONFIG,
      isAdminAuthenticated: false,
      isVisualEditorActive: true,
      activeLiveEditTarget: null,
      adminPin: DEFAULT_ADMIN_PIN,
      adminPinHash: DEFAULT_PIN_HASH,
      adminSessionToken: null,
      adminEmails: AUTHORIZED_ADMIN_EMAILS,

      setVisualEditorActive: (active) => set({ isVisualEditorActive: active }),
      openLiveEdit: (target) => set({ activeLiveEditTarget: target }),
      closeLiveEdit: () => set({ activeLiveEditTarget: null }),

      addVolume: (newVolume) => {
        set((state) => {
          const exists = state.volumes.some((v) => v.id === newVolume.id);
          const finalId = exists ? `${newVolume.id}-${Date.now()}` : newVolume.id;
          const volumeWithId = { ...newVolume, id: finalId };
          const updatedVolumes = [volumeWithId, ...state.volumes];

          const updatedSeries = state.series.map((s) => {
            if (s.slug === volumeWithId.seriesSlug) {
              const alreadyHas = s.volumes.some((v) => v.id === volumeWithId.id);
              return {
                ...s,
                totalVolumes: Math.max(s.totalVolumes, s.volumes.length + 1),
                volumes: alreadyHas ? s.volumes : [...s.volumes, volumeWithId],
              };
            }
            return s;
          });

          return { volumes: updatedVolumes, series: updatedSeries };
        });
      },

      updateVolume: (id, updates) => {
        set((state) => {
          const updatedVolumes = state.volumes.map((v) =>
            v.id === id ? { ...v, ...updates } : v
          );

          const updatedSeries = state.series.map((s) => ({
            ...s,
            volumes: s.volumes.map((v) => (v.id === id ? { ...v, ...updates } : v)),
          }));

          return { volumes: updatedVolumes, series: updatedSeries };
        });
      },

      deleteVolume: (id) => {
        set((state) => {
          const updatedVolumes = state.volumes.filter((v) => v.id !== id);
          const updatedSeries = state.series.map((s) => ({
            ...s,
            volumes: s.volumes.filter((v) => v.id !== id),
          }));
          return { volumes: updatedVolumes, series: updatedSeries };
        });
      },

      duplicateVolume: (id) => {
        const current = get().volumes.find((v) => v.id === id);
        if (!current) return null;

        const newId = `${current.id}-copy-${Date.now().toString().slice(-4)}`;
        const duplicated: MangaVolume = {
          ...current,
          id: newId,
          title: `${current.title} (Archival Duplicate)`,
          volumeNumber: current.volumeNumber + 1,
        };

        get().addVolume(duplicated);
        return duplicated;
      },

      deductStock: (items) => {
        set((state) => {
          const qtyMap = new Map<string, number>();
          items.forEach((item) => {
            qtyMap.set(item.volumeId, (qtyMap.get(item.volumeId) || 0) + item.quantity);
          });

          const updatedVolumes = state.volumes.map((v) => {
            const deductQty = qtyMap.get(v.id);
            if (deductQty) {
              return { ...v, stock: Math.max(0, (v.stock || 0) - deductQty) };
            }
            return v;
          });

          const updatedSeries = state.series.map((s) => ({
            ...s,
            volumes: s.volumes.map((v) => {
              const deductQty = qtyMap.get(v.id);
              if (deductQty) {
                return { ...v, stock: Math.max(0, (v.stock || 0) - deductQty) };
              }
              return v;
            }),
          }));

          return { volumes: updatedVolumes, series: updatedSeries };
        });
      },

      addSeries: (newSeries) => {
        set((state) => {
          const exists = state.series.some((s) => s.slug === newSeries.slug);
          const finalSlug = exists ? `${newSeries.slug}-${Date.now().toString().slice(-4)}` : newSeries.slug;
          const seriesWithSlug = { ...newSeries, slug: finalSlug };
          return { series: [seriesWithSlug, ...state.series] };
        });
      },

      updateSeries: (slug, updates) => {
        set((state) => {
          const exists = state.series.some((s) => s.slug === slug);
          if (exists) {
            return {
              series: state.series.map((s) => (s.slug === slug ? { ...s, ...updates } : s)),
            };
          }
          const fallback = ALL_SERIES.find((s) => s.slug === slug);
          if (fallback) {
            return {
              series: [...state.series, { ...fallback, ...updates }],
            };
          }
          return state;
        });
      },

      deleteSeries: (slug) => {
        set((state) => ({
          series: state.series.filter((s) => s.slug !== slug),
          volumes: state.volumes.filter((v) => v.seriesSlug !== slug),
        }));
      },

      updateHeroContent: (updates) => {
        set((state) => ({
          heroContent: { ...state.heroContent, ...updates },
        }));
      },

      updateAnnouncement: (updates) => {
        set((state) => ({
          announcement: { ...state.announcement, ...updates },
        }));
      },

      updateShippingConfig: (updates) => {
        set((state) => ({
          shippingConfig: { ...state.shippingConfig, ...updates },
        }));
      },

      updateEditorialConfig: (updates) => {
        set((state) => ({
          editorialConfig: { ...state.editorialConfig, ...updates },
        }));
      },

      updateFeaturedSeriesConfig: (updates) => {
        set((state) => ({
          featuredSeriesConfig: { ...state.featuredSeriesConfig, ...updates },
        }));
      },

      updateCollectionConfig: (updates) => {
        set((state) => ({
          collectionConfig: { ...state.collectionConfig, ...updates },
        }));
      },

      updateGenreBentoConfig: (updates) => {
        set((state) => ({
          genreBentoConfig: { ...state.genreBentoConfig, ...updates },
        }));
      },

      updateTrendingConfig: (updates) => {
        set((state) => ({
          trendingConfig: { ...state.trendingConfig, ...updates },
        }));
      },

      updateNewReleasesConfig: (updates) => {
        set((state) => ({
          newReleasesConfig: { ...state.newReleasesConfig, ...updates },
        }));
      },

      updateMangaDiscoveryConfig: (updates) => {
        set((state) => ({
          mangaDiscoveryConfig: { ...state.mangaDiscoveryConfig, ...updates },
        }));
      },

      addGenre: (newGenre) => {
        set((state) => {
          const rawId = newGenre.id?.trim() || newGenre.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const exists = state.genres.some((g) => g.id === rawId);
          const finalId = exists ? `${rawId}-${Date.now()}` : rawId;
          return {
            genres: [...state.genres, { ...newGenre, id: finalId }],
          };
        });
      },

      updateGenre: (id, updates) => {
        set((state) => ({
          genres: state.genres.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        }));
      },

      deleteGenre: (id) => {
        set((state) => ({
          genres: state.genres.filter((g) => g.id !== id),
        }));
      },

      addFormat: (newFormat) => {
        const trimmed = newFormat.trim();
        if (!trimmed) return;
        set((state) => {
          const currentFormats = state.formats && state.formats.length > 0 ? state.formats : DEFAULT_FORMATS;
          if (currentFormats.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
            return state;
          }
          return { formats: [...currentFormats, trimmed] };
        });
      },

      loginAdmin: (pin, userEmail) => {
        if (pin !== get().adminPin) return false;
        if (userEmail && !get().isAuthorizedAdmin(userEmail)) return false;
        set({ isAdminAuthenticated: true });
        return true;
      },

      loginAdminWithToken: (token, pinHash) => {
        set({
          isAdminAuthenticated: true,
          adminSessionToken: token,
          ...(pinHash ? { adminPinHash: pinHash } : {}),
        });
      },

      logoutAdmin: () => {
        set({ isAdminAuthenticated: false, adminSessionToken: null });
        if (typeof fetch !== "undefined") {
          fetch("/api/admin/verify-session", { method: "DELETE" }).catch(() => {});
        }
        if (typeof document !== "undefined") {
          document.cookie = "kairo_curator_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
      },

      updateAdminPin: (newPin) => {
        if (newPin && newPin.length >= 4) {
          set({ adminPin: newPin });
        }
      },

      updateAdminPinHash: (newHash) => {
        if (newHash && newHash.length >= 32) {
          set({ adminPinHash: newHash });
        }
      },

      addAdminEmail: (email) => {
        const normalized = email.trim().toLowerCase();
        if (!normalized) return;
        set((state) => {
          const list = state.adminEmails || AUTHORIZED_ADMIN_EMAILS;
          if (list.includes(normalized)) return state;
          return { adminEmails: [...list, normalized] };
        });
      },

      removeAdminEmail: (email) => {
        const normalized = email.trim().toLowerCase();
        set((state) => {
          const list = state.adminEmails || AUTHORIZED_ADMIN_EMAILS;
          if (list.length <= 1) return state; // Never remove all admins
          return { adminEmails: list.filter((e) => e.toLowerCase() !== normalized) };
        });
      },

      isAuthorizedAdmin: (email) => {
        if (!email) return false;
        const list = get().adminEmails || AUTHORIZED_ADMIN_EMAILS;
        return list.some((e) => e.trim().toLowerCase() === email.trim().toLowerCase());
      },

      resetToDefaults: () => {
        set({
          volumes: ALL_VOLUMES,
          series: ALL_SERIES,
          genres: GENRES,
          formats: DEFAULT_FORMATS,
          heroContent: DEFAULT_HERO_CONTENT,
          announcement: DEFAULT_ANNOUNCEMENT,
          shippingConfig: DEFAULT_SHIPPING_CONFIG,
          editorialConfig: DEFAULT_EDITORIAL,
          featuredSeriesConfig: DEFAULT_FEATURED_SERIES,
          collectionConfig: DEFAULT_COLLECTION_CONFIG,
          genreBentoConfig: DEFAULT_GENRE_BENTO,
          trendingConfig: DEFAULT_TRENDING_CONFIG,
          newReleasesConfig: DEFAULT_NEW_RELEASES_CONFIG,
          mangaDiscoveryConfig: DEFAULT_MANGA_DISCOVERY_CONFIG,
        });
      },

      exportData: () => {
        const state = get();
        const exportPayload = {
          version: "1.0",
          exportedAt: new Date().toISOString(),
          volumes: state.volumes,
          series: state.series,
          genres: state.genres,
          formats: state.formats || DEFAULT_FORMATS,
          heroContent: state.heroContent,
          announcement: state.announcement,
          shippingConfig: state.shippingConfig,
          editorialConfig: state.editorialConfig,
          featuredSeriesConfig: state.featuredSeriesConfig,
          collectionConfig: state.collectionConfig,
          genreBentoConfig: state.genreBentoConfig,
          trendingConfig: state.trendingConfig,
          newReleasesConfig: state.newReleasesConfig,
          mangaDiscoveryConfig: state.mangaDiscoveryConfig,
        };
        return JSON.stringify(exportPayload, null, 2);
      },

      importData: (jsonStr) => {
        try {
          const parsed = JSON.parse(jsonStr);
          if (!parsed || !Array.isArray(parsed.volumes)) {
            return false;
          }

          set({
            volumes: parsed.volumes || ALL_VOLUMES,
            series: parsed.series || ALL_SERIES,
            genres: parsed.genres || GENRES,
            formats: parsed.formats || DEFAULT_FORMATS,
            heroContent: { ...DEFAULT_HERO_CONTENT, ...(parsed.heroContent || {}) },
            announcement: { ...DEFAULT_ANNOUNCEMENT, ...(parsed.announcement || {}) },
            shippingConfig: {
              ...DEFAULT_SHIPPING_CONFIG,
              ...(parsed.shippingConfig || {}),
              governorateRates: {
                ...DEFAULT_GOVERNORATE_RATES,
                ...(parsed.shippingConfig?.governorateRates || {}),
              },
            },
            editorialConfig: { ...DEFAULT_EDITORIAL, ...(parsed.editorialConfig || {}) },
            featuredSeriesConfig: { ...DEFAULT_FEATURED_SERIES, ...(parsed.featuredSeriesConfig || {}) },
            collectionConfig: { ...DEFAULT_COLLECTION_CONFIG, ...(parsed.collectionConfig || {}) },
            genreBentoConfig: { ...DEFAULT_GENRE_BENTO, ...(parsed.genreBentoConfig || {}) },
            trendingConfig: { ...DEFAULT_TRENDING_CONFIG, ...(parsed.trendingConfig || {}) },
            newReleasesConfig: { ...DEFAULT_NEW_RELEASES_CONFIG, ...(parsed.newReleasesConfig || {}) },
            mangaDiscoveryConfig: { ...DEFAULT_MANGA_DISCOVERY_CONFIG, ...(parsed.mangaDiscoveryConfig || {}) },
          });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: "kairo_storefront_cms_v3",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        volumes: state.volumes,
        series: state.series,
        genres: state.genres,
        heroContent: state.heroContent,
        announcement: state.announcement,
        shippingConfig: state.shippingConfig,
        editorialConfig: state.editorialConfig,
        featuredSeriesConfig: state.featuredSeriesConfig,
        collectionConfig: state.collectionConfig,
        genreBentoConfig: state.genreBentoConfig,
        trendingConfig: state.trendingConfig,
        newReleasesConfig: state.newReleasesConfig,
        mangaDiscoveryConfig: state.mangaDiscoveryConfig,
        adminPinHash: state.adminPinHash,
        isAdminAuthenticated: state.isAdminAuthenticated,
        adminSessionToken: state.adminSessionToken,
        isVisualEditorActive: state.isVisualEditorActive,
      }),
      merge: (persistedState: unknown, currentState: StorefrontState): StorefrontState => {
        const persisted = persistedState as Partial<StorefrontState> | undefined;
        const merged: StorefrontState = { ...currentState, ...(persisted || {}) };
        if (persisted?.trendingConfig) {
          merged.trendingConfig = { ...DEFAULT_TRENDING_CONFIG, ...persisted.trendingConfig };
        }
        if (persisted?.newReleasesConfig) {
          merged.newReleasesConfig = { ...DEFAULT_NEW_RELEASES_CONFIG, ...persisted.newReleasesConfig };
        }
        if (persisted?.mangaDiscoveryConfig) {
          merged.mangaDiscoveryConfig = { ...DEFAULT_MANGA_DISCOVERY_CONFIG, ...persisted.mangaDiscoveryConfig };
        }
        if (persisted?.genreBentoConfig) {
          const desc =
            persisted.genreBentoConfig.description ===
            "Navigate through 9 core canonical categories with specialized curated reading lists."
              ? DEFAULT_GENRE_BENTO.description
              : persisted.genreBentoConfig.description;
          merged.genreBentoConfig = {
            ...DEFAULT_GENRE_BENTO,
            ...persisted.genreBentoConfig,
            description: desc,
          };
        }
        if (typeof persisted?.isAdminAuthenticated === "boolean") {
          merged.isAdminAuthenticated = persisted.isAdminAuthenticated;
        }
        if (typeof persisted?.isVisualEditorActive === "boolean") {
          merged.isVisualEditorActive = persisted.isVisualEditorActive;
        }
        if (persisted?.adminSessionToken !== undefined) {
          merged.adminSessionToken = persisted.adminSessionToken;
        }
        if (persisted?.shippingConfig) {
          merged.shippingConfig = {
            ...DEFAULT_SHIPPING_CONFIG,
            ...persisted.shippingConfig,
            freeShippingEnabled:
              persisted.shippingConfig.freeShippingEnabled ??
              DEFAULT_SHIPPING_CONFIG.freeShippingEnabled,
            freeShippingThreshold:
              persisted.shippingConfig.freeShippingThreshold ??
              DEFAULT_SHIPPING_CONFIG.freeShippingThreshold,
            perk1Title: persisted.shippingConfig.perk1Title || DEFAULT_SHIPPING_CONFIG.perk1Title,
            perk1Desc: persisted.shippingConfig.perk1Desc || DEFAULT_SHIPPING_CONFIG.perk1Desc,
            perk2Title: persisted.shippingConfig.perk2Title || DEFAULT_SHIPPING_CONFIG.perk2Title,
            perk2Desc: persisted.shippingConfig.perk2Desc || DEFAULT_SHIPPING_CONFIG.perk2Desc,
            perk3Title: persisted.shippingConfig.perk3Title || DEFAULT_SHIPPING_CONFIG.perk3Title,
            perk3Desc: persisted.shippingConfig.perk3Desc || DEFAULT_SHIPPING_CONFIG.perk3Desc,
            governorateRates: {
              ...DEFAULT_GOVERNORATE_RATES,
              ...(persisted.shippingConfig.governorateRates || {}),
            },
          };
        }
        if (persisted?.editorialConfig) {
          merged.editorialConfig = {
            ...DEFAULT_EDITORIAL,
            ...persisted.editorialConfig,
            footerDescription:
              persisted.editorialConfig.footerDescription ||
              DEFAULT_EDITORIAL.footerDescription,
            hubCities:
              persisted.editorialConfig.hubCities ||
              DEFAULT_EDITORIAL.hubCities,
          };
        }
        return merged;
      },
    }
  )
);
