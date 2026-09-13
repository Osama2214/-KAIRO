"use client";

import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, Save, X } from "lucide-react";
import type { MangaVolume } from "@/data/manga";
import {
  DEFAULT_SHOP_SHOWCASE_ARABIC_CONFIG,
  DEFAULT_SHOP_SHOWCASE_CONFIG,
  type ShopShowcaseArabicConfig,
  type ShopShowcaseConfig,
} from "@/store/useStorefrontStore";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { isMerch, withVariantSummary } from "@/lib/variants";

const inputClass = "w-full h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm focus:border-gold outline-none text-sm font-sans";

/** Live-editor panel for the home page's Figures & Posters section. */
export function ShopShowcaseLiveEditModal({
  initialConfig,
  initialArabicConfig,
  volumes,
  onClose,
  onSave,
}: {
  initialConfig?: ShopShowcaseConfig;
  initialArabicConfig?: ShopShowcaseArabicConfig;
  volumes: MangaVolume[];
  onClose: () => void;
  onSave: (config: ShopShowcaseConfig, arabic: ShopShowcaseArabicConfig) => void;
}) {
  useModalScrollLock(true);
  const [config, setConfig] = useState<ShopShowcaseConfig>({ ...DEFAULT_SHOP_SHOWCASE_CONFIG, ...(initialConfig || {}) });
  const [arabic, setArabic] = useState<ShopShowcaseArabicConfig>({ ...DEFAULT_SHOP_SHOWCASE_ARABIC_CONFIG, ...(initialArabicConfig || {}) });
  const products = useMemo(() => volumes.filter(isMerch).map(withVariantSummary), [volumes]);
  const picked = config.productIds.filter((id) => products.some((p) => p.id === id));

  const toggle = (id: string) =>
    setConfig((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(id) ? prev.productIds.filter((x) => x !== id) : [...prev.productIds, id],
    }));
  const move = (id: string, delta: number) =>
    setConfig((prev) => {
      const list = prev.productIds.filter((x) => products.some((p) => p.id === x));
      const i = list.indexOf(id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= list.length) return prev;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...prev, productIds: list };
    });

  return (
    <div data-lenis-prevent role="dialog" aria-modal="true" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-ink-surface border border-ink-border rounded-sm shadow-2xl my-8 overflow-hidden font-mono text-xs">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-border bg-ink">
          <h2 className="font-cinzel text-lg font-bold text-paper">Home Section — Figures &amp; Posters</h2>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-paper cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6 max-h-[75vh] overflow-y-auto overscroll-contain">
          <label className="flex items-center justify-between p-3 border border-ink-border rounded-sm bg-ink cursor-pointer">
            <span className="text-paper">Show this section on the home page</span>
            <input type="checkbox" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} className="accent-gold w-4 h-4" />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <span className="text-gold uppercase tracking-wider">English</span>
              <input className={inputClass} value={config.badgeText} onChange={(e) => setConfig({ ...config, badgeText: e.target.value })} placeholder="Badge" />
              <input className={inputClass} value={config.headline} onChange={(e) => setConfig({ ...config, headline: e.target.value })} placeholder="Headline" />
              <input className={inputClass} value={config.viewAllText} onChange={(e) => setConfig({ ...config, viewAllText: e.target.value })} placeholder="Button text" />
            </div>
            <div className="space-y-3" dir="rtl">
              <span className="text-gold uppercase tracking-wider">العربية</span>
              <input className={inputClass} value={arabic.badgeText} onChange={(e) => setArabic({ ...arabic, badgeText: e.target.value })} placeholder="الشارة" />
              <input className={inputClass} value={arabic.headline} onChange={(e) => setArabic({ ...arabic, headline: e.target.value })} placeholder="العنوان" />
              <input className={inputClass} value={arabic.viewAllText} onChange={(e) => setArabic({ ...arabic, viewAllText: e.target.value })} placeholder="نص الزر" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-text-muted">Cards shown (rows of 4)</span>
            <select
              value={config.maxCards}
              onChange={(e) => setConfig({ ...config, maxCards: Number(e.target.value) })}
              className="h-10 bg-ink border border-ink-border text-paper px-3 rounded-sm"
            >
              {[4, 8, 12].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Pinned products — shown first, in this order ({picked.length})</span>
              {picked.length > 0 && (
                <button type="button" onClick={() => setConfig({ ...config, productIds: [] })} className="text-[10px] uppercase text-text-muted hover:text-vermilion cursor-pointer">
                  Clear
                </button>
              )}
            </div>
            <p className="text-[10px] text-text-muted">The rest of the section is filled with featured, then in-stock products.</p>
            {products.length === 0 ? (
              <p className="p-4 border border-ink-border rounded-sm text-text-muted">No figures or posters yet — add some from the Products Catalog.</p>
            ) : (
              <div data-lenis-prevent className="max-h-72 overflow-y-auto border border-ink-border rounded-sm divide-y divide-ink-border/60">
                {[...picked.map((id) => products.find((p) => p.id === id)!), ...products.filter((p) => !picked.includes(p.id))].map((product) => {
                  const checked = picked.includes(product.id);
                  return (
                    <div key={product.id} className="flex items-center gap-3 px-3 py-2 hover:bg-ink-elevated/40">
                      <button
                        type="button"
                        onClick={() => toggle(product.id)}
                        className={`w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 cursor-pointer ${checked ? "bg-gold border-gold text-ink" : "border-ink-border"}`}
                        aria-label={checked ? "Unpin" : "Pin"}
                      >
                        {checked && <Check strokeWidth={2.5} className="w-3 h-3" />}
                      </button>
                      <img src={product.coverImage} alt="" className="w-8 h-10 object-cover rounded-xs border border-ink-border" />
                      <div className="flex-1 min-w-0">
                        <p className="text-paper truncate">{product.title}</p>
                        <p className="text-[10px] text-text-muted">{product.format} · {product.stock} in stock</p>
                      </div>
                      {checked && (
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => move(product.id, -1)} className="p-1 text-text-muted hover:text-paper cursor-pointer" aria-label="Move up">
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => move(product.id, 1)} className="p-1 text-text-muted hover:text-paper cursor-pointer" aria-label="Move down">
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink-border bg-ink">
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-ink-border text-text-muted hover:text-paper rounded-sm uppercase tracking-wider cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({ ...config, productIds: picked }, arabic)}
            className="flex items-center gap-2 px-6 py-2.5 bg-gold hover:bg-gold-muted text-ink font-bold rounded-sm uppercase tracking-widest cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
