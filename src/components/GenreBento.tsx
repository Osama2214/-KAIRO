"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { GENRES } from "@/data/manga";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { useMounted } from "@/store/useWishlistStore";
import { LiveEditButton } from "@/components/admin/LiveEditButton";

export function GenreBento() {
  const mounted = useMounted();
  const storeGenres = useStorefrontStore((state) => state.genres);
  const genreBentoConfig = useStorefrontStore((state) => state.genreBentoConfig);

  const genres = mounted && storeGenres && storeGenres.length > 0 ? storeGenres : GENRES;
  const badgeText = mounted && genreBentoConfig?.badgeText ? genreBentoConfig.badgeText : "CATEGORY DIRECTORY";
  const title = mounted && genreBentoConfig?.title ? genreBentoConfig.title : "EXPLORE YOUR GENRE";
  const rawDesc = mounted && genreBentoConfig?.description ? genreBentoConfig.description : "Curated reading lists across 9 canonical categories.";
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {genres.map((genre) => (
            <Link
              key={genre.id}
              href={`/manga?genre=${genre.id}`}
              className="group relative h-64 sm:h-72 rounded-sm overflow-hidden border border-ink-border/70 hover:border-gold/60 transition-all duration-500 flex flex-col justify-end p-6 bg-ink-surface"
            >
              {/* Artwork Background with Zoom on Hover */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={genre.coverImage}
                  alt={genre.name}
                  className="w-full h-full object-cover opacity-35 group-hover:opacity-55 group-hover:scale-110 transition-all duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-linear-to- from-ink via-ink/60 to-transparent" />
              </div>

              {/* Top-Right Arrow Action Badge */}
              <div className="absolute top-4.5 right-4.5 z-20 w-8 h-8 rounded-sm bg-ink/80 backdrop-blur-md border border-ink-border flex items-center justify-center text-paper-muted group-hover:text-gold group-hover:border-gold group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 shadow-md">
                <ArrowUpRight strokeWidth={1.5} className="w-4 h-4" />
              </div>

              {/* Japanese Kanji Background Watermark */}
              <div className="absolute top-4 right-15 font-serif text-5xl font-bold text-white/[0.07] group-hover:text-gold/20 transition-colors pointer-events-none select-none z-0">
                {genre.japanese}
              </div>

              {/* Card Foreground Content */}
              <div className="relative z-10 space-y-2 transform transition-transform duration-300 group-hover:-translate-y-1">
                <span className="text-[10px] font-mono tracking-[0.2em] text-gold uppercase block">
                  {genre.japanese}
                </span>

                <h3 className="text-xl font-bold text-paper tracking-wider uppercase font-sans group-hover:text-gold transition-colors">
                  {genre.name}
                </h3>

                <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                  {genre.description}
                </p>

                <div className="pt-2 flex items-center gap-2 text-[10px] font-mono text-paper-muted">
                  <span className="text-gold">CANONICAL:</span>
                  <span>{genre.popularTitle}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
