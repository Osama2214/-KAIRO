import type { MangaVolume, VolumePromo } from "@/data/manga";

/**
 * Effective pricing for a product, including any limited-time offer.
 *
 * This module is the single place a price is decided, and it is imported by
 * both the storefront and the order route. The server re-runs it at checkout
 * against the catalogue row, so a shopper is charged what the card showed —
 * and an offer that lapsed between browsing and paying is simply not applied.
 */

export interface PricedVolume {
  /** What the customer pays, after any live promotion. */
  price: number;
  /** The price this replaces — the normal selling price, when a promo is live. */
  wasPrice: number | null;
  /** Publisher list price, when it is above the normal selling price. */
  listPrice: number | null;
  /** The promotion actually in effect right now, if any. */
  activePromo: VolumePromo | null;
  /** Whole percent off, comparing the paid price against the highest reference. */
  savedPercent: number;
  /** Milliseconds until the promotion ends; null when none is running. */
  endsInMs: number | null;
}

function parseTime(value: string | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** The promotion in force at `now`, or null. */
export function activePromoFor(
  volume: Pick<MangaVolume, "promo">,
  now: number = Date.now()
): VolumePromo | null {
  const promo = volume?.promo;
  if (!promo) return null;

  const percent = Number(promo.percent);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 90) return null;

  const endsAt = parseTime(promo.endsAt);
  if (endsAt === null || endsAt <= now) return null;

  const startsAt = parseTime(promo.startsAt);
  if (startsAt !== null && startsAt > now) return null;

  return promo;
}

export function priceVolume(
  volume: Pick<MangaVolume, "price" | "originalPrice" | "promo">,
  now: number = Date.now()
): PricedVolume {
  const basePrice = Math.max(0, Number(volume?.price) || 0);
  const original = Number(volume?.originalPrice);
  const listPrice = Number.isFinite(original) && original > basePrice ? original : null;

  const promo = activePromoFor(volume, now);
  if (!promo) {
    return {
      price: basePrice,
      wasPrice: null,
      listPrice,
      activePromo: null,
      savedPercent: listPrice ? Math.round((1 - basePrice / listPrice) * 100) : 0,
      endsInMs: null,
    };
  }

  // Round to piastres so the displayed price and the charged price agree.
  const price = Math.round(basePrice * (1 - promo.percent / 100) * 100) / 100;
  const reference = listPrice ?? basePrice;

  return {
    price,
    wasPrice: basePrice,
    listPrice,
    activePromo: promo,
    savedPercent: reference > 0 ? Math.round((1 - price / reference) * 100) : 0,
    endsInMs: Math.max(0, (parseTime(promo.endsAt) as number) - now),
  };
}

/** Convenience for the many call sites that only need the number. */
export function effectivePrice(
  volume: Pick<MangaVolume, "price" | "originalPrice" | "promo">,
  now: number = Date.now()
): number {
  return priceVolume(volume, now).price;
}
