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
} from "lucide-react";
import { useStorefrontStore, HeroContent, AnnouncementConfig, ShippingConfig, EditorialConfig, FeaturedSeriesConfig, CollectionConfig } from "@/store/useStorefrontStore";
import { useMounted } from "@/store/useWishlistStore";
import { VolumeFormModal } from "./VolumeFormModal";
import { SeriesFormModal } from "./SeriesFormModal";
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
    heroContent,
    announcement,
    shippingConfig,
    editorialConfig,
    featuredSeriesConfig,
    collectionConfig,
    updateVolume,
    updateSeries,
    updateHeroContent,
    updateAnnouncement,
    updateShippingConfig,
    updateEditorialConfig,
    updateFeaturedSeriesConfig,
    updateCollectionConfig,
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
      ? series.find((s) => s.slug === activeLiveEditTarget.seriesSlug) || null
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
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>KAIRO CURATOR</span>
            <Maximize2 className="w-3.5 h-3.5 text-paper-muted" />
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-2.5 bg-ink/95 border border-gold/50 rounded-full shadow-2xl backdrop-blur-md text-xs font-mono text-paper">
            {/* Curator Badge */}
            <div className="flex items-center gap-2 pr-2 border-r border-ink-border">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
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

      {/* Collection Modal */}
      {activeLiveEditTarget?.type === "collection" && (
        <CollectionLiveEditModal
          initialConfig={collectionConfig}
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
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-gold/10 text-gold rounded-xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
                Live Edit: Hero Headline &amp; Actions
              </h3>
              <p className="text-[11px] font-mono text-text-muted">
                Changes apply instantly to the homepage banner.
              </p>
            </div>
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
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-vermilion/10 text-vermilion rounded-xs">
              <Tag className="w-4 h-4" />
            </span>
            <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
              Live Edit: Welcome Voucher Bar
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-paper p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center justify-between p-3 bg-ink-surface/60 border border-ink-border rounded-xs">
            <span className="text-xs font-mono font-semibold uppercase text-paper">
              Announcement Banner Active
            </span>
            <button
              type="button"
              onClick={() => setForm({ ...form, enabled: !form.enabled })}
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold cursor-pointer transition-colors ${
                form.enabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {form.enabled ? "ENABLED" : "HIDDEN"}
            </button>
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
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-gold/10 text-gold rounded-xs">
              <Layers className="w-4 h-4" />
            </span>
            <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
              Live Edit: Featured Series Spotlight
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-paper p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
              Select Series to Feature
            </label>
            <select
              value={form.seriesSlug}
              onChange={(e) => setForm({ ...form, seriesSlug: e.target.value, ctaLink: `/series/${e.target.value}` })}
              className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none cursor-pointer"
            >
              {seriesList.map((s) => (
                <option key={s.slug} value={s.slug} className="bg-ink text-paper">
                  {s.title} ({s.japaneseTitle})
                </option>
              ))}
            </select>
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
  onClose,
  onSave,
}: {
  initialConfig: CollectionConfig;
  onClose: () => void;
  onSave: (config: CollectionConfig) => void;
}) {
  useModalScrollLock(true);
  const [form, setForm] = useState<CollectionConfig>(initialConfig);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-gold/10 text-gold rounded-xs">
              <BookOpen className="w-4 h-4" />
            </span>
            <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
              Live Edit: The Collection Showcase
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-paper p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              Section Headline
            </label>
            <input
              type="text"
              value={form.headline || ""}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
              className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                Boxset Price (EGP)
              </label>
              <input
                type="number"
                value={form.price || 89.99}
                onChange={(e) => setForm({ ...form, price: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="w-full bg-ink-surface border border-ink-border text-gold font-bold px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
                CTA Button Text
              </label>
              <input
                type="text"
                value={form.primaryCtaText || ""}
                onChange={(e) => setForm({ ...form, primaryCtaText: e.target.value })}
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
      <div className="w-full max-w-lg flex flex-col bg-ink border border-ink-border rounded-sm shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink-surface/50">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-gold/10 text-gold rounded-xs">
              <Truck className="w-4 h-4" />
            </span>
            <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
              Live Edit: Shipping &amp; Free Delivery
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-paper p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                  Automatic zero shipping on reaching threshold
                </span>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, freeShippingEnabled: !form.freeShippingEnabled })}
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold cursor-pointer transition-colors ${
                  form.freeShippingEnabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}
              >
                {form.freeShippingEnabled ? "ACTIVE" : "DISABLED"}
              </button>
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
              Standard Shipping Cost (EGP)
            </label>
            <input
              type="number"
              value={form.standardShippingCost || 65}
              onChange={(e) => setForm({ ...form, standardShippingCost: Math.max(0, parseFloat(e.target.value) || 0) })}
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
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-gold/10 text-gold rounded-xs">
              <FileText className="w-4 h-4" />
            </span>
            <h3 className="font-cinzel text-base font-bold text-paper uppercase tracking-wider">
              Live Edit: Editorial &amp; Footer Policies
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-paper p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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
              Concierge Contact Email
            </label>
            <input
              type="email"
              value={form.contactEmail || ""}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className="w-full bg-ink-surface border border-ink-border text-paper px-3 py-2 text-sm rounded-xs focus:border-gold outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-paper-muted uppercase tracking-wider">
              Authenticity Guarantee Text
            </label>
            <textarea
              rows={3}
              value={form.authenticityGuaranteeText || ""}
              onChange={(e) => setForm({ ...form, authenticityGuaranteeText: e.target.value })}
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
