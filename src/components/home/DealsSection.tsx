"use client";

import React, { useMemo } from "react";
import { resolveHomeExtras, useStorefrontStore } from "@/store/useStorefrontStore";
import { useTranslation } from "@/hooks/useTranslation";
import { useNow } from "@/hooks/useNow";
import { priceVolume } from "@/lib/pricing";
import { withVariantSummary } from "@/lib/variants";
import type { MangaVolume } from "@/data/manga";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
import { HomeSectionFrame, fullRows } from "@/components/home/HomeSectionFrame";

/**
 * Every product with a limited-time offer running right now, the soonest to
 * end first. Books and merchandise alike. Hidden when nothing is on offer.
 */
export function DealsSection() {
  const { locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const now = useNow();
  const volumes = useStorefrontStore((state) => state.volumes);
  const settings = resolveHomeExtras(useStorefrontStore((state) => state.homeExtrasConfig)).deals;
  // The clock ticks every second; the list only needs to change once a minute.
  const minute = now === null ? null : Math.floor(now / 60_000);

  const deals = useMemo(() => {
    const products = volumes.map(withVariantSummary).filter((item) => item.stock > 0);
    // No clock on the server (or during hydration): render every product that
    // carries an offer, ordered by its end date, so the section is part of the
    // first HTML instead of appearing after load and pushing the page down.
    // Once the clock is known, offers that are not running are dropped.
    if (minute === null) {
      const endsAt = (item: MangaVolume) => Date.parse(item.promo?.endsAt || "") || Infinity;
      return products
        .filter((item) => Number(item.promo?.percent) > 0 && Number.isFinite(endsAt(item)))
        .sort((a, b) => endsAt(a) - endsAt(b));
    }
    const at = minute * 60_000;
    return products
      .map((item) => ({ item, priced: priceVolume(item, at) }))
      .filter(({ priced }) => priced.activePromo && priced.endsInMs !== null)
      .sort((a, b) => a.priced.endsInMs! - b.priced.endsInMs! || b.priced.savedPercent - a.priced.savedPercent)
      .map(({ item }) => item);
  }, [volumes, minute]);

  const items = fullRows(deals, settings.maxCards);
  if (!settings.enabled || items.length === 0) return null;

  return (
    <HomeSectionFrame
      id="deals"
      section="deals"
      badge={isArabic ? settings.badgeTextAr : settings.badgeText}
      headline={isArabic ? settings.headlineAr : settings.headline}
      isArabic={isArabic}
      isRTL={isRTL}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {items.map((item) => (
          <ShopProductCard key={item.id} product={item} isArabic={isArabic} layout="home" />
        ))}
      </div>
    </HomeSectionFrame>
  );
}
