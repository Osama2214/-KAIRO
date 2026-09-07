"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { GENRES } from "@/data/manga";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { useMounted } from "@/store/useWishlistStore";
import { LiveEditButton } from "@/components/admin/LiveEditButton";
import { useTranslation } from "@/hooks/useTranslation";

export function GenreBento() {
  const mounted = useMounted();
  const { t, locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const storeGenres = useStorefrontStore((state) => state.genres);
  const genreBentoConfig = useStorefrontStore((state) => state.genreBentoConfig);
  const genreBentoArabicConfig = useStorefrontStore((state) => state.genreBentoArabicConfig);

  const genres = mounted && storeGenres && storeGenres.length > 0 ? storeGenres : GENRES;
  const badgeText = isArabic
    ? (mounted && genreBentoArabicConfig?.badgeText ? genreBentoArabicConfig.badgeText : t.bento.badgeText)
    : (mounted && genreBentoConfig?.badgeText ? genreBentoConfig.badgeText : "CATEGORY DIRECTORY");
  const title = isArabic
    ? (mounted && genreBentoArabicConfig?.title ? genreBentoArabicConfig.title : t.bento.title)
    : (mounted && genreBentoConfig?.title ? genreBentoConfig.title : "EXPLORE YOUR GENRE");
  const rawDesc = isArabic
    ? (mounted && genreBentoArabicConfig?.description ? genreBentoArabicConfig.description : t.bento.description)
    : (mounted && genreBentoConfig?.description ? genreBentoConfig.description : "Curated reading lists across 9 canonical categories.");
  const description =
    rawDesc === "Navigate through 9 core canonical categories with specialized curated reading lists."
      ? "Curated reading lists across 9 canonical categories."
      : rawDesc;

  return (
    <section id="genres" className="py-24 px-6 md:px-12 bg-ink border-t border-ink-border/60 relative">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="mb-14 pb-4 border-b border-ink-border/70 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono tracking-[0.25em] text-gold uppercase block mb-1">
              {badgeText}
            </span>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-paper font-sans">
                {title}
              </h2>
              <LiveEditButton target={{ type: "genre-bento" }} label="Edit Genres" variant="floating" size="xs" />
            </div>
          </div>
          <p className="text-xs text-text-muted font-mono max-w-sm">
            {description}
          </p>
        </div>

        {/* 3x3 Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {genres.map((genre) => (
            <Link
              key={genre.id}
              href={`/manga?genre=${genre.id}`}
              className="group relative h-56 sm:h-72 rounded-sm overflow-hidden border border-ink-border/70 hover:border-gold/60 transition-all duration-500 flex flex-col justify-end p-4 sm:p-6 bg-ink-surface active:scale-[0.99]"
            >
              {/* Artwork Background with Zoom on Hover */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={genre.coverImage}
                  alt={genre.name}
                  className="w-full h-full object-cover opacity-35 group-hover:opacity-55 group-hover:scale-110 transition-all duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-linear-to-t from-ink via-ink/60 to-transparent" />
              </div>

              {/* Live Edit Category Button */}
              <LiveEditButton
                target={{ type: "genre-card", genreId: genre.id }}
                label="Edit Category"
                variant="card"
                size="xs"
              />

              {/* Top-Right Arrow Action Badge */}
              <div className={`absolute top-3.5 sm:top-4.5 ${isRTL ? "left-3.5 sm:left-4.5" : "right-3.5 sm:right-4.5"} z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-sm bg-ink/80 backdrop-blur-md border border-ink-border flex items-center justify-center text-paper-muted group-hover:text-gold group-hover:border-gold transition-all duration-300 shadow-md`}>
                <ArrowUpRight strokeWidth={1.5} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRTL ? "-scale-x-100" : ""}`} />
              </div>

              {/* Japanese Kanji Background Watermark */}
              <div className={`absolute top-3 sm:top-4 ${isRTL ? "left-12 sm:left-15" : "right-12 sm:right-15"} font-serif text-4xl sm:text-5xl font-bold text-white/[0.07] group-hover:text-gold/20 transition-colors pointer-events-none select-none z-0`}>
                {genre.japanese}
              </div>

              {/* Card Foreground Content */}
              <div className="relative z-10 space-y-1.5 sm:space-y-2 transform transition-transform duration-300 group-hover:-translate-y-1">
                <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.2em] text-gold uppercase block">
                  {genre.japanese}
                </span>

                <h3 className="text-lg sm:text-xl font-bold text-paper tracking-wider uppercase font-sans group-hover:text-gold transition-colors">
                  {genre.name}
                </h3>

                <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                  {genre.description}
                </p>

                <div className="pt-1 sm:pt-2 flex items-center gap-2 text-[9px] sm:text-[10px] font-mono text-paper-muted">
                  <span className="text-gold">{isArabic ? "العمل المرجعي:" : "CANONICAL:"}</span>
                  <span className="truncate">{genre.popularTitle}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
