"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import {
  Star,
  Plus,
  Minus,
  ShoppingBag,
  BookOpen,
  Share2,
  ShieldCheck,
  Truck,
  ArrowRight,
  Eye,
  Check,
  Heart,
  Sparkles,
} from "lucide-react";
import { ALL_VOLUMES } from "@/data/manga";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore, useMounted } from "@/store/useWishlistStore";
import { useUIStore } from "@/store/useUIStore";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { formatPrice } from "@/lib/utils";
import { useWelcomeOffer } from "@/hooks/useWelcomeOffer";
import { LiveEditButton } from "@/components/admin/LiveEditButton";

interface MangaPageProps {
  params: Promise<{ slug: string }>;
}

export default function MangaDetailPage({ params }: MangaPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);

  const storeVolumes = useStorefrontStore((state) => state.volumes);
  const shippingConfig = useStorefrontStore((state) => state.shippingConfig);
  const activeVolumes = storeVolumes && storeVolumes.length > 0 ? storeVolumes : ALL_VOLUMES;

  const volume = activeVolumes.find((v) => v.id === resolvedParams.slug);

  if (!volume) {
    notFound();
  }

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

  const relatedVolumes = activeVolumes.filter(
    (v) => v.id !== volume.id && (v.seriesSlug === volume.seriesSlug || v.genre.some((g) => volume.genre.includes(g)))
  ).slice(0, 4);

  return (
    <div className="min-h-screen bg-ink text-paper pt-28 pb-20 px-6 md:px-12">
      <div className="max-w-7xl mx-auto space-y-20">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
          <Link href="/" className="hover:text-paper transition-colors">
            HOME
          </Link>
          <span>/</span>
          <Link href="/manga" className="hover:text-paper transition-colors">
            MANGA
          </Link>
          <span>/</span>
          <Link
            href={`/series/${volume.seriesSlug}`}
            className="hover:text-gold transition-colors uppercase text-gold"
          >
            {volume.seriesTitle}
          </Link>
          <span>/</span>
          <span className="text-paper-muted">VOL. {volume.volumeNumber}</span>
        </div>

        {/* Top Split Layout: Media Gallery + Purchasing Column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Large Book Cover & Preview Launcher */}
          <div className="lg:col-span-6 space-y-6">
            <div className="relative aspect-[3/4] max-w-lg mx-auto bg-ink-surface rounded-sm border border-ink-border/90 overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.85)] group">
              <img
                src={volume.coverImage}
                alt={volume.title}
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
              <div className="absolute top-4 left-4 px-3 py-1 bg-ink/90 backdrop-blur-md rounded-xs border border-ink-border font-mono text-[10px] text-gold">
                VOL. {volume.volumeNumber < 10 ? `0${volume.volumeNumber}` : volume.volumeNumber}
              </div>

              {/* Read Sample CTA overlay */}
              <button
                onClick={() => openReader(volume)}
                className="absolute bottom-4 inset-x-4 py-3 bg-ink/90 backdrop-blur-md border border-ink-border text-paper font-mono text-xs tracking-widest uppercase hover:bg-gold hover:text-ink hover:border-gold transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Eye strokeWidth={1.4} className="w-4 h-4" />
                <span>OPEN SAMPLE CHAPTER (RTL PREVIEW)</span>
              </button>
            </div>

            {/* Quick Preview Thumbnails */}
            <div className="flex items-center justify-center gap-4">
              <span className="text-xs font-mono text-text-muted">PREVIEW:</span>
              {volume.previewPages.map((page, index) => (
                <button
                  key={index}
                  onClick={() => openReader(volume)}
                  className="px-3 py-1.5 bg-ink-surface border border-ink-border text-xs font-mono text-paper-muted hover:text-gold hover:border-gold transition-colors rounded-xs flex items-center gap-1.5"
                >
                  <BookOpen strokeWidth={1.3} className="w-3 h-3" />
                  <span>Page 0{index + 1}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Title, Specs, Price, and Cart Action */}
          <div className="lg:col-span-6 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Link
                  href={`/series/${volume.seriesSlug}`}
                  className="text-xs font-mono tracking-[0.2em] text-gold uppercase hover:underline"
                >
                  {volume.seriesTitle}
                </Link>
                <div className="flex items-center gap-2">
                  <LiveEditButton
                    target={{ type: "volume", volumeId: volume.id }}
                    label="Edit Book"
                    variant="floating"
                    size="xs"
                  />
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1 text-[11px] font-mono text-text-muted hover:text-paper"
                  >
                    {copied ? (
                      <>
                        <Check strokeWidth={1.5} className="w-3.5 h-3.5 text-gold" />
                        <span className="text-gold">LINK COPIED</span>
                      </>
                    ) : (
                      <>
                        <Share2 strokeWidth={1.4} className="w-3.5 h-3.5" />
                        <span>SHARE</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight font-sans">
                {volume.title}
              </h1>
              <p className="text-sm font-serif text-text-muted italic">
                {volume.japaneseTitle}
              </p>

              {/* Rating and Reviews */}
              <div className="flex items-center gap-3 pt-1 text-xs font-mono">
                <div className="flex items-center text-gold">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      strokeWidth={1}
                      className="w-4 h-4 fill-gold text-gold"
                    />
                  ))}
                </div>
                <span className="text-paper font-bold">{volume.rating.toFixed(1)}</span>
                <span className="text-text-muted">({volume.reviewCount} customer reviews)</span>
              </div>
            </div>

            {/* Price Tag & Real-Time Stock Status */}
            <div className="py-4 border-y border-ink-border/70 flex items-baseline gap-3 font-mono flex-wrap">
              <span className="text-3xl font-extrabold text-paper">
                {formatPrice(volume.price)}
              </span>
              {volume.originalPrice && (
                <span className="text-sm text-text-muted line-through">
                  {formatPrice(volume.originalPrice)}
                </span>
              )}
              {((volume.stock ?? 0) <= 0) ? (
                <span className="text-[10px] text-vermilion bg-vermilion/15 border border-vermilion/40 px-2.5 py-1 rounded-xs uppercase tracking-wider ml-auto font-bold animate-pulse">
                  OUT OF STOCK // SOLD OUT
                </span>
              ) : (volume.stock ?? 0) <= 5 ? (
                <span className="text-[10px] text-vermilion bg-vermilion/10 border border-vermilion/30 px-2.5 py-0.5 rounded-xs uppercase tracking-wider ml-auto font-semibold">
                  LOW STOCK — ONLY {volume.stock} UNITS LEFT
                </span>
              ) : (
                <span className="text-[10px] text-gold bg-gold/10 px-2.5 py-0.5 rounded-xs uppercase tracking-wider ml-auto font-medium">
                  IN STOCK
                </span>
              )}
            </div>

            {/* Patron Inaugural Grant Callout (Only if book is in stock) */}
            {hasWelcomeOffer && ((volume.stock ?? 0) > 0) && (
              <div className="p-3 bg-gold/10 border border-gold/40 rounded-xs flex items-center justify-between gap-3 text-xs font-mono animate-in fade-in">
                <div className="flex items-center gap-2 text-gold min-w-0">
                  <Sparkles className="w-4 h-4 shrink-0 text-gold" />
                  <div className="truncate">
                    <span>Your Private Grant: </span>
                    <strong className="text-paper">{formatPrice(volume.price * 0.8)}</strong>
                    <span className="text-[10px] text-text-muted ml-1">(-20% with code {welcomeCode})</span>
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
                  {appliedCoupon === welcomeCode ? "APPLIED" : "APPLY & ADD"}
                </button>
              </div>
            )}

            {/* Quantity Selector & Add to Cart Button */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {/* Stepper */}
                <div className={`flex items-center border border-ink-border bg-ink-surface rounded-sm ${((volume.stock ?? 0) <= 0) ? "opacity-50 pointer-events-none" : ""}`}>
                  <button
                    disabled={(volume.stock ?? 0) <= 0 || quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-3 text-text-muted hover:text-paper transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Decrease"
                  >
                    <Minus strokeWidth={1.4} className="w-4 h-4" />
                  </button>
                  <span className="px-4 font-mono text-sm font-bold text-paper">
                    {((volume.stock ?? 0) <= 0) ? 0 : quantity}
                  </span>
                  <button
                    disabled={(volume.stock ?? 0) <= 0 || quantity >= (volume.stock ?? 9999)}
                    onClick={() => setQuantity((q) => Math.min((volume.stock ?? 9999), q + 1))}
                    className="p-3 text-text-muted hover:text-paper transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Increase"
                  >
                    <Plus strokeWidth={1.4} className="w-4 h-4" />
                  </button>
                </div>

                {/* Add to Cart CTA */}
                <button
                  type="button"
                  disabled={(volume.stock ?? 0) <= 0}
                  onClick={handleAddToCart}
                  className={`flex-1 py-4 px-8 font-extrabold text-xs tracking-[0.2em] uppercase rounded-sm transition-all duration-300 shadow-xl flex items-center justify-center gap-2 group ${
                    ((volume.stock ?? 0) <= 0)
                      ? "bg-ink-surface/80 border border-ink-border text-text-muted/60 cursor-not-allowed"
                      : "bg-paper text-ink hover:bg-vermilion hover:text-white cursor-pointer"
                  }`}
                >
                  <ShoppingBag strokeWidth={1.5} className="w-4 h-4" />
                  <span>{((volume.stock ?? 0) <= 0) ? "CURRENTLY OUT OF STOCK" : `ADD TO CART — ${formatPrice(volume.price * quantity)}`}</span>
                </button>

                {/* Wishlist CTA Button */}
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  className={`p-4 border rounded-sm transition-all duration-300 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 ${
                    isSavedInWishlist
                      ? "border-vermilion bg-vermilion/15 text-vermilion hover:bg-vermilion/25 shadow-lg shadow-vermilion/10"
                      : "border-ink-border bg-ink-surface text-text-muted hover:text-paper hover:border-gold/60"
                  }`}
                  title={isSavedInWishlist ? "Saved to Curated Wishlist (Click to remove)" : "Save to Curated Wishlist"}
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

              <div className="flex flex-wrap items-center justify-start gap-x-6 gap-y-2 pt-2 text-[11px] font-mono text-text-muted">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Truck strokeWidth={1.4} className="w-3.5 h-3.5 text-gold shrink-0" />
                  <span>{shippingConfig.dispatchBadgeText || "Dispatched from 6th of October (All Egypt)"}</span>
                </div>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <ShieldCheck strokeWidth={1.4} className="w-3.5 h-3.5 text-gold shrink-0" />
                  <span>{shippingConfig.guaranteeBadgeText || "Authenticity Guaranteed"}</span>
                </div>
              </div>
            </div>

            {/* Specifications Matrix */}
            <div className="pt-4 border-t border-ink-border/60">
              <h3 className="text-xs font-mono tracking-widest text-gold uppercase mb-3">
                VOLUME SPECIFICATIONS
              </h3>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-ink-border/40">
                  <span className="text-text-muted">Author:</span>
                  <span className="text-paper">{volume.author}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-ink-border/40">
                  <span className="text-text-muted">Format:</span>
                  <span className="text-paper">{volume.format}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-ink-border/40">
                  <span className="text-text-muted">Page Count:</span>
                  <span className="text-paper">{volume.pages} pages</span>
                </div>
                <div className="flex justify-between py-1 border-b border-ink-border/40">
                  <span className="text-text-muted">ISBN-13:</span>
                  <span className="text-paper">{volume.isbn}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-ink-border/40">
                  <span className="text-text-muted">Publication:</span>
                  <span className="text-paper">{volume.publishDate}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-ink-border/40">
                  <span className="text-text-muted">Language:</span>
                  <span className="text-paper">English / Kanji Sub</span>
                </div>
              </div>
            </div>

            {/* About This Volume */}
            <div className="pt-4 space-y-2">
              <h3 className="text-xs font-mono tracking-widest text-gold uppercase">
                ABOUT THIS VOLUME
              </h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                {volume.synopsis}
              </p>
            </div>
          </div>
        </div>

        {/* You May Also Like Section */}
        <section className="pt-16 border-t border-ink-border/60">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <span className="text-[11px] font-mono tracking-[0.25em] text-gold uppercase block mb-1">
                RECOMMENDED COMPANIONS
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight uppercase font-sans">
                YOU MAY ALSO LIKE
              </h2>
            </div>
            <Link
              href="/manga"
              className="text-xs font-mono tracking-widest text-text-muted hover:text-paper flex items-center gap-1.5"
            >
              <span>BROWSE ALL</span>
              <ArrowRight strokeWidth={1.4} className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedVolumes.map((item) => (
              <div
                key={item.id}
                onClick={() => handleCardClick(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardClick(item.id);
                  }
                }}
                className="group bg-ink-surface/40 border border-ink-border/70 rounded-sm overflow-hidden hover:border-gold/60 transition-all duration-300 flex flex-col justify-between cursor-pointer hover:shadow-xl hover:shadow-black/50 select-none"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-ink">
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    draggable={false}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                  />
                  <div className="absolute top-2.5 left-2.5 pointer-events-none z-10">
                    <span className="px-2 py-0.5 rounded-xs bg-ink/90 text-[9px] font-mono tracking-wider text-gold border border-ink-border">
                      VOL. {item.volumeNumber < 10 ? `0${item.volumeNumber}` : item.volumeNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleWishlist(item);
                    }}
                    className={`absolute top-2.5 right-2.5 p-1.5 rounded-xs backdrop-blur-md border transition-all z-10 active:scale-90 ${
                      mounted && isInWishlist(item.id)
                        ? "bg-vermilion/20 border-vermilion text-vermilion"
                        : "bg-ink/80 border-ink-border text-paper-muted hover:text-gold hover:border-gold/60 opacity-0 group-hover:opacity-100"
                    }`}
                    title={mounted && isInWishlist(item.id) ? "In Wishlist" : "Add to Wishlist"}
                  >
                    <Heart
                      strokeWidth={1.4}
                      className={`w-3.5 h-3.5 ${mounted && isInWishlist(item.id) ? "fill-vermilion text-vermilion" : ""}`}
                    />
                  </button>
                </div>

                <div className="p-4 flex flex-col justify-between flex-1">
                  <div>
                    <span className="text-[9px] font-mono tracking-widest text-gold uppercase block">
                      {item.seriesTitle}
                    </span>
                    <h3 className="text-xs font-bold text-paper tracking-wide group-hover:text-gold transition-colors line-clamp-1 mt-0.5 block">
                      {item.title}
                    </h3>
                  </div>

                  <div className="mt-4 pt-3 border-t border-ink-border/50 flex items-center justify-between font-mono text-xs">
                    <span className="text-paper font-bold">{formatPrice(item.price)}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addItem(item, 1);
                        openCart();
                      }}
                      className="px-3 py-1 bg-paper text-ink hover:bg-vermilion hover:text-white font-bold text-[10px] uppercase transition-colors rounded-xs z-10 active:scale-95"
                    >
                      + ADD
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
