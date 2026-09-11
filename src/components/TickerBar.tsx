"use client";

import React from "react";
import Link from "next/link";
import { useStorefrontStore, type TickerSlot } from "@/store/useStorefrontStore";
import { useTranslation } from "@/hooks/useTranslation";
import { useMounted } from "@/store/useWishlistStore";
import { LiveEditButton } from "@/components/admin/LiveEditButton";

/**
 * Divider between two messages: a pair of uneven gold hairlines, like tally
 * strokes. Built from elements rather than a glyph, so it renders identically
 * everywhere instead of at whatever weight the system font picks.
 */
function Separator() {
  return (
    <span className="flex items-end gap-[3px] select-none shrink-0 h-3" aria-hidden="true">
      <span className="w-px h-2 bg-gold/50" />
      <span className="w-px h-3 bg-gold" />
      <span className="w-px h-2 bg-gold/50" />
    </span>
  );
}

/**
 * Scrolling announcement strip.
 *
 * The curator writes the lines; this marches them across the page. It pauses on
 * hover so a message can actually be read, and it holds still for anyone who
 * asked their system to reduce motion.
 *
 * The loop works by scrolling one track exactly its own width while an
 * identical track follows it. That only reads as continuous if a single track
 * is at least as wide as the strip — three short lines on a wide screen left an
 * empty gap sweeping past between repeats — so the message list is repeated
 * enough times to cover the width before the pair is laid out.
 */
export function TickerBar({ slot }: { slot: TickerSlot }) {
  const { locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const config = useStorefrontStore((state) => state.tickerConfig);
  const arabicConfig = useStorefrontStore((state) => state.tickerArabicConfig);

  const active = isArabic ? arabicConfig : config;
  const messages = (active?.messages || []).map((m) => m.trim()).filter(Boolean);

  // Server and client must agree on the first paint, so nothing renders until
  // the persisted locale and CMS payload have settled.
  const mounted = useMounted();

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const passRef = React.useRef<HTMLSpanElement>(null);
  // Enough to cover most screens before the first measurement lands, so there
  // is no visible gap on the very first frame.
  const [repeats, setRepeats] = React.useState(4);

  const messageKey = messages.join("|");

  // Measure one pass of the messages directly and repeat it until it covers the
  // strip. Measuring the pass itself — rather than dividing the whole track by
  // the count currently rendered — keeps this a single settled calculation
  // instead of a feedback loop that can land on the wrong number.
  React.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const pass = passRef.current;
    if (!viewport || !pass) return;

    const measure = () => {
      const passWidth = pass.getBoundingClientRect().width;
      const available = viewport.getBoundingClientRect().width;
      if (passWidth <= 0 || available <= 0) return;
      // One spare pass past the edge, so the seam is always off screen.
      setRepeats(Math.max(1, Math.ceil(available / passWidth) + 1));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [messageKey, locale]);

  // Each mount point declares which slot it is; the curator decides which
  // slots are live, so the same component can appear in several places without
  // any of them being hard-coded on.
  const placements = config?.placements ?? ["after-hero"];
  if (!mounted || !config?.enabled || messages.length === 0) return null;
  if (!placements.includes(slot)) return null;

  const seconds = Math.max(10, Math.min(120, config.speedSeconds || 30));
  const href = config.linkHref?.trim();

  // One pass of every message. The trailing padding matters: without it the
  // last separator butts straight against the first word of the next pass.
  const pass = (passIndex: number, first: boolean) => (
    <span
      key={passIndex}
      ref={first ? passRef : undefined}
      className="flex items-center gap-8 shrink-0 pe-8"
    >
      {messages.map((message, index) => (
        <span key={index} className="flex items-center gap-8 whitespace-nowrap">
          <span className="text-[11px] sm:text-xs font-mono font-semibold tracking-[0.18em] uppercase">
            {message}
          </span>
          <Separator />
        </span>
      ))}
    </span>
  );

  const renderTrack = (duplicate: boolean) => (
    <div className="ticker-track flex shrink-0 items-center gap-8" aria-hidden={duplicate}>
      {Array.from({ length: repeats }, (_, i) => pass(i, !duplicate && i === 0))}
    </div>
  );

  const content = (
    <div
      ref={viewportRef}
      className="ticker-viewport flex w-full overflow-hidden"
      style={{ ["--ticker-duration" as string]: `${seconds}s` }}
    >
      {renderTrack(false)}
      {/* A second copy so the first can scroll fully out before it repeats. */}
      {renderTrack(true)}
    </div>
  );

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="group relative w-full py-2.5 overflow-hidden bg-gradient-to-r from-[#8f2418] via-vermilion to-[#8f2418] text-white border-y border-gold/25"
      role="region"
      aria-label={isArabic ? "إعلانات المتجر" : "Store announcements"}
    >
      {/* Feathered edges so messages slide in and out instead of being clipped. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-14 sm:w-20 z-10 bg-gradient-to-r from-[#8f2418] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-14 sm:w-20 z-10 bg-gradient-to-l from-[#8f2418] to-transparent" />

      {/* Live Visual Editor Button */}
      <div className="absolute top-1/2 -translate-y-1/2 end-3 z-30 pointer-events-auto">
        <LiveEditButton
          target={{ type: "ticker" }}
          label={isArabic ? "تعديل الشريط" : "Edit Ticker"}
          variant="floating"
          size="xs"
        />
      </div>

      {href ? (
        <Link href={href} className="block hover:opacity-90 transition-opacity">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}
