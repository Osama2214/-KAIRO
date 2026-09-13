"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Edit2,
  CheckCircle2,
  X,
  ExternalLink,
  LogOut,
  Sliders,
  Eye,
  EyeOff,
  Minimize2,
  Maximize2,
  Save,
  Layers,
  Search,
  Check,
  Plus,
  Trash2,
  Info,
  Truck,
  ShieldCheck,
  Lock,
  FileText,
  ArrowRight,
} from "lucide-react";
import {
  useStorefrontStore,
  HeroContent,
  HeroArabicContent,
  ShippingConfig,
  ShippingArabicConfig,
  EditorialConfig,
  EditorialArabicConfig,
  FeaturedSeriesConfig,
  TrendingConfig,
  TrendingArabicConfig,
  NewReleasesConfig,
  NewReleasesArabicConfig,
  GenreBentoConfig,
  GenreBentoArabicConfig,
  MangaDiscoveryConfig,
  MangaDiscoveryArabicConfig,
  TickerConfig,
  TickerArabicConfig,
  TICKER_SLOTS,
  PolicyContentConfig,
} from "@/store/useStorefrontStore";
import { useMounted } from "@/store/useWishlistStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { VolumeFormModal } from "./VolumeFormModal";
import { ShopShowcaseLiveEditModal } from "./ShopShowcaseLiveEditModal";
import { HomeExtrasLiveEditModal } from "./HomeExtrasLiveEditModal";
import { resolveHomeExtras } from "@/store/useStorefrontStore";
import { isBook } from "@/lib/variants";
import { SeriesFormModal } from "./SeriesFormModal";
import { GenreFormModal } from "./GenreFormModal";
import { GenreInfo, ALL_SERIES, Series, MangaVolume } from "@/data/manga";
import { CustomSelect } from "@/components/CustomSelect";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";

export function LiveVisualEditor() {
  const mounted = useMounted();
  const { locale, toggleLanguage } = useLanguageStore();
  const {
    isAdminAuthenticated,
    isVisualEditorActive,
    setVisualEditorActive,
    activeLiveEditTarget,
    closeLiveEdit,
    openLiveEdit,
    volumes,
    series,
    genres,
    heroContent,
    heroArabicContent,
    shippingConfig,
    shippingArabicConfig,
    editorialConfig,
    editorialArabicConfig,
    featuredSeriesConfig,
    boxSetsConfig,
    boxSetsArabicConfig,
    trendingConfig,
    trendingArabicConfig,
    newReleasesConfig,
    newReleasesArabicConfig,
    genreBentoConfig,
    genreBentoArabicConfig,
    mangaDiscoveryConfig,
    mangaDiscoveryArabicConfig,
    updateVolume,
    addSeries,
    updateSeries,
    deleteSeries,
    addGenre,
    updateGenre,
    deleteGenre,
    updateHeroContent,
    updateHeroArabicContent,
    updateShippingConfig,
    updateShippingArabicConfig,
    updateEditorialConfig,
    updateEditorialArabicConfig,
    updateFeaturedSeriesConfig,
    updateBoxSetsConfig,
    updateBoxSetsArabicConfig,
    updateTrendingConfig,
    updateTrendingArabicConfig,
    updateNewReleasesConfig,
    updateNewReleasesArabicConfig,
    updateGenreBentoConfig,
    updateGenreBentoArabicConfig,
    tickerConfig,
    tickerArabicConfig,
    updateTickerConfig,
    updateTickerArabicConfig,
    policyContent,
    policyContentArabic,
    updatePolicyContent,
    updatePolicyContentArabic,
    updateMangaDiscoveryConfig,
    updateMangaDiscoveryArabicConfig,
    shopShowcaseConfig,
    shopShowcaseArabicConfig,
    updateShopShowcaseConfig,
    updateShopShowcaseArabicConfig,
    homeExtrasConfig,
    updateHomeExtrasConfig,
    logoutAdmin,
  } = useStorefrontStore();

  const [isMinimized, setIsMinimized] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // A persisted browser flag is never enough to reveal admin controls. The
  // HttpOnly server session must still be valid after every page load.
  useEffect(() => {
    let active = true;
    if (!isAdminAuthenticated) {
      return;
    }
    // Do not reuse a previous verified result when a curator signs in again.
    void Promise.resolve().then(() => {
      if (active) setSessionChecked(false);
    });
    fetch("/api/admin/verify-session", { method: "POST", cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return;
        if (!payload?.valid) {
          logoutAdmin();
          return;
        }
        setSessionChecked(true);
      })
      .catch(() => {
        if (active) logoutAdmin();
      });
    return () => { active = false; };
  }, [isAdminAuthenticated, logoutAdmin]);

  // Logging out of the curator console in any other tab also hides this
  // toolbar immediately in the current tab.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "kairo_admin_logout" && useStorefrontStore.getState().isAdminAuthenticated) {
        logoutAdmin();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [logoutAdmin]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCuratorSignOut = async () => {
    setSessionChecked(false);
    try {
      await fetch("/api/admin/verify-session", { method: "DELETE", cache: "no-store" });
    } finally {
      logoutAdmin();
      // Use a full navigation so storefront admin state is not reused.
      window.location.replace("/admin");
    }
  };

  // Only render for authenticated admins
  if (!mounted || !sessionChecked || !isAdminAuthenticated) {
    return null;
  }

  // Find targeted item for modals
  const selectedVolume =
    activeLiveEditTarget?.type === "volume"
      ? volumes.find((v) => v.id === activeLiveEditTarget.volumeId) || null
      : null;

  const selectedSeries =
    activeLiveEditTarget?.type === "series"
      ? series.find((s) => s.slug === activeLiveEditTarget.seriesSlug) ||
        ALL_SERIES.find((s) => s.slug === activeLiveEditTarget.seriesSlug) ||
        null
      : null;

  const selectedGenre =
    activeLiveEditTarget?.type === "genre-card"
      ? genres.find((g) => g.id === activeLiveEditTarget.genreId) || null
      : null;

  return (
    <>
      {/* 1. Live Sync Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 bg-ink border border-gold/70 text-paper shadow-2xl rounded-sm backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 strokeWidth={2} className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs font-mono">
            <span className="text-gold font-bold block uppercase tracking-wider">Live Synchronized</span>
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-text-muted hover:text-paper ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Floating Curator Toolbar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] transition-all duration-300 pointer-events-auto w-[calc(100vw-32px)] sm:w-auto flex justify-center">
        {isMinimized ? (
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 px-4 py-2 bg-ink/95 border border-gold/60 text-gold rounded-full shadow-2xl backdrop-blur-md hover:scale-105 transition-all text-xs font-mono cursor-pointer font-bold tracking-wider uppercase"
            title="Expand Curator Toolbar"
          >
            <span className="font-serif text-vermilion">ANIMEVERSE</span>
            <span>CURATOR</span>
            <Maximize2 className="w-3.5 h-3.5 text-paper-muted" />
          </button>
        ) : (
          <div className="inline-flex flex-nowrap justify-center items-center gap-1.5 px-3 py-2 bg-ink/95 border border-gold/50 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-mono text-paper">
            {/* Curator Badge — hidden on very small screens */}
            <div className="hidden sm:flex items-center gap-2 pr-2 border-r border-ink-border shrink-0">
              <span className="font-serif text-sm font-bold text-vermilion">ANIMEVERSE</span>
              <span className="font-bold tracking-wider text-[11px] text-paper">CURATOR</span>
            </div>

            {/* Visual Editor Toggle Switch */}
            <button
              type="button"
              onClick={() => setVisualEditorActive(!isVisualEditorActive)}
              className={`shrink-0 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full border transition-all text-[10px] sm:text-[11px] font-bold uppercase tracking-wider cursor-pointer ${
                isVisualEditorActive
                  ? "bg-gold text-ink border-gold shadow-md shadow-gold/20"
                  : "bg-ink-surface text-text-muted border-ink-border hover:text-paper"
              }`}
            >
              {isVisualEditorActive ? (
                <>
                  <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xs:inline">Visual Edit: ON</span>
                  <span className="xs:hidden">ON</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xs:inline">Visual Edit: OFF</span>
                  <span className="xs:hidden">Edit</span>
                </>
              )}
            </button>

            {/* Admin Console Link */}
            <Link
              href="/admin"
              className="shrink-0 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full bg-ink-surface hover:bg-ink-border border border-ink-border text-paper-muted hover:text-paper transition-colors text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider"
              title="Open full administrative dashboard"
            >
              <Sliders className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gold" />
              <span>Console</span>
              <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-text-muted" />
            </Link>

            {/* Storefront Language Live Switch */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="shrink-0 flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-full bg-ink-surface hover:bg-ink-border border border-ink-border text-paper-muted hover:text-paper transition-colors text-[10px] sm:text-[11px] font-mono font-bold tracking-wider cursor-pointer"
              title="Toggle Storefront Language"
            >
              <span className={locale === "ar" ? "text-gold" : "text-text-muted"}>AR</span>
              <span className="text-text-muted text-[9px]">/</span>
              <span className={locale === "en" ? "text-gold" : "text-text-muted"}>EN</span>
            </button>

            {/* Actions: Minimize & Logout */}
            <div className="flex items-center gap-0.5 pl-1 border-l border-ink-border shrink-0">
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-full text-text-muted hover:text-paper hover:bg-ink-surface transition-colors cursor-pointer"
                title="Minimize toolbar"
              >
                <Minimize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => void handleCuratorSignOut()}
                className="p-1.5 rounded-full text-text-muted hover:text-red-400 hover:bg-ink-surface transition-colors cursor-pointer"
                title="Log out from Curator Session"
              >
                <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. In-Place Edit Modals */}

      {/* Volume Modal */}
      {activeLiveEditTarget?.type === "volume" && selectedVolume && (
        <VolumeFormModal
          isOpen={true}
          onClose={closeLiveEdit}
          initialVolume={selectedVolume}
          seriesList={series}
          onSave={(updated) => {
            updateVolume(updated.id, updated);
            closeLiveEdit();
            showToast(`"${updated.title}" updated and synced live!`);
          }}
        />
      )}

      {/* Series Modal */}
      {activeLiveEditTarget?.type === "series" && selectedSeries && (
        <SeriesFormModal
          isOpen={true}
          onClose={closeLiveEdit}
          initialSeries={selectedSeries}
          onSave={(updated) => {
            updateSeries(updated.slug, updated);
            closeLiveEdit();
            showToast(`Series "${updated.title}" updated and synced live!`);
          }}
          onDelete={(slug) => {
            deleteSeries(slug);
            closeLiveEdit();
            showToast("Series deleted successfully.");
          }}
        />
      )}

      {/* New Series Modal */}
      {activeLiveEditTarget?.type === "new-series" && (
        <SeriesFormModal
          isOpen={true}
          onClose={closeLiveEdit}
          initialSeries={null}
          onSave={(created) => {
            addSeries(created);
            closeLiveEdit();
            showToast(`New series "${created.title}" created and synced live!`);
          }}
        />
      )}

      {/* Hero Content Modal */}
      {activeLiveEditTarget?.type === "hero" && (
        <HeroLiveEditModal
          initialContent={heroContent}
          initialArabicContent={heroArabicContent}
          currentLocale={locale}
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateHeroContent(updated);
            closeLiveEdit();
            showToast("Hero section updated and synced live!");
          }}
          onSaveArabic={(updated) => {
            updateHeroArabicContent(updated);
            closeLiveEdit();
            showToast("تم تحديث قسم البانر الرئيسي بالعربية ومزامنته!");
          }}
        />
      )}

      {/* Hero Card Selection Modal */}
      {activeLiveEditTarget?.type === "hero-card" && (
        <HeroCardLiveEditModal
          currentVolumeId={heroContent.featuredVolumeId || volumes.find(isBook)?.id || ""}
          // The hero frames a book, so only books can be picked for it.
          volumes={volumes.filter(isBook)}
          onClose={closeLiveEdit}
          onSave={(selectedVolumeId) => {
            updateHeroContent({ featuredVolumeId: selectedVolumeId });
            closeLiveEdit();
            const vol = volumes.find((v) => v.id === selectedVolumeId);
            showToast(`"${vol?.title || "Volume"}" set as Hero card!`);
          }}
        />
      )}


      {/* Featured Series Modal */}
      {activeLiveEditTarget?.type === "featured-series" && (
        <FeaturedSeriesLiveEditModal
          initialConfig={featuredSeriesConfig}
          seriesList={series}
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateFeaturedSeriesConfig(updated);
            closeLiveEdit();
            showToast("Featured series spotlight updated and synced live!");
          }}
        />
      )}

      {/* Featured Series Card Selection Modal */}
      {activeLiveEditTarget?.type === "featured-series-card" && (
        <FeaturedSeriesCardLiveEditModal
          currentSeriesSlug={featuredSeriesConfig.seriesSlug || series[0]?.slug || ""}
          seriesList={series}
          onClose={closeLiveEdit}
          onSave={(selectedSlug) => {
            updateFeaturedSeriesConfig({
              ...featuredSeriesConfig,
              seriesSlug: selectedSlug,
              customTitle: "",
              customDescription: "",
              customImage: "",
              ctaLink: `/series/${selectedSlug}`,
            });
            closeLiveEdit();
            const s = series.find((item) => item.slug === selectedSlug);
            showToast(`"${s?.title || selectedSlug}" set as Featured Spotlight series!`);
          }}
        />
      )}

      {/* Shipping Config Modal */}
      {activeLiveEditTarget?.type === "shipping" && (
        <ShippingLiveEditModal
          initialConfig={shippingConfig}
          initialArabicConfig={shippingArabicConfig}
          currentLocale={locale}
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateShippingConfig(updated);
            closeLiveEdit();
            showToast("Logistics & shipping configuration updated and synced live!");
          }}
          onSaveArabic={(updated) => {
            updateShippingArabicConfig(updated);
            closeLiveEdit();
            showToast("تم تحديث قسم الشحن والمزايا بالعربية ومزامنته!");
          }}
        />
      )}

      {/* Footer Copy Modal */}
      {activeLiveEditTarget?.type === "footer" && (
        <FooterLiveEditModal
          initialConfig={editorialConfig}
          initialArabicConfig={editorialArabicConfig}
          currentLocale={locale}
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateEditorialConfig(updated);
            closeLiveEdit();
            showToast("Footer copy updated and synced live!");
          }}
          onSaveArabic={(updated) => {
            updateEditorialArabicConfig(updated);
            closeLiveEdit();
            showToast("تم تحديث نصوص الفوتر بالعربية ومزامنتها!");
          }}
        />
      )}

      {/* Store Policies Modal */}
      {activeLiveEditTarget?.type === "editorial" && (
        <PoliciesLiveEditModal
          initialConfig={editorialConfig}
          initialArabicConfig={editorialArabicConfig}
          initialPolicy={policyContent}
          initialPolicyArabic={policyContentArabic}
          initialTab={activeLiveEditTarget.tab || "shipping"}
          currentLocale={locale}
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateEditorialConfig(updated);
            closeLiveEdit();
            showToast("Store policies updated and synced live!");
          }}
          onSaveArabic={(updated) => {
            updateEditorialArabicConfig(updated);
            closeLiveEdit();
            showToast("تم تحديث نصوص السياسات بالعربية ومزامنتها!");
          }}
          onSavePolicy={updatePolicyContent}
          onSavePolicyArabic={updatePolicyContentArabic}
          onOpenShippingRates={() => openLiveEdit({ type: "shipping" })}
        />
      )}

      {/* Figures & Posters home section */}
      {activeLiveEditTarget?.type === "shop-showcase" && (
        <ShopShowcaseLiveEditModal
          initialConfig={shopShowcaseConfig}
          initialArabicConfig={shopShowcaseArabicConfig}
          volumes={volumes}
          onClose={closeLiveEdit}
          onSave={(updated, arabic) => {
            updateShopShowcaseConfig(updated);
            updateShopShowcaseArabicConfig(arabic);
            closeLiveEdit();
            showToast("Figures & posters section updated and synced live!");
          }}
        />
      )}

      {/* Deals / Shop by franchise / Picked for you home sections */}
      {activeLiveEditTarget?.type === "home-extras" && (
        <HomeExtrasLiveEditModal
          key={activeLiveEditTarget.section}
          section={activeLiveEditTarget.section}
          initial={resolveHomeExtras(homeExtrasConfig)[activeLiveEditTarget.section]}
          onClose={closeLiveEdit}
          onSave={(settings) => {
            updateHomeExtrasConfig(activeLiveEditTarget.section, settings);
            closeLiveEdit();
            showToast("Home section updated and synced live!");
          }}
        />
      )}

      {/* Trending Now Modal */}
      {/* Box Sets Modal */}
      {activeLiveEditTarget?.type === "box-sets" && (
        <TrendingLiveEditModal
          initialConfig={boxSetsConfig}
          initialArabicConfig={boxSetsArabicConfig}
          currentLocale={locale}
          sectionLabel="Box Sets Carousel"
          arabicSectionLabel="تعديل نصوص المجموعات الكاملة"
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateBoxSetsConfig(updated);
            closeLiveEdit();
            showToast("Box sets carousel configuration updated and synced live!");
          }}
          onSaveArabic={(updated) => {
            updateBoxSetsArabicConfig(updated);
            closeLiveEdit();
            showToast("تم تحديث قسم المجموعات الكاملة بالعربية ومزامنته!");
          }}
        />
      )}

      {/* Announcement Ticker Modal */}
      {activeLiveEditTarget?.type === "ticker" && (
        <TickerLiveEditModal
          initialConfig={tickerConfig}
          initialArabicConfig={tickerArabicConfig}
          currentLocale={locale}
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateTickerConfig(updated);
            closeLiveEdit();
            showToast("Announcement ticker updated and synced live!");
          }}
          onSaveArabic={(updated) => {
            updateTickerArabicConfig(updated);
            closeLiveEdit();
            showToast("تم تحديث نصوص الشريط الإعلاني بالعربية ومزامنتها!");
          }}
        />
      )}

      {activeLiveEditTarget?.type === "trending" && (
        <TrendingLiveEditModal
          initialConfig={trendingConfig}
          initialArabicConfig={trendingArabicConfig}
          currentLocale={locale}
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateTrendingConfig(updated);
            closeLiveEdit();
            showToast("Trending carousel configuration updated and synced live!");
          }}
          onSaveArabic={(updated) => {
            updateTrendingArabicConfig(updated);
            closeLiveEdit();
            showToast("تم تحديث قسم الأكثر رواجاً بالعربية ومزامنته!");
          }}
        />
      )}

      {/* New Releases Modal */}
      {activeLiveEditTarget?.type === "new-releases" && (
        <NewReleasesLiveEditModal
          initialConfig={newReleasesConfig}
          initialArabicConfig={newReleasesArabicConfig}
          currentLocale={locale}
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateNewReleasesConfig(updated);
            closeLiveEdit();
            showToast("New releases showcase updated and synced live!");
          }}
          onSaveArabic={(updated) => {
            updateNewReleasesArabicConfig(updated);
            closeLiveEdit();
            showToast("تم تحديث قسم أحدث الإصدارات بالعربية ومزامنته!");
          }}
        />
      )}

      {/* Genre Bento Modal */}
      {activeLiveEditTarget?.type === "genre-bento" && (
        <GenreBentoLiveEditModal
          initialConfig={genreBentoConfig}
          initialArabicConfig={genreBentoArabicConfig}
          genres={genres}
          currentLocale={locale}
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateGenreBentoConfig(updated);
            closeLiveEdit();
            showToast("Genre Bento section updated and synced live!");
          }}
          onSaveArabic={(updated) => {
            updateGenreBentoArabicConfig(updated);
            closeLiveEdit();
            showToast("تم تحديث نصوص دليل التصنيفات بالعربية ومزامنتها!");
          }}
          onAddGenre={(newGenre) => {
            addGenre(newGenre);
            showToast(`Category "${newGenre.name}" created successfully!`);
          }}
          onUpdateGenre={(id, updates) => {
            updateGenre(id, updates);
            showToast("Category updated successfully!");
          }}
          onDeleteGenre={(id) => {
            deleteGenre(id);
            showToast("Category removed from catalog.");
          }}
        />
      )}

      {/* Genre Card Modal */}
      {activeLiveEditTarget?.type === "genre-card" && (
        <GenreFormModal
          isOpen={true}
          initialGenre={selectedGenre}
          onClose={closeLiveEdit}
          onSave={(savedGenre) => {
            if (selectedGenre) {
              updateGenre(selectedGenre.id, savedGenre);
              showToast(`Category "${savedGenre.name}" updated live!`);
            } else {
              addGenre(savedGenre);
              showToast(`Category "${savedGenre.name}" created live!`);
            }
            closeLiveEdit();
          }}
          onDelete={(id) => {
            deleteGenre(id);
            closeLiveEdit();
            showToast("Category removed from catalog.");
          }}
        />
      )}

      {/* Manga Discovery Modal */}
      {activeLiveEditTarget?.type === "manga-discovery" && (
        <MangaDiscoveryLiveEditModal
          initialConfig={mangaDiscoveryConfig}
          initialArabicConfig={mangaDiscoveryArabicConfig}
          currentLocale={locale}
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateMangaDiscoveryConfig(updated);
            closeLiveEdit();
            showToast("Manga Discovery section updated and synced live!");
          }}
          onSaveArabic={(updated) => {
            updateMangaDiscoveryArabicConfig(updated);
            closeLiveEdit();
            showToast("تم تحديث قسم استكشاف المانجا بالعربية ومزامنته!");
          }}
        />
      )}
    </>
  );
}

/* ========================================================================== */
/* LIGHTWEIGHT IN-PLACE EDIT MODALS                                            */
/* ========================================================================== */

function ModalLanguageSwitch({
  activeLang,
  onChange,
}: {
  activeLang: "en" | "ar";
  onChange: (lang: "en" | "ar") => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-ink border border-ink-border p-0.5 rounded-sm shrink-0">
      <button
        type="button"
        onClick={() => onChange("en")}
        className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer ${
          activeLang === "en"
            ? "bg-gold text-ink shadow-xs"
            : "text-text-muted hover:text-paper"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => onChange("ar")}
        className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer ${
          activeLang === "ar"
            ? "bg-gold text-ink shadow-xs"
            : "text-text-muted hover:text-paper"
        }`}
      >
        العربية AR
      </button>
    </div>
  );
}

function HeroLiveEditModal({
  initialContent,
  initialArabicContent,
  currentLocale = "en",
  onClose,
  onSave,
  onSaveArabic,
}: {
  initialContent: HeroContent;
  initialArabicContent?: HeroArabicContent;
  currentLocale?: "en" | "ar";
  onClose: () => void;
  onSave: (content: HeroContent) => void;
  onSaveArabic: (content: HeroArabicContent) => void;
}) {
  useModalScrollLock(true);
  const [editLang, setEditLang] = useState<"en" | "ar">(currentLocale);
  const [form, setForm] = useState<HeroContent>(initialContent);
  const [arabicForm, setArabicForm] = useState<HeroArabicContent>(
    initialArabicContent || {
      badgeText: "الفصل الأول — بداية الحكاية",
      headlineLine1: "اكتشف",
      headlineHighlight: "حكايتك",
      headlineLine2: "القادمة",
      subheadline:
        "مانجا، وروايات خفيفة، وقصص تأخذك لعوالم استثنائية. من الطبعات الأولى الفاخرة والمجلدات الكبيرة المقوّاة، حتى بوكس سيت كاملة للمقتنين.",
      primaryCtaText: "استكشف المانجا",
      primaryCtaLink: "/manga",
      secondaryCtaText: "أحدث الإصدارات",
      secondaryCtaLink: "#new-releases",
      stat1Value: "١,٤٠٠+",
      stat1Label: "مجلد في الأرشيف",
      stat2Value: "١٠٠%",
      stat2Label: "إصدارات أصلية مرخصة",
      stat3Value: "٢٤-٤٨ ساعة",
      stat3Label: "شحن لجميع محافظات مصر",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editLang === "ar") {
      onSaveArabic(arabicForm);
    } else {
      onSave(form);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        {/* Header with Language Switch */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50 gap-4">
          <div className="min-w-0">
            <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider truncate">
              Live Edit: Hero Headline &amp; Actions
            </h3>
            <p className="text-[11px] font-mono text-text-muted truncate">
              {editLang === "ar"
                ? "تعديل نصوص البانر الرئيسي باللغة العربية ومزامنتها فوراً"
                : "Changes apply instantly to the homepage banner."}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ModalLanguageSwitch activeLang={editLang} onChange={setEditLang} />
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-paper p-1 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {editLang === "ar" ? (
            <div className="space-y-4" dir="rtl">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  شارة الفصل العلوية (Badge Text)
                </label>
                <input
                  type="text"
                  value={arabicForm.badgeText || ""}
                  onChange={(e) => setArabicForm({ ...arabicForm, badgeText: e.target.value })}
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 flex flex-col justify-between">
                  <label className="text-[11px] sm:text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                    السطر الأول (Line 1)
                  </label>
                  <input
                    type="text"
                    value={arabicForm.headlineLine1 || ""}
                    onChange={(e) => setArabicForm({ ...arabicForm, headlineLine1: e.target.value })}
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-between">
                  <label className="text-[11px] sm:text-xs font-mono font-semibold text-gold uppercase tracking-wider">
                    الكلمة الذهبية (Highlight)
                  </label>
                  <input
                    type="text"
                    value={arabicForm.headlineHighlight || ""}
                    onChange={(e) => setArabicForm({ ...arabicForm, headlineHighlight: e.target.value })}
                    className="w-full bg-ink-surface border border-gold/40 text-gold px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-between">
                  <label className="text-[11px] sm:text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                    السطر الثاني (Line 2)
                  </label>
                  <input
                    type="text"
                    value={arabicForm.headlineLine2 || ""}
                    onChange={(e) => setArabicForm({ ...arabicForm, headlineLine2: e.target.value })}
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  الوصف التحريري (Subheadline)
                </label>
                <textarea
                  rows={3}
                  value={arabicForm.subheadline || ""}
                  onChange={(e) => setArabicForm({ ...arabicForm, subheadline: e.target.value })}
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none resize-none font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                    نص زر الإجراء الرئيسي (Primary CTA)
                  </label>
                  <input
                    type="text"
                    value={arabicForm.primaryCtaText || ""}
                    onChange={(e) => setArabicForm({ ...arabicForm, primaryCtaText: e.target.value })}
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                    نص زر الإجراء الثانوي (Secondary CTA)
                  </label>
                  <input
                    type="text"
                    value={arabicForm.secondaryCtaText || ""}
                    onChange={(e) => setArabicForm({ ...arabicForm, secondaryCtaText: e.target.value })}
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-paper-muted uppercase">إحصائية 1 (المجلدات)</label>
                  <input
                    type="text"
                    value={arabicForm.stat1Value || ""}
                    onChange={(e) => setArabicForm({ ...arabicForm, stat1Value: e.target.value })}
                    placeholder="١,٤٠٠+"
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-1.5 text-xs rounded-xs mb-1"
                  />
                  <input
                    type="text"
                    value={arabicForm.stat1Label || ""}
                    onChange={(e) => setArabicForm({ ...arabicForm, stat1Label: e.target.value })}
                    placeholder="مجلد في الأرشيف"
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-1.5 text-xs rounded-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-paper-muted uppercase">إحصائية 2 (الترخيص)</label>
                  <input
                    type="text"
                    value={arabicForm.stat2Value || ""}
                    onChange={(e) => setArabicForm({ ...arabicForm, stat2Value: e.target.value })}
                    placeholder="١٠٠%"
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-1.5 text-xs rounded-xs mb-1"
                  />
                  <input
                    type="text"
                    value={arabicForm.stat2Label || ""}
                    onChange={(e) => setArabicForm({ ...arabicForm, stat2Label: e.target.value })}
                    placeholder="إصدارات أصلية مرخصة"
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-1.5 text-xs rounded-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-paper-muted uppercase">إحصائية 3 (الشحن)</label>
                  <input
                    type="text"
                    value={arabicForm.stat3Value || ""}
                    onChange={(e) => setArabicForm({ ...arabicForm, stat3Value: e.target.value })}
                    placeholder="٢٤-٤٨ ساعة"
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-1.5 text-xs rounded-xs mb-1"
                  />
                  <input
                    type="text"
                    value={arabicForm.stat3Label || ""}
                    onChange={(e) => setArabicForm({ ...arabicForm, stat3Label: e.target.value })}
                    placeholder="شحن لجميع محافظات مصر"
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-1.5 text-xs rounded-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  Badge Text (Top of Hero)
                </label>
                <input
                  type="text"
                  value={form.badgeText || ""}
                  onChange={(e) => setForm({ ...form, badgeText: e.target.value })}
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 flex flex-col justify-between">
                  <label className="text-[11px] sm:text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                    Headline Line 1
                  </label>
                  <input
                    type="text"
                    value={form.headlineLine1 || ""}
                    onChange={(e) => setForm({ ...form, headlineLine1: e.target.value })}
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-between">
                  <label className="text-[11px] sm:text-xs font-mono font-semibold text-gold uppercase tracking-wider">
                    Headline Highlight (Gold)
                  </label>
                  <input
                    type="text"
                    value={form.headlineHighlight || ""}
                    onChange={(e) => setForm({ ...form, headlineHighlight: e.target.value })}
                    className="w-full bg-ink-surface border border-gold/40 text-gold px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-between">
                  <label className="text-[11px] sm:text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                    Headline Line 2
                  </label>
                  <input
                    type="text"
                    value={form.headlineLine2 || ""}
                    onChange={(e) => setForm({ ...form, headlineLine2: e.target.value })}
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  Subheadline Editorial Copy
                </label>
                <textarea
                  rows={3}
                  value={form.subheadline || ""}
                  onChange={(e) => setForm({ ...form, subheadline: e.target.value })}
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none resize-none font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                    Primary CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={form.primaryCtaText || ""}
                    onChange={(e) => setForm({ ...form, primaryCtaText: e.target.value })}
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                    Primary CTA Link
                  </label>
                  <input
                    type="text"
                    value={form.primaryCtaLink || ""}
                    onChange={(e) => setForm({ ...form, primaryCtaLink: e.target.value })}
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-paper-muted uppercase">Stat 1 (Volumes)</label>
                  <input
                    type="text"
                    value={form.stat1Value || ""}
                    onChange={(e) => setForm({ ...form, stat1Value: e.target.value })}
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-1.5 text-xs rounded-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-paper-muted uppercase">Stat 2 (Licensing)</label>
                  <input
                    type="text"
                    value={form.stat2Value || ""}
                    onChange={(e) => setForm({ ...form, stat2Value: e.target.value })}
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-1.5 text-xs rounded-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-paper-muted uppercase">Stat 3 (Delivery)</label>
                  <input
                    type="text"
                    value={form.stat3Value || ""}
                    onChange={(e) => setForm({ ...form, stat3Value: e.target.value })}
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-1.5 text-xs rounded-xs"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-text-muted hover:text-paper cursor-pointer"
            >
              {editLang === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-gold hover:bg-gold-light text-ink text-xs font-mono font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-md transition-transform hover:scale-105"
            >
              <Save className="w-4 h-4" />
              {editLang === "ar" ? "حفظ ومزامنة فورية" : "Save & Sync Live"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function FeaturedSeriesLiveEditModal({
  initialConfig,
  seriesList,
  onClose,
  onSave,
}: {
  initialConfig: FeaturedSeriesConfig;
  seriesList: Series[];
  onClose: () => void;
  onSave: (config: FeaturedSeriesConfig) => void;
}) {
  useModalScrollLock(true);
  const [form, setForm] = useState<FeaturedSeriesConfig>(initialConfig);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50">
          <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
            Live Edit: Featured Series Spotlight
          </h3>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-paper p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} data-lenis-prevent
          className="p-6 space-y-4 max-h-[70vh] overflow-y-auto overscroll-contain">
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
              Select Series to Feature
            </label>
            <CustomSelect
              fullWidth
              value={form.seriesSlug}
              onChange={(val) =>
                setForm({ ...form, seriesSlug: val, ctaLink: `/series/${val}` })
              }
              options={seriesList.map((s) => ({
                value: s.slug,
                label: s.japaneseTitle ? `${s.title} (${s.japaneseTitle})` : s.title,
                badge: s.status ? s.status.toUpperCase() : undefined,
              }))}
              buttonClassName="bg-ink-surface border-ink-border text-paper h-10 px-3 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
              Badge Text (Optional Override)
            </label>
            <input
              type="text"
              placeholder="e.g. FEATURED SERIES — 呪術廻戦"
              value={form.badgeText || ""}
              onChange={(e) => setForm({ ...form, badgeText: e.target.value })}
              className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
              Custom Headline (Leave empty to use canonical title)
            </label>
            <input
              type="text"
              placeholder="Custom title override"
              value={form.customTitle || ""}
              onChange={(e) => setForm({ ...form, customTitle: e.target.value })}
              className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
              Custom Headline — Arabic
            </label>
            <input
              type="text"
              dir="rtl"
              placeholder="عنوان مخصّص بالعربية"
              value={form.customTitleAr || ""}
              onChange={(e) => setForm({ ...form, customTitleAr: e.target.value })}
              className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
            />
            <span className="text-[10px] text-text-muted">Optional; falls back to English.</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
              Custom Description
            </label>
            <textarea
              rows={3}
              placeholder="Custom spotlight synopsis"
              value={form.customDescription || ""}
              onChange={(e) => setForm({ ...form, customDescription: e.target.value })}
              className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
              Custom Description — Arabic
            </label>
            <textarea
              rows={3}
              dir="rtl"
              placeholder="وصف مخصّص بالعربية"
              value={form.customDescriptionAr || ""}
              onChange={(e) => setForm({ ...form, customDescriptionAr: e.target.value })}
              className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none resize-none"
            />
            <span className="text-[10px] text-text-muted">
              Optional; falls back to the series&apos; Arabic description, then English.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-text-muted hover:text-paper cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-gold hover:bg-gold-light text-ink text-xs font-mono font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-md transition-transform hover:scale-105"
            >
              <Save className="w-4 h-4" />
              Save &amp; Sync Live
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ShippingLiveEditModal({
  initialConfig,
  initialArabicConfig,
  currentLocale = "en",
  onClose,
  onSave,
  onSaveArabic,
}: {
  initialConfig: ShippingConfig;
  initialArabicConfig?: ShippingArabicConfig;
  currentLocale?: "en" | "ar";
  onClose: () => void;
  onSave: (config: ShippingConfig) => void;
  onSaveArabic: (config: ShippingArabicConfig) => void;
}) {
  useModalScrollLock(true);
  const [editLang, setEditLang] = useState<"en" | "ar">(currentLocale);
  const [form, setForm] = useState<ShippingConfig>(initialConfig);
  const [arabicForm, setArabicForm] = useState<ShippingArabicConfig>(
    initialArabicConfig || {
      hubName: "مدينة 6 أكتوبر • مصر",
      dispatchBadgeText: "شحن سريع لكافة المحافظات",
      guaranteeBadgeText: "أصالة أرشيفية 100%",
      deliveryEstimate: "خلال 24-48 ساعة",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editLang === "ar") {
      onSaveArabic(arabicForm);
    } else {
      onSave(form);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50 gap-3">
          <div className="min-w-0">
            <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider truncate">
              Live Edit: Logistics &amp; Shipping Settings
            </h3>
            <p className="text-[11px] font-mono text-text-muted truncate">
              {editLang === "ar" ? "تعديل إعدادات ونصوص الشحن بالعربية" : "Configure dispatch hub, thresholds & delivery"}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ModalLanguageSwitch activeLang={editLang} onChange={setEditLang} />
            <button type="button" onClick={onClose} className="text-text-muted hover:text-paper p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain">
          {editLang === "ar" ? (
            <div className="space-y-6" dir="rtl">
              {/* نصوص المستودع والتقديرات */}
              <div className="space-y-4">
                <h4 className="text-xs font-mono font-bold text-gold uppercase tracking-wider">
                  نصوص المستودع وتقدير التوصيل بالعربية
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                      اسم مقر الشحن (Hub Name)
                    </label>
                    <input
                      type="text"
                      value={arabicForm.hubName || ""}
                      onChange={(e) => setArabicForm({ ...arabicForm, hubName: e.target.value })}
                      placeholder="مدينة 6 أكتوبر • مصر"
                      className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                      تقدير مدة التوصيل
                    </label>
                    <input
                      type="text"
                      value={arabicForm.deliveryEstimate || ""}
                      onChange={(e) => setArabicForm({ ...arabicForm, deliveryEstimate: e.target.value })}
                      placeholder="خلال 24-48 ساعة"
                      className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                      شارة الشحن السريع
                    </label>
                    <input
                      type="text"
                      value={arabicForm.dispatchBadgeText || ""}
                      onChange={(e) => setArabicForm({ ...arabicForm, dispatchBadgeText: e.target.value })}
                      placeholder="شحن سريع لكافة المحافظات"
                      className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                      شارة ضمان الأصالة
                    </label>
                    <input
                      type="text"
                      value={arabicForm.guaranteeBadgeText || ""}
                      onChange={(e) => setArabicForm({ ...arabicForm, guaranteeBadgeText: e.target.value })}
                      placeholder="أصالة أرشيفية 100%"
                      className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Section: Logistics & Thresholds */}
              <div className="space-y-4">
                <h4 className="text-xs font-mono font-bold text-gold uppercase tracking-wider">
                  Logistics &amp; Free Delivery Threshold
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                      Dispatch Hub Name
                    </label>
                    <input
                      type="text"
                      value={form.hubName || ""}
                      onChange={(e) => setForm({ ...form, hubName: e.target.value })}
                      className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                      Delivery Estimate
                    </label>
                    <input
                      type="text"
                      value={form.deliveryEstimate || ""}
                      onChange={(e) => setForm({ ...form, deliveryEstimate: e.target.value })}
                      className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                    />
                  </div>
                </div>

                <div className="p-4 bg-ink-surface/60 border border-ink-border rounded-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-semibold uppercase text-paper block">
                        Free Shipping Threshold
                      </span>
                      <span className="text-[10px] text-text-muted">
                        Automatic zero shipping on reaching subtotal threshold
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                      <input
                        type="checkbox"
                        checked={form.freeShippingEnabled}
                        onChange={(e) => setForm({ ...form, freeShippingEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-ink border border-ink-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-paper after:border after:border-ink-border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold peer-checked:border-gold"></div>
                      <span className={`ml-2.5 text-xs font-mono font-bold tracking-wider uppercase transition-colors ${
                        form.freeShippingEnabled ? "text-gold" : "text-text-muted"
                      }`}>
                        {form.freeShippingEnabled ? "ACTIVE" : "DISABLED"}
                      </span>
                    </label>
                  </div>

                  {form.freeShippingEnabled && (
                    <div className="space-y-1.5 pt-2 border-t border-ink-border/50">
                      <label className="text-xs font-mono font-semibold text-gold uppercase tracking-wider">
                        Minimum Subtotal for Free Delivery (EGP)
                      </label>
                      <input
                        type="number"
                        value={form.freeShippingThreshold ?? 500}
                        onChange={(e) => setForm({ ...form, freeShippingThreshold: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-full bg-ink border border-gold/40 text-gold font-bold px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                    Standard Baseline Shipping Cost (EGP)
                  </label>
                  <input
                    type="number"
                    value={form.standardShippingCost || 65}
                    onChange={(e) => setForm({ ...form, standardShippingCost: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-text-muted hover:text-paper cursor-pointer"
            >
              {editLang === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-gold hover:bg-gold-light text-ink text-xs font-mono font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-md transition-transform hover:scale-105"
            >
              <Save className="w-4 h-4" />
              {editLang === "ar" ? "حفظ ومزامنة فورية" : "Save & Sync Live"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Editorial config: footer copy and customer policies ─────────────────
 *
 * Both live in the one `editorialConfig` object, but they are edited from two
 * unrelated places — the footer itself, and the customer-facing Policies
 * dialog — so they get a modal each rather than one screen that opens the same
 * way from both. Each modal saves only the keys it owns, so neither can write
 * over a field the other one is responsible for.
 */

/** A field both language configs carry — everything except contact/owner. */
type EditorialSharedKey =
  | "siteTagline"
  | "footerQuote"
  | "authenticityGuaranteeText"
  | "shippingPolicyText"
  | "returnPolicyText"
  | "privacyPolicyText"
  | "footerDescription"
  | "hubCities";

type PolicySectionId = "shipping" | "authenticity" | "privacy" | "terms";

const POLICY_SECTIONS: {
  id: PolicySectionId;
  icon: typeof Info;
  key: EditorialSharedKey;
  en: string;
  ar: string;
  hintEn: string;
  hintAr: string;
}[] = [
  {
    id: "shipping",
    icon: Truck,
    key: "shippingPolicyText",
    en: "Shipping",
    ar: "الشحن",
    hintEn: "Shown in the Shipping tab of the customer Policies dialog.",
    hintAr: "يظهر في تبويب الشحن بنافذة السياسات للعملاء.",
  },
  {
    id: "authenticity",
    icon: ShieldCheck,
    key: "authenticityGuaranteeText",
    en: "Authenticity",
    ar: "الأصالة",
    hintEn: "Shown in the Authenticity tab of the customer Policies dialog.",
    hintAr: "يظهر في تبويب الأصالة بنافذة السياسات للعملاء.",
  },
  {
    id: "privacy",
    icon: Lock,
    key: "privacyPolicyText",
    en: "Privacy",
    ar: "الخصوصية",
    hintEn: "Shown in the Privacy tab of the customer Policies dialog.",
    hintAr: "يظهر في تبويب الخصوصية بنافذة السياسات للعملاء.",
  },
  {
    id: "terms",
    icon: FileText,
    key: "returnPolicyText",
    en: "Terms",
    ar: "الاستبدال",
    hintEn: "Shown in the Terms tab of the customer Policies dialog.",
    hintAr: "يظهر في تبويب الاستبدال بنافذة السياسات للعملاء.",
  },
];

const editorialFieldLabel = "text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider block mb-1.5";
const editorialFieldInput =
  "w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none";

const ARABIC_EDITORIAL_FALLBACK: EditorialArabicConfig = {
  siteTagline: "أرشيف المانجا اليابانية الفاخرة والطبعات الأصلية في مصر",
  footerQuote: "كل صفحة تُقلب هي بوابة لعالم استثنائي، ومجلدات المقتنين تُصنع لتبقى حية عبر الأجيال.",
  authenticityGuaranteeText: "نضمن أصالة 100% لجميع المجلدات والروايات المعروضة في ANIMEVERSE. طبعات يابانية رسمية ومرخصة بدون أي نسخ مقلدة.",
  shippingPolicyText: "شحن مغلف بعناية فائقة ضد الصدمات والرطوبة، يصلك خلال 24-48 ساعة لجميع أنحاء مصر.",
  privacyPolicyText: "خصوصيتك أولويتنا المطلقة. تلتزم كايرو بأعلى معايير حماية البيانات وبقانون حماية البيانات الشخصية المصري (قانون رقم 151 لسنة 2020). لا نقوم ببيع أو مشاركة بياناتك إطلاقاً.",
  returnPolicyText: "حق الاستبدال الفوري خلال 14 يوماً في حالة وجود أي عيب طباعي أو تلف ناتج عن الشحن.",
  footerDescription: "دار ANIMEVERSE — الأرشيف التحريري الأول في مصر المتخصص في استيراد وتوفير أندر مجلدات المانجا والروايات الخفيفة وبوكس سيت المقتنين الأصلية بأعلى معايير الجودة.",
  hubCities: "مدينة 6 أكتوبر • القاهرة • الإسكندرية • كافة المحافظات",
};

/**
 * A list a curator can grow and shrink: the delivery-time cards, the
 * certificate's ticks, the titled paragraphs under each policy. The caller
 * draws one row; this handles adding, removing and replacing.
 */
function RepeatableList<T>({
  label,
  addLabel,
  isAr,
  items,
  onChange,
  blank,
  render,
}: {
  label: string;
  addLabel: string;
  isAr: boolean;
  items: T[];
  onChange: (items: T[]) => void;
  /** A fresh, empty entry, copied when the curator adds a row. */
  blank: T;
  render: (item: T, update: (next: T) => void) => React.ReactNode;
}) {
  const replace = (index: number, next: T) => onChange(items.map((item, i) => (i === index ? next : item)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className={`${editorialFieldLabel} mb-0`}>{label}</label>
        <button
          type="button"
          onClick={() => onChange([...items, structuredClone(blank)])}
          className="flex items-center gap-1 text-[10px] font-mono font-bold text-gold hover:text-white uppercase tracking-wider cursor-pointer transition-colors"
        >
          <Plus className="w-3 h-3" />
          {addLabel}
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-[10px] text-text-muted italic">{isAr ? "لا يوجد شيء هنا." : "Nothing here yet."}</p>
      )}

      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-2 p-2.5 bg-ink-surface/40 border border-ink-border rounded-xs">
          <span className="text-[10px] font-mono text-text-muted pt-2.5 w-4 shrink-0">{index + 1}</span>
          <div className="flex-1 min-w-0">{render(item, (next) => replace(index, next))}</div>
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            title={isAr ? "حذف" : "Remove"}
            className="p-1.5 text-text-muted hover:text-vermilion cursor-pointer transition-colors shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/** The English and Arabic drafts, and one accessor pair over whichever is live. */
function useEditorialDraft(
  initialConfig: EditorialConfig,
  initialArabicConfig: EditorialArabicConfig | undefined,
  currentLocale: "en" | "ar"
) {
  const [editLang, setEditLang] = useState<"en" | "ar">(currentLocale);
  const [form, setForm] = useState<EditorialConfig>(initialConfig);
  const [arabicForm, setArabicForm] = useState<EditorialArabicConfig>(
    initialArabicConfig || ARABIC_EDITORIAL_FALLBACK
  );

  const isAr = editLang === "ar";
  const value = (key: EditorialSharedKey): string => (isAr ? arabicForm[key] : form[key]) || "";
  const setValue = (key: EditorialSharedKey, next: string) => {
    if (isAr) setArabicForm({ ...arabicForm, [key]: next });
    else setForm({ ...form, [key]: next });
  };

  return { editLang, setEditLang, isAr, form, setForm, arabicForm, value, setValue };
}

/** The chrome both editorial modals share: header, language switch, buttons. */
function EditorialModalShell({
  title,
  subtitle,
  editLang,
  onLangChange,
  isAr,
  onClose,
  onSubmit,
  nav,
  children,
}: {
  title: string;
  subtitle: string;
  editLang: "en" | "ar";
  onLangChange: (lang: "en" | "ar") => void;
  isAr: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  nav?: React.ReactNode;
  children: React.ReactNode;
}) {
  useModalScrollLock(true);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50 gap-3">
          <div className="min-w-0">
            <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider truncate">{title}</h3>
            <p className="text-[11px] font-mono text-text-muted truncate">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ModalLanguageSwitch activeLang={editLang} onChange={onLangChange} />
            <button type="button" onClick={onClose} className="text-text-muted hover:text-paper p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {nav}

        <form
          onSubmit={onSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-5 overscroll-contain"
          dir={isAr ? "rtl" : "ltr"}
        >
          {children}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-text-muted hover:text-paper cursor-pointer"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-gold hover:bg-gold-light text-ink text-xs font-mono font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-md transition-transform hover:scale-105"
            >
              <Save className="w-4 h-4" />
              {isAr ? "حفظ ومزامنة فورية" : "Save & Sync Live"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * The footer's own copy: brand narrative, hub cities, tagline, quote, and the
 * contact details printed beside them. Opened from the footer, and it writes
 * nothing the Policies dialog owns.
 */
function FooterLiveEditModal({
  initialConfig,
  initialArabicConfig,
  currentLocale = "en",
  onClose,
  onSave,
  onSaveArabic,
}: {
  initialConfig: EditorialConfig;
  initialArabicConfig?: EditorialArabicConfig;
  currentLocale?: "en" | "ar";
  onClose: () => void;
  onSave: (config: Partial<EditorialConfig>) => void;
  onSaveArabic: (config: Partial<EditorialArabicConfig>) => void;
}) {
  const { editLang, setEditLang, isAr, form, setForm, arabicForm, value, setValue } = useEditorialDraft(
    initialConfig,
    initialArabicConfig,
    currentLocale
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAr) {
      onSaveArabic({
        footerDescription: arabicForm.footerDescription,
        hubCities: arabicForm.hubCities,
        siteTagline: arabicForm.siteTagline,
        footerQuote: arabicForm.footerQuote,
      });
    } else {
      onSave({
        footerDescription: form.footerDescription,
        hubCities: form.hubCities,
        siteTagline: form.siteTagline,
        footerQuote: form.footerQuote,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        ownerName: form.ownerName,
      });
    }
  };

  return (
    <EditorialModalShell
      title="Live Edit: Footer"
      subtitle={isAr ? "تعديل نصوص الفوتر وبيانات التواصل" : "Footer brand copy & contact details"}
      editLang={editLang}
      onLangChange={setEditLang}
      isAr={isAr}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      {/* Contact details are printed identically in both languages, so they
          live on the English side only rather than being typed twice. */}
      {isAr ? (
        <div className="p-3 bg-ink-surface/60 border border-ink-border rounded-xs flex items-center justify-between gap-3 text-[11px] font-mono">
          <span className="text-paper-muted">
            بيانات التواصل (الإيميل، الهاتف، اسم المالك) مشتركة بين اللغتين وتُعدَّل بالإنجليزية فقط.
          </span>
          <button
            type="button"
            onClick={() => setEditLang("en")}
            className="flex items-center gap-1 text-gold hover:text-white font-bold uppercase tracking-wider shrink-0 cursor-pointer"
          >
            EN
            <ArrowRight className="w-3 h-3 rotate-180" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-bold text-gold uppercase tracking-wider">Contact &amp; Ownership</h4>
          <p className="text-[10px] text-text-muted -mt-2">Shared across both languages.</p>
          <div>
            <label className={editorialFieldLabel}>Contact Email</label>
            <input
              type="email"
              value={form.contactEmail || ""}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className={editorialFieldInput}
            />
          </div>
          <div>
            <label className={editorialFieldLabel}>Contact Phone</label>
            <input
              type="tel"
              value={form.contactPhone || ""}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className={editorialFieldInput}
            />
          </div>
          <div>
            <label className={editorialFieldLabel}>Owner Name</label>
            <input
              type="text"
              value={form.ownerName || ""}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
              className={editorialFieldInput}
            />
          </div>
        </div>
      )}

      <div className="space-y-3 pt-3 border-t border-ink-border/60">
        <h4 className="text-xs font-mono font-bold text-gold uppercase tracking-wider">
          {isAr ? "هوية الفوتر" : "Footer Identity"}
        </h4>
        <div>
          <label className={editorialFieldLabel}>{isAr ? "الوصف التحريري بالفوتر" : "Footer Brand Narrative"}</label>
          <textarea
            rows={3}
            value={value("footerDescription")}
            onChange={(e) => setValue("footerDescription", e.target.value)}
            className={`${editorialFieldInput} resize-none`}
          />
        </div>
        <div>
          <label className={editorialFieldLabel}>{isAr ? "سطر المدن ومناطق الشحن" : "Hub Cities Line"}</label>
          <input
            type="text"
            value={value("hubCities")}
            onChange={(e) => setValue("hubCities", e.target.value)}
            placeholder="6TH OF OCTOBER • CAIRO • ALEXANDRIA • ALL EGYPT"
            className={editorialFieldInput}
          />
        </div>
        <div>
          <label className={editorialFieldLabel}>{isAr ? "شعار الموقع" : "Site Tagline"}</label>
          <input
            type="text"
            value={value("siteTagline")}
            onChange={(e) => setValue("siteTagline", e.target.value)}
            className={editorialFieldInput}
          />
        </div>
        <div>
          <label className={editorialFieldLabel}>{isAr ? "المقولة الفلسفية بالفوتر" : "Footer Philosophical Quote"}</label>
          <textarea
            rows={2}
            value={value("footerQuote")}
            onChange={(e) => setValue("footerQuote", e.target.value)}
            className={`${editorialFieldInput} resize-none`}
          />
        </div>
      </div>
    </EditorialModalShell>
  );
}

/**
 * The four policy texts behind the customer-facing Policies dialog. Opened
 * from that dialog on whichever tab the customer is reading, and it writes
 * nothing the footer owns.
 */
function PoliciesLiveEditModal({
  initialConfig,
  initialArabicConfig,
  initialPolicy,
  initialPolicyArabic,
  initialTab = "shipping",
  currentLocale = "en",
  onClose,
  onSave,
  onSaveArabic,
  onSavePolicy,
  onSavePolicyArabic,
  onOpenShippingRates,
}: {
  initialConfig: EditorialConfig;
  initialArabicConfig?: EditorialArabicConfig;
  initialPolicy: PolicyContentConfig;
  initialPolicyArabic: PolicyContentConfig;
  initialTab?: PolicySectionId;
  currentLocale?: "en" | "ar";
  onClose: () => void;
  onSave: (config: Partial<EditorialConfig>) => void;
  onSaveArabic: (config: Partial<EditorialArabicConfig>) => void;
  onSavePolicy: (config: PolicyContentConfig) => void;
  onSavePolicyArabic: (config: PolicyContentConfig) => void;
  onOpenShippingRates?: () => void;
}) {
  const { editLang, setEditLang, isAr, form, arabicForm, value, setValue } = useEditorialDraft(
    initialConfig,
    initialArabicConfig,
    currentLocale
  );
  const [section, setSection] = useState<PolicySectionId>(initialTab);
  const [policyEn, setPolicyEn] = useState<PolicyContentConfig>(initialPolicy);
  const [policyAr, setPolicyAr] = useState<PolicyContentConfig>(initialPolicyArabic);

  const active = POLICY_SECTIONS.find((entry) => entry.id === section) || POLICY_SECTIONS[0];

  const policy = isAr ? policyAr : policyEn;
  const tab = policy[section];

  /** Writes a patch into the tab on screen, in whichever language is live. */
  const patchTab = (patch: Record<string, unknown>) => {
    const next = { ...policy, [section]: { ...policy[section], ...patch } } as PolicyContentConfig;
    if (isAr) setPolicyAr(next);
    else setPolicyEn(next);
  };

  const save = () => {
    if (isAr) {
      onSavePolicyArabic(policyAr);
      onSaveArabic({
        shippingPolicyText: arabicForm.shippingPolicyText,
        authenticityGuaranteeText: arabicForm.authenticityGuaranteeText,
        privacyPolicyText: arabicForm.privacyPolicyText,
        returnPolicyText: arabicForm.returnPolicyText,
      });
    } else {
      onSavePolicy(policyEn);
      onSave({
        shippingPolicyText: form.shippingPolicyText,
        authenticityGuaranteeText: form.authenticityGuaranteeText,
        privacyPolicyText: form.privacyPolicyText,
        returnPolicyText: form.returnPolicyText,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    save();
  };

  /** Persists whatever's on screen before handing off to the rates editor,
   *  so following the link never silently drops an unsaved policy edit. */
  const goToShippingRates = () => {
    if (!onOpenShippingRates) return;
    save();
    onOpenShippingRates();
  };

  return (
    <EditorialModalShell
      title="Live Edit: Store Policies"
      subtitle={isAr ? "تعديل نصوص السياسات الظاهرة للعملاء" : "Policy texts shown to customers"}
      editLang={editLang}
      onLangChange={setEditLang}
      isAr={isAr}
      onClose={onClose}
      onSubmit={handleSubmit}
      nav={
        <div className="flex items-center gap-1 px-3 py-2 bg-ink-surface/30 border-b border-ink-border overflow-x-auto text-[11px] font-mono scrollbar-none">
          {POLICY_SECTIONS.map(({ id, icon: Icon, en, ar }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xs transition-colors shrink-0 uppercase tracking-wider cursor-pointer ${
                section === id
                  ? "bg-gold text-ink font-bold shadow-xs"
                  : "text-text-muted hover:text-paper hover:bg-ink-border"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {isAr ? ar : en}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-5">
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-mono font-bold text-gold uppercase tracking-wider mb-1">
              {isAr ? active.ar : active.en}
            </h4>
            <p className="text-[10px] text-text-muted">{isAr ? active.hintAr : active.hintEn}</p>
          </div>

          <div>
            <label className={editorialFieldLabel}>{isAr ? "عنوان الصندوق العلوي" : "Header Line"}</label>
            <input
              type="text"
              value={tab.leadTitle}
              onChange={(e) => patchTab({ leadTitle: e.target.value })}
              className={editorialFieldInput}
            />
          </div>

          {section === "authenticity" && "certificateTitle" in tab && (
            <div>
              <label className={editorialFieldLabel}>{isAr ? "عنوان الشهادة" : "Certificate Title"}</label>
              <input
                type="text"
                value={tab.certificateTitle}
                onChange={(e) => patchTab({ certificateTitle: e.target.value })}
                className={editorialFieldInput}
              />
            </div>
          )}

          <div>
            <label className={editorialFieldLabel}>{isAr ? "الفقرة الافتتاحية" : "Opening Paragraph"}</label>
            <textarea
              rows={5}
              value={value(active.key)}
              onChange={(e) => setValue(active.key, e.target.value)}
              className={`${editorialFieldInput} resize-none`}
            />
          </div>
        </div>

        {/* Shipping: the delivery-time cards and the courier line. */}
        {section === "shipping" && "windows" in tab && (
          <div className="space-y-3 pt-3 border-t border-ink-border/60">
            <div>
              <label className={editorialFieldLabel}>{isAr ? "عنوان جدول المواعيد" : "Delivery Windows Heading"}</label>
              <input
                type="text"
                value={tab.windowsTitle}
                onChange={(e) => patchTab({ windowsTitle: e.target.value })}
                className={editorialFieldInput}
              />
            </div>

            <RepeatableList
              label={isAr ? "بطاقات مواعيد التوصيل" : "Delivery Windows"}
              addLabel={isAr ? "إضافة منطقة" : "Add region"}
              isAr={isAr}
              items={tab.windows}
              onChange={(windows) => patchTab({ windows })}
              blank={{ region: "", duration: "", note: "" }}
              render={(window, update) => (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={window.region}
                    onChange={(e) => update({ ...window, region: e.target.value })}
                    placeholder={isAr ? "المنطقة" : "Region"}
                    className={editorialFieldInput}
                  />
                  <input
                    type="text"
                    value={window.duration}
                    onChange={(e) => update({ ...window, duration: e.target.value })}
                    placeholder={isAr ? "المدة" : "Duration"}
                    className={editorialFieldInput}
                  />
                  <input
                    type="text"
                    value={window.note}
                    onChange={(e) => update({ ...window, note: e.target.value })}
                    placeholder={isAr ? "ملاحظة" : "Note"}
                    className={editorialFieldInput}
                  />
                </div>
              )}
            />

            <div>
              <label className={editorialFieldLabel}>{isAr ? "سطر شركاء الشحن" : "Courier Line"}</label>
              <input
                type="text"
                value={tab.couriers}
                onChange={(e) => patchTab({ couriers: e.target.value })}
                className={editorialFieldInput}
              />
            </div>
          </div>
        )}

        {/* Authenticity: the tick list on the certificate. */}
        {section === "authenticity" && "checks" in tab && (
          <div className="pt-3 border-t border-ink-border/60">
            <RepeatableList
              label={isAr ? "بنود الشهادة" : "Certificate Ticks"}
              addLabel={isAr ? "إضافة بند" : "Add tick"}
              isAr={isAr}
              items={tab.checks}
              onChange={(checks) => patchTab({ checks })}
              blank=""
              render={(check, update) => (
                <input
                  type="text"
                  value={check}
                  onChange={(e) => update(e.target.value)}
                  className={editorialFieldInput}
                />
              )}
            />
          </div>
        )}

        {/* Every tab: the titled paragraphs under the opening box. */}
        <div className="pt-3 border-t border-ink-border/60">
          <RepeatableList
            label={isAr ? "الفقرات المعنونة" : "Titled Points"}
            addLabel={isAr ? "إضافة فقرة" : "Add point"}
            isAr={isAr}
            items={tab.points}
            onChange={(points) => patchTab({ points })}
            blank={{ title: "", body: "" }}
            render={(point, update) => (
              <div className="space-y-2">
                <input
                  type="text"
                  value={point.title}
                  onChange={(e) => update({ ...point, title: e.target.value })}
                  placeholder={isAr ? "العنوان" : "Title"}
                  className={editorialFieldInput}
                />
                <textarea
                  rows={3}
                  value={point.body}
                  onChange={(e) => update({ ...point, body: e.target.value })}
                  placeholder={isAr ? "النص" : "Body"}
                  className={`${editorialFieldInput} resize-none`}
                />
              </div>
            )}
          />
        </div>

        {section === "shipping" && onOpenShippingRates && (
          <button
            type="button"
            onClick={goToShippingRates}
            className="w-full flex items-center justify-between gap-2 p-2.5 bg-ink-surface/60 border border-gold/30 hover:border-gold rounded-xs transition-colors cursor-pointer text-left rtl:text-right"
          >
            <span className="text-[11px] font-mono text-paper-muted">
              {isAr
                ? "تعديل أسعار الشحن وعتبة الشحن المجاني لكل محافظة"
                : "Edit per-governorate rates & the free-delivery threshold"}
            </span>
            <ArrowRight className={`w-3.5 h-3.5 text-gold shrink-0 ${isAr ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
    </EditorialModalShell>
  );
}

function HeroCardLiveEditModal({
  currentVolumeId,
  volumes,
  onClose,
  onSave,
}: {
  currentVolumeId: string;
  volumes: MangaVolume[];
  onClose: () => void;
  onSave: (volumeId: string) => void;
}) {
  useModalScrollLock(true);
  const [selectedId, setSelectedId] = useState(currentVolumeId);
  const [search, setSearch] = useState("");
  const [selectedSeriesFilter, setSelectedSeriesFilter] = useState("all");

  const seriesOptions = React.useMemo(() => {
    const set = new Set<string>();
    volumes.forEach((v) => {
      if (v.seriesTitle) set.add(v.seriesTitle);
    });
    return Array.from(set).sort();
  }, [volumes]);

  const filteredVolumes = React.useMemo(() => {
    return volumes.filter((v) => {
      const matchSearch =
        !search ||
        v.title.toLowerCase().includes(search.toLowerCase()) ||
        (v.seriesTitle && v.seriesTitle.toLowerCase().includes(search.toLowerCase())) ||
        String(v.volumeNumber).includes(search);
      const matchSeries =
        selectedSeriesFilter === "all" || v.seriesTitle === selectedSeriesFilter;
      return matchSearch && matchSeries;
    });
  }, [volumes, search, selectedSeriesFilter]);

  const selectedVolume = volumes.find((v) => v.id === selectedId) || volumes[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedId) {
      onSave(selectedId);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50">
          <div>
            <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
              Select Featured Book for Hero
            </h3>
            <p className="text-[11px] font-mono text-text-muted">
              Choose which manga volume is showcased on the primary homepage 3D card.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-paper p-1 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currently Selected Preview Banner */}
        {selectedVolume && (
          <div className="px-6 py-3 bg-gold/5 border-b border-gold/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-14 bg-ink rounded-xs overflow-hidden border border-gold/40 shrink-0">
                <img
                  src={selectedVolume.coverImage}
                  alt={selectedVolume.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="text-[10px] font-mono text-gold uppercase tracking-wider block">
                  Currently Selected for Hero
                </span>
                <div className="text-sm font-bold text-paper line-clamp-1">
                  {selectedVolume.title}
                </div>
                <div className="text-xs font-mono text-text-muted">
                  {selectedVolume.seriesTitle} • Vol. {selectedVolume.volumeNumber}
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-gold text-ink font-mono text-xs font-bold rounded-xs shrink-0">
              ACTIVE
            </span>
          </div>
        )}

        {/* Filter Controls */}
        <div className="p-4 border-b border-ink-border bg-ink-surface/30 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search manga by title, volume..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-ink border border-ink-border text-paper text-xs rounded-xs focus:border-gold outline-none font-mono"
            />
          </div>
          <div>
            <CustomSelect
              fullWidth
              value={selectedSeriesFilter}
              onChange={(val) => setSelectedSeriesFilter(val)}
              options={[
                { value: "all", label: "All Series" },
                ...seriesOptions.map((s) => ({ value: s, label: s })),
              ]}
              buttonClassName="bg-ink border-ink-border text-paper h-8 px-3 text-xs font-mono"
            />
          </div>
        </div>

        {/* Volumes Grid */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredVolumes.map((vol) => {
              const isChosen = vol.id === selectedId;
              return (
                <div
                  key={vol.id}
                  onClick={() => setSelectedId(vol.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(vol.id);
                    }
                  }}
                  className={`group relative p-2.5 rounded-sm border cursor-pointer transition-all flex flex-col justify-between ${
                    isChosen
                      ? "bg-gold/10 border-gold shadow-lg shadow-gold/10 ring-1 ring-gold"
                      : "bg-ink-surface/40 border-ink-border/70 hover:border-gold/50 hover:bg-ink-surface"
                  }`}
                >
                  <div className="relative aspect-[3/4] overflow-hidden rounded-xs bg-ink mb-2">
                    <img
                      src={vol.coverImage}
                      alt={vol.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {isChosen && (
                      <div className="absolute top-1.5 right-1.5 p-1 bg-gold text-ink rounded-full shadow-md">
                        <Check strokeWidth={2.5} className="w-3 h-3" />
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-ink/90 text-gold text-[9px] font-mono rounded-xs">
                      VOL. {vol.volumeNumber}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-gold line-clamp-1">
                      {vol.seriesTitle}
                    </div>
                    <div className="text-xs font-bold text-paper line-clamp-1 group-hover:text-gold transition-colors">
                      {vol.title}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-ink-border bg-ink-surface/40">
            <span className="text-xs font-mono text-text-muted">
              {filteredVolumes.length} volume(s) available
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-text-muted hover:text-paper cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 bg-gold hover:bg-gold-light text-ink text-xs font-mono font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-md transition-transform hover:scale-105"
              >
                <Save className="w-4 h-4" />
                Save &amp; Set as Hero Book
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function FeaturedSeriesCardLiveEditModal({
  currentSeriesSlug,
  seriesList,
  onClose,
  onSave,
}: {
  currentSeriesSlug: string;
  seriesList: Series[];
  onClose: () => void;
  onSave: (seriesSlug: string) => void;
}) {
  useModalScrollLock(true);
  const [selectedSlug, setSelectedSlug] = useState(currentSeriesSlug);
  const [search, setSearch] = useState("");

  const filteredSeries = React.useMemo(() => {
    return seriesList.filter((s) => {
      const matchSearch =
        !search ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        (s.japaneseTitle && s.japaneseTitle.toLowerCase().includes(search.toLowerCase())) ||
        (s.author && s.author.toLowerCase().includes(search.toLowerCase())) ||
        (s.genres && s.genres.some((g: string) => g.toLowerCase().includes(search.toLowerCase())));
      return matchSearch;
    });
  }, [seriesList, search]);

  const activeSeries = seriesList.find((s) => s.slug === selectedSlug) || seriesList[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlug) {
      onSave(selectedSlug);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50">
          <div>
            <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
              Select Featured Series for Spotlight
            </h3>
            <p className="text-[11px] font-mono text-text-muted">
              Choose which manga franchise is showcased in the primary homepage spotlight card.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-paper p-1 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currently Selected Preview Banner */}
        {activeSeries && (
          <div className="px-6 py-3 bg-gold/5 border-b border-gold/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-14 bg-ink rounded-xs overflow-hidden border border-gold/40 shrink-0">
                <img
                  src={activeSeries.featuredImage || activeSeries.bannerImage}
                  alt={activeSeries.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="text-[10px] font-mono text-gold uppercase tracking-wider block">
                  Currently Selected for Spotlight
                </span>
                <div className="text-sm font-bold text-paper line-clamp-1">
                  {activeSeries.title} {activeSeries.japaneseTitle && <span className="text-gold font-serif font-normal">({activeSeries.japaneseTitle})</span>}
                </div>
                <div className="text-xs font-mono text-text-muted">
                  By {activeSeries.author} • {activeSeries.totalVolumes} Volumes ({activeSeries.status})
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-gold text-ink font-mono text-xs font-bold rounded-xs shrink-0">
              ACTIVE
            </span>
          </div>
        )}

        {/* Search Control */}
        <div className="p-4 border-b border-ink-border bg-ink-surface/30">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search franchises by title, Japanese title, author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-ink border border-ink-border text-paper text-xs rounded-xs focus:border-gold outline-none font-mono"
            />
          </div>
        </div>

        {/* Series Grid */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredSeries.map((s) => {
              const isChosen = s.slug === selectedSlug;
              return (
                <div
                  key={s.slug}
                  onClick={() => setSelectedSlug(s.slug)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedSlug(s.slug);
                    }
                  }}
                  className={`group relative p-2.5 rounded-sm border cursor-pointer transition-all flex flex-col justify-between ${
                    isChosen
                      ? "bg-gold/10 border-gold shadow-lg shadow-gold/10 ring-1 ring-gold"
                      : "bg-ink-surface/40 border-ink-border/70 hover:border-gold/50 hover:bg-ink-surface"
                  }`}
                >
                  <div className="relative aspect-[3/4] overflow-hidden rounded-xs bg-ink mb-2">
                    <img
                      src={s.featuredImage || s.bannerImage}
                      alt={s.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {isChosen && (
                      <div className="absolute top-1.5 right-1.5 p-1 bg-gold text-ink rounded-full shadow-md">
                        <Check strokeWidth={2.5} className="w-3 h-3" />
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-ink/90 text-gold text-[9px] font-mono rounded-xs">
                      {s.totalVolumes} VOLS
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-serif text-gold line-clamp-1">
                      {s.japaneseTitle}
                    </div>
                    <div className="text-xs font-bold text-paper line-clamp-1 group-hover:text-gold transition-colors">
                      {s.title}
                    </div>
                    <div className="text-[10px] font-mono text-text-muted line-clamp-1 mt-0.5">
                      {s.author}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-ink-border bg-ink-surface/40">
            <span className="text-xs font-mono text-text-muted">
              {filteredSeries.length} franchise(s) available
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-text-muted hover:text-paper cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 bg-gold hover:bg-gold-light text-ink text-xs font-mono font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-md transition-transform hover:scale-105"
              >
                <Save className="w-4 h-4" />
                Save &amp; Set as Featured Series
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function TrendingLiveEditModal({
  initialConfig,
  initialArabicConfig,
  currentLocale = "en",
  sectionLabel = "Trending Now Carousel",
  arabicSectionLabel = "تعديل نصوص الأكثر رواجاً بالعربية",
  onClose,
  onSave,
  onSaveArabic,
}: {
  initialConfig: TrendingConfig;
  initialArabicConfig?: TrendingArabicConfig;
  currentLocale?: "en" | "ar";
  sectionLabel?: string;
  arabicSectionLabel?: string;
  onClose: () => void;
  onSave: (config: TrendingConfig) => void;
  onSaveArabic: (config: TrendingArabicConfig) => void;
}) {
  useModalScrollLock(true);
  const [editLang, setEditLang] = useState<"en" | "ar">(currentLocale);
  const [form, setForm] = useState<TrendingConfig>(initialConfig);
  const [arabicForm, setArabicForm] = useState<TrendingArabicConfig>(
    initialArabicConfig || {
      badgeText: "مختارات الأرشيف",
      headline: "الأكثر رواجاً الآن",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editLang === "ar") {
      onSaveArabic(arabicForm);
    } else {
      onSave(form);
    }
  };

  const speedInSeconds = (form.autoplaySpeed / 1000).toFixed(1);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50 gap-3">
          <div className="min-w-0">
            <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider truncate">
              Live Edit: {sectionLabel}
            </h3>
            <p className="text-[11px] font-mono text-text-muted truncate">
              {editLang === "ar" ? arabicSectionLabel : "Configure carousel speed & section headlines"}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ModalLanguageSwitch activeLang={editLang} onChange={setEditLang} />
            <button type="button" onClick={onClose} className="text-text-muted hover:text-paper p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {editLang === "ar" ? (
            <div className="space-y-4" dir="rtl">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  الشارة العلوية للسكشن (Badge Text)
                </label>
                <input
                  type="text"
                  value={arabicForm.badgeText || ""}
                  onChange={(e) => setArabicForm({ ...arabicForm, badgeText: e.target.value })}
                  placeholder="مختارات الأرشيف"
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  العنوان الرئيسي للسكشن (Headline)
                </label>
                <input
                  type="text"
                  value={arabicForm.headline || ""}
                  onChange={(e) => setArabicForm({ ...arabicForm, headline: e.target.value })}
                  placeholder="الأكثر رواجاً الآن"
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 bg-ink-surface/60 border border-ink-border rounded-xs">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gold" />
                  <div>
                    <div className="text-xs font-mono font-semibold uppercase text-paper">
                      Automatic Card Flipping (Autoplay)
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Auto-advance carousel cards smoothly
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={form.autoplayEnabled}
                    onChange={(e) => setForm({ ...form, autoplayEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-ink border border-ink-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-paper after:border after:border-ink-border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold peer-checked:border-gold"></div>
                  <span className={`ml-2.5 text-xs font-mono font-bold tracking-wider uppercase transition-colors ${
                    form.autoplayEnabled ? "text-gold" : "text-text-muted"
                  }`}>
                    {form.autoplayEnabled ? "ACTIVE" : "PAUSED"}
                  </span>
                </label>
              </div>

              <div className="space-y-2 p-3 bg-ink-surface/40 border border-ink-border rounded-xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                    Card Flipping Speed / Transition Delay
                  </label>
                  <span className="text-xs font-mono font-bold text-gold px-2 py-0.5 bg-gold/10 border border-gold/30 rounded-xs">
                    {speedInSeconds}s ({form.autoplaySpeed} ms)
                  </span>
                </div>

                <input
                  type="range"
                  min={1500}
                  max={8000}
                  step={100}
                  value={form.autoplaySpeed}
                  disabled={!form.autoplayEnabled}
                  onChange={(e) =>
                    setForm({ ...form, autoplaySpeed: parseInt(e.target.value) || 3800 })
                  }
                  className="w-full accent-gold cursor-pointer disabled:opacity-40"
                />

                <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                  <span>1.5s (Fast)</span>
                  <span>3.8s (Balanced)</span>
                  <span>8.0s (Relaxed)</span>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono text-text-muted uppercase">Presets:</span>
                  {[
                    { label: "2.0s Fast", val: 2000 },
                    { label: "3.8s Standard", val: 3800 },
                    { label: "5.0s Gentle", val: 5000 },
                    { label: "6.5s Leisure", val: 6500 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setForm({ ...form, autoplaySpeed: preset.val })}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded-xs border transition-colors cursor-pointer ${
                        form.autoplaySpeed === preset.val
                          ? "bg-gold text-ink border-gold font-bold"
                          : "bg-ink-surface text-paper-muted border-ink-border hover:text-paper hover:border-gold/50"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  Section Badge
                </label>
                <input
                  type="text"
                  value={form.badgeText || ""}
                  onChange={(e) => setForm({ ...form, badgeText: e.target.value })}
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  Section Headline
                </label>
                <input
                  type="text"
                  value={form.headline || ""}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-text-muted hover:text-paper cursor-pointer"
            >
              {editLang === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-gold hover:bg-gold-light text-ink text-xs font-mono font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-md transition-transform hover:scale-105"
            >
              <Save className="w-4 h-4" />
              {editLang === "ar" ? "حفظ ومزامنة فورية" : "Save & Sync Live"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TickerLiveEditModal({
  initialConfig,
  initialArabicConfig,
  currentLocale = "en",
  onClose,
  onSave,
  onSaveArabic,
}: {
  initialConfig: TickerConfig;
  initialArabicConfig?: TickerArabicConfig;
  currentLocale?: "en" | "ar";
  onClose: () => void;
  onSave: (config: TickerConfig) => void;
  onSaveArabic: (config: TickerArabicConfig) => void;
}) {
  useModalScrollLock(true);
  const [editLang, setEditLang] = useState<"en" | "ar">(currentLocale);
  const [form, setForm] = useState<TickerConfig>(initialConfig);
  const [arabicForm, setArabicForm] = useState<TickerArabicConfig>(
    initialArabicConfig || {
      messages: [
        "شحن مجاني للطلبات فوق ٥٠٠ جنيه",
        "إصدارات بأعلى جودة",
        "الدفع عند الاستلام في كل محافظات مصر",
      ],
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      messages: form.messages.map((m) => m.trim()).filter(Boolean),
      placements: form.placements ?? [],
    });
    onSaveArabic({
      messages: arabicForm.messages.map((m) => m.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50 gap-3">
          <div className="min-w-0">
            <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider truncate">
              Live Edit: Announcement Ticker
            </h3>
            <p className="text-[11px] font-mono text-text-muted truncate">
              {editLang === "ar"
                ? "تعديل نصوص ورسائل الشريط الإعلاني المتحرك فورياً"
                : "Manage scrolling ticker messages, speed, and placement"}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ModalLanguageSwitch activeLang={editLang} onChange={setEditLang} />
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-paper p-1 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Status Toggle */}
          <div className="flex items-center justify-between p-3 bg-ink-surface/60 border border-ink-border rounded-xs">
            <div>
              <span className="text-xs font-mono font-semibold uppercase text-paper block">
                {editLang === "ar" ? "حالة الشريط الإعلاني" : "Announcement Ticker Status"}
              </span>
              <span className="text-[10px] text-text-muted">
                {editLang === "ar"
                  ? "تفعيل أو إخفاء ظهور الشريط في الواجهة"
                  : "Enable or hide ticker display on storefront"}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-ink border border-ink-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-paper after:border after:border-ink-border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold peer-checked:border-gold"></div>
              <span
                className={`ml-2.5 text-xs font-mono font-bold tracking-wider uppercase transition-colors ${
                  form.enabled ? "text-gold" : "text-text-muted"
                }`}
              >
                {form.enabled
                  ? editLang === "ar"
                    ? "مفعل"
                    : "ACTIVE"
                  : editLang === "ar"
                  ? "معطل"
                  : "HIDDEN"}
              </span>
            </label>
          </div>

          {editLang === "ar" ? (
            <div className="space-y-4" dir="rtl">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider block">
                  نصوص رسائل الشريط (كل رسالة في سطر مستقل)
                </label>
                <textarea
                  rows={4}
                  value={arabicForm.messages.join("\n")}
                  onChange={(e) =>
                    setArabicForm({
                      ...arabicForm,
                      messages: e.target.value.split("\n"),
                    })
                  }
                  placeholder={"شحن مجاني للطلبات فوق ٥٠٠ جنيه\nإصدارات بأعلى جودة\nالدفع عند الاستلام في كل محافظات مصر"}
                  className="w-full bg-ink-surface border border-ink-border text-paper p-3 text-xs font-mono rounded-xs focus:border-gold outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Live Preview */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block">
                  معاينة الشريط المباشرة (العربية) — بنفس سرعة الحركة الحقيقية
                </span>
                <div
                  dir="rtl"
                  className="ticker-viewport flex w-full overflow-hidden rounded-xs border border-gold/25 bg-gradient-to-r from-[#8f2418] via-vermilion to-[#8f2418] text-white py-2"
                  style={{ ["--ticker-duration" as string]: `${form.speedSeconds}s` }}
                >
                  {[0, 1].map((track) => (
                    <div key={track} className="ticker-track-preview flex shrink-0 items-center gap-6 px-3">
                      {Array.from({ length: 3 }, (_, pass) => (
                        <span key={pass} className="flex items-center gap-6 shrink-0 pe-6">
                          {(arabicForm.messages.filter((m) => m.trim()).length > 0
                            ? arabicForm.messages.filter((m) => m.trim())
                            : ["(لا توجد رسائل حالياً)"]
                          ).map((m, i) => (
                            <span
                              key={i}
                              className="text-[11px] font-mono font-semibold tracking-wider whitespace-nowrap flex items-center gap-6"
                            >
                              {m}
                              <span className="text-gold">◆</span>
                            </span>
                          ))}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-ink-border">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                      سرعة حركة الشريط
                    </label>
                    <span className="text-gold font-mono font-bold text-xs">{form.speedSeconds} ثانية</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={120}
                    step={1}
                    value={form.speedSeconds}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        speedSeconds: parseInt(e.target.value, 10) || 30,
                      })
                    }
                    className="w-full accent-gold cursor-pointer"
                  />
                  <p className="text-[10px] text-text-muted">الرقم الأقل يعني حركة أسرع للشريط.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider block">
                    رابط عند النقر (اختياري)
                  </label>
                  <input
                    type="text"
                    value={form.linkHref ?? ""}
                    onChange={(e) => setForm({ ...form, linkHref: e.target.value })}
                    placeholder="/manga أو #deals"
                    dir="ltr"
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-xs font-mono rounded-xs focus:border-gold outline-none"
                  />
                </div>
              </div>

              {/* Placements */}
              <div className="space-y-2 pt-2 border-t border-ink-border">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider block">
                  أماكن ظهور الشريط
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {TICKER_SLOTS.map((slot) => {
                    const checked = (form.placements ?? []).includes(slot.id);
                    return (
                      <label
                        key={slot.id}
                        className="flex items-center gap-2 p-2 rounded-xs bg-ink-surface/60 border border-ink-border hover:border-gold/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const current = form.placements ?? [];
                            setForm({
                              ...form,
                              placements: checked
                                ? current.filter((id) => id !== slot.id)
                                : [...current, slot.id],
                            });
                          }}
                          className="accent-gold rounded-xs"
                        />
                        <span className="text-paper text-[11px]">{slot.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider block">
                  Ticker Messages (one per line)
                </label>
                <textarea
                  rows={4}
                  value={form.messages.join("\n")}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      messages: e.target.value.split("\n"),
                    })
                  }
                  placeholder={"FREE SHIPPING ON ORDERS OVER EGP 500\nAUTHENTIC VIZ MEDIA ENGLISH EDITIONS\nCASH ON DELIVERY ACROSS EGYPT"}
                  className="w-full bg-ink-surface border border-ink-border text-paper p-3 text-xs font-mono rounded-xs focus:border-gold outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Live Preview */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block">
                  Live Strip Preview (English) — runs at the real scroll speed
                </span>
                <div
                  dir="ltr"
                  className="ticker-viewport flex w-full overflow-hidden rounded-xs border border-gold/25 bg-gradient-to-r from-[#8f2418] via-vermilion to-[#8f2418] text-white py-2"
                  style={{ ["--ticker-duration" as string]: `${form.speedSeconds}s` }}
                >
                  {[0, 1].map((track) => (
                    <div key={track} className="ticker-track-preview flex shrink-0 items-center gap-6 px-3">
                      {Array.from({ length: 3 }, (_, pass) => (
                        <span key={pass} className="flex items-center gap-6 shrink-0 pe-6">
                          {(form.messages.filter((m) => m.trim()).length > 0
                            ? form.messages.filter((m) => m.trim())
                            : ["(no messages entered)"]
                          ).map((m, i) => (
                            <span
                              key={i}
                              className="text-[11px] font-mono font-semibold tracking-wider whitespace-nowrap flex items-center gap-6"
                            >
                              {m}
                              <span className="text-gold">◆</span>
                            </span>
                          ))}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-ink-border">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                      Scroll Speed
                    </label>
                    <span className="text-gold font-mono font-bold text-xs">{form.speedSeconds}s / pass</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={120}
                    step={1}
                    value={form.speedSeconds}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        speedSeconds: parseInt(e.target.value, 10) || 30,
                      })
                    }
                    className="w-full accent-gold cursor-pointer"
                  />
                  <p className="text-[10px] text-text-muted">Lower is faster. Strip pauses on hover.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider block">
                    Link Destination (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.linkHref ?? ""}
                    onChange={(e) => setForm({ ...form, linkHref: e.target.value })}
                    placeholder="/manga or #offers"
                    className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-xs font-mono rounded-xs focus:border-gold outline-none"
                  />
                </div>
              </div>

              {/* Placements */}
              <div className="space-y-2 pt-2 border-t border-ink-border">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider block">
                  Show In Locations
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {TICKER_SLOTS.map((slot) => {
                    const checked = (form.placements ?? []).includes(slot.id);
                    return (
                      <label
                        key={slot.id}
                        className="flex items-center gap-2 p-2 rounded-xs bg-ink-surface/60 border border-ink-border hover:border-gold/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const current = form.placements ?? [];
                            setForm({
                              ...form,
                              placements: checked
                                ? current.filter((id) => id !== slot.id)
                                : [...current, slot.id],
                            });
                          }}
                          className="accent-gold rounded-xs"
                        />
                        <span className="text-paper text-[11px]">{slot.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-text-muted hover:text-paper cursor-pointer"
            >
              {editLang === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-gold hover:bg-gold-light text-ink text-xs font-mono font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-md transition-transform hover:scale-105"
            >
              <Save className="w-4 h-4" />
              {editLang === "ar" ? "حفظ ومزامنة فورية" : "Save & Sync Live"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewReleasesLiveEditModal({
  initialConfig,
  initialArabicConfig,
  currentLocale = "en",
  onClose,
  onSave,
  onSaveArabic,
}: {
  initialConfig: NewReleasesConfig;
  initialArabicConfig?: NewReleasesArabicConfig;
  currentLocale?: "en" | "ar";
  onClose: () => void;
  onSave: (config: NewReleasesConfig) => void;
  onSaveArabic: (config: NewReleasesArabicConfig) => void;
}) {
  useModalScrollLock(true);
  const [editLang, setEditLang] = useState<"en" | "ar">(currentLocale);
  const [form, setForm] = useState<NewReleasesConfig>(initialConfig);
  const [arabicForm, setArabicForm] = useState<NewReleasesArabicConfig>(
    initialArabicConfig || {
      badgeText: "وصل حديثاً للأرشيف",
      headline: "أحدث الإصدارات",
      viewAllText: "عرض الأرشيف الكامل",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editLang === "ar") {
      onSaveArabic(arabicForm);
    } else {
      onSave(form);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50 gap-3">
          <div className="min-w-0">
            <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider truncate">
              Live Edit: New Releases Section
            </h3>
            <p className="text-[11px] font-mono text-text-muted truncate">
              {editLang === "ar" ? "تعديل نصوص أحدث الإصدارات بالعربية" : "Configure new arrivals showcase"}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ModalLanguageSwitch activeLang={editLang} onChange={setEditLang} />
            <button type="button" onClick={onClose} className="text-text-muted hover:text-paper p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {editLang === "ar" ? (
            <div className="space-y-4" dir="rtl">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  شارة السكشن العلوية (Badge Text)
                </label>
                <input
                  type="text"
                  value={arabicForm.badgeText || ""}
                  onChange={(e) => setArabicForm({ ...arabicForm, badgeText: e.target.value })}
                  placeholder="وصل حديثاً للأرشيف"
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  عنوان السكشن الرئيسي (Headline)
                </label>
                <input
                  type="text"
                  value={arabicForm.headline || ""}
                  onChange={(e) => setArabicForm({ ...arabicForm, headline: e.target.value })}
                  placeholder="أحدث الإصدارات"
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  نص رابط عرض الكل (View All Link Text)
                </label>
                <input
                  type="text"
                  value={arabicForm.viewAllText || ""}
                  onChange={(e) => setArabicForm({ ...arabicForm, viewAllText: e.target.value })}
                  placeholder="عرض الأرشيف الكامل"
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  Section Badge
                </label>
                <input
                  type="text"
                  value={form.badgeText || ""}
                  onChange={(e) => setForm({ ...form, badgeText: e.target.value })}
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  Section Headline
                </label>
                <input
                  type="text"
                  value={form.headline || ""}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  View All Link Text
                </label>
                <input
                  type="text"
                  value={form.viewAllText || ""}
                  onChange={(e) => setForm({ ...form, viewAllText: e.target.value })}
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-text-muted hover:text-paper cursor-pointer"
            >
              {editLang === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-gold hover:bg-gold-light text-ink text-xs font-mono font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-md transition-transform hover:scale-105"
            >
              <Save className="w-4 h-4" />
              {editLang === "ar" ? "حفظ ومزامنة فورية" : "Save & Sync Live"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GenreBentoLiveEditModal({
  initialConfig,
  initialArabicConfig,
  genres,
  currentLocale = "en",
  onClose,
  onSave,
  onSaveArabic,
  onAddGenre,
  onUpdateGenre,
  onDeleteGenre,
}: {
  initialConfig: GenreBentoConfig;
  initialArabicConfig?: GenreBentoArabicConfig;
  genres: GenreInfo[];
  currentLocale?: "en" | "ar";
  onClose: () => void;
  onSave: (config: GenreBentoConfig) => void;
  onSaveArabic: (config: GenreBentoArabicConfig) => void;
  onAddGenre: (genre: GenreInfo) => void;
  onUpdateGenre: (id: string, updates: Partial<GenreInfo>) => void;
  onDeleteGenre: (id: string) => void;
}) {
  useModalScrollLock(true);
  const [activeTab, setActiveTab] = useState<"header" | "categories">("categories");
  const [editLang, setEditLang] = useState<"en" | "ar">(currentLocale);
  const [form, setForm] = useState<GenreBentoConfig>(initialConfig);
  const [arabicForm, setArabicForm] = useState<GenreBentoArabicConfig>(
    initialArabicConfig || {
      badgeText: "دليل التصنيفات",
      title: "استكشف تصنيفك المفضل",
      description: "قوائم قراءة منتقاة بعناية عبر 9 تصنيفات رئيسية.",
    }
  );
  const [editingGenre, setEditingGenre] = useState<GenreInfo | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [genreToDelete, setGenreToDelete] = useState<GenreInfo | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editLang === "ar") {
      onSaveArabic(arabicForm);
    } else {
      onSave(form);
    }
  };

  const handleOpenAdd = () => {
    setEditingGenre(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (genre: GenreInfo) => {
    setEditingGenre(genre);
    setIsFormModalOpen(true);
  };

  return (
    <>
      <div
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200"
      >
        <div className="w-full max-w-3xl flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50 shrink-0">
            <div>
              <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
                Category &amp; Bento Grid Manager
              </h3>
              <p className="text-[11px] text-text-muted font-mono mt-0.5">
                Manage showcase copy and curate all {genres.length} store categories
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-paper p-1 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-ink-border bg-ink px-6 pt-2 shrink-0">
            <div className="flex">
              <button
                type="button"
                onClick={() => setActiveTab("categories")}
                className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === "categories"
                    ? "border-gold text-gold"
                    : "border-transparent text-text-muted hover:text-paper"
                }`}
              >
                Categories ({genres.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("header")}
                className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wider font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === "header"
                    ? "border-gold text-gold"
                    : "border-transparent text-text-muted hover:text-paper"
                }`}
              >
                Section Header Copy
              </button>
            </div>
            {activeTab === "header" && (
              <div className="pb-2">
                <ModalLanguageSwitch activeLang={editLang} onChange={setEditLang} />
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="p-6 overflow-y-auto overscroll-contain flex-1">
            {activeTab === "categories" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-paper uppercase tracking-wider block">
                      Active Canonical Categories
                    </span>
                    <span className="text-[11px] text-text-muted font-mono">
                      Add, update artwork, Kanji scripts, and delete categories across the store.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gold hover:bg-gold-light text-ink text-xs font-mono font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-md transition-all hover:scale-105"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Category</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {genres.map((genre) => (
                    <div
                      key={genre.id}
                      className="flex items-center justify-between p-3 bg-ink-surface border border-ink-border rounded-xs group hover:border-gold/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-10 h-12 rounded-xs overflow-hidden border border-ink-border shrink-0 bg-ink">
                          <img
                            src={genre.coverImage}
                            alt={genre.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-paper truncate font-mono">
                              {genre.name}
                            </span>
                            <span className="text-[10px] text-gold font-serif shrink-0">
                              {genre.japanese}
                            </span>
                          </div>
                          <span className="text-[10px] text-text-muted truncate block font-mono">
                            {genre.popularTitle || "Archival Selection"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(genre)}
                          className="p-1.5 text-text-muted hover:text-gold hover:bg-ink rounded-xs transition-colors cursor-pointer"
                          title={`Edit ${genre.name}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setGenreToDelete(genre)}
                          className="p-1.5 text-text-muted hover:text-red-400 hover:bg-ink rounded-xs transition-colors cursor-pointer"
                          title={`Delete ${genre.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {editLang === "ar" ? (
                  <div className="space-y-4" dir="rtl">
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                        شارة السكشن العلوية (Badge Text)
                      </label>
                      <input
                        type="text"
                        value={arabicForm.badgeText || ""}
                        onChange={(e) => setArabicForm({ ...arabicForm, badgeText: e.target.value })}
                        placeholder="دليل التصنيفات"
                        className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                        عنوان السكشن الرئيسي (Section Title)
                      </label>
                      <input
                        type="text"
                        value={arabicForm.title || ""}
                        onChange={(e) => setArabicForm({ ...arabicForm, title: e.target.value })}
                        placeholder="استكشف تصنيفك المفضل"
                        className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                        الوصف التوضيحي (Description)
                      </label>
                      <textarea
                        rows={3}
                        value={arabicForm.description || ""}
                        onChange={(e) => setArabicForm({ ...arabicForm, description: e.target.value })}
                        placeholder="قوائم قراءة منتقاة بعناية عبر 9 تصنيفات رئيسية."
                        className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none resize-none"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                        Badge Text
                      </label>
                      <input
                        type="text"
                        value={form.badgeText || ""}
                        onChange={(e) => setForm({ ...form, badgeText: e.target.value })}
                        className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                        Section Title
                      </label>
                      <input
                        type="text"
                        value={form.title || ""}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                        Description / Caption
                      </label>
                      <textarea
                        rows={3}
                        value={form.description || ""}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none resize-none font-mono"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-border">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-text-muted hover:text-paper cursor-pointer"
                  >
                    {editLang === "ar" ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 bg-gold hover:bg-gold-light text-ink text-xs font-mono font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-md transition-transform hover:scale-105"
                  >
                    <Save className="w-4 h-4" />
                    {editLang === "ar" ? "حفظ ومزامنة فورية" : "Save & Sync Live"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Genre Form Modal */}
      {isFormModalOpen && (
        <GenreFormModal
          isOpen={true}
          initialGenre={editingGenre}
          onClose={() => setIsFormModalOpen(false)}
          onSave={(savedGenre) => {
            if (editingGenre) {
              onUpdateGenre(editingGenre.id, savedGenre);
            } else {
              onAddGenre(savedGenre);
            }
            setIsFormModalOpen(false);
          }}
          onDelete={(id) => {
            onDeleteGenre(id);
            setIsFormModalOpen(false);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {genreToDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-ink/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-ink border border-red-800/80 rounded-sm shadow-2xl p-6 space-y-4 font-mono">
            <h4 className="text-sm font-bold text-paper uppercase tracking-wider">
              Delete Category &ldquo;{genreToDelete.name}&rdquo;?
            </h4>
            <p className="text-xs text-text-muted leading-relaxed">
              This category will be permanently removed from the Bento showcase and manga filters.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink-border">
              <button
                type="button"
                onClick={() => setGenreToDelete(null)}
                className="px-4 py-2 text-xs uppercase tracking-wider text-text-muted hover:text-paper cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteGenre(genreToDelete.id);
                  setGenreToDelete(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-900/80 hover:bg-red-800 text-red-200 text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MangaDiscoveryLiveEditModal({
  initialConfig,
  initialArabicConfig,
  currentLocale = "en",
  onClose,
  onSave,
  onSaveArabic,
}: {
  initialConfig: MangaDiscoveryConfig;
  initialArabicConfig?: MangaDiscoveryArabicConfig;
  currentLocale?: "en" | "ar";
  onClose: () => void;
  onSave: (config: MangaDiscoveryConfig) => void;
  onSaveArabic: (config: MangaDiscoveryArabicConfig) => void;
}) {
  useModalScrollLock(true);
  const [editLang, setEditLang] = useState<"en" | "ar">(currentLocale);
  const [form, setForm] = useState<MangaDiscoveryConfig>(initialConfig);
  const [arabicForm, setArabicForm] = useState<MangaDiscoveryArabicConfig>(
    initialArabicConfig || {
      badgeText: "البحث الفوري في الأرشيف",
      title: "ابحث عن مجلدك القادم",
      description: "ابحث مباشرة بين العناوين، والمؤلفين، والتصنيفات، أو الأرقام المعيارية.",
      searchPlaceholder: "ابحث باسم المانجا، الكاتب، أو التصنيف... (مثل: Eiichiro Oda, Dark Fantasy)",
      catalogLinkText: "الانتقال لكتالوج المانجا الكامل",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editLang === "ar") {
      onSaveArabic(arabicForm);
    } else {
      onSave(form);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50 gap-3">
          <div className="min-w-0">
            <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider truncate">
              Live Edit: Manga Discovery Section
            </h3>
            <p className="text-[11px] font-mono text-text-muted truncate">
              {editLang === "ar" ? "تعديل نصوص استكشاف المانجا والبحث بالعربية" : "Configure discovery bar & catalog search"}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ModalLanguageSwitch activeLang={editLang} onChange={setEditLang} />
            <button type="button" onClick={onClose} className="text-text-muted hover:text-paper p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto overscroll-contain">
          {editLang === "ar" ? (
            <div className="space-y-4" dir="rtl">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  شارة السكشن العلوية (Badge Text)
                </label>
                <input
                  type="text"
                  value={arabicForm.badgeText || ""}
                  onChange={(e) => setArabicForm({ ...arabicForm, badgeText: e.target.value })}
                  placeholder="البحث الفوري في الأرشيف"
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  عنوان السكشن الرئيسي (Title)
                </label>
                <input
                  type="text"
                  value={arabicForm.title || ""}
                  onChange={(e) => setArabicForm({ ...arabicForm, title: e.target.value })}
                  placeholder="ابحث عن مجلدك القادم"
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  الوصف التوضيحي (Description)
                </label>
                <textarea
                  rows={2}
                  value={arabicForm.description || ""}
                  onChange={(e) => setArabicForm({ ...arabicForm, description: e.target.value })}
                  placeholder="ابحث مباشرة بين العناوين، والمؤلفين، والتصنيفات، أو الأرقام المعيارية."
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  نص حقل البحث التوضيحي (Search Placeholder)
                </label>
                <input
                  type="text"
                  value={arabicForm.searchPlaceholder || ""}
                  onChange={(e) => setArabicForm({ ...arabicForm, searchPlaceholder: e.target.value })}
                  placeholder="ابحث باسم المانجا، الكاتب، أو التصنيف... (مثل: Eiichiro Oda, Dark Fantasy)"
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  نص رابط الكتالوج الكامل (Catalog Link Text)
                </label>
                <input
                  type="text"
                  value={arabicForm.catalogLinkText || ""}
                  onChange={(e) => setArabicForm({ ...arabicForm, catalogLinkText: e.target.value })}
                  placeholder="الانتقال لكتالوج المانجا الكامل"
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={form.badgeText || ""}
                  onChange={(e) => setForm({ ...form, badgeText: e.target.value })}
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  Section Title
                </label>
                <input
                  type="text"
                  value={form.title || ""}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  Description / Caption
                </label>
                <textarea
                  rows={2}
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  Search Input Placeholder
                </label>
                <input
                  type="text"
                  value={form.searchPlaceholder || ""}
                  onChange={(e) => setForm({ ...form, searchPlaceholder: e.target.value })}
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                  Catalog Link Text
                </label>
                <input
                  type="text"
                  value={form.catalogLinkText || ""}
                  onChange={(e) => setForm({ ...form, catalogLinkText: e.target.value })}
                  className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                    Default Active Tab
                  </label>
                  <CustomSelect
                    fullWidth
                    value={form.defaultTab || "POPULAR"}
                    onChange={(val) => setForm({ ...form, defaultTab: val as MangaDiscoveryConfig["defaultTab"] })}
                    options={[
                      { value: "POPULAR", label: "POPULAR (Trending)" },
                      { value: "TOP_RATED", label: "TOP RATED (4.9+ Stars)" },
                      { value: "BEST_SELLERS", label: "BEST SELLERS" },
                      { value: "RECENTLY_ADDED", label: "RECENTLY ADDED (Vol. 1)" },
                    ]}
                    buttonClassName="bg-ink-surface rounded-xs h-10 px-3 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                    Cards Display Count
                  </label>
                  <CustomSelect
                    fullWidth
                    value={String(form.displayCount || 4)}
                    onChange={(val) => setForm({ ...form, displayCount: parseInt(val, 10) || 4 })}
                    options={[
                      { value: "4", label: "4 Cards (Single Row)" },
                      { value: "8", label: "8 Cards (Two Rows)" },
                    ]}
                    buttonClassName="bg-ink-surface rounded-xs h-10 px-3 text-xs"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-text-muted hover:text-paper cursor-pointer"
            >
              {editLang === "ar" ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-gold hover:bg-gold-light text-ink text-xs font-mono font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-md transition-transform hover:scale-105"
            >
              <Save className="w-4 h-4" />
              {editLang === "ar" ? "حفظ ومزامنة فورية" : "Save & Sync Live"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
