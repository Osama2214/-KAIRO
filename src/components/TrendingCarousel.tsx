"use client";

import React, { useCallback } from "react";
import { AnimeVerseImage } from "@/components/AnimeVerseImage";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, Star, Plus, Eye } from "lucide-react";
import { MangaVolume } from "@/data/manga";
import { useCartStore } from "@/store/useCartStore";
import { useUIStore } from "@/store/useUIStore";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { volumeBadgeLabel } from "@/lib/utils";
import { isBook } from "@/lib/variants";
import { PriceTag, PromoBadge } from "@/components/PriceTag";
import { LiveEditButton } from "@/components/admin/LiveEditButton";
import { useTranslation } from "@/hooks/useTranslation";

export function TrendingCarousel() {
  const { t, locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const addItem = useCartStore((state) => state.addItem);
  const { openCart, openReader } = useUIStore();
  const volumes = useStorefrontStore((state) => state.volumes);
  const trendingConfig = useStorefrontStore((state) => state.trendingConfig);
  const trendingArabicConfig = useStorefrontStore((state) => state.trendingArabicConfig);

  // Books only; figures and posters have their own home section.
  const activeVolumes = React.useMemo(
    () => volumes.filter(isBook),
    [volumes]
  );
  const autoplaySpeed = trendingConfig?.autoplaySpeed || 3800;
  const autoplayEnabled = trendingConfig?.autoplayEnabled ?? true;

  // Curated trending items dynamically populated
  // How full the rail should be. Curated picks always come first; the top-up
  // only happens when there are not enough of them to fill it.
  const MIN_TRENDING = Math.max(1, Math.min(24, trendingConfig?.minCards ?? 8));

  const trendingItems = React.useMemo(() => {
    const picked = activeVolumes.filter((v) => v.isTrending);
    // Respect the configured rail size even when dozens of products are tagged.
    if (picked.length >= MIN_TRENDING) return picked.slice(0, MIN_TRENDING);

    const chosen = new Set(picked.map((v) => v.id));
    const fillers = activeVolumes
      .filter((v) => !chosen.has(v.id))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviewCount || 0) - (a.reviewCount || 0));

    return [...picked, ...fillers].slice(0, MIN_TRENDING);
    // MIN_TRENDING comes from the curator's setting, so the rail has to be
    // rebuilt when they change how many cards it should hold.
  }, [activeVolumes, MIN_TRENDING]);

  const plugins = React.useMemo(() => {
    if (!autoplayEnabled) return [];
    return [
      Autoplay({
        delay: autoplaySpeed,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        playOnInit: true,
      }),
    ];
  }, [autoplayEnabled, autoplaySpeed]);

  // Initialize Embla Carousel with true circular infinite loop and dynamic autoplay
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      slidesToScroll: 1,
      skipSnaps: false,
      direction: isRTL ? "rtl" : "ltr",
    },
    plugins
  );

  const handlePrev = useCallback(() => {
    if (!emblaApi) return;
    emblaApi.scrollPrev();
    const autoplay = emblaApi.plugins()?.autoplay;
    if (autoplay) autoplay.reset();
  }, [emblaApi]);

  const handleNext = useCallback(() => {
    if (!emblaApi) return;
    emblaApi.scrollNext();
    const autoplay = emblaApi.plugins()?.autoplay;
    if (autoplay) autoplay.reset();
  }, [emblaApi]);

  const pointerStartPos = React.useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
  };

  // Prevent link navigation if the interaction was a swipe or drag
  const handleCardLinkClick = (e: React.MouseEvent) => {
    if (pointerStartPos.current) {
      const dx = Math.abs(e.clientX - pointerStartPos.current.x);
      const dy = Math.abs(e.clientY - pointerStartPos.current.y);
      if (dx > 8 || dy > 8) {
        e.preventDefault();
      }
    }
  };

  // Quick Add handler (stops card navigation)
  const handleQuickAdd = (e: React.MouseEvent, volume: MangaVolume) => {
    e.preventDefault();
    e.stopPropagation();
    if (volume.stock <= 0) return;
    addItem(volume, 1);
    openCart();
  };

  // Preview Reader handler (stops card navigation)
  const handlePreview = (e: React.MouseEvent, volume: MangaVolume) => {
    e.preventDefault();
    e.stopPropagation();
    openReader(volume);
  };

  return (
    <section id="trending" className="py-20 px-6 md:px-12 bg-ink border-t border-ink-border/60 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-end justify-between mb-8 pb-4 border-b border-ink-border/70">
          <div>
            <span className="text-[11px] font-mono tracking-[0.25em] text-gold uppercase block mb-1">
              {isArabic
                ? (trendingArabicConfig?.badgeText || t.trending.badgeText)
                : (trendingConfig?.badgeText || "CURATED SELECTION")}
            </span>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-paper font-sans">
                {isArabic
                  ? (trendingArabicConfig?.headline || t.trending.headline)
                  : (trendingConfig?.headline || "TRENDING NOW")}
              </h2>
              <LiveEditButton target={{ type: "trending" }} label="Edit Trending" variant="floating" size="xs" />
            </div>
          </div>

          {/* Clean Carousel Arrows */}
          <div className="flex items-center gap-2" dir="ltr">
            <button
              type="button"
              onClick={isRTL ? handleNext : handlePrev}
              className="p-2.5 rounded-sm bg-ink-surface border border-ink-border text-paper hover:border-gold hover:text-gold transition-colors active:scale-95 cursor-pointer shadow-sm"
              aria-label={isRTL ? "التالي" : "Previous volume"}
              title={isRTL ? "التالي" : "Previous volume"}
            >
              <ChevronLeft strokeWidth={1.5} className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={isRTL ? handlePrev : handleNext}
              className="p-2.5 rounded-sm bg-ink-surface border border-ink-border text-paper hover:border-gold hover:text-gold transition-colors active:scale-95 cursor-pointer shadow-sm"
              aria-label={isRTL ? "السابق" : "Next volume"}
              title={isRTL ? "السابق" : "Next volume"}
            >
              <ChevronRight strokeWidth={1.5} className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Carousel Viewport (Embla 100% flush default, RTL-aware) */}
        <div
          key={locale}
          ref={emblaRef}
          dir={isRTL ? "rtl" : "ltr"}
          className="overflow-hidden select-none cursor-grab active:cursor-grabbing pb-4"
        >
          <div className={`flex items-start lg:items-stretch ${isRTL ? "-mr-4 sm:-mr-6" : "-ml-4 sm:-ml-6"}`}>
            {trendingItems.map((volume) => (
              <div
                key={volume.id}
                className={`flex-[0_0_72%] sm:flex-[0_0_50%] md:flex-[0_0_33.333%] lg:flex-[0_0_25%] min-w-0 ${
                  isRTL ? "pr-3 sm:pr-6" : "pl-3 sm:pl-6"
                }`}
              >
                <div
                  onPointerDown={handlePointerDown}
                  className="group self-start relative bg-ink-surface/50 border border-ink-border/80 rounded-sm overflow-hidden hover:border-gold/60 transition-all duration-300 flex flex-col justify-between h-auto lg:h-full hover:shadow-2xl hover:shadow-black/70 select-none"
                >
                  <Link
                    href={`/manga/${volume.id}`}
                    prefetch="auto"
                    className="absolute inset-0 z-10 focus:outline-none"
                    aria-label={volume.title}
                    onClick={handleCardLinkClick}
                  />
                  {/* Cover Image Container */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-ink">
                    <AnimeVerseImage
                      src={volume.coverImage}
                      alt={volume.title}
                      sizes="(max-width: 639px) 64vw, (max-width: 1023px) 42vw, 25vw"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out pointer-events-none"
                    />

                    {/* Live Edit Volume Button */}
                    <LiveEditButton
                      target={{ type: "volume", volumeId: volume.id }}
                      label="Edit"
                      variant="card"
                      size="xs"
                    />

                    {/* Badges */}
                    <div className="absolute top-2.5 start-2.5 flex flex-col gap-1 z-10 pointer-events-none">
                      <PromoBadge volume={volume} isArabic={isArabic} />
                      <span className="px-2 py-0.5 rounded-xs bg-ink/90 backdrop-blur-md text-[9px] sm:text-[10px] font-mono tracking-wider text-gold border border-ink-border">
                        {volumeBadgeLabel(volume, isArabic)}
                      </span>
                      {volume.format === "Deluxe Edition" && (
                        <span className="px-2 py-0.5 rounded-xs bg-vermilion/90 text-[8px] sm:text-[9px] font-mono tracking-wider text-white">
                          {isArabic ? "فاخر" : "DELUXE"}
                        </span>
                      )}
                      {volume.stock <= 0 && (
                        <span className="px-2 py-0.5 rounded-xs bg-red-950/90 border border-red-800/80 text-[8px] sm:text-[9px] font-mono tracking-wider text-red-400 font-bold uppercase">
                          {isArabic ? "نفد" : "OUT OF STOCK"}
                        </span>
                      )}
                    </div>

                    {/* Quick Add and Preview Overlay on Hover & Touch */}
                    <div className="absolute inset-x-2.5 sm:inset-x-3 bottom-2.5 sm:bottom-3 flex gap-1.5 sm:gap-2 sm:opacity-0 sm:translate-y-2 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 transition-all duration-300 z-20">
                      {volume.stock <= 0 ? (
                        <button
                          type="button"
                          disabled
                          className="flex-1 py-2 sm:py-2.5 bg-ink-surface/90 text-text-muted font-bold text-[9px] sm:text-[10px] tracking-[0.14em] uppercase rounded-sm border border-ink-border cursor-not-allowed flex items-center justify-center gap-1 shadow-lg opacity-90 whitespace-nowrap shrink-0"
                        >
                          {isArabic ? "نفد" : "OUT OF STOCK"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleQuickAdd(e, volume)}
                          className="flex-1 py-2 sm:py-2.5 bg-paper text-ink font-bold text-[10px] sm:text-[11px] tracking-[0.14em] uppercase rounded-sm hover:bg-vermilion hover:text-white transition-colors flex items-center justify-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                        >
                          <Plus strokeWidth={1.5} className="w-3.5 h-3.5" />
                          {isArabic ? "إضافة" : "QUICK ADD"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handlePreview(e, volume)}
                        className="p-2 sm:p-2.5 bg-ink/90 backdrop-blur-md border border-ink-border text-paper hover:text-gold hover:border-gold transition-colors rounded-sm active:scale-95 cursor-pointer shrink-0"
                        title={isArabic ? "قراءة عينة" : "Read Sample (RTL)"}
                      >
                        <Eye strokeWidth={1.4} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Volume Info */}
                  <div className="p-3 sm:p-4 flex flex-col justify-between flex-1">
                    <div>
                      <span className="text-[9px] sm:text-[10px] font-mono tracking-widest text-text-muted uppercase block truncate">
                        {volume.seriesTitle}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-paper tracking-wide group-hover:text-gold transition-colors line-clamp-1 mt-1 block">
                        {volume.title}
                      </h3>
                    </div>

                    <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-ink-border/50 flex items-center justify-between font-mono text-xs">
                      <PriceTag volume={volume} isArabic={isArabic} />
                      <div className="flex items-center gap-1 text-paper-muted shrink-0 text-[11px] sm:text-xs">
                        <Star strokeWidth={1.5} className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gold fill-gold" />
                        <span>{volume.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
