"use client";

import React from "react";
import { AnimeVerseImage } from "@/components/AnimeVerseImage";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { LiveEditButton } from "@/components/admin/LiveEditButton";
import { useTranslation } from "@/hooks/useTranslation";

function parseBadgeText(badgeText: string) {
  const match = badgeText.match(/^(.*?)([\s]*[—–-][\s]*)(.*)$/);
  if (match && match[3]) {
    return {
      prefix: match[1].trim(),
      separator: " — ",
      japanese: match[3].trim(),
    };
  }
  // Check if there are Japanese characters directly
  const cjkMatch = badgeText.match(/^([^\u3000-\u9FAF]*)([\u3000-\u9FAF]+.*)$/);
  if (cjkMatch && cjkMatch[2]) {
    return {
      prefix: cjkMatch[1].trim(),
      separator: " ",
      japanese: cjkMatch[2].trim(),
    };
  }
  return {
    prefix: badgeText,
    separator: "",
    japanese: "",
  };
}

export function FeaturedSeries() {
  const { locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const allSeries = useStorefrontStore((state) => state.series);
  const featuredConfig = useStorefrontStore((state) => state.featuredSeriesConfig);

  const series =
    (allSeries && allSeries.find((s) => s.slug === featuredConfig?.seriesSlug)) ||
    allSeries[0];
  if (!series) return null;

  const badgeText =
    featuredConfig?.badgeText && featuredConfig.badgeText !== `FEATURED SERIES — ${series.japaneseTitle}`
      ? featuredConfig.badgeText
      : isArabic
      ? `سلسلة مميزة — ${series.japaneseTitle}`
      : `FEATURED SERIES — ${series.japaneseTitle}`;

  // Parse badge text to extract prefix and Japanese text to style Japanese text in vermilion red
  const badgeParts = parseBadgeText(badgeText);
  const title =
    (isArabic ? featuredConfig?.customTitleAr : "") || featuredConfig?.customTitle || series.title;
  // In Arabic, an Arabic override wins, then the series' own Arabic copy, then English.
  const description =
    (isArabic ? featuredConfig?.customDescriptionAr || series.descriptionAr : "") ||
    featuredConfig?.customDescription ||
    series.description;
  const ctaText =
    featuredConfig?.ctaText && featuredConfig.ctaText !== "EXPLORE SERIES ARCHIVE"
      ? featuredConfig.ctaText
      : isArabic
      ? "استكشف أرشيف السلسلة"
      : "EXPLORE SERIES ARCHIVE";
  const ctaLink = featuredConfig?.ctaLink || `/series/${series.slug}`;
  const image = featuredConfig?.customImage || series.featuredImage;

  const metaText = isArabic
    ? `تأليف ورسم ${series.author} • ${series.totalVolumes} مجلدات (${series.status === "Ongoing" ? "مستمرة" : "مكتملة"})`
    : `Written & Illustrated by ${series.author} • ${series.totalVolumes} Volumes (${series.status})`;

  return (
    <section id="featured-series" className="py-14 sm:py-20 px-4 sm:px-8 md:px-12 lg:px-16 bg-ink border-t border-ink-border/60 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="relative rounded-sm border border-ink-border/70 bg-ink-surface/40 p-5 xs:p-7 sm:p-10 lg:p-14 overflow-hidden shadow-2xl backdrop-blur-sm">
          {/* Authentic Japanese Typographic Watermark Pattern inside Card */}
          <div className="absolute inset-0 bg-japanese-pattern opacity-100 pointer-events-none select-none z-0" />

          {/* Large Faint Japanese Watermark Kanji Accents */}
          <div className="absolute -bottom-8 left-8 font-serif text-7xl sm:text-9xl font-bold text-paper/[0.03] pointer-events-none select-none tracking-[0.25em] whitespace-nowrap z-0">
            {series.japaneseTitle || "特選"}
          </div>
          <div className="absolute top-8 right-[46%] writing-mode-vertical font-serif text-6xl sm:text-7xl font-bold text-paper/[0.022] pointer-events-none select-none tracking-[0.35em] hidden lg:block z-0">
            領域展開・特選
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 sm:gap-10 lg:gap-16 items-center relative z-10">
            {/* Left Column: Quiet & Authoritative Editorial Copy */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-5 sm:space-y-6">
              {/* Badge & Live Edit */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10.5px] xs:text-xs font-mono tracking-[0.2em] sm:tracking-[0.25em] uppercase inline-flex items-center flex-wrap">
                  <span className="text-gold">{badgeParts.prefix}</span>
                  {badgeParts.separator && (
                    <span className="text-gold/60 mx-1.5">{badgeParts.separator.trim()}</span>
                  )}
                  {badgeParts.japanese && (
                    <span className="text-vermilion font-serif font-bold tracking-wider">
                      {badgeParts.japanese}
                    </span>
                  )}
                </span>
                <LiveEditButton target={{ type: "featured-series" }} label="Edit Spotlight" variant="floating" size="xs" />
              </div>

              {/* Title & Author */}
              <div className="space-y-2">
                <h2 className="font-cinzel text-[1.9rem] xs:text-3xl sm:text-5xl lg:text-6xl font-bold tracking-[0.03em] text-paper uppercase leading-[1.08] sm:leading-[1.05]">
                  {title}
                </h2>
                <p className="text-[10.5px] xs:text-xs font-mono tracking-wider sm:tracking-widest text-text-muted uppercase leading-relaxed">
                  {metaText}
                </p>
              </div>

              {/* Description */}
              <p className="text-[13.5px] sm:text-base text-paper-muted/80 leading-relaxed font-sans font-light max-w-xl">
                {description}
              </p>

              {/* Single Confident CTA */}
              <div className="pt-1 sm:pt-2 flex justify-center lg:justify-start">
                <Link
                  href={ctaLink}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 sm:gap-3 px-4 sm:px-9 py-3.5 sm:py-4 bg-paper text-ink font-extrabold text-[11px] xs:text-xs sm:text-sm tracking-[0.14em] sm:tracking-[0.2em] whitespace-nowrap uppercase rounded-sm hover:bg-vermilion hover:text-white transition-all duration-300 shadow-xl group cursor-pointer text-center"
                >
                  <span>{ctaText}</span>
                  <ArrowRight strokeWidth={1.5} className={`w-4 h-4 group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5 transition-transform ${isRTL ? "rotate-180" : ""}`} />
                </Link>
              </div>
            </div>

            {/* Right Column: Clean, Pure Art Presentation */}
            {/* On phones the art leads, so the section opens on the picture instead of a screen of text. */}
            <div className="order-first lg:order-none lg:col-span-5 flex items-center justify-center lg:justify-end w-full">
              <div className="relative w-full max-w-[350px] xs:max-w-[390px] sm:max-w-[440px] lg:max-w-[450px] aspect-[4/5] sm:aspect-[3/4] rounded-sm overflow-hidden border border-ink-border/80 shadow-[0_25px_80px_rgba(0,0,0,0.9)] group">
                <AnimeVerseImage
                  src={image}
                  alt={title}
                  sizes="(max-width: 1023px) 100vw, 450px"
                  className="w-full h-full object-cover object-top filter brightness-95 contrast-105 transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Live Edit Series Button */}
                <LiveEditButton
                  target={{ type: "featured-series-card" }}
                  label="Change Featured Series"
                  variant="card"
                  size="xs"
                />

                {/* Subtle Japanese Seal in Corner */}
                <div className="absolute top-4 right-4 px-2.5 py-1 rounded-xs bg-ink/75 backdrop-blur-md border border-ink-border/80 text-vermilion font-serif font-bold text-xs shadow-lg select-none pointer-events-none">
                  検印
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
