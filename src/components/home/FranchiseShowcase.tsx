"use client";

import React, { useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimeVerseImage } from "@/components/AnimeVerseImage";
import { LiveEditButton } from "@/components/admin/LiveEditButton";
import { resolveHomeExtras, useStorefrontStore } from "@/store/useStorefrontStore";
import { useTranslation } from "@/hooks/useTranslation";
import { buildFranchises } from "@/lib/franchise";

/**
 * One card per anime/manga: its books and its figures and posters together,
 * in a single sliding row that works like Trending Now. A series card opens
 * the series page (which lists its merchandise too); a franchise with only
 * merchandise opens the shop filtered to it. The curator can give each
 * franchise its own card artwork; otherwise the series' card image, then its
 * banner, is used.
 */
export function FranchiseShowcase() {
  const router = useRouter();
  const { locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const volumes = useStorefrontStore((state) => state.volumes);
  const series = useStorefrontStore((state) => state.series);
  const trendingConfig = useStorefrontStore((state) => state.trendingConfig);
  const settings = resolveHomeExtras(useStorefrontStore((state) => state.homeExtrasConfig)).franchises;
  const cardImages = settings.cardImages;

  const franchises = useMemo(() => {
    const custom = new Map((cardImages || []).filter((c) => c?.key && c.image).map((c) => [c.key, c.image]));
    return buildFranchises(volumes, series)
      .map((f) => ({ ...f, image: custom.get(f.key) || f.image }))
      .filter((f) => f.image);
  }, [volumes, series, cardImages]);

  // Same pace as the Trending rail, so the two rows feel like one design.
  const autoplaySpeed = trendingConfig?.autoplaySpeed || 3800;
  const autoplayEnabled = trendingConfig?.autoplayEnabled ?? true;
  const plugins = useMemo(
    () => (autoplayEnabled ? [Autoplay({ delay: autoplaySpeed, stopOnInteraction: false, stopOnMouseEnter: true, playOnInit: true })] : []),
    [autoplayEnabled, autoplaySpeed]
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", slidesToScroll: 1, skipSnaps: false, direction: isRTL ? "rtl" : "ltr" },
    plugins
  );

  const handlePrev = useCallback(() => {
    if (!emblaApi) return;
    emblaApi.scrollPrev();
    emblaApi.plugins()?.autoplay?.reset();
  }, [emblaApi]);
  const handleNext = useCallback(() => {
    if (!emblaApi) return;
    emblaApi.scrollNext();
    emblaApi.plugins()?.autoplay?.reset();
  }, [emblaApi]);

  // Navigate only on a clean click, not at the end of a swipe.
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const open = (e: React.MouseEvent, href: string) => {
    if (pointerStart.current) {
      const dx = Math.abs(e.clientX - pointerStart.current.x);
      const dy = Math.abs(e.clientY - pointerStart.current.y);
      if (dx > 8 || dy > 8) return;
    }
    router.push(href);
  };

  // Rendered on the server too, so the page does not grow after load.
  if (!settings.enabled || franchises.length === 0) return null;

  return (
    <section id="franchises" className="py-20 px-6 md:px-12 bg-ink border-t border-ink-border/60 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-8 pb-4 border-b border-ink-border/70">
          <div>
            <span className="text-[11px] font-mono tracking-[0.25em] text-gold uppercase block mb-1">
              {isArabic ? settings.badgeTextAr : settings.badgeText}
            </span>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-paper font-sans">
                {isArabic ? settings.headlineAr : settings.headline}
              </h2>
              <LiveEditButton
                target={{ type: "home-extras", section: "franchises" }}
                label={isArabic ? "تعديل القسم" : "Edit Section"}
                variant="floating"
                size="xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2" dir="ltr">
            <button
              type="button"
              onClick={isRTL ? handleNext : handlePrev}
              className="p-2.5 rounded-sm bg-ink-surface border border-ink-border text-paper hover:border-gold hover:text-gold transition-colors active:scale-95 cursor-pointer shadow-sm"
              aria-label={isRTL ? "التالي" : "Previous"}
            >
              <ChevronLeft strokeWidth={1.5} className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={isRTL ? handlePrev : handleNext}
              className="p-2.5 rounded-sm bg-ink-surface border border-ink-border text-paper hover:border-gold hover:text-gold transition-colors active:scale-95 cursor-pointer shadow-sm"
              aria-label={isRTL ? "السابق" : "Next"}
            >
              <ChevronRight strokeWidth={1.5} className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          key={locale}
          ref={emblaRef}
          dir={isRTL ? "rtl" : "ltr"}
          className="overflow-hidden select-none cursor-grab active:cursor-grabbing pb-4"
        >
          <div className={`flex ${isRTL ? "-mr-4 sm:-mr-6" : "-ml-4 sm:-ml-6"}`}>
            {franchises.map((f) => {
              const counts = [
                f.bookCount > 0 && (isArabic ? `${f.bookCount} مجلد` : `${f.bookCount} ${f.bookCount === 1 ? "VOLUME" : "VOLUMES"}`),
                f.merchCount > 0 && (isArabic ? `${f.merchCount} منتج` : `${f.merchCount} ${f.merchCount === 1 ? "ITEM" : "ITEMS"}`),
              ].filter(Boolean);
              return (
                <div
                  key={f.key}
                  className={`flex-[0_0_72%] sm:flex-[0_0_50%] md:flex-[0_0_33.333%] lg:flex-[0_0_25%] min-w-0 ${isRTL ? "pr-3 sm:pr-6" : "pl-3 sm:pl-6"}`}
                >
                  <div
                    onPointerDown={(e) => (pointerStart.current = { x: e.clientX, y: e.clientY })}
                    onClick={(e) => open(e, f.href)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(f.href);
                      }
                    }}
                    className="group relative block aspect-[4/5] overflow-hidden rounded-sm border border-ink-border/80 bg-ink-surface/40 hover:border-gold/60 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-black/70"
                  >
                    <AnimeVerseImage
                      src={f.image}
                      alt={f.name}
                      sizes="(max-width: 639px) 64vw, (max-width: 1023px) 42vw, 25vw"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
                    {f.comingSoon && (
                      <span className="absolute top-3 start-3 px-2 py-1 rounded-xs bg-gold/15 border border-gold/70 text-[9px] font-mono font-bold tracking-[0.16em] text-gold uppercase">
                        {isArabic ? "قريبًا" : "COMING SOON"}
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 pointer-events-none">
                      <h3 className="text-base sm:text-xl font-extrabold uppercase tracking-tight text-paper font-sans line-clamp-2">
                        {isArabic && f.nameAr ? f.nameAr : f.name}
                      </h3>
                      <p className="mt-1 text-[9px] sm:text-[10px] font-mono tracking-[0.2em] text-gold uppercase">{counts.join(" · ")}</p>
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
