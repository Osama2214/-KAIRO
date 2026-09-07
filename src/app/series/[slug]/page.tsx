"use client";

import React, { use } from "react";
import { notFound, useRouter } from "next/navigation";
import {
  Star,
  BookOpen,
  Plus,
  Eye,
  User,
  Heart,
} from "lucide-react";
import { ALL_SERIES, ALL_VOLUMES } from "@/data/manga";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore, useMounted } from "@/store/useWishlistStore";
import { useUIStore } from "@/store/useUIStore";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { formatPrice } from "@/lib/utils";
import { LiveEditButton } from "@/components/admin/LiveEditButton";

interface SeriesPageProps {
  params: Promise<{ slug: string }>;
}

export default function SeriesPage({ params }: SeriesPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);

  const allSeries = useStorefrontStore((state) => state.series);
  const allVolumes = useStorefrontStore((state) => state.volumes);

  const seriesList = allSeries && allSeries.length > 0 ? allSeries : ALL_SERIES;
  const activeVolumes = allVolumes && allVolumes.length > 0 ? allVolumes : ALL_VOLUMES;

  const series = seriesList.find((s) => s.slug === resolvedParams.slug);

  if (!series) {
    notFound();
  }

  const seriesVolumes = activeVolumes.filter((v) => v.seriesSlug === series.slug);
  const addItem = useCartStore((state) => state.addItem);
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const mounted = useMounted();
  const { openCart, openReader } = useUIStore();

  const handleCardClick = (volumeId: string) => {
    router.push(`/manga/${volumeId}`);
  };

  const handleAddAllVolumes = () => {
    const inStockVolumes = seriesVolumes.filter((v) => v.stock > 0);
    if (inStockVolumes.length === 0) return;
    inStockVolumes.forEach((volume) => {
      addItem(volume, 1);
    });
    openCart();
  };

  return (
    <div className="min-h-screen bg-ink text-paper">
      {/* Series Hero Banner */}
      <div className="relative h-[65vh] min-h-[440px] flex items-end overflow-hidden border-b border-ink-border/80">
        {/* Banner Media */}
        <div className="absolute inset-0">
          <img
            src={series.bannerImage}
            alt={series.title}
            className="w-full h-full object-cover object-center filter brightness-50"
          />
          <div className="absolute inset-0 bg-linear-to- from-ink via-ink/60 to-transparent" />
        </div>

        {/* Japanese Title Watermark */}
        <div className="absolute top-20 right-10 font-serif text-8xl md:text-9xl font-bold text-white/[0.04] pointer-events-none select-none">
          {series.japaneseTitle}
        </div>

        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto w-full px-6 md:px-12 pb-12 z-10 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-xs bg-vermilion/90 text-white font-mono text-[10px] tracking-widest uppercase">
                {series.status}
              </span>
              <span className="text-xs font-serif text-gold tracking-widest">
                {series.japaneseTitle}
              </span>
            </div>
            <LiveEditButton
              target={{ type: "series", seriesSlug: series.slug }}
              label="Edit Series"
              variant="floating"
              size="sm"
            />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight uppercase font-sans">
            {series.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-paper-muted">
            <div className="flex items-center gap-1.5">
              <User strokeWidth={1.4} className="w-4 h-4 text-gold" />
              <span>Written & Illustrated by {series.author}</span>
            </div>
            <div className="flex items-center gap-1 text-gold">
              {[...Array(5)].map((_, i) => (
                <Star key={i} strokeWidth={1} className="w-3.5 h-3.5 fill-gold text-gold" />
              ))}
              <span className="text-paper font-semibold ml-1">4.9 / 5.0</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen strokeWidth={1.4} className="w-4 h-4 text-gold" />
              <span>{series.totalVolumes} Total Volumes</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-text-muted max-w-2xl leading-relaxed">
            {series.description}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <a
              href="#volumes"
              className="px-8 py-3.5 bg-paper text-ink font-bold text-xs tracking-[0.2em] uppercase rounded-sm hover:bg-vermilion hover:text-white transition-colors"
            >
              EXPLORE VOLUMES
            </a>
            <button
              onClick={handleAddAllVolumes}
              className="px-6 py-3.5 bg-ink-surface border border-ink-border text-paper font-semibold text-xs tracking-[0.2em] uppercase rounded-sm hover:border-gold hover:text-gold transition-colors"
            >
              ADD ENTIRE SERIES TO CART
            </button>
          </div>
        </div>
      </div>

      {/* Volumes Section */}
      <section id="volumes" className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="mb-12 pb-4 border-b border-ink-border/70 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono tracking-[0.25em] text-gold uppercase block mb-1">
              CHRONOLOGICAL CANON
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-paper font-sans">
              AVAILABLE VOLUMES
            </h2>
          </div>
          <span className="text-xs font-mono text-text-muted">
            {seriesVolumes.length} Volumes in Archive
          </span>
        </div>

        {/* Volumes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {seriesVolumes.map((volume) => (
            <div
              key={volume.id}
              onClick={() => handleCardClick(volume.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCardClick(volume.id);
                }
              }}
              className="group bg-ink-surface/40 border border-ink-border/70 rounded-sm overflow-hidden hover:border-gold/60 transition-all duration-300 flex flex-col justify-between cursor-pointer hover:shadow-xl hover:shadow-black/50 select-none"
            >
              {/* Media */}
              <div className="relative aspect-[3/4] overflow-hidden bg-ink">
                <img
                  src={volume.coverImage}
                  alt={volume.title}
                  draggable={false}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                />

                {/* Live Edit Volume Button */}
                <LiveEditButton
                  target={{ type: "volume", volumeId: volume.id }}
                  label="Edit"
                  variant="card"
                  size="xs"
                />
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none z-10">
                  <span className="px-2 py-0.5 rounded-xs bg-ink/90 backdrop-blur-md text-[9px] font-mono tracking-wider text-gold border border-ink-border">
                    VOL. {volume.volumeNumber < 10 ? `0${volume.volumeNumber}` : volume.volumeNumber}
                  </span>
                  {volume.stock <= 0 && (
                    <span className="px-2 py-0.5 rounded-xs bg-red-950/90 border border-red-800/80 text-[8px] font-mono font-bold tracking-wider text-red-400 uppercase">
                      OUT OF STOCK
                    </span>
                  )}
                </div>
                <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleWishlist(volume);
                    }}
                    className={`p-1.5 rounded-xs backdrop-blur-md border transition-all active:scale-90 ${
                      mounted && isInWishlist(volume.id)
                        ? "bg-ink/90 border-vermilion text-vermilion"
                        : "bg-ink/80 border-ink-border text-paper-muted hover:text-gold hover:border-gold/60 opacity-0 group-hover:opacity-100"
                    }`}
                    title={mounted && isInWishlist(volume.id) ? "Saved in Wishlist" : "Save to Wishlist"}
                    aria-label="Wishlist"
                  >
                    <Heart
                      strokeWidth={1.4}
                      className={`w-3.5 h-3.5 transition-transform ${
                        mounted && isInWishlist(volume.id) ? "fill-vermilion text-vermilion scale-110" : ""
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openReader(volume);
                    }}
                    className="p-1.5 rounded-xs bg-ink/80 backdrop-blur-md border border-ink-border text-paper-muted hover:text-gold hover:border-gold transition-colors opacity-0 group-hover:opacity-100 active:scale-95"
                    title="Read Sample (RTL)"
                  >
                    <Eye strokeWidth={1.4} className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Meta */}
              <div className="p-4 flex flex-col justify-between flex-1">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-paper tracking-wide group-hover:text-gold transition-colors line-clamp-1">
                    Vol. {volume.volumeNumber} — {volume.title}
                  </h4>
                  <p className="text-[10px] text-text-muted mt-1 font-mono">
                    {volume.pages} pages • {volume.format}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-ink-border/50 flex items-center justify-between font-mono text-xs">
                  <span className="text-paper font-bold">{formatPrice(volume.price)}</span>
                  {volume.stock <= 0 ? (
                    <span className="px-2.5 py-1 bg-ink-surface/90 border border-ink-border text-text-muted text-[9px] font-mono font-bold uppercase rounded-xs cursor-not-allowed opacity-80">
                      OUT OF STOCK
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addItem(volume, 1);
                        openCart();
                      }}
                      className="px-3 py-1.5 bg-paper text-ink hover:bg-vermilion hover:text-white font-bold text-[10px] uppercase transition-colors rounded-xs flex items-center gap-1 z-10 active:scale-95"
                    >
                      <Plus strokeWidth={1.5} className="w-3 h-3" />
                      ADD
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
