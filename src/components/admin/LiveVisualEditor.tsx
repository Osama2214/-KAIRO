"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Edit2,
  CheckCircle2,
  X,
  ExternalLink,
  LogOut,
  Sliders,
  Sparkles,
  Eye,
  EyeOff,
  Minimize2,
  Maximize2,
  Save,
  Truck,
  BookOpen,
  Layers,
  FileText,
  Tag,
  Search,
  Check,
  Clock,
  ArrowRight,
  Play,
  Pause,
  Plus,
  Trash2,
} from "lucide-react";
import {
  useStorefrontStore,
  HeroContent,
  AnnouncementConfig,
  ShippingConfig,
  EditorialConfig,
  FeaturedSeriesConfig,
  CollectionConfig,
  TrendingConfig,
  NewReleasesConfig,
  GenreBentoConfig,
  MangaDiscoveryConfig,
} from "@/store/useStorefrontStore";
import { useMounted } from "@/store/useWishlistStore";
import { VolumeFormModal } from "./VolumeFormModal";
import { SeriesFormModal } from "./SeriesFormModal";
import { GenreFormModal } from "./GenreFormModal";
import { GenreInfo, ALL_SERIES } from "@/data/manga";
import { CustomSelect } from "@/components/CustomSelect";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";

export function LiveVisualEditor() {
  const mounted = useMounted();
  const {
    isAdminAuthenticated,
    isVisualEditorActive,
    setVisualEditorActive,
    activeLiveEditTarget,
    closeLiveEdit,
    volumes,
    series,
    genres,
    heroContent,
    announcement,
    shippingConfig,
    editorialConfig,
    featuredSeriesConfig,
    collectionConfig,
    trendingConfig,
    newReleasesConfig,
    genreBentoConfig,
    mangaDiscoveryConfig,
    updateVolume,
    addSeries,
    updateSeries,
    deleteSeries,
    addGenre,
    updateGenre,
    deleteGenre,
    updateHeroContent,
    updateAnnouncement,
    updateShippingConfig,
    updateEditorialConfig,
    updateFeaturedSeriesConfig,
    updateCollectionConfig,
    updateTrendingConfig,
    updateNewReleasesConfig,
    updateGenreBentoConfig,
    updateMangaDiscoveryConfig,
    logoutAdmin,
  } = useStorefrontStore();

  const [isMinimized, setIsMinimized] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Only render for authenticated admins
  if (!mounted || !isAdminAuthenticated) {
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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] transition-all duration-300 pointer-events-auto">
        {isMinimized ? (
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 bg-ink/95 border border-gold/60 text-gold rounded-full shadow-2xl backdrop-blur-md hover:scale-105 transition-all text-xs font-mono cursor-pointer font-bold tracking-wider uppercase"
            title="Expand Curator Toolbar"
          >
            <span>KAIRO CURATOR</span>
            <Maximize2 className="w-3.5 h-3.5 text-paper-muted" />
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-2.5 bg-ink/95 border border-gold/50 rounded-full shadow-2xl backdrop-blur-md text-xs font-mono text-paper">
            {/* Curator Badge */}
            <div className="flex items-center gap-2 pr-2 border-r border-ink-border">
              <span className="font-serif text-sm font-bold text-vermilion">回路</span>
              <span className="font-bold tracking-wider text-[11px] text-paper hidden sm:inline">
                CURATOR MODE
              </span>
            </div>

            {/* Visual Editor Toggle Switch */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVisualEditorActive(!isVisualEditorActive)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all text-[11px] font-bold uppercase tracking-wider cursor-pointer ${
                  isVisualEditorActive
                    ? "bg-gold text-ink border-gold shadow-md shadow-gold/20"
                    : "bg-ink-surface text-text-muted border-ink-border hover:text-paper"
                }`}
              >
                {isVisualEditorActive ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visual Edit: ON</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Visual Edit: OFF</span>
                  </>
                )}
              </button>
            </div>

            {/* Admin Console Link */}
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-ink-surface hover:bg-ink-border border border-ink-border text-paper-muted hover:text-paper transition-colors text-[11px] font-semibold uppercase tracking-wider"
              title="Open full administrative dashboard"
            >
              <Sliders className="w-3.5 h-3.5 text-gold" />
              <span className="hidden md:inline">Full</span> Console
              <ExternalLink className="w-3 h-3 text-text-muted" />
            </Link>

            {/* Actions: Minimize & Logout */}
            <div className="flex items-center gap-1 pl-1 border-l border-ink-border">
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-full text-text-muted hover:text-paper hover:bg-ink-surface transition-colors cursor-pointer"
                title="Minimize toolbar"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={logoutAdmin}
                className="p-1.5 rounded-full text-text-muted hover:text-red-400 hover:bg-ink-surface transition-colors cursor-pointer"
                title="Log out from Curator Session"
              >
                <LogOut className="w-3.5 h-3.5" />
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
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateHeroContent(updated);
            closeLiveEdit();
            showToast("Hero section updated and synced live!");
          }}
        />
      )}

      {/* Hero Card Selection Modal */}
      {activeLiveEditTarget?.type === "hero-card" && (
        <HeroCardLiveEditModal
          currentVolumeId={heroContent.featuredVolumeId || volumes[0]?.id || ""}
          volumes={volumes}
          onClose={closeLiveEdit}
          onSave={(selectedVolumeId) => {
            updateHeroContent({ featuredVolumeId: selectedVolumeId });
            closeLiveEdit();
            const vol = volumes.find((v) => v.id === selectedVolumeId);
            showToast(`"${vol?.title || "Volume"}" set as Hero card!`);
          }}
        />
      )}

      {/* Announcement Bar Modal */}
      {activeLiveEditTarget?.type === "announcement" && (
        <AnnouncementLiveEditModal
          initialConfig={announcement}
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateAnnouncement(updated);
            closeLiveEdit();
            showToast("Announcement banner updated and synced live!");
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

      {/* Collection Modal */}
      {activeLiveEditTarget?.type === "collection" && (
        <CollectionLiveEditModal
          initialConfig={collectionConfig}
          volumes={volumes}
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateCollectionConfig(updated);
            closeLiveEdit();
            showToast("Collection showcase updated and synced live!");
          }}
        />
      )}

      {/* Shipping Config Modal */}
      {activeLiveEditTarget?.type === "shipping" && (
        <ShippingLiveEditModal
          initialConfig={shippingConfig}
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateShippingConfig(updated);
            closeLiveEdit();
            showToast("Logistics & shipping configuration updated and synced live!");
          }}
        />
      )}

      {/* Editorial Config Modal */}
      {activeLiveEditTarget?.type === "editorial" && (
        <EditorialLiveEditModal
          initialConfig={editorialConfig}
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateEditorialConfig(updated);
            closeLiveEdit();
            showToast("Editorial quotes & store policies updated and synced live!");
          }}
        />
      )}

      {/* Trending Now Modal */}
      {activeLiveEditTarget?.type === "trending" && (
        <TrendingLiveEditModal
          initialConfig={trendingConfig}
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateTrendingConfig(updated);
            closeLiveEdit();
            showToast("Trending carousel configuration updated and synced live!");
          }}
        />
      )}

      {/* New Releases Modal */}
      {activeLiveEditTarget?.type === "new-releases" && (
        <NewReleasesLiveEditModal
          initialConfig={newReleasesConfig}
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateNewReleasesConfig(updated);
            closeLiveEdit();
            showToast("New releases showcase updated and synced live!");
          }}
        />
      )}

      {/* Genre Bento Modal */}
      {activeLiveEditTarget?.type === "genre-bento" && (
        <GenreBentoLiveEditModal
          initialConfig={genreBentoConfig}
          genres={genres}
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateGenreBentoConfig(updated);
            closeLiveEdit();
            showToast("Genre Bento section updated and synced live!");
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
          onClose={closeLiveEdit}
          onSave={(updated) => {
            updateMangaDiscoveryConfig(updated);
            closeLiveEdit();
            showToast("Manga Discovery section updated and synced live!");
          }}
        />
      )}
    </>
  );
}

/* ========================================================================== */
/* LIGHTWEIGHT IN-PLACE EDIT MODALS                                            */
/* ========================================================================== */

function HeroLiveEditModal({
  initialContent,
  onClose,
  onSave,
}: {
  initialContent: HeroContent;
  onClose: () => void;
  onSave: (content: HeroContent) => void;
}) {
  useModalScrollLock(true);
  const [form, setForm] = useState<HeroContent>(initialContent);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50">
          <div>
            <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
              Live Edit: Hero Headline &amp; Actions
            </h3>
            <p className="text-[11px] font-mono text-text-muted">
              Changes apply instantly to the homepage banner.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Headline Line 1
              </label>
              <input
                type="text"
                value={form.headlineLine1 || ""}
                onChange={(e) => setForm({ ...form, headlineLine1: e.target.value })}
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-gold uppercase tracking-wider">
                Headline Highlight (Gold)
              </label>
              <input
                type="text"
                value={form.headlineHighlight || ""}
                onChange={(e) => setForm({ ...form, headlineHighlight: e.target.value })}
                className="w-full bg-ink-surface border border-gold/40 text-gold px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
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
              className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none resize-none"
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

function AnnouncementLiveEditModal({
  initialConfig,
  onClose,
  onSave,
}: {
  initialConfig: AnnouncementConfig;
  onClose: () => void;
  onSave: (config: AnnouncementConfig) => void;
}) {
  useModalScrollLock(true);
  const [form, setForm] = useState<AnnouncementConfig>(initialConfig);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50">
          <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
            Live Edit: Welcome Voucher Bar
          </h3>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-paper p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center justify-between p-3 bg-ink-surface/60 border border-ink-border rounded-xs">
            <span className="text-xs font-mono font-semibold uppercase text-paper">
              Announcement Banner Active
            </span>
            <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-ink border border-ink-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-paper after:border after:border-ink-border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold peer-checked:border-gold"></div>
              <span className={`ml-2.5 text-xs font-mono font-bold tracking-wider uppercase transition-colors ${
                form.enabled ? "text-gold" : "text-text-muted"
              }`}>
                {form.enabled ? "ACTIVE" : "HIDDEN"}
              </span>
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
              Announcement Promo Copy
            </label>
            <textarea
              rows={2}
              value={form.text || ""}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Voucher Code
              </label>
              <input
                type="text"
                value={form.voucherCode || ""}
                onChange={(e) => setForm({ ...form, voucherCode: e.target.value.toUpperCase() })}
                className="w-full bg-ink-surface border border-ink-border text-gold font-mono font-bold px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Discount Percent (%)
              </label>
              <input
                type="number"
                value={form.discountPercent || 20}
                onChange={(e) => setForm({ ...form, discountPercent: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
              />
            </div>
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

function FeaturedSeriesLiveEditModal({
  initialConfig,
  seriesList,
  onClose,
  onSave,
}: {
  initialConfig: FeaturedSeriesConfig;
  seriesList: any[];
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

function CollectionLiveEditModal({
  initialConfig,
  volumes,
  onClose,
  onSave,
}: {
  initialConfig: CollectionConfig;
  volumes: any[];
  onClose: () => void;
  onSave: (config: CollectionConfig) => void;
}) {
  useModalScrollLock(true);
  const [form, setForm] = useState<CollectionConfig>({
    ...initialConfig,
    volumeId1: initialConfig.volumeId1 || "jjk-01",
    volumeId2: initialConfig.volumeId2 || "jjk-02",
    volumeId3: initialConfig.volumeId3 || "jjk-03",
    secondaryCtaText: initialConfig.secondaryCtaText || "DISCOVER ALL BOXSETS",
    secondaryCtaLink: initialConfig.secondaryCtaLink || "/manga?format=Box+Set",
  });

  const selectedVol1 = volumes.find((v) => v.id === form.volumeId1) || volumes[0];
  const selectedVol2 = volumes.find((v) => v.id === form.volumeId2) || volumes[1] || volumes[0];
  const selectedVol3 = volumes.find((v) => v.id === form.volumeId3) || volumes[2] || volumes[0];

  const volumeOptions = React.useMemo(() => {
    return volumes.map((v) => ({
      value: v.id,
      label: `${v.seriesTitle} - Vol. ${v.volumeNumber} (${v.title})`,
      badge: v.format || "MANGA",
    }));
  }, [volumes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50">
          <div>
            <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
              Live Edit: The Collection 3D Showcase
            </h3>
            <p className="text-[11px] font-mono text-text-muted">
              Configure boxset headline, 3 featured volumes, bundle price, and cart actions.
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. Boxset Volumes Selection with Live Covers */}
          <div className="space-y-3 p-4 bg-ink-surface/40 border border-ink-border rounded-xs">
            <div className="flex items-center justify-between border-b border-ink-border/50 pb-2">
              <span className="text-xs font-mono font-bold text-gold uppercase tracking-wider">
                3D Boxset Volumes (Slipcase Showcase)
              </span>
              <span className="text-[10px] font-mono text-text-muted">
                Left, Center (Hero), and Right volumes
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Volume 01 (Left) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-12 rounded-xs overflow-hidden border border-ink-border shrink-0 bg-ink">
                    {selectedVol1 && (
                      <img
                        src={selectedVol1.coverImage}
                        alt={selectedVol1.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="text-[11px] font-mono font-semibold text-paper block uppercase truncate">
                      Vol 01 (Left)
                    </label>
                    <span className="text-[9px] font-mono text-gold block truncate">
                      {selectedVol1?.seriesTitle}
                    </span>
                  </div>
                </div>
                <CustomSelect
                  fullWidth
                  value={form.volumeId1}
                  onChange={(val) => setForm({ ...form, volumeId1: val })}
                  options={volumeOptions}
                  buttonClassName="bg-ink border-ink-border text-paper h-9 px-2 text-xs"
                />
              </div>

              {/* Volume 02 (Center) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-12 rounded-xs overflow-hidden border border-gold/50 ring-1 ring-gold/30 shrink-0 bg-ink">
                    {selectedVol2 && (
                      <img
                        src={selectedVol2.coverImage}
                        alt={selectedVol2.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="text-[11px] font-mono font-semibold text-gold block uppercase truncate">
                      Vol 02 (Center Hero)
                    </label>
                    <span className="text-[9px] font-mono text-gold block truncate">
                      {selectedVol2?.seriesTitle}
                    </span>
                  </div>
                </div>
                <CustomSelect
                  fullWidth
                  value={form.volumeId2}
                  onChange={(val) => setForm({ ...form, volumeId2: val })}
                  options={volumeOptions}
                  buttonClassName="bg-ink border-gold/40 text-paper h-9 px-2 text-xs"
                />
              </div>

              {/* Volume 03 (Right) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-12 rounded-xs overflow-hidden border border-ink-border shrink-0 bg-ink">
                    {selectedVol3 && (
                      <img
                        src={selectedVol3.coverImage}
                        alt={selectedVol3.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="text-[11px] font-mono font-semibold text-paper block uppercase truncate">
                      Vol 03 (Right)
                    </label>
                    <span className="text-[9px] font-mono text-gold block truncate">
                      {selectedVol3?.seriesTitle}
                    </span>
                  </div>
                </div>
                <CustomSelect
                  fullWidth
                  value={form.volumeId3}
                  onChange={(val) => setForm({ ...form, volumeId3: val })}
                  options={volumeOptions}
                  buttonClassName="bg-ink border-ink-border text-paper h-9 px-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* 2. Section Typography & Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Section Headline
              </label>
              <input
                type="text"
                value={form.headline || ""}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                placeholder="THE COLLECTION"
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Metadata Badge Text
              </label>
              <input
                type="text"
                value={form.badgeText || ""}
                onChange={(e) => setForm({ ...form, badgeText: e.target.value })}
                placeholder="COMPLETE ARCHIVE • VOL. 01–03"
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Boxset Bundle Price (EGP)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.price || 29.99}
                  onChange={(e) =>
                    setForm({ ...form, price: Math.max(0, parseFloat(e.target.value) || 0) })
                  }
                  className="w-full bg-ink-surface border border-ink-border text-gold font-bold px-3 py-2 text-sm rounded-xs focus:border-gold outline-none font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted pointer-events-none">
                  EGP
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Primary CTA Label
              </label>
              <input
                type="text"
                value={form.primaryCtaText || ""}
                onChange={(e) => setForm({ ...form, primaryCtaText: e.target.value })}
                placeholder="ADD SET TO CART"
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Secondary CTA Label
              </label>
              <input
                type="text"
                value={form.secondaryCtaText || ""}
                onChange={(e) => setForm({ ...form, secondaryCtaText: e.target.value })}
                placeholder="DISCOVER ALL BOXSETS"
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Secondary CTA Destination Link
              </label>
              <input
                type="text"
                value={form.secondaryCtaLink || ""}
                onChange={(e) => setForm({ ...form, secondaryCtaLink: e.target.value })}
                placeholder="/manga?format=Box+Set"
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none font-mono text-xs"
              />
            </div>
          </div>

          {/* Footer */}
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
  onClose,
  onSave,
}: {
  initialConfig: ShippingConfig;
  onClose: () => void;
  onSave: (config: ShippingConfig) => void;
}) {
  useModalScrollLock(true);
  const [form, setForm] = useState<ShippingConfig>(initialConfig);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50">
          <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
            Live Edit: Logistics, Shipping &amp; Perks
          </h3>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-paper p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain">
          {/* Section 01: The 3 Value Props / Perks */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-bold text-gold uppercase tracking-wider border-b border-ink-border/60 pb-1">
              01. Front-Facing Trust Perks (3 Footer Cards)
            </h4>

            {/* Perk 1 */}
            <div className="p-3 bg-ink-surface/50 border border-ink-border rounded-xs space-y-2">
              <div className="text-[11px] font-mono font-semibold text-paper uppercase">
                Perk 01: Express Dispatch
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-text-muted uppercase">Card Title</label>
                <input
                  type="text"
                  value={form.perk1Title || ""}
                  onChange={(e) => setForm({ ...form, perk1Title: e.target.value })}
                  placeholder="EGYPT-WIDE EXPRESS DISPATCH"
                  className="w-full bg-ink border border-ink-border text-paper px-3 py-1.5 text-xs rounded-xs focus:border-gold outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-text-muted uppercase">Card Description</label>
                <textarea
                  rows={2}
                  value={form.perk1Desc || ""}
                  onChange={(e) => setForm({ ...form, perk1Desc: e.target.value })}
                  className="w-full bg-ink border border-ink-border text-paper px-3 py-1.5 text-xs rounded-xs focus:border-gold outline-none resize-none font-sans"
                />
              </div>
            </div>

            {/* Perk 2 */}
            <div className="p-3 bg-ink-surface/50 border border-ink-border rounded-xs space-y-2">
              <div className="text-[11px] font-mono font-semibold text-paper uppercase">
                Perk 02: Authentic Editions
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-text-muted uppercase">Card Title</label>
                <input
                  type="text"
                  value={form.perk2Title || ""}
                  onChange={(e) => setForm({ ...form, perk2Title: e.target.value })}
                  placeholder="AUTHENTIC JAPANESE EDITIONS"
                  className="w-full bg-ink border border-ink-border text-paper px-3 py-1.5 text-xs rounded-xs focus:border-gold outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-text-muted uppercase">Card Description</label>
                <textarea
                  rows={2}
                  value={form.perk2Desc || ""}
                  onChange={(e) => setForm({ ...form, perk2Desc: e.target.value })}
                  className="w-full bg-ink border border-ink-border text-paper px-3 py-1.5 text-xs rounded-xs focus:border-gold outline-none resize-none font-sans"
                />
              </div>
            </div>

            {/* Perk 3 */}
            <div className="p-3 bg-ink-surface/50 border border-ink-border rounded-xs space-y-2">
              <div className="text-[11px] font-mono font-semibold text-paper uppercase">
                Perk 03: Replacement Guarantee
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-text-muted uppercase">Card Title</label>
                <input
                  type="text"
                  value={form.perk3Title || ""}
                  onChange={(e) => setForm({ ...form, perk3Title: e.target.value })}
                  placeholder="COLLECTOR REPLACEMENT GUARANTEE"
                  className="w-full bg-ink border border-ink-border text-paper px-3 py-1.5 text-xs rounded-xs focus:border-gold outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-text-muted uppercase">Card Description</label>
                <textarea
                  rows={2}
                  value={form.perk3Desc || ""}
                  onChange={(e) => setForm({ ...form, perk3Desc: e.target.value })}
                  className="w-full bg-ink border border-ink-border text-paper px-3 py-1.5 text-xs rounded-xs focus:border-gold outline-none resize-none font-sans"
                />
              </div>
            </div>
          </div>

          {/* Section 02: Logistics & Thresholds */}
          <div className="space-y-4 pt-2 border-t border-ink-border/60">
            <h4 className="text-xs font-mono font-bold text-gold uppercase tracking-wider">
              02. Logistics &amp; Free Delivery Threshold
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

function EditorialLiveEditModal({
  initialConfig,
  onClose,
  onSave,
}: {
  initialConfig: EditorialConfig;
  onClose: () => void;
  onSave: (config: EditorialConfig) => void;
}) {
  useModalScrollLock(true);
  const [form, setForm] = useState<EditorialConfig>(initialConfig);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50">
          <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
            Live Edit: Editorial &amp; Footer Brand
          </h3>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-paper p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain">
          {/* Section 01: Footer Brand Identity */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-bold text-gold uppercase tracking-wider border-b border-ink-border/60 pb-1">
              01. Footer Brand Identity
            </h4>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Footer Brand Narrative / Description
              </label>
              <textarea
                rows={3}
                value={form.footerDescription || ""}
                onChange={(e) => setForm({ ...form, footerDescription: e.target.value })}
                placeholder="An editorial archive celebrating sequential art, Japanese literary epics, and tactile physical printing craftsmanship."
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Hub Cities Line
              </label>
              <input
                type="text"
                value={form.hubCities || ""}
                onChange={(e) => setForm({ ...form, hubCities: e.target.value })}
                placeholder="6TH OF OCTOBER • CAIRO • ALEXANDRIA • ALL EGYPT"
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Site Tagline
              </label>
              <input
                type="text"
                value={form.siteTagline || ""}
                onChange={(e) => setForm({ ...form, siteTagline: e.target.value })}
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Concierge Contact Email
              </label>
              <input
                type="email"
                value={form.contactEmail || ""}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
              />
            </div>
          </div>

          {/* Section 02: Canonical Store Policies */}
          <div className="space-y-4 pt-2 border-t border-ink-border/60">
            <h4 className="text-xs font-mono font-bold text-gold uppercase tracking-wider">
              02. Canonical Store Policies &amp; Philosophy
            </h4>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Footer Philosophical Quote
              </label>
              <textarea
                rows={3}
                value={form.footerQuote || ""}
                onChange={(e) => setForm({ ...form, footerQuote: e.target.value })}
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Authenticity Guarantee Policy
              </label>
              <textarea
                rows={3}
                value={form.authenticityGuaranteeText || ""}
                onChange={(e) => setForm({ ...form, authenticityGuaranteeText: e.target.value })}
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Shipping Logistics Policy
              </label>
              <textarea
                rows={3}
                value={form.shippingPolicyText || ""}
                onChange={(e) => setForm({ ...form, shippingPolicyText: e.target.value })}
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Return &amp; Replacement Policy
              </label>
              <textarea
                rows={3}
                value={form.returnPolicyText || ""}
                onChange={(e) => setForm({ ...form, returnPolicyText: e.target.value })}
                className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none resize-none"
              />
            </div>
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

function HeroCardLiveEditModal({
  currentVolumeId,
  volumes,
  onClose,
  onSave,
}: {
  currentVolumeId: string;
  volumes: any[];
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
  seriesList: any[];
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
                  src={activeSeries.featuredImage || activeSeries.coverImage}
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
                      src={s.featuredImage || s.coverImage}
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
  onClose,
  onSave,
}: {
  initialConfig: TrendingConfig;
  onClose: () => void;
  onSave: (config: TrendingConfig) => void;
}) {
  useModalScrollLock(true);
  const [form, setForm] = useState<TrendingConfig>(initialConfig);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const speedInSeconds = (form.autoplaySpeed / 1000).toFixed(1);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50">
          <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
            Live Edit: Trending Now Carousel
          </h3>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-paper p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

function NewReleasesLiveEditModal({
  initialConfig,
  onClose,
  onSave,
}: {
  initialConfig: NewReleasesConfig;
  onClose: () => void;
  onSave: (config: NewReleasesConfig) => void;
}) {
  useModalScrollLock(true);
  const [form, setForm] = useState<NewReleasesConfig>(initialConfig);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50">
          <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
            Live Edit: New Releases Section
          </h3>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-paper p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

function GenreBentoLiveEditModal({
  initialConfig,
  genres,
  onClose,
  onSave,
  onAddGenre,
  onUpdateGenre,
  onDeleteGenre,
}: {
  initialConfig: GenreBentoConfig;
  genres: GenreInfo[];
  onClose: () => void;
  onSave: (config: GenreBentoConfig) => void;
  onAddGenre: (genre: GenreInfo) => void;
  onUpdateGenre: (id: string, updates: Partial<GenreInfo>) => void;
  onDeleteGenre: (id: string) => void;
}) {
  useModalScrollLock(true);
  const [activeTab, setActiveTab] = useState<"header" | "categories">("categories");
  const [form, setForm] = useState<GenreBentoConfig>(initialConfig);
  const [editingGenre, setEditingGenre] = useState<GenreInfo | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [genreToDelete, setGenreToDelete] = useState<GenreInfo | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
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
          <div className="flex border-b border-ink-border bg-ink px-6 pt-2 shrink-0">
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
  onClose,
  onSave,
}: {
  initialConfig: MangaDiscoveryConfig;
  onClose: () => void;
  onSave: (config: MangaDiscoveryConfig) => void;
}) {
  useModalScrollLock(true);
  const [form, setForm] = useState<MangaDiscoveryConfig>(initialConfig);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50">
          <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
            Live Edit: Manga Discovery Section
          </h3>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-paper p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto overscroll-contain">
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


