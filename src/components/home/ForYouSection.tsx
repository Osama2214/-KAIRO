"use client";

import React, { useMemo } from "react";
import { resolveHomeExtras, useStorefrontStore } from "@/store/useStorefrontStore";
import { useBrowsingHistoryStore } from "@/store/useBrowsingHistoryStore";
import { useCartStore } from "@/store/useCartStore";
import { useMounted } from "@/store/useWishlistStore";
import { useTranslation } from "@/hooks/useTranslation";
import { useNow } from "@/hooks/useNow";
import { recommend } from "@/lib/recommendations";
import { isBook } from "@/lib/variants";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
import { HomeSectionFrame, fullRows } from "@/components/home/HomeSectionFrame";

/**
 * Personal recommendations from this shopper's own browsing (kept in their
 * browser). A first-time visitor has no history, so the section stays hidden
 * until they have looked at something.
 */
export function ForYouSection() {
  const { locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const mounted = useMounted();
  const now = useNow();
  const volumes = useStorefrontStore((state) => state.volumes);
  const settings = resolveHomeExtras(useStorefrontStore((state) => state.homeExtrasConfig)).forYou;
  const views = useBrowsingHistoryStore((state) => state.views);
  const cartItems = useCartStore((state) => state.items);
  // Recency is measured in days; an hourly clock is plenty and keeps the row still.
  const hour = now === null ? null : Math.floor(now / 3_600_000);

  const recommendations = useMemo(() => {
    if (hour === null) return [];
    return recommend(volumes, views, {
      now: hour * 3_600_000,
      exclude: cartItems.map((item) => item.volumeId),
      limit: 12,
    });
  }, [volumes, views, cartItems, hour]);

  const items = fullRows(recommendations, settings.maxCards);
  if (!mounted || !settings.enabled || items.length === 0) return null;

  const lastViewed = volumes.find((v) => v.id === views[0]?.id);
  const because = !lastViewed
    ? ""
    : isBook(lastViewed) && lastViewed.format !== "Box Set"
      ? `${lastViewed.seriesTitle} ${isArabic ? "مجلد" : "Vol."} ${lastViewed.volumeNumber}`
      : lastViewed.title;

  return (
    <HomeSectionFrame
      id="for-you"
      section="forYou"
      badge={isArabic ? settings.badgeTextAr : settings.badgeText}
      headline={isArabic ? settings.headlineAr : settings.headline}
      isArabic={isArabic}
      isRTL={isRTL}
    >
      {because && (
        <p className="-mt-8 mb-8 text-[11px] font-mono tracking-wider text-text-muted">
          {isArabic ? "لأنك شاهدت: " : "BECAUSE YOU VIEWED: "}
          <span className="text-paper">{because}</span>
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {items.map(({ item }) => (
          <ShopProductCard key={item.id} product={item} isArabic={isArabic} layout="home" />
        ))}
      </div>
    </HomeSectionFrame>
  );
}
