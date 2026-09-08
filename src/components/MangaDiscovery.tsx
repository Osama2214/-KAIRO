"use client";

import React, { useState, useMemo } from "react";
import { KairoImage } from "@/components/KairoImage";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowRight, Heart } from "lucide-react";
import { MangaVolume } from "@/data/manga";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/useCartStore";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { useWishlistStore, useMounted } from "@/store/useWishlistStore";
import { useUIStore } from "@/store/useUIStore";
import { LiveEditButton } from "@/components/admin/LiveEditButton";
import { useTranslation } from "@/hooks/useTranslation";

export function MangaDiscovery() {
  const router = useRouter();
  const { locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const mangaDiscoveryConfig = useStorefrontStore((state) => state.mangaDiscoveryConfig);
  const mangaDiscoveryArabicConfig = useStorefrontStore((state) => state.mangaDiscoveryArabicConfig);
  const storeVolumes = useStorefrontStore((state) => state.volumes);
  const addItem = useCartStore((state) => state.addItem);
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const mounted = useMounted();
  const { openCart } = useUIStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [userSelectedTab, setUserSelectedTab] = useState<"POPULAR" | "TOP_RATED" | "BEST_SELLERS" | "RECENTLY_ADDED" | null>(null);
  const activeTab = userSelectedTab ?? mangaDiscoveryConfig?.defaultTab ?? "POPULAR";
  const setActiveTab = (tab: "POPULAR" | "TOP_RATED" | "BEST_SELLERS" | "RECENTLY_ADDED") => setUserSelectedTab(tab);

  const badgeText = isArabic
    ? (mangaDiscoveryArabicConfig?.badgeText || "بحث سريع في الأرشيف")
    : (mounted && mangaDiscoveryConfig?.badgeText ? mangaDiscoveryConfig.badgeText : "INSTANT ARCHIVAL LOOKUP");
  const title = isArabic
    ? (mangaDiscoveryArabicConfig?.title || "ابحث عن مجلدك التالي")
    : (mounted && mangaDiscoveryConfig?.title ? mangaDiscoveryConfig.title : "FIND YOUR NEXT MANGA");
  const description = isArabic
    ? (mangaDiscoveryArabicConfig?.description || "ابحث بالعناوين أو المؤلفين أو التصنيفات أو رقم التسجيل.")
    : (mounted && mangaDiscoveryConfig?.description ? mangaDiscoveryConfig.description : "Query across titles, authors, genres, or ISBN registry.");
  const searchPlaceholder = isArabic
    ? (mangaDiscoveryArabicConfig?.searchPlaceholder || "ابحث عن مانجا أو مؤلف أو سلسلة...")
    : (mounted && mangaDiscoveryConfig?.searchPlaceholder ? mangaDiscoveryConfig.searchPlaceholder : "Search manga, author, or series... (e.g. Eiichiro Oda, Dark Fantasy, Solo Leveling)");
  const catalogLinkText = isArabic
    ? (mangaDiscoveryArabicConfig?.catalogLinkText || "الانتقال إلى الكتالوج الكامل")
    : (mounted && mangaDiscoveryConfig?.catalogLinkText ? mangaDiscoveryConfig.catalogLinkText : "GO TO COMPLETE MANGA CATALOG");
  const displayCount = mangaDiscoveryConfig?.displayCount || 4;

  const handleCardClick = (volumeId: string) => {
    router.push(`/manga/${volumeId}`);
  };

  const filteredItems = useMemo(() => {
    let list: MangaVolume[] = [...storeVolumes];

    if (activeTab === "POPULAR") {
      list = list.filter((v) => v.isTrending);
    } else if (activeTab === "TOP_RATED") {
      list = list.filter((v) => v.rating >= 4.9);
    } else if (activeTab === "BEST_SELLERS") {
      list = list.filter((v) => v.stock > 25);
    } else if (activeTab === "RECENTLY_ADDED") {
      list = list.filter((v) => v.isNewRelease || v.volumeNumber === 1);
    }

    if (!searchTerm.trim()) return list.slice(0, displayCount);

    const term = searchTerm.toLowerCase();
    return list.filter(
      (v) =>
        v.title.toLowerCase().includes(term) ||
        v.seriesTitle.toLowerCase().includes(term) ||
        v.author.toLowerCase().includes(term) ||
        v.genre.some((g) => g.toLowerCase().includes(term))
    ).slice(0, displayCount);
  }, [searchTerm, activeTab, storeVolumes, displayCount]);

  return (
    <section className="py-14 sm:py-24 px-4 sm:px-8 md:px-12 bg-ink border-t border-ink-border/60">
      <div className="max-w-7xl mx-auto">
        {/* Section Title */}
        <div className="relative text-center max-w-2xl mx-auto mb-6 sm:mb-10 space-y-1.5 sm:space-y-2">
          <div className="inline-flex items-center justify-center gap-2">
            <span className="text-[10px] sm:text-[11px] font-mono tracking-[0.22em] sm:tracking-[0.25em] text-gold uppercase">
              {badgeText}
            </span>
            <LiveEditButton
              target={{ type: "manga-discovery" }}
              label="Edit Discovery"
              variant="floating"
              size="xs"
            />
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight uppercase text-paper font-sans">
            {title}
          </h2>
          <p className="text-[11px] sm:text-xs text-text-muted">
            {description}
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto relative mb-5 sm:mb-6">
          <div className="relative flex items-center bg-ink-surface border border-ink-border rounded-sm shadow-2xl focus-within:border-gold transition-colors px-3 sm:px-4">
            <Search strokeWidth={1.5} className="w-4 h-4 sm:w-5 sm:h-5 text-gold shrink-0 rtl:ml-2 rtl:mr-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full py-3 sm:py-4.5 px-2.5 sm:px-3 bg-transparent text-paper placeholder-text-muted/60 text-xs sm:text-sm focus:outline-none font-sans"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-[10px] sm:text-xs font-mono text-text-muted hover:text-paper shrink-0 ml-2"
              >
                {isArabic ? "مسح" : "RESET"}
              </button>
            )}
          </div>
        </div>

        {/* Tabs Below Search */}
        <div className="flex justify-center items-center gap-1.5 sm:gap-3 flex-wrap mb-8 sm:mb-12">
          {[
            { id: "POPULAR" as const, label: isArabic ? "الأكثر شعبية" : "POPULAR" },
            { id: "TOP_RATED" as const, label: isArabic ? "الأعلى تقييماً" : "TOP RATED" },
            { id: "BEST_SELLERS" as const, label: isArabic ? "الأكثر مبيعاً" : "BEST SELLERS" },
            { id: "RECENTLY_ADDED" as const, label: isArabic ? "وصل حديثاً" : "RECENTLY ADDED" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-sm text-[10px] sm:text-xs font-mono tracking-wider sm:tracking-widest uppercase transition-all ${
                activeTab === tab.id
                  ? "bg-paper text-ink font-bold shadow-md"
                  : "bg-ink-surface text-text-muted hover:text-paper border border-ink-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Preview Cards Results (2-column on mobile, 4-column on desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {filteredItems.map((volume) => (
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
              className="group bg-ink-surface/40 border border-ink-border/70 rounded-sm overflow-hidden hover:border-gold/60 transition-all duration-300 flex flex-col justify-between cursor-pointer hover:shadow-xl hover:shadow-black/50 select-none"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-ink">
                <KairoImage
                  src={volume.coverImage}
                  alt={volume.title}
                  sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                />

                {/* Live Edit Volume Button */}
                <LiveEditButton
                  target={{ type: "volume", volumeId: volume.id }}
                  label="Edit"
                  variant="card"
                  size="xs"
                />
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none z-10">
                  <span className="px-2 py-0.5 rounded-xs bg-ink/90 text-[9px] font-mono tracking-wider text-gold border border-ink-border">
                    {isArabic ? "المجلد" : "VOL."} {volume.volumeNumber < 10 ? `0${volume.volumeNumber}` : volume.volumeNumber}
                  </span>
                  {volume.stock <= 0 && (
                    <span className="px-2 py-0.5 rounded-xs bg-red-950/90 border border-red-800/80 text-[8px] font-mono tracking-wider text-red-400 font-bold uppercase">
                      {isArabic ? "نفد" : "OUT OF STOCK"}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWishlist(volume);
                  }}
                  className={`absolute top-2.5 right-2.5 p-1.5 rounded-xs backdrop-blur-md border transition-all z-10 active:scale-90 ${
                    mounted && isInWishlist(volume.id)
                      ? "bg-ink/90 border-vermilion text-vermilion"
                      : "bg-ink/80 border-ink-border text-paper-muted hover:text-gold hover:border-gold/60 opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
                  }`}
                  title={mounted && isInWishlist(volume.id) ? (isArabic ? "محفوظ في المفضلة" : "Saved in Wishlist") : (isArabic ? "إضافة للمفضلة" : "Save to Wishlist")}
                  aria-label="Wishlist"
                >
                  <Heart
                    strokeWidth={1.4}
                    className={`w-3.5 h-3.5 transition-transform ${
                      mounted && isInWishlist(volume.id) ? "fill-vermilion text-vermilion scale-110" : ""
                    }`}
                  />
                </button>
              </div>

              <div className="p-3 sm:p-4 pb-3.5 sm:pb-4 flex flex-col justify-between flex-1">
                <div>
                  <span className="text-[9px] sm:text-[10px] font-mono tracking-widest text-gold uppercase block truncate">
                    {volume.seriesTitle}
                  </span>
                  <h3 className="text-[11px] sm:text-xs font-bold text-paper tracking-wide group-hover:text-gold transition-colors line-clamp-1 mt-0.5 sm:mt-1 block">
                    {volume.title}
                  </h3>
                  <p className="text-[9px] sm:text-[10px] text-text-muted mt-0.5 truncate">{isArabic ? "تأليف" : "By"} {volume.author}</p>
                </div>

                <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 pb-0.5 border-t border-ink-border/50 flex items-center justify-between font-mono text-[11px] sm:text-xs">
                  <span className="text-paper font-bold">{formatPrice(volume.price)}</span>
                  {volume.stock <= 0 ? (
                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-ink-surface/80 border border-ink-border text-text-muted text-[8px] sm:text-[9px] font-mono uppercase rounded-xs">
                      {isArabic ? "نفد" : "OUT OF STOCK"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addItem(volume, 1);
                        openCart();
                      }}
                      className="px-2.5 sm:px-3 py-1 bg-ink border border-ink-border hover:border-vermilion hover:bg-vermilion hover:text-white text-[9px] sm:text-[10px] font-bold uppercase transition-colors rounded-xs z-10 active:scale-95"
                    >
                      {isArabic ? "+ أضف" : "+ ADD"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Link to full catalog */}
        <div className="text-center mt-8 sm:mt-12">
          <Link
            href="/manga"
            className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-text-muted hover:text-gold transition-colors"
          >
            <span>{catalogLinkText}</span>
            <ArrowRight strokeWidth={1.4} className={`w-3.5 h-3.5 ${isRTL ? "rotate-180" : ""}`} />
          </Link>
        </div>
      </div>
    </section>
  );
}
