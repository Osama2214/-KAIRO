"use client";

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import Image, { getImageProps } from "next/image";
import { ArrowRight } from "lucide-react";

import { useStorefrontStore } from "@/store/useStorefrontStore";
import { isBook } from "@/lib/variants";
import { useMounted } from "@/store/useWishlistStore";
import { LiveEditButton } from "@/components/admin/LiveEditButton";
import { useTranslation } from "@/hooks/useTranslation";
import { PLACEHOLDER_COVER } from "@/config/mediaDefaults";
import { useImageRetry } from "@/components/AnimeVerseImage";
import { mobileHeroImages } from "@/config/mobileHeroImages";

/**
 * One frame of the mobile backdrop. Split out so each carries its own retry
 * state: a frame that fails is re-requested rather than fading in empty.
 */
function HeroBackdropFrame({ frame, first, active, onReady }: {
  frame: (typeof mobileHeroImages)[number];
  first: boolean;
  active: boolean;
  onReady: () => void;
}) {
  const retry = useImageRetry(frame.src);
  const { props } = getImageProps({ src: retry.src, alt: "", width: frame.width, height: frame.height, unoptimized: true });
  return (
    <picture>
      {/* Desktop has its own cover; do not download the mobile backdrop there. */}
      <source media="(min-width: 1024px)" srcSet="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" />
      <source type="image/avif" srcSet={frame.avif} sizes="100vw" />
      <img
      {...props}
      alt=""
      key={retry.key}
      srcSet={frame.webp}
      sizes="100vw"
      loading="eager"
      fetchPriority={first ? "high" : "auto"}
      decoding="async"
      onError={retry.onError}
      onLoad={() => { retry.onLoad(); onReady(); }}
      // All five frames share one treatment. The old rule gave slide 0 full
      // brightness and dimmed the rest to 76%, which on artwork this dark
      // left the characters barely readable.
      className={`absolute inset-0 w-full h-full object-cover object-[center_62%] filter contrast-[1.08] brightness-[1.05] saturate-[1.05] ${
        active ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    /></picture>
  );
}

export function Hero() {
  const cardRef = useRef<HTMLDivElement>(null);
  const mounted = useMounted();
  const { t, locale } = useTranslation();

  const [bgIndex, setBgIndex] = useState(0);
  const [loadedBgIndex, setLoadedBgIndex] = useState(0);

  const heroContent = useStorefrontStore((state) => state.heroContent);
  const heroArabicContent = useStorefrontStore((state) => state.heroArabicContent);
  const volumes = useStorefrontStore((state) => state.volumes);
  const shippingConfig = useStorefrontStore((state) => state.shippingConfig);

  // The hero frames a book ("Series — VOL. N"), so a figure or poster is never
  // picked here, even if one is marked featured.
  const heroBooks = volumes.filter(isBook);
  const featuredVolume =
    heroBooks.find((v) => v.id === heroContent.featuredVolumeId) ||
    heroBooks.find((v) => v.isFeatured) ||
    heroBooks[0];

  const featuredCover = useImageRetry(featuredVolume?.coverImage || PLACEHOLDER_COVER);

  useEffect(() => {
    let rafId: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    let running = false;

    // The tilt eases toward the pointer and stops once it has caught up. It used
    // to run every frame for as long as the page was open, including on phones,
    // where there is no pointer and the card is not even shown.
    const animate = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      if (cardRef.current) {
        cardRef.current.style.transform = `perspective(1000px) rotateY(${currentX * 0.5}deg) rotateX(${-currentY * 0.5}deg)`;
      }
      if (Math.abs(targetX - currentX) < 0.01 && Math.abs(targetY - currentY) < 0.01) {
        running = false;
        return;
      }
      rafId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const { clientWidth, clientHeight } = document.documentElement;
      targetX = (e.clientX / clientWidth - 0.5) * 18;
      targetY = (e.clientY / clientHeight - 0.5) * 18;
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(animate);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Alternate artwork is fetched only when a shopper selects a slide.

  const isAr = locale === "ar";
  const headlineLine1 = mounted
    ? (isAr ? (heroArabicContent?.headlineLine1 || t.hero.headlineLine1) : (heroContent.headlineLine1 || t.hero.headlineLine1))
    : t.hero.headlineLine1;
  const headlineHighlight = mounted
    ? (isAr ? (heroArabicContent?.headlineHighlight || t.hero.headlineHighlight) : (heroContent.headlineHighlight || t.hero.headlineHighlight))
    : t.hero.headlineHighlight;
  const headlineLine2 = mounted
    ? (isAr ? (heroArabicContent?.headlineLine2 || t.hero.headlineLine2) : (heroContent.headlineLine2 || t.hero.headlineLine2))
    : t.hero.headlineLine2;
  const subheadline = mounted
    ? (isAr ? (heroArabicContent?.subheadline || t.hero.subheadline) : (heroContent.subheadline || t.hero.subheadline))
    : t.hero.subheadline;
  const primaryCtaText = mounted
    ? (isAr ? (heroArabicContent?.primaryCtaText || t.hero.primaryCta) : (heroContent.primaryCtaText || t.hero.primaryCta))
    : t.hero.primaryCta;
  const primaryCtaLink = mounted && heroContent.primaryCtaLink ? heroContent.primaryCtaLink : "/manga";
  const secondaryCtaText = mounted
    ? (isAr ? (heroArabicContent?.secondaryCtaText || t.hero.secondaryCta) : (heroContent.secondaryCtaText || t.hero.secondaryCta))
    : t.hero.secondaryCta;
  const secondaryCtaLink = mounted && heroContent.secondaryCtaLink ? heroContent.secondaryCtaLink : "#new-releases";
  const stat1Val = mounted
    ? (isAr ? (heroArabicContent?.stat1Value || t.hero.stat1Val) : (heroContent.stat1Value || t.hero.stat1Val))
    : t.hero.stat1Val;
  const stat1Lbl = mounted
    ? (isAr ? (heroArabicContent?.stat1Label || t.hero.stat1Lbl) : (heroContent.stat1Label || t.hero.stat1Lbl))
    : t.hero.stat1Lbl;
  const stat2Val = mounted
    ? (isAr ? (heroArabicContent?.stat2Value || t.hero.stat2Val) : (heroContent.stat2Value || t.hero.stat2Val))
    : t.hero.stat2Val;
  const stat2Lbl = mounted
    ? (isAr ? (heroArabicContent?.stat2Label || t.hero.stat2Lbl) : (heroContent.stat2Label || t.hero.stat2Lbl))
    : t.hero.stat2Lbl;
  const stat3Val = mounted
    ? (isAr ? (heroArabicContent?.stat3Value || t.hero.stat3Val) : (heroContent.stat3Value || shippingConfig.deliveryEstimate || t.hero.stat3Val))
    : t.hero.stat3Val;
  const stat3Lbl = mounted
    ? (isAr ? (heroArabicContent?.stat3Label || t.hero.stat3Lbl) : (heroContent.stat3Label || t.hero.stat3Lbl))
    : t.hero.stat3Lbl;

  return (
    <section className="relative h-[100svh] min-h-[100svh] max-h-[100svh] lg:h-auto lg:min-h-screen lg:max-h-none w-full flex flex-col justify-center overflow-hidden pt-20 sm:pt-24 lg:pt-28 pb-8 sm:pb-12 lg:pb-16 px-5 sm:px-8 md:px-12 lg:px-16 bg-ink">
      {/* Match the picture's AVIF candidate so only one first-frame file is
          preloaded, only below lg, directly from the deployment's asset cache. */}
      <link rel="preload" as="image" type="image/avif" media="(max-width: 1023px)" imageSrcSet={mobileHeroImages[0].avif} imageSizes="100vw" fetchPriority="high" />
      {/* Subtle Japanese Typographic Watermark Background */}
      <div className="absolute inset-0 bg-japanese-pattern pointer-events-none select-none z-0" />
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] rounded-full bg-vermilion/5 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-gold/5 blur-[130px] pointer-events-none" />

      {/* Keep the current background visible until the selected image loads. */}
      <div className="lg:hidden absolute inset-0 z-0 overflow-hidden select-none">
        {mobileHeroImages.map((frame, idx) =>
          idx === bgIndex || idx === loadedBgIndex ? (
            <HeroBackdropFrame
              key={frame.src}
              frame={frame}
              first={idx === 0}
              active={idx === loadedBgIndex}
              onReady={() => { if (idx === bgIndex) setLoadedBgIndex(idx); }}
            />
          ) : null
        )}
        {/* Soft Top Vignette for Navbar Legibility */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-ink/60 via-ink/15 to-transparent pointer-events-none" />
        {/* Soft Left Vignette for Text Contrast leaving Artwork Vibrant */}
        <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-ink/70 via-ink/25 to-transparent pointer-events-none" />
        {/* Soft Bottom Vignette */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/35 to-transparent pointer-events-none" />

        {/* Minimalist Slide Indicator Dots on Mobile & iPad (Bottom-Right) */}
        <div className="absolute bottom-5 right-5 sm:bottom-6 sm:right-6 z-20 flex items-center gap-1.5 pointer-events-auto">
          {mobileHeroImages.length > 1 && mobileHeroImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setBgIndex(idx)}
              aria-label={isAr ? `عرض الخلفية ${idx + 1}` : `Switch slide ${idx + 1}`}
              aria-pressed={idx === bgIndex}
              className={`h-1 rounded-full transition-all duration-500 cursor-pointer ${
                idx === bgIndex ? "w-5 bg-gold shadow-[0_0_8px_rgba(199,167,108,0.6)]" : "w-1.5 bg-paper/30 hover:bg-paper/60"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Large Ultra-Faint Japanese Watermark Accents in Void (Desktop) */}
      <div className="absolute top-1/3 -left-3 writing-mode-vertical font-serif text-6xl md:text-8xl font-bold text-paper/[0.015] pointer-events-none select-none tracking-[0.35em] hidden lg:block">
        {heroContent.japaneseWatermark1 || "物語の始まり"}
      </div>
      <div className="absolute bottom-1/4 -right-3 writing-mode-vertical font-serif text-6xl md:text-8xl font-bold text-paper/[0.012] pointer-events-none select-none tracking-[0.35em] hidden lg:block">
        {heroContent.japaneseWatermark2 || "精神と物質の調和"}
      </div>

      {/* Hero Content Container */}
      <div className="relative max-w-7xl mx-auto w-full z-10 flex flex-col justify-center lg:grid lg:grid-cols-12 lg:gap-14 lg:items-center my-auto py-2 sm:py-4">
        {/* Left Column: Bold & Confident Editorial Headline & Actions */}
        <div className="lg:col-span-7 flex flex-col space-y-3 sm:space-y-5 lg:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 w-full max-w-xl lg:max-w-none">
          
          {/* Top Metadata: archive mark & Live Edit */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-text-muted font-serif">
              ANIMEVERSE アーカイブ
            </span>
            <LiveEditButton target={{ type: "hero" }} label="Edit Hero" variant="floating" size="xs" />
          </div>

          {/* Main Headline with 3-line cadence on mobile & iPad */}
          <div className="space-y-0.5 sm:space-y-2">
            <h1
              className={`text-[2.25rem] xs:text-[2.65rem] sm:text-4xl md:text-5xl lg:text-[4.8rem] xl:text-[5.2rem] font-bold text-paper uppercase drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)] ${
                isAr
                  ? "font-sans leading-[1.18] sm:leading-[1.25] tracking-normal"
                  : "font-cinzel leading-[1.04] sm:leading-[1.06] tracking-[0.02em]"
              }`}
            >
              {isAr ? (
                <>
                  {headlineLine1} <br />
                  <span className="text-gold font-bold inline-block drop-shadow-[0_2px_16px_rgba(199,167,108,0.25)]">
                    {headlineHighlight}
                  </span>{" "}
                  {headlineLine2}
                </>
              ) : (
                <>
                  {headlineLine1 || "DISCOVER"} <br />
                  <span className="lg:hidden">YOUR <br /></span>
                  <span className="hidden lg:inline">YOUR </span>
                  <span className="text-gold font-semibold">NEXT</span> STORY
                </>
              )}
            </h1>

            {/* Subtle Gold Editorial Line under Headline */}
            <div className="w-7 xs:w-8 h-[1.5px] bg-gold/80 mt-2.5 mb-2.5 rounded-full shadow-md" />
          </div>

          {/* Supporting Text: Formatted to break into 4 balanced lines matching user reference */}
          <p className="text-[12px] xs:text-[12.5px] sm:text-sm md:text-base text-paper-muted/80 leading-[1.65] max-w-[315px] sm:max-w-xl font-sans drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
            {subheadline}
          </p>

          {/* CTA Buttons: Expanded across available space with full text visible */}
          <div className="grid grid-cols-2 gap-3 pt-1 w-full max-w-md sm:flex sm:flex-row sm:items-center sm:gap-4 sm:max-w-none">
            <Link
              href={primaryCtaLink}
              className="w-full sm:w-auto px-3 xs:px-4 sm:px-9 py-3.5 sm:py-4 bg-paper text-ink font-extrabold text-[11px] xs:text-xs sm:text-sm tracking-[0.14em] sm:tracking-[0.2em] uppercase rounded-sm hover:bg-vermilion hover:text-white transition-all duration-300 shadow-xl flex items-center justify-center gap-1.5 sm:gap-2 group cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <span>{primaryCtaText}</span>
              <ArrowRight strokeWidth={1.5} className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5 rtl:rotate-180 transition-transform shrink-0" />
            </Link>

            <a
              href={secondaryCtaLink}
              className="w-full sm:w-auto px-3 xs:px-4 sm:px-9 py-3.5 sm:py-4 bg-ink-surface/85 border border-ink-border text-paper font-semibold text-[11px] xs:text-xs sm:text-sm tracking-[0.14em] sm:tracking-[0.2em] uppercase rounded-sm hover:border-gold hover:text-gold transition-all duration-300 backdrop-blur-md cursor-pointer flex items-center justify-center active:scale-95 whitespace-nowrap"
            >
              <span>{secondaryCtaText}</span>
            </a>
          </div>

          {/* Editorial Specs Bar: Top stat values centered relative to the labels below them */}
          <div className="pt-3.5 sm:pt-6 mt-1 border-t border-ink-border/60 grid grid-cols-3 gap-2 sm:gap-6 max-w-md sm:max-w-lg font-mono text-xs w-full">
            <div className="text-center flex flex-col items-center">
              <span className="block text-paper font-bold text-xs sm:text-base lg:text-lg tracking-wider text-center">
                {stat1Val}
              </span>
              <span className="text-text-muted text-[8.5px] xs:text-[9.5px] sm:text-[10px] lg:text-[11px] tracking-wider uppercase block mt-0.5 leading-tight text-center">
                {stat1Lbl}
              </span>
            </div>
            <div className="text-center flex flex-col items-center border-x border-ink-border/40 px-1 sm:px-3">
              <span className="block text-paper font-bold text-xs sm:text-base lg:text-lg tracking-wider text-center">
                {stat2Val}
              </span>
              <span className="text-text-muted text-[8.5px] xs:text-[9.5px] sm:text-[10px] lg:text-[11px] tracking-wider uppercase block mt-0.5 leading-tight text-center">
                {stat2Lbl}
              </span>
            </div>
            <div className="text-center flex flex-col items-center">
              <span className="block text-gold font-bold text-xs sm:text-base lg:text-lg tracking-wider text-center">
                {stat3Val}
              </span>
              <span className="text-text-muted text-[8.5px] xs:text-[9.5px] sm:text-[10px] lg:text-[11px] tracking-wider uppercase block mt-0.5 leading-tight text-center">
                {stat3Lbl}
              </span>
            </div>
          </div>
        </div>


        {/* Right Column: Desktop 3D Artwork (Active on lg screens and above) */}
        <div className="hidden lg:flex lg:col-span-5 relative items-center justify-center lg:justify-end">
          <div
            ref={cardRef}
            className="relative w-full max-w-[280px] md:max-w-[320px] lg:max-w-[420px] xl:max-w-[450px] aspect-[3/4] rounded-sm overflow-hidden border border-ink-border/80 shadow-[0_30px_100px_rgba(0,0,0,0.95)] group will-change-transform"
          >
            {/* Background Artwork */}
            <Image
              key={featuredCover.key}
              src={featuredCover.src}
              alt={featuredVolume?.title || "ANIMEVERSE Manga Hero Cover"}
              fill
              sizes="(max-width: 1023px) 0px, (max-width: 1280px) 320px, 450px"
              quality={90}
              loading="lazy"
              decoding="async"
              onError={featuredCover.onError}
              onLoad={featuredCover.onLoad}
              className="w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-105 filter contrast-105"
            />

            {/* Subtle Atmospheric Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-black/30 pointer-events-none" />

            {/* Japanese Seal Watermark on Artwork */}
            <div className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 sm:p-2.5 rounded-sm bg-ink/75 backdrop-blur-md border border-ink-border/80 text-vermilion font-serif font-bold text-xs shadow-lg">
              検印
            </div>

            {/* Live Edit Hero Card Button */}
            <LiveEditButton
              target={{ type: "hero-card" }}
              label="Change Hero Card"
              variant="card"
            />

            {/* Bottom Caption Pill */}
            {featuredVolume && (
              <Link
                href={`/manga/${featuredVolume.id}`}
                className="absolute bottom-4 sm:bottom-5 left-4 sm:left-5 right-4 sm:right-5 p-3 sm:p-4 rounded-sm bg-ink/90 backdrop-blur-md border border-ink-border/80 hover:border-gold/60 flex items-center justify-between shadow-2xl transition-all duration-300 group/pill cursor-pointer hover:bg-ink-surface"
                title={`Explore ${featuredVolume.title}`}
              >
                <div>
                  <span className="text-[9px] sm:text-[10px] font-mono tracking-widest text-gold uppercase block">
                    {locale === "ar" ? "مختارات الأسبوع بالأرشيف" : "FEATURED CURATION"}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-paper tracking-wider uppercase group-hover/pill:text-gold transition-colors">
                    {featuredVolume.seriesTitle} — VOL. {featuredVolume.volumeNumber}
                  </span>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xs bg-ink-surface border border-ink-border text-paper group-hover/pill:text-gold group-hover/pill:border-gold transition-all duration-300">
                  <ArrowRight strokeWidth={1.4} className="w-3.5 sm:w-4 h-3.5 sm:h-4 group-hover/pill:translate-x-1 rtl:group-hover/pill:-translate-x-1 rtl:rotate-180 transition-transform" />
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
