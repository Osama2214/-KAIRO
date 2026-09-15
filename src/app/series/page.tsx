"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useStorefrontStore } from "@/store/useStorefrontStore";
import { LiveEditButton } from "@/components/admin/LiveEditButton";
import { useTranslation } from "@/hooks/useTranslation";
import { AnimeVerseImage } from "@/components/AnimeVerseImage";

export default function SeriesDirectoryPage() {
  const { locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const allSeries = useStorefrontStore((state) => state.series);
  const seriesList = allSeries;

  return (
    <div className="min-h-screen bg-ink pt-8 sm:pt-28 pb-16 sm:pb-24 px-3.5 sm:px-6 md:px-12 text-paper">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-16">
        {/* Header */}
        <div className="mb-5 sm:mb-16 pb-5 sm:pb-8 border-b border-ink-border/70 flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2 font-mono text-[10px] sm:text-[11px] text-gold tracking-widest uppercase">
              <span>{isArabic ? "الدليل الشامل" : "CANONICAL COMPENDIUM"}</span>
              <span>•</span>
              <span>{isArabic ? "سلاسل المانجا الأرشيفية" : "SERIES DIRECTORY"}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight uppercase text-paper font-sans">
              {isArabic ? "السلاسل الأرشيفية المعتمدة" : "FEATURED SERIES"}
            </h1>
          </div>
          <LiveEditButton
            target={{ type: "new-series" }}
            label={isArabic ? "إضافة سلسلة" : "Add Series"}
            variant="floating"
            size="sm"
          />
        </div>

        {/* Series Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
          {seriesList.map((series) => (
            <div
              key={series.slug}
              className="group relative rounded-sm border border-ink-border/80 bg-ink-surface/40 hover:border-gold/60 transition-all duration-300 overflow-hidden hover:shadow-2xl hover:shadow-black/70 flex flex-col justify-between select-none"
            >
              <Link
                href={`/series/${series.slug}`}
                prefetch="auto"
                className="absolute inset-0 z-0 focus:outline-none"
                aria-label={series.title}
              />
              {/* Top Banner Image with Kanji Watermark */}
              <div className="relative h-44 xs:h-52 sm:h-64 md:h-72 overflow-hidden bg-ink">
                <AnimeVerseImage
                  src={series.bannerImage}
                  alt={series.title}
                  sizes="(max-width: 767px) 100vw, 50vw"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out pointer-events-none opacity-60 group-hover:opacity-85"
                />
                <div className="absolute inset-0 bg-linear-to-t from-ink via-ink/40 to-transparent" />

                {/* Big Kanji Watermark */}
                <div className="absolute top-3 sm:top-4 right-4 sm:right-6 font-serif text-4xl xs:text-5xl sm:text-6xl font-bold text-white/[0.08] group-hover:text-gold/25 transition-colors pointer-events-none select-none">
                  {series.japaneseTitle}
                </div>

                {/* Status Badge */}
                <div className="absolute top-3 left-3 z-10 flex gap-1.5 sm:gap-2">
                  <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xs bg-ink/90 backdrop-blur-md text-[9px] sm:text-[10px] font-mono tracking-widest text-gold border border-ink-border">
                    {isArabic
                      ? series.status.toLowerCase() === "ongoing"
                        ? "مستمرة"
                        : "مكتملة"
                      : series.status.toUpperCase()}
                  </span>
                  <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xs bg-vermilion/90 text-[9px] sm:text-[10px] font-mono tracking-widest text-white">
                    {isArabic ? `${series.totalVolumes} مجلدات` : `${series.totalVolumes} VOLUMES`}
                  </span>
                </div>

                {/* Live Edit Series Button */}
                <div className="absolute top-3 right-3 z-20">
                  <LiveEditButton
                    target={{ type: "series", seriesSlug: series.slug }}
                    label={isArabic ? "تعديل السلسلة" : "Edit Series"}
                    variant="floating"
                    size="xs"
                  />
                </div>
              </div>

              {/* Body Content */}
              <div className="p-4 sm:p-6 md:p-8 flex flex-col justify-between flex-1 space-y-4 sm:space-y-6">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-[11px] font-mono text-gold tracking-widest uppercase">
                      {series.japaneseTitle}
                    </span>
                    <span className="text-text-muted text-xs">•</span>
                    <span className="text-[10px] sm:text-[11px] font-mono text-text-muted">{isArabic ? "تأليف: " : "By "} {series.author}</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-paper uppercase tracking-tight group-hover:text-gold transition-colors font-sans">
                    {series.title}
                  </h2>

                  <p className="text-xs sm:text-sm text-text-muted line-clamp-2 sm:line-clamp-3 leading-relaxed">
                    {isArabic && series.descriptionAr ? series.descriptionAr : series.description}
                  </p>
                </div>

                {/* Genres & CTA */}
                <div className="pt-3.5 sm:pt-4 border-t border-ink-border/60 flex items-center justify-between gap-2.5 flex-wrap">
                  <div className="flex flex-wrap gap-1.5 min-w-0">
                    {series.genres.map((g) => (
                      <span
                        key={g}
                        className="px-2 py-0.5 rounded-xs bg-ink border border-ink-border text-[9px] sm:text-[10px] font-mono text-paper-muted"
                      >
                        {g}
                      </span>
                    ))}
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-mono font-bold tracking-wider text-paper group-hover:text-gold transition-colors uppercase shrink-0">
                    {isArabic ? "استعراض السلسلة" : "VIEW ARCHIVE"}
                    <ArrowRight strokeWidth={1.5} className={`w-3.5 h-3.5 transition-transform ${isRTL ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
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
