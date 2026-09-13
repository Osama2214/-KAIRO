"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ShoppingBag } from "lucide-react";
import type { MangaVolume } from "@/data/manga";
import { AnimeVerseImage } from "@/components/AnimeVerseImage";
import { PriceTag, PromoBadge, PromoTimer } from "@/components/PriceTag";
import { LiveEditButton } from "@/components/admin/LiveEditButton";
import { StarRating } from "@/components/StarRating";
import { useCartStore } from "@/store/useCartStore";
import { useUIStore } from "@/store/useUIStore";
import { useWishlistStore, useMounted } from "@/store/useWishlistStore";
import { productHref, volumeBadgeLabel } from "@/lib/utils";
import { isBook, withVariantSummary } from "@/lib/variants";

/**
 * A product in a grid — mainly figures and posters. Mirrors the manga card, but a product with
 * several variants sends the shopper to its page to choose one; a single
 * variant can be added straight from the card.
 */
export function ShopProductCard({
  product,
  isArabic,
  layout = "catalog",
}: {
  product: MangaVolume;
  isArabic: boolean;
  /** "catalog" matches the /manga grid card; "home" matches the New Releases card. */
  layout?: "catalog" | "home";
}) {
  const home = layout === "home";
  const router = useRouter();
  const item = withVariantSummary(product);
  const variants = item.variants || [];
  const href = productHref(item);
  const addItem = useCartStore((state) => state.addItem);
  const { openCart } = useUIStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const mounted = useMounted();
  const saved = mounted && isInWishlist(item.id);
  // Books use this card too (in mixed rows like deals and "picked for you"):
  // they are always added straight to the cart and are labelled by series.
  const book = isBook(item);
  const franchise = book ? item.seriesTitle : (isArabic && item.merch?.franchiseAr) || item.merch?.franchise || "";
  const soldOut = item.stock <= 0;
  const comingSoon = Boolean(item.comingSoon);
  const single = variants.length === 1 ? variants[0] : null;
  const directAdd = book || Boolean(single);

  return (
    <div
      onClick={() => router.push(href)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
      className={`group ${home ? "bg-ink-surface/30" : "bg-ink-surface/40"} border border-ink-border/70 rounded-sm overflow-hidden hover:border-gold/60 transition-all duration-300 flex flex-col justify-between cursor-pointer hover:shadow-xl hover:shadow-black/50 select-none`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-ink">
        <AnimeVerseImage
          src={item.coverImage}
          alt={item.title}
          sizes={home ? "(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw" : "(max-width: 1023px) 50vw, 33vw"}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${home ? "ease-out " : ""}pointer-events-none`}
        />
        <LiveEditButton target={{ type: "volume", volumeId: item.id }} label="Edit" variant="card" size="xs" />
        {/* On a phone the card is too narrow for the countdown to sit under
            the heart beside the badges, so it moves to the image's bottom corner. */}
        <div className="sm:hidden absolute bottom-2 end-2 flex pointer-events-none z-10">
          <PromoTimer volume={item} isArabic={isArabic} />
        </div>
        <div className="absolute top-2 sm:top-2.5 start-2 sm:start-2.5 flex flex-col items-start gap-1 pointer-events-none z-10 max-w-[70%]">
          {home && <PromoBadge volume={item} isArabic={isArabic} />}
          <span className="px-2 py-0.5 rounded-xs bg-ink/90 backdrop-blur-md text-[9px] font-mono tracking-wider text-gold border border-ink-border truncate max-w-full">
            {volumeBadgeLabel(item, isArabic)}
          </span>
          {!home && <PromoBadge volume={item} isArabic={isArabic} />}
          {comingSoon ? (
            <span className="px-2 py-0.5 rounded-xs bg-gold/15 border border-gold/60 text-[8px] font-mono font-bold tracking-wider text-gold uppercase">
              {isArabic ? "قريبًا" : "COMING SOON"}
            </span>
          ) : soldOut && (
            <span className="px-2 py-0.5 rounded-xs bg-red-950/90 border border-red-800/80 text-[8px] font-mono font-bold tracking-wider text-red-400 uppercase">
              {isArabic ? "نفد من المخزن" : "OUT OF STOCK"}
            </span>
          )}
        </div>
        {/* Top corner: the wishlist heart, and under it the offer countdown.
            While the heart is hidden (desktop, not hovered) the countdown
            moves up into its place. */}
        <div className={`absolute z-10 flex flex-col items-end gap-1.5 ${home ? "top-2 sm:top-2.5 end-2 sm:end-2.5" : "top-2 end-2"}`}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(item);
            }}
            className={
              home
                ? `items-center justify-center p-1.5 rounded-xs backdrop-blur-md border transition-colors active:scale-90 ${
                    saved
                      ? "flex bg-ink/90 border-vermilion text-vermilion"
                      : "flex sm:hidden sm:group-hover:flex bg-ink/80 border-ink-border text-paper-muted hover:text-gold hover:border-gold/60"
                  }`
                : `w-7 h-7 rounded-full items-center justify-center backdrop-blur-md border transition-colors active:scale-90 shadow-sm ${
                    saved
                      ? "flex bg-ink/95 border-vermilion text-vermilion"
                      : "flex sm:hidden sm:group-hover:flex bg-black/60 border-white/15 text-paper-muted hover:text-gold hover:border-gold/60"
                  }`
            }
            aria-label={isArabic ? "المفضلة" : "Wishlist"}
          >
            <Heart strokeWidth={home ? 1.4 : 1.5} className={`w-3.5 h-3.5 transition-transform ${saved ? "fill-vermilion text-vermilion scale-110" : ""}`} />
          </button>
          <span className="hidden sm:flex">
            <PromoTimer volume={item} isArabic={isArabic} />
          </span>
        </div>
      </div>

      <div className={`${home ? "p-4" : "p-3 sm:p-4"} flex flex-col justify-between flex-1`}>
        <div>
          <span className={`${home ? "text-[10px]" : "text-[9px]"} font-mono tracking-widest text-gold uppercase block truncate`}>
            {franchise || volumeBadgeLabel(item, isArabic)}
          </span>
          <h3 className={`text-xs sm:text-sm font-bold text-paper tracking-wide group-hover:text-gold transition-colors line-clamp-1 ${home ? "mt-1" : "mt-0.5"}`}>
            <Link href={href} onClick={(e) => e.stopPropagation()}>{item.title}</Link>
          </h3>
          {home ? (
            // Same row as New Releases: stars and score.
            <div className="flex items-center gap-1 mt-2 text-[11px] font-mono text-text-muted">
              <StarRating value={item.rating} size="xs" />
              <span className="ms-1 text-paper font-semibold">{(item.rating || 0).toFixed(1)}</span>
            </div>
          ) : (
            variants.length > 1 && (
              <p className="text-[10px] text-text-muted mt-0.5 line-clamp-1">
                {variants.map((v) => (isArabic && v.labelAr) || v.label).join(" · ")}
              </p>
            )
          )}
        </div>

        <div className={`${home ? "mt-5 pt-3" : "mt-3 sm:mt-4 pt-2.5 sm:pt-3"} border-t border-ink-border/50 flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5`}>
          <div className="flex flex-wrap items-baseline gap-x-1.5 min-w-0">
            {variants.length > 1 && (
              <span className="text-[9px] sm:text-[10px] font-mono text-text-muted uppercase w-full sm:w-auto">{isArabic ? "يبدأ من" : "From"}</span>
            )}
            <PriceTag volume={item} isArabic={isArabic} showTimer={false} />
          </div>
          {comingSoon ? (
            <button type="button" disabled className="grow basis-auto px-3 py-2 bg-gold/10 border border-gold/40 text-gold text-[9px] font-mono font-bold tracking-widest uppercase rounded-sm cursor-not-allowed whitespace-nowrap">
              {isArabic ? "أضف للمفضلة" : "WISHLIST IT"}
            </button>
          ) : soldOut ? (
            <button
              type="button"
              disabled
              className="grow basis-auto px-3 py-2 bg-ink-surface/90 border border-ink-border text-text-muted text-[9px] font-mono font-bold tracking-widest uppercase rounded-sm cursor-not-allowed opacity-80 whitespace-nowrap"
            >
              {isArabic ? "نفد من المخزن" : "OUT OF STOCK"}
            </button>
          ) : directAdd ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addItem(item, 1, single?.sku);
                openCart();
              }}
              className="grow basis-auto px-3 py-2 bg-ink-elevated border border-ink-border hover:border-vermilion hover:bg-vermilion hover:text-white text-paper text-[10px] font-mono font-bold tracking-wider uppercase transition-all rounded-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-95 z-10 whitespace-nowrap"
            >
              <ShoppingBag strokeWidth={1.3} className="w-3 h-3" />
              {isArabic ? "أضف للسلة" : "ADD TO CART"}
            </button>
          ) : (
            <Link
              href={href}
              onClick={(e) => e.stopPropagation()}
              className="grow basis-auto px-3 py-2 bg-ink-elevated border border-ink-border hover:border-gold hover:text-gold text-paper text-[10px] font-mono font-bold tracking-wider uppercase transition-all rounded-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-95 z-10 whitespace-nowrap"
            >
              {isArabic ? "اختر" : "CHOOSE OPTION"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
