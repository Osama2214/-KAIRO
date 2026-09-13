"use client";

import React, { useMemo, useState } from "react";
import { Save, X } from "lucide-react";
import { DEFAULT_HOME_EXTRAS_CONFIG, useStorefrontStore, type HomeExtrasConfig, type HomeSectionSettings } from "@/store/useStorefrontStore";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { ImageUploadInput } from "@/components/ImageUploadInput";
import { buildFranchises } from "@/lib/franchise";

const inputClass = "w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans";

const TITLES: Record<keyof HomeExtrasConfig, { title: string; note: string }> = {
  deals: {
    title: "Deals Ending Soon",
    note: "Lists every in-stock product with a limited-time offer running now, soonest to end first. Hidden when no offer is running.",
  },
  franchises: {
    title: "Shop by Franchise",
    note: "One card per series, with its books and the figures/posters whose franchise matches the series name. Merch-only franchises open the shop filtered.",
  },
  forYou: {
    title: "Picked for You",
    note: "Personal to each visitor, from the products they viewed on this device: next volumes, box sets, matching figures/posters and similar genres. Hidden for first-time visitors.",
  },
};

/** Live-editor panel for one of the deals / franchises / picked-for-you home sections. */
export function HomeExtrasLiveEditModal({
  section,
  initial,
  onClose,
  onSave,
}: {
  section: keyof HomeExtrasConfig;
  initial: HomeSectionSettings;
  onClose: () => void;
  onSave: (settings: HomeSectionSettings) => void;
}) {
  useModalScrollLock(true);
  const [s, setS] = useState<HomeSectionSettings>({ ...DEFAULT_HOME_EXTRAS_CONFIG[section], ...initial });
  const info = TITLES[section];
  const volumes = useStorefrontStore((state) => state.volumes);
  const seriesList = useStorefrontStore((state) => state.series);
  const franchises = useMemo(() => buildFranchises(volumes, seriesList), [volumes, seriesList]);
  const imageFor = (key: string) => s.cardImages?.find((c) => c.key === key)?.image || "";
  const setImage = (key: string, image: string) =>
    setS((prev) => {
      const rest = (prev.cardImages || []).filter((c) => c.key !== key);
      return { ...prev, cardImages: image.trim() ? [...rest, { key, image: image.trim() }] : rest };
    });

  return (
    <div data-lenis-prevent role="dialog" aria-modal="true" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-ink-surface border border-ink-border rounded-sm shadow-2xl my-8 overflow-hidden font-mono text-xs">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink">
          <h2 className="font-cinzel text-lg font-bold text-paper">Home Section — {info.title}</h2>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-paper cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6 max-h-[75vh] overflow-y-auto overscroll-contain">
          <p className="text-[11px] text-text-muted leading-relaxed">{info.note}</p>

          <label className="flex items-center justify-between p-3 border border-ink-border rounded-sm bg-ink cursor-pointer">
            <span className="text-paper">Show this section on the home page</span>
            <input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} className="accent-gold w-4 h-4" />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <span className="text-gold uppercase tracking-wider">English</span>
              <input className={inputClass} value={s.badgeText} onChange={(e) => setS({ ...s, badgeText: e.target.value })} placeholder="Badge" />
              <input className={inputClass} value={s.headline} onChange={(e) => setS({ ...s, headline: e.target.value })} placeholder="Headline" />
            </div>
            <div className="space-y-3" dir="rtl">
              <span className="text-gold uppercase tracking-wider">العربية</span>
              <input className={inputClass} value={s.badgeTextAr} onChange={(e) => setS({ ...s, badgeTextAr: e.target.value })} placeholder="الشارة" />
              <input className={inputClass} value={s.headlineAr} onChange={(e) => setS({ ...s, headlineAr: e.target.value })} placeholder="العنوان" />
            </div>
          </div>

          {section === "franchises" && (
            <div className="space-y-3">
              <span className="text-gold uppercase tracking-wider">Card artwork per franchise</span>
              <p className="text-[10px] text-text-muted">Leave empty to use the series banner. Portrait images (4:5) look best.</p>
              {franchises.map((f) => (
                <ImageUploadInput
                  key={f.key}
                  label={f.name}
                  value={imageFor(f.key)}
                  onChange={(url) => setImage(f.key, url)}
                  placeholder={f.image}
                  aspectRatio="cover"
                  recommendedDimensions="1000 × 1250 px (4:5)"
                />
              ))}
            </div>
          )}

          {section !== "franchises" && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-text-muted">Cards shown (rows of 4)</span>
            <select
              value={s.maxCards}
              onChange={(e) => setS({ ...s, maxCards: Number(e.target.value) })}
              className="h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm"
            >
              {[4, 8, 12].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink-border bg-ink">
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-ink-border text-text-muted hover:text-paper rounded-sm uppercase tracking-wider cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(s)}
            className="flex items-center gap-2 px-6 py-2.5 bg-gold hover:bg-gold-muted text-ink font-bold rounded-sm uppercase tracking-widest cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
