"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ALL_SERIES } from "@/data/manga";
import { useStorefrontStore } from "@/store/useStorefrontStore";

export default function SeriesDirectoryPage() {
  const router = useRouter();
  const allSeries = useStorefrontStore((state) => state.series);
  const seriesList = allSeries && allSeries.length > 0 ? allSeries : ALL_SERIES;

  return (
    <div className="min-h-screen bg-ink pt-28 pb-24 px-6 md:px-12 text-paper">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="pb-8 border-b border-ink-border/70 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 font-mono text-[11px] text-gold tracking-widest uppercase">
              <span>CANONICAL COMPENDIUM</span>
              <span>•</span>
              <span>SERIES DIRECTORY</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight uppercase text-paper font-sans">
              FEATURED SERIES
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-text-muted font-mono max-w-md">
            Complete multi-volume canonical archives. Official English releases, Tankōbon editions, and collector boxsets.
          </p>
        </div>

        {/* Series Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {seriesList.map((series) => (
            <div
              key={series.slug}
              onClick={() => router.push(`/series/${series.slug}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/series/${series.slug}`);
                }
              }}
              className="group relative rounded-sm border border-ink-border/80 bg-ink-surface/40 hover:border-gold/60 transition-all duration-300 overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-black/70 flex flex-col justify-between select-none"
            >
              {/* Top Banner Image with Kanji Watermark */}
              <div className="relative h-60 sm:h-72 overflow-hidden bg-ink">
                <img
                  src={series.bannerImage}
                  alt={series.title}
                  draggable={false}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out pointer-events-none opacity-60 group-hover:opacity-85"
                />
                <div className="absolute inset-0 bg-linear-to- from-ink via-ink/40 to-transparent" />

                {/* Big Kanji Watermark */}
                <div className="absolute top-4 right-6 font-serif text-5xl sm:text-6xl font-bold text-white/[0.08] group-hover:text-gold/25 transition-colors pointer-events-none select-none">
                  {series.japaneseTitle}
                </div>

                {/* Status Badge */}
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  <span className="px-2.5 py-1 rounded-xs bg-ink/90 backdrop-blur-md text-[10px] font-mono tracking-widest text-gold border border-ink-border">
                    {series.status.toUpperCase()}
                  </span>
                  <span className="px-2.5 py-1 rounded-xs bg-vermilion/90 text-[10px] font-mono tracking-widest text-white">
                    {series.totalVolumes} VOLUMES
                  </span>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-6 sm:p-8 flex flex-col justify-between flex-1 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-gold tracking-widest uppercase">
                      {series.japaneseTitle}
                    </span>
                    <span className="text-text-muted text-xs">•</span>
                    <span className="text-[11px] font-mono text-text-muted">By {series.author}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-paper uppercase tracking-tight group-hover:text-gold transition-colors font-sans">
                    {series.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-text-muted line-clamp-3 leading-relaxed">
                    {series.description}
                  </p>
                </div>

                {/* Genres & CTA */}
                <div className="pt-4 border-t border-ink-border/60 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {series.genres.map((g) => (
                      <span
                        key={g}
                        className="px-2 py-0.5 rounded-xs bg-ink border border-ink-border text-[10px] font-mono text-paper-muted"
                      >
                        {g}
                      </span>
                    ))}
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold tracking-widest text-paper group-hover:text-gold transition-colors uppercase">
                    VIEW ARCHIVE
                    <ArrowRight strokeWidth={1.5} className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
