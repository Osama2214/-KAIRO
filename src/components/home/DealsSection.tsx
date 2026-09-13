"use client";

import React, { useMemo } from "react";
import { resolveHomeExtras, useStorefrontStore } from "@/store/useStorefrontStore";
import { useTranslation } from "@/hooks/useTranslation";
import { useNow } from "@/hooks/useNow";
import { priceVolume } from "@/lib/pricing";
import { withVariantSummary } from "@/lib/variants";
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
    if (minute === null) return [];
    const at = minute * 60_000;
    return volumes
      .map(withVariantSummary)
      .map((item) => ({ item, priced: priceVolume(item, at) }))
      .filter(({ item, priced }) => priced.activePromo && priced.endsInMs !== null && item.stock > 0)
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
