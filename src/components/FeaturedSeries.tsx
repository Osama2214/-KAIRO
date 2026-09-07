"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ALL_SERIES } from "@/data/manga";
import { useStorefrontStore } from "@/store/useStorefrontStore";

export function FeaturedSeries() {
  const allSeries = useStorefrontStore((state) => state.series);
  const featuredConfig = useStorefrontStore((state) => state.featuredSeriesConfig);

  const series =
    (allSeries && allSeries.find((s) => s.slug === featuredConfig?.seriesSlug)) ||
    (allSeries && allSeries.length > 0 ? allSeries[0] : ALL_SERIES[0]);

  const badgeText = featuredConfig?.badgeText || `FEATURED SERIES — ${series.japaneseTitle}`;
  const title = featuredConfig?.customTitle || series.title;
  const description = featuredConfig?.customDescription || series.description;
  const ctaText = featuredConfig?.ctaText || "EXPLORE SERIES ARCHIVE";
  const ctaLink = featuredConfig?.ctaLink || `/series/${series.slug}`;
  const image = featuredConfig?.customImage || series.featuredImage;

  return (
    <section className="py-20 px-6 md:px-12 lg:px-16 bg-ink border-t border-ink-border/60 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="relative rounded-sm border border-ink-border/70 bg-ink-surface/40 p-8 sm:p-12 lg:p-14 overflow-hidden shadow-2xl backdrop-blur-sm">
          {/* Authentic Japanese Typographic Watermark Pattern inside Card */}
          <div className="absolute inset-0 bg-japanese-pattern opacity-100 pointer-events-none select-none z-0" />

          {/* Large Faint Japanese Watermark Kanji Accents */}
          <div className="absolute -bottom-8 left-8 font-serif text-7xl sm:text-9xl font-bold text-paper/[0.03] pointer-events-none select-none tracking-[0.25em] z-0">
            {series.japaneseTitle || "特選"}
          </div>
          <div className="absolute top-8 right-[46%] writing-mode-vertical font-serif text-6xl sm:text-7xl font-bold text-paper/[0.022] pointer-events-none select-none tracking-[0.35em] hidden lg:block z-0">
            領域展開・特選
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center relative z-10">
            {/* Left Column: Quiet & Authoritative Editorial Copy */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              {/* Badge */}
              <div>
                <span className="text-xs font-mono tracking-[0.25em] text-gold uppercase">
                  {badgeText}
                </span>
              </div>

              {/* Title & Author */}
              <div className="space-y-2">
                <h2 className="font-cinzel text-3xl sm:text-5xl lg:text-6xl font-bold tracking-[0.03em] text-paper uppercase leading-[1.05]">
                  {title}
                </h2>
                <p className="text-xs font-mono tracking-widest text-text-muted uppercase">
                  Written &amp; Illustrated by {series.author} • {series.totalVolumes} Volumes ({series.status})
                </p>
              </div>

              {/* Description */}
              <p className="text-sm sm:text-base text-paper-muted/80 leading-relaxed font-sans font-light max-w-xl">
                {description}
              </p>

              {/* Single Confident CTA */}
              <div className="pt-2">
                <Link
                  href={ctaLink}
                  className="inline-flex items-center gap-3 px-8 sm:px-9 py-4 bg-paper text-ink font-extrabold text-xs sm:text-sm tracking-[0.2em] uppercase rounded-sm hover:bg-vermilion hover:text-white transition-all duration-300 shadow-xl group cursor-pointer"
                >
                  <span>{ctaText}</span>
                  <ArrowRight strokeWidth={1.5} className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Right Column: Clean, Pure Art Presentation */}
            <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
              <div className="relative w-full max-w-[380px] sm:max-w-[420px] aspect-[3/4] rounded-sm overflow-hidden border border-ink-border/80 shadow-[0_25px_80px_rgba(0,0,0,0.9)] group">
                <img
                  src={image}
                  alt={title}
                  className="w-full h-full object-cover object-top filter brightness-95 contrast-105 transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Subtle Japanese Seal in Corner */}
                <div className="absolute top-4 right-4 px-2.5 py-1 rounded-xs bg-ink/75 backdrop-blur-md border border-ink-border/80 text-vermilion font-serif font-bold text-xs shadow-lg select-none pointer-events-none">
                  回路
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
