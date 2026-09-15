"use client";

import { PriceTag, PromoBadge } from "@/components/PriceTag";
import React, { useCallback } from "react";
import { AnimeVerseImage } from "@/components/AnimeVerseImage";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, ShoppingBag, Layers } from "lucide-react";
import { MangaVolume } from "@/data/manga";
import { useCartStore } from "@/store/useCartStore";
import { useUIStore } from "@/store/useUIStore";
import { useStorefrontStore } from "@/store/useStorefrontStore";

import { LiveEditButton } from "@/components/admin/LiveEditButton";
import { useTranslation } from "@/hooks/useTranslation";
import { StarRating } from "@/components/StarRating";

/**
 * Box set showcase — the same looping carousel as Trending Now, restricted to
 * complete-collection products.
 *
 * A box set is priced against the sum of its volumes, so the saving is the
 * point of the card: every tile leads with the discount rather than burying it.
 */
export function BoxSets() {
  const { locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const addItem = useCartStore((state) => state.addItem);
  const { openCart } = useUIStore();
  const volumes = useStorefrontStore((state) => state.volumes);
  const boxSetsConfig = useStorefrontStore((state) => state.boxSetsConfig);
  const boxSetsArabicConfig = useStorefrontStore((state) => state.boxSetsArabicConfig);

  const activeVolumes = volumes;
  const autoplaySpeed = boxSetsConfig?.autoplaySpeed || 4200;
  const autoplayEnabled = boxSetsConfig?.autoplayEnabled ?? true;

  const boxSets = React.useMemo(
    () => activeVolumes.filter((v) => v.format === "Box Set"),
    [activeVolumes]
  );

  const plugins = React.useMemo(() => {
    // Looping a single slide just jitters it in place.
    if (!autoplayEnabled || boxSets.length < 2) return [];
    return [
      Autoplay({
        delay: autoplaySpeed,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        playOnInit: true,
      }),
    ];
  }, [autoplayEnabled, autoplaySpeed, boxSets.length]);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: boxSets.length > 1,
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

  const handleQuickAdd = (e: React.MouseEvent, volume: MangaVolume) => {
    e.preventDefault();
    e.stopPropagation();
    if (volume.stock <= 0) return;
    addItem(volume, 1);
    openCart();
  };

  // Nothing to show until a box set exists in the catalogue.
  if (boxSets.length === 0) return null;

  return (
    <section
      id="box-sets"
      className="py-20 px-6 md:px-12 bg-ink border-t border-ink-border/60 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-end justify-between mb-8 pb-4 border-b border-ink-border/70">
          <div>
            <span className="text-[11px] font-mono tracking-[0.25em] text-gold uppercase block mb-1">
              {isArabic
                ? boxSetsArabicConfig?.badgeText || "المجموعات الكاملة"
                : boxSetsConfig?.badgeText || "COMPLETE COLLECTIONS"}
            </span>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-paper font-sans">
                {isArabic
                  ? boxSetsArabicConfig?.headline || "طقم المجموعة الكاملة"
                  : boxSetsConfig?.headline || "BOX SETS"}
              </h2>
              <LiveEditButton target={{ type: "box-sets" }} label="Edit Box Sets" variant="floating" size="xs" />
            </div>
          </div>

          {/* Arrows are pointless with a single slide. */}
          {boxSets.length > 1 && (
            <div className="flex items-center gap-2" dir="ltr">
              <button
                type="button"
                onClick={isRTL ? handleNext : handlePrev}
                className="p-2.5 rounded-sm bg-ink-surface border border-ink-border text-paper hover:border-gold hover:text-gold transition-colors active:scale-95 cursor-pointer shadow-sm"
                aria-label={isRTL ? "التالي" : "Previous box set"}
                title={isRTL ? "التالي" : "Previous box set"}
              >
                <ChevronLeft strokeWidth={1.5} className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={isRTL ? handlePrev : handleNext}
                className="p-2.5 rounded-sm bg-ink-surface border border-ink-border text-paper hover:border-gold hover:text-gold transition-colors active:scale-95 cursor-pointer shadow-sm"
                aria-label={isRTL ? "السابق" : "Next box set"}
                title={isRTL ? "السابق" : "Next box set"}
              >
                <ChevronRight strokeWidth={1.5} className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Carousel Viewport (Embla 100% flush default, RTL-aware) */}
        <div
          key={locale}
          ref={emblaRef}
          dir={isRTL ? "rtl" : "ltr"}
          className="overflow-hidden select-none cursor-grab active:cursor-grabbing pb-4"
        >
          <div className={`flex ${isRTL ? "-mr-4 sm:-mr-6" : "-ml-4 sm:-ml-6"}`}>
            {boxSets.map((volume) => {
              const hasDiscount = Boolean(volume.originalPrice && volume.originalPrice > volume.price);
              const savedPercent = hasDiscount
                ? Math.round((1 - volume.price / (volume.originalPrice as number)) * 100)
                : 0;

              return (
                <div
                  key={volume.id}
                  className={`flex-[0_0_72%] sm:flex-[0_0_50%] md:flex-[0_0_33.333%] lg:flex-[0_0_25%] min-w-0 ${
                    isRTL ? "pr-3 sm:pr-6" : "pl-3 sm:pl-6"
                  }`}
                >
                  <div
                    onPointerDown={handlePointerDown}
                    className="group relative bg-ink-surface/50 border border-ink-border/80 rounded-sm overflow-hidden hover:border-gold/60 transition-all duration-300 flex flex-col justify-between h-full hover:shadow-2xl hover:shadow-black/70 select-none"
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

                      <LiveEditButton
                        target={{ type: "volume", volumeId: volume.id }}
                        label="Edit"
                        variant="card"
                        size="xs"
                      />

                      {/* Badges */}
                      <div className="absolute top-2.5 start-2.5 flex flex-col gap-1 z-10 pointer-events-none">
                        <PromoBadge volume={volume} isArabic={isArabic} />
                        <span className="px-2 py-0.5 rounded-xs bg-gold/90 text-[9px] sm:text-[10px] font-mono font-bold tracking-wider text-ink flex items-center gap-1">
                          <Layers strokeWidth={2} className="w-2.5 h-2.5" />
                          {isArabic ? "طقم كامل" : "BOX SET"}
                        </span>
                        {hasDiscount && (
                          <span className="px-2 py-0.5 rounded-xs bg-vermilion/90 text-[8px] sm:text-[9px] font-mono font-bold tracking-wider text-white">
                            {isArabic ? `وفّر ${savedPercent}%` : `SAVE ${savedPercent}%`}
                          </span>
                        )}
                        {volume.stock <= 0 && (
                          <span className="px-2 py-0.5 rounded-xs bg-red-950/90 border border-red-800/80 text-[8px] sm:text-[9px] font-mono tracking-wider text-red-400 font-bold uppercase">
                            {isArabic ? "نفد" : "OUT OF STOCK"}
                          </span>
                        )}
                      </div>

                    </div>

                    {/* Card Meta & Action — matches the New Releases grid above */}
                    <div className="p-4 flex flex-col justify-between flex-1">
                      <div>
                        <span className="text-[10px] font-mono tracking-widest text-gold uppercase block">
                          {volume.seriesTitle}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-paper tracking-wide group-hover:text-gold transition-colors line-clamp-1 mt-1 block">
                          {volume.title}
                        </h3>

                        {/* Rating Stars */}
                        <div className="flex items-center gap-1 mt-2 text-[11px] font-mono text-text-muted">
                          <StarRating value={volume.rating} size="xs" />
                          <span className="ml-1 text-paper font-semibold">{volume.rating.toFixed(1)}</span>
                        </div>
                      </div>

                      {/* Price and Cart Button */}
                      <div className="mt-5 pt-3 border-t border-ink-border/50 flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5">
                        <PriceTag volume={volume} isArabic={isArabic} />
                        {volume.stock <= 0 ? (
                          <button
                            type="button"
                            disabled
                            className="grow basis-auto px-3 py-2 bg-ink-surface/90 border border-ink-border text-text-muted text-[9px] font-mono font-bold tracking-widest uppercase rounded-sm cursor-not-allowed opacity-80 whitespace-nowrap"
                          >
                            {isArabic ? "نفد من المخزن" : "OUT OF STOCK"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleQuickAdd(e, volume)}
                            className="grow basis-auto px-3 py-2 bg-ink-elevated border border-ink-border hover:border-vermilion hover:bg-vermilion hover:text-white text-paper text-[10px] font-mono font-bold tracking-wider uppercase transition-all rounded-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-95 z-20 whitespace-nowrap"
                          >
                            <ShoppingBag strokeWidth={1.3} className="w-3 h-3" />
                            {isArabic ? "أضف للسلة" : "ADD TO CART"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
