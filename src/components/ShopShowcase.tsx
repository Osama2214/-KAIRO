"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  DEFAULT_SHOP_SHOWCASE_ARABIC_CONFIG,
  DEFAULT_SHOP_SHOWCASE_CONFIG,
  useStorefrontStore,
} from "@/store/useStorefrontStore";
import { useTranslation } from "@/hooks/useTranslation";
import { LiveEditButton } from "@/components/admin/LiveEditButton";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
import { isMerch, withVariantSummary } from "@/lib/variants";

/**
 * Figures and posters on the home page. Curated picks come first, topped up
 * with featured and then in-stock products. The section stays out of the page
 * entirely until the shop has something to show.
 */
export function ShopShowcase() {
  const { locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const volumes = useStorefrontStore((state) => state.volumes);
  const config = { ...DEFAULT_SHOP_SHOWCASE_CONFIG, ...useStorefrontStore((state) => state.shopShowcaseConfig) };
  const arabic = { ...DEFAULT_SHOP_SHOWCASE_ARABIC_CONFIG, ...useStorefrontStore((state) => state.shopShowcaseArabicConfig) };

  const maxCards = Math.max(4, Math.min(12, Number(config.maxCards) || 8));
  const productIds = config.productIds;

  const items = useMemo(() => {
    const merch = volumes.filter(isMerch).map(withVariantSummary);
    const byId = new Map(merch.map((p) => [p.id, p]));
    const picked = (productIds || []).map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
    const chosen = new Set(picked.map((p) => p.id));
    const fillers = merch
      .filter((p) => !chosen.has(p.id))
      .sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) || Number(b.stock > 0) - Number(a.stock > 0));
    // Rows of four: never leave a ragged last row.
    const all = [...picked, ...fillers].slice(0, maxCards);
    return all.length >= 4 ? all.slice(0, all.length - (all.length % 4)) : all;
  }, [volumes, productIds, maxCards]);

  // Rendered on the server too: mounting it only in the browser made the page
  // grow after load, which moved everything positioned against its height.
  if (!config.enabled || items.length === 0) return null;

  const badge = isArabic ? arabic.badgeText : config.badgeText;
  const headline = isArabic ? arabic.headline : config.headline;
  const viewAll = isArabic ? arabic.viewAllText : config.viewAllText;

  return (
    // Same frame, header and grid as the New Releases section.
    <section id="shop" className="py-24 px-6 md:px-12 bg-ink border-t border-ink-border/60">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 pb-4 border-b border-ink-border/70 gap-4">
          <div>
            <span className="text-[11px] font-mono tracking-[0.25em] text-gold uppercase block mb-1">{badge}</span>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-paper font-sans">{headline}</h2>
              <LiveEditButton target={{ type: "shop-showcase" }} label={isArabic ? "تعديل المتجر" : "Edit Shop"} variant="floating" size="xs" />
            </div>
          </div>
          <Link
            href="/shop"
            className="flex items-center gap-2 text-xs font-mono tracking-widest text-text-muted hover:text-paper transition-colors group"
          >
            <span>{viewAll}</span>
            <ArrowRight strokeWidth={1.4} className={`w-3.5 h-3.5 transition-transform ${isRTL ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {items.map((product) => (
            <ShopProductCard key={product.id} product={product} isArabic={isArabic} layout="home" />
          ))}
        </div>
      </div>
    </section>
  );
}
