"use client";

import React from "react";
import { Timer } from "lucide-react";
import type { MangaVolume } from "@/data/manga";
import { priceVolume } from "@/lib/pricing";
import { formatPrice } from "@/lib/utils";
import { useNow } from "@/hooks/useNow";

/** "2d 04h" / "04h 12m" / "12m" — enough precision to feel the clock. */
function formatRemaining(ms: number, isArabic: boolean): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return isArabic ? `${days}ي ${hours}س` : `${days}d ${String(hours).padStart(2, "0")}h`;
  if (hours > 0) return isArabic ? `${hours}س ${minutes}د` : `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return isArabic ? `${minutes}د` : `${minutes}m`;
}

/**
 * The price a shopper pays, with the price it replaces struck through.
 *
 * Timed offers are re-evaluated on a ticking clock so a card that is open when
 * an offer lapses corrects itself instead of advertising a price the checkout
 * will refuse to honour.
 */
export function PriceTag({
  volume,
  isArabic,
  size = "sm",
  className = "",
  showTimer = true,
}: {
  volume: Pick<MangaVolume, "price" | "originalPrice" | "promo">;
  isArabic: boolean;
  size?: "sm" | "lg";
  className?: string;
  /** Off where the card shows the countdown elsewhere (see PromoTimer). */
  showTimer?: boolean;
}) {
  // Rendering from a clock would differ between server and client, so the first
  // paint uses no promo and the real evaluation lands once the browser takes over.
  const now = useNow();

  const priced = priceVolume(volume, now ?? 0);
  const live = now !== null ? priced.activePromo : null;

  const priceClass = size === "lg"
    ? "text-2xl sm:text-3xl font-extrabold text-paper"
    : "text-sm font-mono font-extrabold text-paper";
  const strikeClass = size === "lg"
    ? "text-sm font-mono text-text-muted/70 line-through"
    : "text-[11px] font-mono text-text-muted/70 line-through";

  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 leading-tight ${className}`}>
      <span className={live ? priceClass.replace("text-paper", "text-vermilion") : priceClass}>
        {formatPrice(now !== null ? priced.price : Number(volume.price) || 0)}
      </span>

      {/* While an offer runs, the normal price is what it replaces; otherwise
          the publisher list price is. Never show both — it reads as two sales. */}
      {live && priced.wasPrice !== null ? (
        <span className={strikeClass}>{formatPrice(priced.wasPrice)}</span>
      ) : priced.listPrice !== null ? (
        <span className={strikeClass}>{formatPrice(priced.listPrice)}</span>
      ) : null}

      {showTimer && live && priced.endsInMs !== null && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-vermilion/15 border border-vermilion/40 text-vermilion text-[9px] font-mono font-bold tracking-wider whitespace-nowrap">
          <Timer strokeWidth={2} className="w-2.5 h-2.5" />
          {formatRemaining(priced.endsInMs, isArabic)}
        </span>
      )}
    </div>
  );
}

/** Just the countdown of a running offer, for placing on a card's image. */
export function PromoTimer({
  volume,
  isArabic,
  className = "",
}: {
  volume: Pick<MangaVolume, "price" | "originalPrice" | "promo">;
  isArabic: boolean;
  className?: string;
}) {
  const now = useNow();
  if (now === null) return null;
  const priced = priceVolume(volume, now);
  if (!priced.activePromo || priced.endsInMs === null) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-ink/90 backdrop-blur-md border border-vermilion/50 text-vermilion text-[9px] font-mono font-bold tracking-wider whitespace-nowrap ${className}`}>
      <Timer strokeWidth={2} className="w-2.5 h-2.5" />
      {formatRemaining(priced.endsInMs, isArabic)}
    </span>
  );
}

/** The corner badge that marks a card as being on a timed offer. */
export function PromoBadge({
  volume,
  isArabic,
}: {
  volume: Pick<MangaVolume, "price" | "originalPrice" | "promo">;
  isArabic: boolean;
}) {
  const now = useNow();

  if (now === null) return null;
  const priced = priceVolume(volume, now);
  if (!priced.activePromo) return null;

  const label = isArabic
    ? priced.activePromo.labelArabic || priced.activePromo.label
    : priced.activePromo.label;

  return (
    <span className="px-2 py-0.5 rounded-xs bg-vermilion text-[8px] sm:text-[9px] font-mono font-bold tracking-wider text-white uppercase whitespace-nowrap">
      {label || (isArabic ? `عرض −${priced.activePromo.percent}%` : `DEAL −${priced.activePromo.percent}%`)}
    </span>
  );
}
