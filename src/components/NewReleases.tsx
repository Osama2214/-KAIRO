"use client";

import React from "react";
import { YujiImage } from "@/components/YujiImage";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, ShoppingBag, Eye, ArrowRight, Heart } from "lucide-react";
import { ALL_VOLUMES, MangaVolume } from "@/data/manga";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore, useMounted } from "@/store/useWishlistStore";
import { useUIStore } from "@/store/useUIStore";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { formatPrice } from "@/lib/utils";
import { LiveEditButton } from "@/components/admin/LiveEditButton";
import { useTranslation } from "@/hooks/useTranslation";

export function NewReleases() {
  const router = useRouter();
  const { locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const addItem = useCartStore((state) => state.addItem);
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const mounted = useMounted();
  const { openCart, openReader } = useUIStore();
  const volumes = useStorefrontStore((state) => state.volumes);
  const newReleasesConfig = useStorefrontStore((state) => state.newReleasesConfig);
  const newReleasesArabicConfig = useStorefrontStore((state) => state.newReleasesArabicConfig);

  const activeVolumes = volumes && volumes.length > 0 ? volumes : ALL_VOLUMES;
  const badgeText = isArabic
    ? (newReleasesArabicConfig?.badgeText || "وصل حديثاً للأرشيف")
    : (newReleasesConfig?.badgeText || "JUST ARCHIVED");
  const headline = isArabic
    ? (newReleasesArabicConfig?.headline || "أحدث الإصدارات")
    : (newReleasesConfig?.headline || "NEW RELEASES");
  const viewAllText = isArabic
    ? (newReleasesArabicConfig?.viewAllText || "عرض الأرشيف الكامل")
    : (newReleasesConfig?.viewAllText || "VIEW COMPLETE ARCHIVE");

  const newItems = React.useMemo(() => {
    const tagged = activeVolumes.filter((v) => v.isNewRelease);
    return tagged.length >= 4 ? tagged.slice(0, 8) : activeVolumes.slice(0, 8);
  }, [activeVolumes]);

  const handleCardClick = (volumeId: string) => {
    router.push(`/manga/${volumeId}`);
  };

  const handleAddToCart = (e: React.MouseEvent, volume: MangaVolume) => {
    e.preventDefault();
    e.stopPropagation();
    if (volume.stock <= 0) return;
    addItem(volume, 1);
    openCart();
  };

  const handlePreview = (e: React.MouseEvent, volume: MangaVolume) => {
    e.preventDefault();
    e.stopPropagation();
    openReader(volume);
  };

  return (
    <section id="new-releases" className="py-24 px-6 md:px-12 bg-ink border-t border-ink-border/60">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 pb-4 border-b border-ink-border/70 gap-4">
          <div>
            <span className="text-[11px] font-mono tracking-[0.25em] text-gold uppercase block mb-1">
              {badgeText}
            </span>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-paper font-sans">
                {headline}
              </h2>
              <LiveEditButton target={{ type: "new-releases" }} label={isArabic ? "تعديل الإصدارات" : "Edit Releases"} variant="floating" size="xs" />
            </div>
          </div>
          <Link
            href="/manga"
            className="flex items-center gap-2 text-xs font-mono tracking-widest text-text-muted hover:text-paper transition-colors group"
          >
            <span>{viewAllText}</span>
            <ArrowRight strokeWidth={1.4} className={`w-3.5 h-3.5 transition-transform ${isRTL ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
          </Link>
        </div>

        {/* 4-column Responsive Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {newItems.map((volume) => (
            <div
              key={volume.id}
              onClick={() => handleCardClick(volume.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCardClick(volume.id);
                }
              }}
              className="group bg-ink-surface/30 border border-ink-border/70 rounded-sm overflow-hidden hover:border-gold/60 transition-all duration-300 flex flex-col justify-between cursor-pointer hover:shadow-xl hover:shadow-black/50 select-none"
            >
              {/* Cover Media */}
              <div className="relative aspect-[3/4] overflow-hidden bg-ink">
                <YujiImage
                  src={volume.coverImage}
                  alt={volume.title}
                  sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out pointer-events-none"
                />

                {/* Live Edit Volume Button */}
                <LiveEditButton
                  target={{ type: "volume", volumeId: volume.id }}
                  label="Edit"
                  variant="card"
                  size="xs"
                />

                {/* Badges */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none z-10">
                  <span className="px-2 py-0.5 rounded-xs bg-ink/90 backdrop-blur-md text-[9px] font-mono tracking-wider text-gold border border-ink-border">
                    {isArabic ? "المجلد" : "VOL."} {volume.volumeNumber < 10 ? `0${volume.volumeNumber}` : volume.volumeNumber}
                  </span>
                  {volume.stock <= 0 && (
                    <span className="px-2 py-0.5 rounded-xs bg-red-950/90 border border-red-800/80 text-[8px] font-mono tracking-wider text-red-400 font-bold uppercase">
                      {isArabic ? "نفد" : "OUT OF STOCK"}
                    </span>
                  )}
                </div>

                {/* Floating Actions */}
                <div className="absolute top-2 sm:top-2.5 right-2 sm:right-2.5 flex flex-col gap-1.5 z-10">
                  {/* Wishlist Trigger */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleWishlist(volume);
                    }}
                    className={`p-1.5 rounded-xs backdrop-blur-md border transition-all active:scale-90 ${
                      mounted && isInWishlist(volume.id)
                        ? "bg-ink/90 border-vermilion text-vermilion opacity-100"
                        : "bg-ink/80 border-ink-border text-paper-muted hover:text-gold hover:border-gold/60 opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
                    }`}
                    title={mounted && isInWishlist(volume.id) ? "Saved in Wishlist" : "Save to Wishlist"}
                    aria-label="Wishlist"
                  >
                    <Heart
                      strokeWidth={1.4}
                      className={`w-3.5 h-3.5 transition-transform ${
                        mounted && isInWishlist(volume.id) ? "fill-vermilion text-vermilion scale-110" : ""
                      }`}
                    />
                  </button>

                  {/* Quick Preview Eye */}
                  <button
                    type="button"
                    onClick={(e) => handlePreview(e, volume)}
                    className="p-1.5 rounded-xs bg-ink/80 backdrop-blur-md border border-ink-border text-paper-muted hover:text-gold hover:border-gold transition-colors opacity-80 sm:opacity-0 sm:group-hover:opacity-100 active:scale-95"
                    title="Preview sample pages"
                  >
                    <Eye strokeWidth={1.4} className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Meta & Action */}
              <div className="p-4 flex flex-col justify-between flex-1">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-gold uppercase block">
                    {volume.seriesTitle}
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-paper tracking-wide group-hover:text-gold transition-colors line-clamp-1 mt-1 block">
                    {volume.title}
                  </h3>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 mt-2 text-[11px] font-mono text-text-muted">
                    <div className="flex items-center text-gold">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          strokeWidth={1}
                          className="w-3 h-3 fill-gold text-gold"
                        />
                      ))}
                    </div>
                    <span className="ml-1 text-paper font-semibold">{volume.rating.toFixed(1)}</span>
                  </div>
                </div>

                {/* Price and Cart Button */}
                <div className="mt-5 pt-3 border-t border-ink-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-sm font-mono font-extrabold text-paper">
                    {formatPrice(volume.price)}
                  </span>
                  {volume.stock <= 0 ? (
                    <button
                      type="button"
                      disabled
                      className="w-full sm:w-auto px-3 py-2 bg-ink-surface/90 border border-ink-border text-text-muted text-[9px] font-mono font-bold tracking-widest uppercase rounded-sm cursor-not-allowed opacity-80"
                    >
                      {isArabic ? "نفد من المخزن" : "OUT OF STOCK"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(e, volume)}
                      className="w-full sm:w-auto px-4 py-2 bg-ink-elevated border border-ink-border hover:border-vermilion hover:bg-vermilion hover:text-white text-paper text-[10px] font-mono font-bold tracking-widest uppercase transition-all rounded-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-95 z-10"
                    >
                      <ShoppingBag strokeWidth={1.3} className="w-3 h-3" />
                      {isArabic ? "أضف للسلة" : "ADD TO CART"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
