"use client";

import React, { use, useMemo } from "react";
import { notFound, useRouter } from "next/navigation";
import { BookOpen, Plus, Eye, User, Heart } from "lucide-react";
import { ALL_SERIES, ALL_VOLUMES, type MangaVolume, type Series } from "@/data/manga";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore, useMounted } from "@/store/useWishlistStore";
import { useUIStore } from "@/store/useUIStore";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { formatPrice } from "@/lib/utils";
import { LiveEditButton } from "@/components/admin/LiveEditButton";
import { useTranslation } from "@/hooks/useTranslation";
import { StarRating } from "@/components/StarRating";
import { AnimeVerseImage } from "@/components/AnimeVerseImage";
import { CatalogPending } from "@/components/CatalogPending";

interface SeriesPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Resolves the series before the view mounts, so the view can assume it exists
 * and keep its hook order stable no matter how the lookup goes.
 */
export default function SeriesPage({ params }: SeriesPageProps) {
  const resolvedParams = use(params);
  const catalogLoaded = useStorefrontStore((state) => state.catalogLoaded);
  const allSeries = useStorefrontStore((state) => state.series);
  const seriesList = allSeries && allSeries.length > 0 ? allSeries : ALL_SERIES;
  const series = seriesList.find((s) => s.slug === resolvedParams.slug);

  if (!series) {
    if (!catalogLoaded) return <CatalogPending />;
    notFound();
  }
  return <SeriesView series={series} />;
}

function SeriesView({ series }: { series: Series }) {
  const router = useRouter();
  const { locale } = useTranslation();
  const isArabic = locale === "ar";

  const allVolumes = useStorefrontStore((state) => state.volumes);
  const activeVolumes = allVolumes && allVolumes.length > 0 ? allVolumes : ALL_VOLUMES;

  const seriesEntries = activeVolumes.filter((v) => v.seriesSlug === series.slug);
  // A box set is a way to buy the books, not a book — it does not belong in the
  // volume grid, the volume count, or the average rating.
  const seriesVolumes = seriesEntries.filter((v) => v.format !== "Box Set");
  const seriesBoxes = seriesEntries.filter((v) => v.format === "Box Set");

  // The star row used to read a hard-coded 4.9 regardless of the catalogue.
  const seriesRating = seriesVolumes.length
    ? seriesVolumes.reduce((sum, v) => sum + (Number(v.rating) || 0), 0) / seriesVolumes.length
    : 0;
  const addItem = useCartStore((state) => state.addItem);
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const mounted = useMounted();
  const { openCart, openReader } = useUIStore();

  const handleCardClick = (volumeId: string) => {
    router.push(`/manga/${volumeId}`);
  };

  /**
   * What "add the whole series" should actually put in the basket.
   *
   * Adding every volume one by one ignored the box set sitting right there at a
   * discount — and, because the box is itself part of the series listing, it
   * used to be added alongside the volumes it contains, charging twice for the
   * same books. This picks the box that covers the most of the series, then
   * tops up with anything it leaves out.
   */
  const seriesBasket = useMemo(() => {
    const wanted = seriesVolumes.filter((v) => v.stock > 0);
    if (wanted.length === 0) return null;

    const wantedIds = new Set(wanted.map((v) => v.id));
    const separatelyTotal = wanted.reduce((sum, v) => sum + (Number(v.price) || 0), 0);

    // Only a box that is in stock and cheaper than its own contents is worth
    // steering someone towards.
    let bestBox: (typeof seriesBoxes)[number] | null = null;
    let bestCovered: string[] = [];

    for (const box of seriesBoxes) {
      if ((box.stock || 0) <= 0) continue;
      const covered = (box.bundleOf || []).filter((id) => wantedIds.has(id));
      if (covered.length === 0) continue;

      const coveredValue = covered.reduce((sum, id) => {
        const volume = wanted.find((v) => v.id === id);
        return sum + (Number(volume?.price) || 0);
      }, 0);
      if (Number(box.price) >= coveredValue) continue;

      if (covered.length > bestCovered.length) {
        bestBox = box;
        bestCovered = covered;
      }
    }

    if (!bestBox) {
      return { box: null, extras: wanted, total: separatelyTotal, saving: 0 };
    }

    const coveredSet = new Set(bestCovered);
    const extras = wanted.filter((v) => !coveredSet.has(v.id));
    const total =
      Number(bestBox.price) + extras.reduce((sum, v) => sum + (Number(v.price) || 0), 0);

    return {
      box: bestBox,
      extras,
      total,
      saving: Math.max(0, Math.round((separatelyTotal - total) * 100) / 100),
    };
  }, [seriesVolumes, seriesBoxes]);

  const handleAddAllVolumes = () => {
    if (!seriesBasket) return;
    if (seriesBasket.box) addItem(seriesBasket.box, 1);
    seriesBasket.extras.forEach((volume: MangaVolume) => addItem(volume, 1));
    openCart();
  };

  return (
    <div className="min-h-screen bg-ink text-paper">
      {/* Series Hero Banner */}
      <div className="relative min-h-[380px] sm:min-h-[440px] sm:h-[65vh] flex items-end overflow-hidden border-b border-ink-border/80 pt-20 sm:pt-0">
        {/* Banner Media */}
        <div className="absolute inset-0">
          <AnimeVerseImage
            src={series.bannerImage}
            alt={series.title}
            sizes="100vw"
            preload
            className="w-full h-full object-cover object-center filter brightness-50"
          />
          <div className="absolute inset-0 bg-linear-to-t from-ink via-ink/60 to-transparent" />
        </div>

        {/* Japanese Title Watermark */}
        <div className="absolute top-16 sm:top-20 right-6 sm:right-10 font-serif text-6xl sm:text-8xl md:text-9xl font-bold text-white/[0.04] pointer-events-none select-none">
          {series.japaneseTitle}
        </div>

        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto w-full px-3.5 sm:px-6 md:px-12 pb-6 sm:pb-12 z-10 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xs bg-vermilion/90 text-white font-mono text-[9px] sm:text-[10px] tracking-widest uppercase">
                {isArabic ? (series.status === "Ongoing" ? "مستمرة" : "مكتملة") : series.status}
              </span>
              <span className="text-xs font-serif text-gold tracking-widest">
                {series.japaneseTitle}
              </span>
            </div>
            <LiveEditButton
              target={{ type: "series", seriesSlug: series.slug }}
              label="Edit Series"
              variant="floating"
              size="sm"
            />
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold tracking-tight uppercase font-sans">
            {series.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-[11px] sm:text-xs font-mono text-paper-muted">
            <div className="flex items-center gap-1.5">
              <User strokeWidth={1.4} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
              <span>{isArabic ? `تأليف ورسم: ${series.author}` : `Written & Illustrated by ${series.author}`}</span>
            </div>
            <div className="flex items-center gap-1 text-gold">
              <StarRating value={seriesRating} size="sm" />
              <span className="text-paper font-semibold ml-1">{seriesRating.toFixed(1)} / 5.0</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen strokeWidth={1.4} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gold" />
              <span>{isArabic ? `${series.totalVolumes} مجلداً إجمالاً` : `${series.totalVolumes} Total Volumes`}</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-text-muted max-w-2xl leading-relaxed">
            {series.description}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-4">
            <a
              href="#volumes"
              className="w-full sm:w-auto text-center px-6 sm:px-8 py-3 bg-paper text-ink font-bold text-xs tracking-[0.2em] uppercase rounded-sm hover:bg-vermilion hover:text-white transition-colors active:scale-95"
            >
              {isArabic ? "استعراض المجلدات" : "EXPLORE VOLUMES"}
            </a>
            <button
              onClick={handleAddAllVolumes}
              disabled={!seriesBasket}
              className="w-full sm:w-auto text-center px-5 sm:px-6 py-3 bg-ink-surface border border-ink-border text-paper font-semibold text-xs tracking-[0.15em] sm:tracking-[0.2em] uppercase rounded-sm hover:border-gold hover:text-gold transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isArabic ? "إضافة السلسلة كاملة للسلة" : "ADD ENTIRE SERIES TO CART"}
              {seriesBasket && seriesBasket.saving > 0 && (
                <span className="ms-2 text-gold normal-case tracking-normal">
                  {isArabic
                    ? `— وفّر ${formatPrice(seriesBasket.saving)}`
                    : `— save ${formatPrice(seriesBasket.saving)}`}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Volumes Section */}
      <section id="volumes" className="py-12 sm:py-20 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto">
        <div className="mb-10 sm:mb-12 pb-4 border-b border-ink-border/70 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono tracking-[0.25em] text-gold uppercase block mb-1">
              {isArabic ? "التسلسل الزمني الرسمي" : "CHRONOLOGICAL CANON"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-paper font-sans">
              {isArabic ? "المجلدات المتوفرة" : "AVAILABLE VOLUMES"}
            </h2>
          </div>
          <span className="text-xs font-mono text-text-muted">
            {isArabic ? `${seriesVolumes.length} مجلد في الأرشيف` : `${seriesVolumes.length} Volumes in Archive`}
          </span>
        </div>

        {/* Volumes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {seriesVolumes.map((volume) => (
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
              {/* Media */}
              <div className="relative aspect-[3/4] overflow-hidden bg-ink">
                <AnimeVerseImage
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
                <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none z-10">
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-xs bg-ink/90 backdrop-blur-md text-[8px] sm:text-[9px] font-mono tracking-wider text-gold border border-ink-border">
                    {isArabic ? "المجلد" : "VOL."} {volume.volumeNumber < 10 ? `0${volume.volumeNumber}` : volume.volumeNumber}
                  </span>
                  {volume.stock <= 0 && (
                    <span className="px-1.5 py-0.5 rounded-xs bg-red-950/90 border border-red-800/80 text-[7px] sm:text-[8px] font-mono font-bold tracking-wider text-red-400 uppercase">
                      {isArabic ? "نفد" : "OUT OF STOCK"}
                    </span>
                  )}
                </div>
                <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleWishlist(volume);
                    }}
                    className={`w-7 h-7 rounded-full backdrop-blur-md border transition-all flex items-center justify-center active:scale-90 ${
                      mounted && isInWishlist(volume.id)
                        ? "bg-vermilion/30 border-vermilion text-vermilion"
                        : "bg-black/60 border-white/15 text-paper-muted hover:text-gold hover:border-gold/60"
                    }`}
                    title={mounted && isInWishlist(volume.id) ? (isArabic ? "محفوظ في المفضلة" : "Saved in Wishlist") : (isArabic ? "إضافة للمفضلة" : "Save to Wishlist")}
                    aria-label="Wishlist"
                  >
                    <Heart
                      strokeWidth={1.5}
                      className={`w-3.5 h-3.5 transition-transform ${
                        mounted && isInWishlist(volume.id) ? "fill-vermilion text-vermilion scale-110" : ""
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openReader(volume);
                    }}
                    className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-paper-muted hover:text-gold hover:border-gold transition-colors flex items-center justify-center active:scale-90"
                    title={isArabic ? "قراءة عينة" : "Read Sample (RTL)"}
                  >
                    <Eye strokeWidth={1.4} className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Meta */}
              <div className="p-3 sm:p-4 flex flex-col justify-between flex-1">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-paper tracking-wide group-hover:text-gold transition-colors line-clamp-1">
                    {isArabic ? "المجلد" : "Vol."} {volume.volumeNumber} — {volume.title}
                  </h4>
                  <p className="text-[9px] sm:text-[10px] text-text-muted mt-0.5 sm:mt-1 font-mono truncate">
                    {volume.pages} {isArabic ? "صفحة" : "pages"} • {volume.format}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 sm:mt-4 sm:pt-3 border-t border-ink-border/50 flex items-center justify-between font-mono text-xs gap-1">
                  {/* Show what the volume was struck through from — the catalogue
                      card does this, and the series grid was dropping it. */}
                  <span className="flex flex-col leading-tight min-w-0">
                    <span className="text-paper font-bold text-[11px] sm:text-xs truncate">{formatPrice(volume.price)}</span>
                    {volume.originalPrice && volume.originalPrice > volume.price && (
                      <span className="text-[9px] sm:text-[10px] text-text-muted line-through truncate">
                        {formatPrice(volume.originalPrice)}
                      </span>
                    )}
                  </span>
                  {volume.stock <= 0 ? (
                    <span className="px-2 py-0.5 bg-ink-surface/90 border border-ink-border text-text-muted text-[8px] sm:text-[9px] font-mono font-bold uppercase rounded-xs cursor-not-allowed opacity-80">
                      {isArabic ? "نفد" : "OUT"}
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
                      className="h-7 sm:h-8 px-2 sm:px-3 bg-paper text-ink hover:bg-vermilion hover:text-white font-bold text-[10px] uppercase transition-colors rounded-xs flex items-center gap-1 z-10 active:scale-95 shrink-0"
                    >
                      <Plus strokeWidth={1.5} className="w-3 h-3" />
                      <span className="hidden xs:inline">{isArabic ? "أضف" : "ADD"}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
