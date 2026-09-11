"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { Plus, Minus, ShoppingBag, BookOpen, Share2, ShieldCheck, Truck, ArrowRight, ChevronLeft, ChevronRight, Eye, Check, Heart } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { ALL_VOLUMES, type MangaVolume } from "@/data/manga";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore, useMounted } from "@/store/useWishlistStore";
import { useUIStore } from "@/store/useUIStore";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { formatPrice, volumeBadgeLabel } from "@/lib/utils";
import { useWelcomeOffer } from "@/hooks/useWelcomeOffer";
import { LiveEditButton } from "@/components/admin/LiveEditButton";
import { useTranslation } from "@/hooks/useTranslation";
import { StarRating } from "@/components/StarRating";
import { AnimeVerseImage } from "@/components/AnimeVerseImage";
import { CatalogPending } from "@/components/CatalogPending";

interface MangaPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Resolves the volume before the view mounts, so the view can assume it exists
 * and keep its hook order stable no matter how the lookup goes.
 */
export default function MangaDetailPage({ params }: MangaPageProps) {
  const resolvedParams = use(params);
  const catalogLoaded = useStorefrontStore((state) => state.catalogLoaded);
  const storeVolumes = useStorefrontStore((state) => state.volumes);
  const activeVolumes = storeVolumes && storeVolumes.length > 0 ? storeVolumes : ALL_VOLUMES;
  const volume = activeVolumes.find((v) => v.id === resolvedParams.slug);

  if (!volume) {
    // The bundled catalogue only holds what existed at build time, so a product
    // the curator added later is absent until the fetch lands.
    if (!catalogLoaded) return <CatalogPending />;
    notFound();
  }
  return <MangaDetailView volume={volume} />;
}

function MangaDetailView({ volume }: { volume: MangaVolume }) {
  const router = useRouter();
  const { locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";

  const storeVolumes = useStorefrontStore((state) => state.volumes);
  const shippingConfig = useStorefrontStore((state) => state.shippingConfig);
  const shippingArabicConfig = useStorefrontStore((state) => state.shippingArabicConfig);
  const activeVolumes = storeVolumes && storeVolumes.length > 0 ? storeVolumes : ALL_VOLUMES;

  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);

  const addItem = useCartStore((state) => state.addItem);
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const appliedCoupon = useCartStore((state) => state.appliedCoupon);
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const { openCart, openReader } = useUIStore();
  const mounted = useMounted();
  const { hasOffer: hasWelcomeOffer, voucherCode: welcomeCode } = useWelcomeOffer();

  const isSavedInWishlist = mounted && isInWishlist(volume.id);

  const handleToggleWishlist = () => {
    toggleWishlist(volume);
  };

  const handleAddToCart = () => {
    addItem(volume, quantity);
    openCart();
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCardClick = (volumeId: string) => {
    router.push(`/manga/${volumeId}`);
  };

  const [relatedRef, relatedApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    slidesToScroll: 1,
    direction: isRTL ? "rtl" : "ltr",
  });
  const scrollRelated = React.useCallback((delta: number) => {
    if (!relatedApi) return;
    if (delta > 0) relatedApi.scrollNext();
    else relatedApi.scrollPrev();
  }, [relatedApi]);

  // A card is a link and the row is draggable, so a swipe must not also count
  // as a click on whatever card the finger happened to start on.
  const dragStart = React.useRef<{ x: number; y: number } | null>(null);
  const handleRelatedPointerDown = (e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
  };
  const handleRelatedClick = (e: React.MouseEvent, volumeId: string) => {
    if (dragStart.current) {
      const dx = Math.abs(e.clientX - dragStart.current.x);
      const dy = Math.abs(e.clientY - dragStart.current.y);
      if (dx > 8 || dy > 8) return;
    }
    handleCardClick(volumeId);
  };

  /**
   * What to put in front of someone looking at this volume.
   *
   * This used to be `filter(same series or shared genre).slice(0, 4)`, which
   * always returned the first four matches in catalogue order — the same four
   * books on every product page in the shop, regardless of what was being
   * looked at.
   *
   * The order that actually helps a reader is: the volumes that come next in
   * this series, then the box set that contains the whole run, then where the
   * story starts, and only then other series that share its genres.
   */
  const relatedVolumes = React.useMemo(() => {
    const genres = new Set(volume.genre || []);
    const currentNumber = Number(volume.volumeNumber);
    const hasNumber = Number.isFinite(currentNumber);
    // Someone looking at a box set already has everything inside it, so its own
    // members are the one thing not worth offering them.
    const inThisBox = new Set(volume.bundleOf || []);

    const score = (v: MangaVolume) => {
      const sameSeries = v.seriesSlug === volume.seriesSlug;
      const isBox = v.format === "Box Set";
      const number = Number(v.volumeNumber);
      let points = 0;

      if (sameSeries && isBox) {
        // The rest of the run in one purchase.
        points += 820;
      } else if (sameSeries && hasNumber && Number.isFinite(number)) {
        const gap = number - currentNumber;
        // Reading forward is the common case, so the next volume outranks
        // everything; the further ahead or behind, the weaker the pull.
        points += gap > 0 ? 1000 - gap * 8 : 420 + gap * 5;
        // Someone deep in a series may still be missing the beginning.
        if (number === 1 && currentNumber > 2) points += 130;
      } else if (sameSeries) {
        points += 500;
      } else {
        const overlap = (v.genre || []).filter((g) => genres.has(g)).length;
        points += overlap * 90;
        points += (Number(v.rating) || 0) * 14;
        points += Math.min(45, Math.log10(Math.max(1, Number(v.reviewCount) || 0)) * 14);
        if (isBox) points += 35;
      }

      // Nothing that cannot be bought today belongs near the top.
      if ((Number(v.stock) || 0) <= 0) points -= 900;
      return points;
    };

    const ranked = activeVolumes
      .filter((v) => v.id !== volume.id && !inThisBox.has(v.id))
      .map((v) => ({ v, points: score(v) }))
      .filter((entry) => entry.points > 0)
      .sort((a, b) => b.points - a.points);

    // A row entirely from one series reads as a shelf, not a recommendation,
    // so a few slots are held back for other series when the catalogue has any.
    // Eight fills a row that can be flipped through, rather than the four a
    // static grid could hold.
    const LIMIT = 8;
    const SAME_SERIES_CAP = 5;
    const picked: MangaVolume[] = [];
    let sameSeriesUsed = 0;
    for (const { v } of ranked) {
      if (picked.length >= LIMIT) break;
      const sameSeries = v.seriesSlug === volume.seriesSlug;
      if (sameSeries && sameSeriesUsed >= SAME_SERIES_CAP) continue;
      picked.push(v);
      if (sameSeries) sameSeriesUsed += 1;
    }
    // If the held-back slot found no taker, fill it from the same series.
    if (picked.length < LIMIT) {
      for (const { v } of ranked) {
        if (picked.length >= LIMIT) break;
        if (!picked.some((p) => p.id === v.id)) picked.push(v);
      }
    }
    return picked;
  }, [activeVolumes, volume]);

  // The row sits far below the fold, so Embla takes its measurements before the
  // cards have their final size and decides there is nothing to scroll. Telling
  // it to measure again once the recommendations are on the page fixes that.
  React.useEffect(() => {
    if (!relatedApi) return;
    relatedApi.reInit();
    const onResize = () => relatedApi.reInit();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [relatedApi, relatedVolumes, isRTL]);

  return (
    <div className="min-h-screen bg-ink text-paper pt-20 sm:pt-28 pb-16 sm:pb-20 px-3.5 sm:px-6 md:px-12">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-16">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono text-text-muted overflow-x-auto no-scrollbar py-1 whitespace-nowrap">
          <Link href="/" className="hover:text-paper transition-colors">
            {isArabic ? "الرئيسية" : "HOME"}
          </Link>
          <span>/</span>
          <Link href="/manga" className="hover:text-paper transition-colors">
            {isArabic ? "المانجا" : "MANGA"}
          </Link>
          <span>/</span>
          <Link
            href={`/series/${volume.seriesSlug}`}
            className="hover:text-gold transition-colors uppercase text-gold"
          >
            {volume.seriesTitle}
          </Link>
          <span>/</span>
          <span className="text-paper-muted">{volumeBadgeLabel(volume, isArabic)}</span>
        </div>

        {/* Top Split Layout: Media Gallery + Purchasing Column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          {/* Left Column: Large Book Cover & Preview Launcher */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-5">
            <div className="relative aspect-[3/4] max-w-sm sm:max-w-md mx-auto bg-ink-surface rounded-sm border border-ink-border/90 overflow-hidden shadow-[0_20px_70px_rgba(0,0,0,0.85)] group">
              <AnimeVerseImage
                src={volume.coverImage}
                alt={volume.title}
                sizes="(max-width: 639px) 90vw, 448px"
                preload
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />

              {/* Live Edit Volume Button */}
              <LiveEditButton
                target={{ type: "volume", volumeId: volume.id }}
                label="Edit Volume"
                variant="card"
                size="sm"
              />

              {/* Japanese Seal Floating Badge */}
              <div className="absolute top-3 left-3 px-2.5 py-0.5 bg-ink/90 backdrop-blur-md rounded-xs border border-ink-border font-mono text-[9px] sm:text-[10px] text-gold">
                {volumeBadgeLabel(volume, isArabic)}
              </div>
            </div>

            {/* Quick Preview & Sample Reader Actions (Unobstructed Cover) */}
            {volume.previewPages.length > 0 && (
            <div className="max-w-sm sm:max-w-md mx-auto space-y-2.5">
              <button
                type="button"
                onClick={() => openReader(volume)}
                className="w-full py-2.5 sm:py-3 px-4 bg-ink-surface/90 hover:bg-gold hover:text-ink border border-ink-border hover:border-gold rounded-xs text-paper font-mono text-xs tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer shadow-sm active:scale-[0.99]"
              >
                <Eye strokeWidth={1.5} className="w-4 h-4 text-gold group-hover:text-ink transition-colors" />
                <span className="font-bold">{isArabic ? "قراءة عينة من الفصل (معاينة يابانية)" : "OPEN SAMPLE CHAPTER (RTL PREVIEW)"}</span>
              </button>

              {/* Quick Preview Thumbnails */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono text-text-muted">{isArabic ? "المعاينة:" : "PREVIEW:"}</span>
                {volume.previewPages.map((page, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => openReader(volume)}
                    className="px-2.5 py-1 bg-ink-surface border border-ink-border text-[11px] font-mono text-paper-muted hover:text-gold hover:border-gold transition-colors rounded-xs flex items-center gap-1 cursor-pointer"
                  >
                    <BookOpen strokeWidth={1.3} className="w-3 h-3 text-gold" />
                    <span>{isArabic ? "صفحة" : "Page"} 0{index + 1}</span>
                  </button>
                ))}
              </div>
            </div>
            )}
          </div>

          {/* Right Column: Title, Specs, Price, and Cart Action */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-8">
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/series/${volume.seriesSlug}`}
                  className="text-xs font-mono tracking-[0.2em] text-gold uppercase hover:underline truncate"
                >
                  {volume.seriesTitle}
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <LiveEditButton
                    target={{ type: "volume", volumeId: volume.id }}
                    label="Edit Book"
                    variant="floating"
                    size="xs"
                  />
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center gap-1 text-[11px] font-mono text-text-muted hover:text-paper px-2 py-1 rounded-xs bg-ink-surface/60 border border-ink-border/80 cursor-pointer transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check strokeWidth={1.5} className="w-3.5 h-3.5 text-gold" />
                        <span className="text-gold">{isArabic ? "تم النسخ" : "COPIED"}</span>
                      </>
                    ) : (
                      <>
                        <Share2 strokeWidth={1.4} className="w-3.5 h-3.5" />
                        <span>{isArabic ? "مشاركة" : "SHARE"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold uppercase tracking-tight font-sans leading-tight">
                {volume.title}
              </h1>
              <p className="text-xs sm:text-sm font-serif text-text-muted italic">
                {volume.japaneseTitle}
              </p>

              {/* Rating and Reviews */}
              <div className="flex items-center gap-2 sm:gap-3 pt-1 text-xs font-mono flex-wrap">
                <StarRating value={volume.rating} size="md" />
                <span className="text-paper font-bold">{volume.rating.toFixed(1)}</span>
                <span className="text-text-muted text-[11px] sm:text-xs">
                  {isArabic ? `(${volume.reviewCount} تقييم للعملاء)` : `(${volume.reviewCount} customer reviews)`}
                </span>
              </div>
            </div>

            {/* Price Tag & Real-Time Stock Status */}
            <div className="py-3.5 sm:py-4 border-y border-ink-border/70 flex items-center justify-between gap-3 font-mono flex-wrap">
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-paper">
                  {formatPrice(volume.price)}
                </span>
                {volume.originalPrice && (
                  <span className="text-xs sm:text-sm text-text-muted line-through">
                    {formatPrice(volume.originalPrice)}
                  </span>
                )}
              </div>
              {((volume.stock ?? 0) <= 0) ? (
                <span className="text-[10px] text-vermilion bg-vermilion/15 border border-vermilion/40 px-2.5 py-1 rounded-xs uppercase tracking-wider font-bold animate-pulse shrink-0">
                  {isArabic ? "غير متوفر" : "OUT OF STOCK"}
                </span>
              ) : (volume.stock ?? 0) <= 5 ? (
                <span className="text-[10px] text-vermilion bg-vermilion/10 border border-vermilion/30 px-2.5 py-0.5 rounded-xs uppercase tracking-wider font-semibold shrink-0">
                  {isArabic ? `متبقي ${volume.stock} فقط` : `ONLY ${volume.stock} LEFT`}
                </span>
              ) : (
                <span className="text-[10px] text-gold bg-gold/10 px-2.5 py-0.5 rounded-xs uppercase tracking-wider font-medium shrink-0">
                  {isArabic ? "متوفر في المخزن" : "IN STOCK"}
                </span>
              )}
            </div>

            {/* Patron Inaugural Grant Callout (Only if book is in stock) */}
            {hasWelcomeOffer && ((volume.stock ?? 0) > 0) && (
              <div className="p-3 bg-gold/10 border border-gold/40 rounded-xs flex flex-row items-center justify-between gap-2.5 text-xs font-mono animate-in fade-in">
                <div className="flex items-center gap-2 text-gold min-w-0">
                  <div className="truncate">
                    <span>{isArabic ? "خصم الترحيب: " : "Private Grant: "}</span>
                    <strong className="text-paper">{formatPrice(volume.price * 0.8)}</strong>
                    <span className="text-[10px] text-text-muted mx-1">
                      {isArabic ? `(خصم 20%)` : `(-20%)`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    applyCoupon(welcomeCode, 20, true);
                    addItem(volume, quantity);
                    openCart();
                  }}
                  className="px-2.5 py-1 bg-gold text-ink font-bold text-[10px] rounded-xs uppercase tracking-wider hover:bg-paper transition-colors shrink-0 cursor-pointer shadow-xs"
                >
                  {appliedCoupon === welcomeCode ? (isArabic ? "تم التفعيل" : "APPLIED") : (isArabic ? "تفعيل وإضافة" : "APPLY & ADD")}
                </button>
              </div>
            )}

            {/* Quantity Selector & Add to Cart Button */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Mobile Row: Stepper + Wishlist Button */}
                <div className="flex items-center gap-3">
                  {/* Stepper */}
                  <div className={`flex items-center border border-ink-border bg-ink-surface rounded-sm h-12 flex-1 sm:flex-none ${((volume.stock ?? 0) <= 0) ? "opacity-50 pointer-events-none" : ""}`}>
                    <button
                      disabled={(volume.stock ?? 0) <= 0 || quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="p-3.5 text-text-muted hover:text-paper transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Decrease"
                    >
                      <Minus strokeWidth={1.4} className="w-4 h-4" />
                    </button>
                    <span className="px-4 font-mono text-sm font-bold text-paper text-center flex-1 sm:flex-none sm:min-w-[2.5rem]">
                      {((volume.stock ?? 0) <= 0) ? 0 : quantity}
                    </span>
                    <button
                      disabled={(volume.stock ?? 0) <= 0 || quantity >= (volume.stock ?? 9999)}
                      onClick={() => setQuantity((q) => Math.min((volume.stock ?? 9999), q + 1))}
                      className="p-3.5 text-text-muted hover:text-paper transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Increase"
                    >
                      <Plus strokeWidth={1.4} className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Wishlist Button on Mobile (next to stepper) */}
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    className={`h-12 w-12 sm:hidden border rounded-sm transition-all duration-300 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 ${
                      isSavedInWishlist
                        ? "border-vermilion bg-vermilion/15 text-vermilion shadow-lg shadow-vermilion/10"
                        : "border-ink-border bg-ink-surface text-text-muted hover:text-paper"
                    }`}
                    title={
                      isSavedInWishlist
                        ? (isArabic ? "محفوظ في المفضلة" : "Saved to Wishlist")
                        : (isArabic ? "إضافة للمفضلة" : "Save to Wishlist")
                    }
                    aria-label="Toggle Wishlist"
                  >
                    <Heart
                      strokeWidth={1.5}
                      className={`w-4 h-4 ${isSavedInWishlist ? "fill-vermilion text-vermilion scale-110" : ""}`}
                    />
                  </button>
                </div>

                {/* Add to Cart CTA */}
                <button
                  type="button"
                  disabled={(volume.stock ?? 0) <= 0}
                  onClick={handleAddToCart}
                  className={`w-full sm:flex-1 h-12 px-6 font-extrabold text-xs tracking-[0.15em] sm:tracking-[0.2em] uppercase rounded-sm transition-all duration-300 shadow-xl flex items-center justify-center gap-2 group cursor-pointer active:scale-[0.98] ${
                    ((volume.stock ?? 0) <= 0)
                      ? "bg-ink-surface/80 border border-ink-border text-text-muted/60 cursor-not-allowed"
                      : "bg-paper text-ink hover:bg-vermilion hover:text-white"
                  }`}
                >
                  <ShoppingBag strokeWidth={1.5} className="w-4 h-4" />
                  <span className="truncate">
                    {((volume.stock ?? 0) <= 0)
                      ? (isArabic ? "نفد من المخزن حالياً" : "CURRENTLY OUT OF STOCK")
                      : (isArabic ? `أضف للسلة — ${formatPrice(volume.price * quantity)}` : `ADD TO CART — ${formatPrice(volume.price * quantity)}`)}
                  </span>
                </button>

                {/* Wishlist Button on Desktop (at the end) */}
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  className={`hidden sm:flex h-12 w-12 border rounded-sm transition-all duration-300 items-center justify-center shrink-0 cursor-pointer active:scale-95 ${
                    isSavedInWishlist
                      ? "border-vermilion bg-vermilion/15 text-vermilion hover:bg-vermilion/25 shadow-lg shadow-vermilion/10"
                      : "border-ink-border bg-ink-surface text-text-muted hover:text-paper hover:border-gold/60"
                  }`}
                  title={
                    isSavedInWishlist
                      ? (isArabic ? "محفوظ في المفضلة" : "Saved to Wishlist")
                      : (isArabic ? "إضافة للمفضلة" : "Save to Wishlist")
                  }
                  aria-label="Toggle Wishlist"
                >
                  <Heart
                    strokeWidth={1.5}
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isSavedInWishlist ? "fill-vermilion text-vermilion scale-110" : ""
                    }`}
                  />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-start gap-2 sm:gap-6 pt-2 text-[11px] font-mono text-text-muted">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Truck strokeWidth={1.4} className="w-3.5 h-3.5 text-gold shrink-0" />
                  <span>
                    {isArabic
                      ? (shippingArabicConfig?.dispatchBadgeText || "شحن فوري من 6 أكتوبر (لكافة محافظات مصر)")
                      : (shippingConfig.dispatchBadgeText || "Dispatched from 6th of October (All Egypt)")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <ShieldCheck strokeWidth={1.4} className="w-3.5 h-3.5 text-gold shrink-0" />
                  <span>
                    {isArabic
                      ? (shippingArabicConfig?.guaranteeBadgeText || "ضمان أصالة النسخة 100%")
                      : (shippingConfig.guaranteeBadgeText || "Authenticity Guaranteed")}
                  </span>
                </div>
              </div>
            </div>

            {/* Specifications Matrix */}
            <div className="pt-4 border-t border-ink-border/60">
              <h3 className="text-xs font-mono tracking-widest text-gold uppercase mb-3">
                {isArabic ? "مواصفات المجلد" : "VOLUME SPECIFICATIONS"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 sm:gap-y-3 gap-x-6 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-ink-border/40 gap-2">
                  <span className="text-text-muted shrink-0">{isArabic ? "المؤلف:" : "Author:"}</span>
                  <span className="text-paper text-end truncate">{volume.author}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-ink-border/40 gap-2">
                  <span className="text-text-muted shrink-0">{isArabic ? "نوع التجليد:" : "Format:"}</span>
                  <span className="text-paper text-end">
                    {isArabic ? (
                      volume.format === "Deluxe Edition" ? "طبعة خاصة (Deluxe)" :
                      volume.format === "Light Novel" ? "رواية خفيفة (Light Novel)" :
                      "مانجا أصلية (Manga)"
                    ) : volume.format}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-ink-border/40 gap-2">
                  <span className="text-text-muted shrink-0">{isArabic ? "عدد الصفحات:" : "Page Count:"}</span>
                  <span className="text-paper text-end">{volume.pages} {isArabic ? "صفحة" : "pages"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-ink-border/40 gap-2">
                  <span className="text-text-muted shrink-0">ISBN-13:</span>
                  <span className="text-paper text-end">{volume.isbn}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-ink-border/40 gap-2">
                  <span className="text-text-muted shrink-0">{isArabic ? "تاريخ الإصدار:" : "Publication:"}</span>
                  <span className="text-paper text-end">{volume.publishDate}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-ink-border/40 gap-2">
                  <span className="text-text-muted shrink-0">{isArabic ? "اللغة:" : "Language:"}</span>
                  <span className="text-paper text-end">{isArabic ? "إنجليزية / نصوص كانجي أصلية" : "English / Kanji Sub"}</span>
                </div>
              </div>
            </div>

            {/* About This Volume */}
            <div className="pt-4 space-y-2">
              <h3 className="text-xs font-mono tracking-widest text-gold uppercase">
                {isArabic ? "عن هذا المجلد" : "ABOUT THIS VOLUME"}
              </h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                {volume.synopsis}
              </p>
            </div>
          </div>
        </div>

        {/* You May Also Like Section */}
        <section className="pt-12 sm:pt-16 border-t border-ink-border/60">
          <div className="mb-6 sm:mb-10 flex items-end justify-between">
            <div>
              <span className="text-[10px] sm:text-[11px] font-mono tracking-[0.25em] text-gold uppercase block mb-1">
                {isArabic ? "ترشيحات الأرشيف" : "RECOMMENDED COMPANIONS"}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight uppercase font-sans">
                {isArabic ? "قد يعجبك أيضاً" : "YOU MAY ALSO LIKE"}
              </h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Was a muted text link that read as a caption; it is the way to
                  the rest of the shop, so it is now a button you can see. */}
              <Link
                href="/manga"
                className="h-9 px-3.5 sm:px-4 rounded-sm bg-ink-surface border border-ink-border hover:border-gold text-paper hover:text-gold font-mono text-[10px] sm:text-xs tracking-widest uppercase font-bold flex items-center gap-1.5 transition-colors active:scale-95 whitespace-nowrap"
              >
                <span>{isArabic ? "تصفح الكل" : "BROWSE ALL"}</span>
                <ArrowRight strokeWidth={1.6} className={`w-3.5 h-3.5 ${isRTL ? "rotate-180" : ""}`} />
              </Link>
              <div className="hidden sm:flex items-center gap-2" dir="ltr">
                <button
                  type="button"
                  onClick={() => scrollRelated(isRTL ? 1 : -1)}
                  className="p-2.5 rounded-sm bg-ink-surface border border-ink-border text-paper hover:border-gold hover:text-gold transition-colors active:scale-95 cursor-pointer"
                  aria-label={isArabic ? "السابق" : "Previous"}
                >
                  <ChevronLeft strokeWidth={1.5} className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRelated(isRTL ? -1 : 1)}
                  className="p-2.5 rounded-sm bg-ink-surface border border-ink-border text-paper hover:border-gold hover:text-gold transition-colors active:scale-95 cursor-pointer"
                  aria-label={isArabic ? "التالي" : "Next"}
                >
                  <ChevronRight strokeWidth={1.5} className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={relatedRef}
            dir={isRTL ? "rtl" : "ltr"}
            className="overflow-hidden select-none cursor-grab active:cursor-grabbing"
          >
            <div className={`flex ${isRTL ? "-mr-3 sm:-mr-6" : "-ml-3 sm:-ml-6"}`}>
            {relatedVolumes.map((item) => (
              <div
                key={item.id}
                onPointerDown={handleRelatedPointerDown}
                onClick={(e) => handleRelatedClick(e, item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardClick(item.id);
                  }
                }}
                className={`flex-[0_0_50%] sm:flex-[0_0_33.333%] lg:flex-[0_0_25%] min-w-0 ${isRTL ? "pr-3 sm:pr-6" : "pl-3 sm:pl-6"} group bg-transparent cursor-pointer select-none`}
              >
              <div className="bg-ink-surface/40 border border-ink-border/70 rounded-sm overflow-hidden hover:border-gold/60 transition-all duration-300 flex flex-col justify-between h-full hover:shadow-xl hover:shadow-black/50">
                <div className="relative aspect-[3/4] overflow-hidden bg-ink">
                  <AnimeVerseImage
                    src={item.coverImage}
                    alt={item.title}
                    sizes="(max-width: 1023px) 50vw, 25vw"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                  />
                  <div className="absolute top-2 left-2 pointer-events-none z-10">
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-xs bg-ink/90 text-[8px] sm:text-[9px] font-mono tracking-wider text-gold border border-ink-border">
                      {volumeBadgeLabel(item, isArabic)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleWishlist(item);
                    }}
                    className={`absolute top-2 right-2 w-7 h-7 rounded-full backdrop-blur-md border transition-all z-10 flex items-center justify-center active:scale-90 ${
                      mounted && isInWishlist(item.id)
                        ? "bg-vermilion/30 border-vermilion text-vermilion"
                        : "bg-black/60 border-white/15 text-paper-muted hover:text-gold hover:border-gold/60"
                    }`}
                    title={mounted && isInWishlist(item.id) ? (isArabic ? "في المفضلة" : "In Wishlist") : (isArabic ? "إضافة للمفضلة" : "Add to Wishlist")}
                  >
                    <Heart
                      strokeWidth={1.5}
                      className={`w-3.5 h-3.5 ${mounted && isInWishlist(item.id) ? "fill-vermilion text-vermilion" : ""}`}
                    />
                  </button>
                </div>

                <div className="p-3 sm:p-4 flex flex-col justify-between flex-1">
                  <div>
                    <span className="text-[8px] sm:text-[9px] font-mono tracking-widest text-gold uppercase block truncate">
                      {item.seriesTitle}
                    </span>
                    <h3 className="text-xs font-bold text-paper tracking-wide group-hover:text-gold transition-colors line-clamp-1 mt-0.5 block">
                      {item.title}
                    </h3>
                  </div>

                  <div className="mt-3 pt-2.5 sm:mt-4 sm:pt-3 border-t border-ink-border/50 flex items-center justify-between font-mono gap-1">
                    <div className="flex flex-col min-w-0 pr-1">
                      <span className="text-paper font-bold text-[11px] sm:text-xs truncate">
                        {formatPrice(item.price)}
                      </span>
                      {item.originalPrice && (
                        <span className="text-[9px] sm:text-[10px] text-text-muted line-through truncate">
                          {formatPrice(item.originalPrice)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addItem(item, 1);
                        openCart();
                      }}
                      className="h-7 sm:h-8 px-2 sm:px-3 bg-paper text-ink hover:bg-vermilion hover:text-white font-bold text-[10px] uppercase transition-colors rounded-xs z-10 active:scale-95 shrink-0 flex items-center gap-1"
                    >
                      <span>+</span>
                      <span className="hidden xs:inline">{isArabic ? "أضف" : "ADD"}</span>
                    </button>
                  </div>
                </div>
              </div>
              </div>
            ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
