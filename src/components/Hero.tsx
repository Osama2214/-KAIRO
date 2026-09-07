"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useStorefrontStore } from "@/store/useStorefrontStore";
import { useMounted } from "@/store/useWishlistStore";
import { LiveEditButton } from "@/components/admin/LiveEditButton";

export function Hero() {
  const cardRef = useRef<HTMLDivElement>(null);
  const mounted = useMounted();

  const heroContent = useStorefrontStore((state) => state.heroContent);
  const volumes = useStorefrontStore((state) => state.volumes);
  const shippingConfig = useStorefrontStore((state) => state.shippingConfig);

  const featuredVolume =
    volumes.find((v) => v.id === heroContent.featuredVolumeId) ||
    volumes.find((v) => v.isFeatured) ||
    volumes[0];

  useEffect(() => {
    let rafId: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientWidth, clientHeight } = document.documentElement;
      targetX = (e.clientX / clientWidth - 0.5) * 18;
      targetY = (e.clientY / clientHeight - 0.5) * 18;
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      if (cardRef.current) {
        cardRef.current.style.transform = `perspective(1000px) rotateY(${currentX * 0.5}deg) rotateX(${-currentY * 0.5}deg)`;
      }
      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const badgeText = mounted && heroContent.badgeText ? heroContent.badgeText : "CHAPTER 01 — 物語の始まり";
  const hubName = mounted && shippingConfig.hubName ? shippingConfig.hubName : "6TH OF OCTOBER • EGYPT";
  const headlineLine1 = mounted && heroContent.headlineLine1 ? heroContent.headlineLine1 : "DISCOVER";
  const headlineHighlight = mounted && heroContent.headlineHighlight ? heroContent.headlineHighlight : "YOUR NEXT";
  const headlineLine2 = mounted && heroContent.headlineLine2 ? heroContent.headlineLine2 : "STORY";
  const subheadline = mounted && heroContent.subheadline ? heroContent.subheadline : "Manga, light novels, and stories worth getting lost in. From pristine First Editions and oversize Deluxe hardcovers to complete collector slipcase box sets.";
  const primaryCtaText = mounted && heroContent.primaryCtaText ? heroContent.primaryCtaText : "EXPLORE MANGA";
  const primaryCtaLink = mounted && heroContent.primaryCtaLink ? heroContent.primaryCtaLink : "/manga";
  const secondaryCtaText = mounted && heroContent.secondaryCtaText ? heroContent.secondaryCtaText : "NEW RELEASES";
  const secondaryCtaLink = mounted && heroContent.secondaryCtaLink ? heroContent.secondaryCtaLink : "#new-releases";
  const stat1Val = mounted && heroContent.stat1Value ? heroContent.stat1Value : "1,400+";
  const stat1Lbl = mounted && heroContent.stat1Label ? heroContent.stat1Label : "Volumes Archived";
  const stat2Val = mounted && heroContent.stat2Value ? heroContent.stat2Value : "100%";
  const stat2Lbl = mounted && heroContent.stat2Label ? heroContent.stat2Label : "Licensed Imports";
  const stat3Val = mounted && (heroContent.stat3Value || shippingConfig.deliveryEstimate) ? (heroContent.stat3Value || shippingConfig.deliveryEstimate) : "24-48h";
  const stat3Lbl = mounted && heroContent.stat3Label ? heroContent.stat3Label : "All Egypt Delivery";

  return (
    <section className="relative min-h-screen w-full flex flex-col justify-center overflow-hidden pt-28 pb-16 px-6 md:px-12 lg:px-16 bg-ink">
      {/* Subtle Japanese Typographic Watermark Background */}
      <div className="absolute inset-0 bg-japanese-pattern pointer-events-none select-none" />
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] rounded-full bg-vermilion/5 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-gold/5 blur-[130px] pointer-events-none" />

      {/* Large Ultra-Faint Japanese Watermark Accents in Void */}
      <div className="absolute top-1/3 -left-3 writing-mode-vertical font-serif text-6xl md:text-8xl font-bold text-paper/[0.015] pointer-events-none select-none tracking-[0.35em]">
        {heroContent.japaneseWatermark1 || "回路・物語の始まり"}
      </div>
      <div className="absolute bottom-1/4 -right-3 writing-mode-vertical font-serif text-6xl md:text-8xl font-bold text-paper/[0.012] pointer-events-none select-none tracking-[0.35em] hidden sm:block">
        {heroContent.japaneseWatermark2 || "精神と物質の調和"}
      </div>

      {/* Hero Content Container */}
      <div className="relative max-w-7xl mx-auto w-full my-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center z-10 py-4">
        {/* Left Column: Bold & Confident Editorial Headline & Actions */}
        <div className="lg:col-span-7 flex flex-col space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
          {/* Japanese Chapter Badge & Live Edit */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono tracking-[0.28em] text-gold uppercase">
                {badgeText}
              </span>
              <span className="text-xs text-text-muted font-serif hidden sm:inline">
                回路アーカイブ // {hubName}
              </span>
            </div>
            <LiveEditButton target={{ type: "hero" }} label="Edit Hero" variant="floating" size="xs" />
          </div>

          {/* Main Headline */}
          <div className="space-y-2">
            <h1 className="font-cinzel text-4xl sm:text-6xl md:text-7xl lg:text-[5.4rem] font-bold tracking-[0.03em] text-paper leading-[1.04] uppercase">
              {headlineLine1} <br />
              <span className="text-gold-gradient font-semibold tracking-[0.05em]">
                {headlineHighlight}
              </span>{" "}
              {headlineLine2}
            </h1>
          </div>

          {/* Supporting Text */}
          <p className="text-sm sm:text-base md:text-[17px] text-text-muted leading-relaxed max-w-xl font-sans">
            {subheadline}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-1.5">
            <Link
              href={primaryCtaLink}
              className="px-8 sm:px-9 py-4 bg-paper text-ink font-extrabold text-xs sm:text-sm tracking-[0.2em] uppercase rounded-sm hover:bg-vermilion hover:text-white transition-all duration-300 shadow-xl flex items-center gap-3 group cursor-pointer"
            >
              <span>{primaryCtaText}</span>
              <ArrowRight strokeWidth={1.5} className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </Link>

            <a
              href={secondaryCtaLink}
              className="px-8 sm:px-9 py-4 bg-ink-surface/80 border border-ink-border text-paper font-semibold text-xs sm:text-sm tracking-[0.2em] uppercase rounded-sm hover:border-gold hover:text-gold transition-all duration-300 backdrop-blur-md cursor-pointer"
            >
              {secondaryCtaText}
            </a>
          </div>

          {/* Editorial Specs Bar */}
          <div className="pt-6 border-t border-ink-border/60 grid grid-cols-3 gap-6 max-w-lg font-mono text-xs">
            <div>
              <span className="block text-paper font-bold text-base sm:text-lg tracking-wider">
                {stat1Val}
              </span>
              <span className="text-text-muted text-[10px] sm:text-[11px] tracking-widest uppercase">
                {stat1Lbl}
              </span>
            </div>
            <div>
              <span className="block text-paper font-bold text-base sm:text-lg tracking-wider">
                {stat2Val}
              </span>
              <span className="text-text-muted text-[10px] sm:text-[11px] tracking-widest uppercase">
                {stat2Lbl}
              </span>
            </div>
            <div>
              <span className="block text-gold font-bold text-base sm:text-lg tracking-wider">
                {stat3Val}
              </span>
              <span className="text-text-muted text-[10px] sm:text-[11px] tracking-widest uppercase">
                {stat3Lbl}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Prominent & Harmonious Artwork */}
        <div className="lg:col-span-5 relative flex items-center justify-center lg:justify-end">
          <div
            ref={cardRef}
            className="relative w-full max-w-[380px] sm:max-w-[420px] lg:max-w-[450px] aspect-[3/4] rounded-sm overflow-hidden border border-ink-border/80 shadow-[0_30px_100px_rgba(0,0,0,0.95)] group will-change-transform"
          >
            {/* Background Artwork */}
            <img
              src={featuredVolume?.coverImage || "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop"}
              alt={featuredVolume?.title || "KAIRO Manga Hero Cover"}
              className="w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-105 filter contrast-105"
            />

            {/* Subtle Atmospheric Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-black/30 pointer-events-none" />

            {/* Japanese Seal Watermark on Artwork */}
            <div className="absolute top-5 right-5 p-2.5 rounded-sm bg-ink/75 backdrop-blur-md border border-ink-border/80 text-vermilion font-serif font-bold text-xs shadow-lg">
              回路
            </div>

            {/* Live Edit Book Button */}
            {featuredVolume && (
              <LiveEditButton
                target={{ type: "volume", volumeId: featuredVolume.id }}
                label="Edit Book"
                variant="card"
              />
            )}

            {/* Bottom Caption Pill */}
            {featuredVolume && (
              <Link
                href={`/manga/${featuredVolume.id}`}
                className="absolute bottom-5 left-5 right-5 p-4 rounded-sm bg-ink/90 backdrop-blur-md border border-ink-border/80 hover:border-gold/60 flex items-center justify-between shadow-2xl transition-all duration-300 group/pill cursor-pointer hover:bg-ink-surface"
                title={`Explore ${featuredVolume.title}`}
              >
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-gold uppercase block">
                    FEATURED CURATION
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-paper tracking-wider uppercase group-hover/pill:text-gold transition-colors">
                    {featuredVolume.seriesTitle} — VOL. {featuredVolume.volumeNumber}
                  </span>
                </div>
                <div className="p-2.5 rounded-xs bg-ink-surface border border-ink-border text-paper group-hover/pill:text-gold group-hover/pill:border-gold transition-all duration-300">
                  <ArrowRight strokeWidth={1.4} className="w-4 h-4 group-hover/pill:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
