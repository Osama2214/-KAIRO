"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, Star, Plus, Eye } from "lucide-react";
import { ALL_VOLUMES, MangaVolume } from "@/data/manga";
import { useCartStore } from "@/store/useCartStore";
import { useUIStore } from "@/store/useUIStore";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { formatPrice } from "@/lib/utils";
import { LiveEditButton } from "@/components/admin/LiveEditButton";

export function TrendingCarousel() {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const { openCart, openReader } = useUIStore();
  const volumes = useStorefrontStore((state) => state.volumes);

  const activeVolumes = volumes && volumes.length > 0 ? volumes : ALL_VOLUMES;

  // Curated trending items dynamically populated
  const trendingItems = React.useMemo(() => {
    const items = activeVolumes.filter((v) => v.isTrending);
    return items.length >= 4 ? items : activeVolumes.slice(0, 8);
  }, [activeVolumes]);

  // Initialize Embla Carousel with true circular infinite loop and official track padding
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      slidesToScroll: 1,
      skipSnaps: false,
    },
    [
      Autoplay({
        delay: 3800,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        playOnInit: true,
      }),
    ]
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

  // Navigate only if the interaction was a clean click, not a swipe or drag
  const handleCardClick = (e: React.MouseEvent, volumeId: string) => {
    if (pointerStartPos.current) {
      const dx = Math.abs(e.clientX - pointerStartPos.current.x);
      const dy = Math.abs(e.clientY - pointerStartPos.current.y);
      if (dx > 8 || dy > 8) return;
    }
    router.push(`/manga/${volumeId}`);
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
              CURATED SELECTION
            </span>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-paper font-sans">
                TRENDING NOW
              </h2>
              <LiveEditButton target={{ type: "collection" }} label="Edit Section" variant="floating" size="xs" />
            </div>
          </div>

          {/* Clean Carousel Arrows */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className="p-2.5 rounded-sm bg-ink-surface border border-ink-border text-paper hover:border-gold hover:text-gold transition-colors active:scale-95 cursor-pointer shadow-sm"
              aria-label="Previous volume"
            >
              <ChevronLeft strokeWidth={1.5} className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-2.5 rounded-sm bg-ink-surface border border-ink-border text-paper hover:border-gold hover:text-gold transition-colors active:scale-95 cursor-pointer shadow-sm"
              aria-label="Next volume"
            >
              <ChevronRight strokeWidth={1.5} className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Carousel Viewport (Embla 100% flush left default, no cutoff, drag-safe) */}
        <div
          ref={emblaRef}
          className="overflow-hidden select-none cursor-grab active:cursor-grabbing pb-4"
        >
          <div className="flex -ml-4 sm:-ml-6">
            {trendingItems.map((volume) => (
              <div
                key={volume.id}
                className="flex-[0_0_80%] sm:flex-[0_0_50%] md:flex-[0_0_33.333%] lg:flex-[0_0_25%] min-w-0 pl-4 sm:pl-6"
              >
                <div
                  onPointerDown={handlePointerDown}
                  onClick={(e) => handleCardClick(e, volume.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/manga/${volume.id}`);
                    }
                  }}
                  className="group relative bg-ink-surface/50 border border-ink-border/80 rounded-sm overflow-hidden hover:border-gold/60 transition-all duration-300 flex flex-col justify-between h-full cursor-pointer hover:shadow-2xl hover:shadow-black/70"
                >
                  {/* Cover Image Container */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-ink">
                    <img
                      src={volume.coverImage}
                      alt={volume.title}
                      draggable={false}
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
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
                      <span className="px-2 py-0.5 rounded-xs bg-ink/90 backdrop-blur-md text-[10px] font-mono tracking-wider text-gold border border-ink-border">
                        VOL. {volume.volumeNumber < 10 ? `0${volume.volumeNumber}` : volume.volumeNumber}
                      </span>
                      {volume.format === "Deluxe Edition" && (
                        <span className="px-2 py-0.5 rounded-xs bg-vermilion/90 text-[9px] font-mono tracking-wider text-white">
                          DELUXE
                        </span>
                      )}
                      {volume.stock <= 0 && (
                        <span className="px-2 py-0.5 rounded-xs bg-red-950/90 border border-red-800/80 text-[9px] font-mono tracking-wider text-red-400 font-bold uppercase">
                          OUT OF STOCK
                        </span>
                      )}
                    </div>

                    {/* Quick Add and Preview Overlay on Hover */}
                    <div className="absolute inset-x-3 bottom-3 flex gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-20">
                      {volume.stock <= 0 ? (
                        <button
                          type="button"
                          disabled
                          className="flex-1 py-2.5 bg-ink-surface/90 text-text-muted font-bold text-[10px] tracking-[0.16em] uppercase rounded-sm border border-ink-border cursor-not-allowed flex items-center justify-center gap-1.5 shadow-lg opacity-90"
                        >
                          OUT OF STOCK
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleQuickAdd(e, volume)}
                          className="flex-1 py-2.5 bg-paper text-ink font-bold text-[11px] tracking-[0.16em] uppercase rounded-sm hover:bg-vermilion hover:text-white transition-colors flex items-center justify-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                        >
                          <Plus strokeWidth={1.5} className="w-3.5 h-3.5" />
                          QUICK ADD
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handlePreview(e, volume)}
                        className="p-2.5 bg-ink/90 backdrop-blur-md border border-ink-border text-paper hover:text-gold hover:border-gold transition-colors rounded-sm active:scale-95 cursor-pointer"
                        title="Read Sample (RTL)"
                      >
                        <Eye strokeWidth={1.4} className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Volume Info */}
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <span className="text-[10px] font-mono tracking-widest text-text-muted uppercase block truncate">
                        {volume.seriesTitle}
                      </span>
                      <h3 className="text-sm font-bold text-paper tracking-wide group-hover:text-gold transition-colors line-clamp-1 mt-1 block">
                        {volume.title}
                      </h3>
                    </div>

                    <div className="mt-4 pt-3 border-t border-ink-border/50 flex items-center justify-between font-mono text-xs">
                      <span className="text-paper font-bold tracking-wide">{formatPrice(volume.price)}</span>
                      <div className="flex items-center gap-1 text-paper-muted shrink-0">
                        <Star strokeWidth={1.5} className="w-3.5 h-3.5 text-gold fill-gold" />
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
