"use client";

import React, { use, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, Heart, Minus, Plus, Share2, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import type { MangaVolume, ProductVariant } from "@/data/manga";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { useCartStore } from "@/store/useCartStore";
import { useUIStore } from "@/store/useUIStore";
import { useWishlistStore, useMounted } from "@/store/useWishlistStore";
import { useTranslation } from "@/hooks/useTranslation";
import { AnimeVerseImage } from "@/components/AnimeVerseImage";
import { CatalogPending } from "@/components/CatalogPending";
import { LiveEditButton } from "@/components/admin/LiveEditButton";
import { PriceTag, PromoBadge } from "@/components/PriceTag";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
import { isMerch, productTypeOf, variantRow, withVariantSummary } from "@/lib/variants";
import { formatPrice, volumeBadgeLabel } from "@/lib/utils";
import { effectivePrice } from "@/lib/pricing";

export default function ShopProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const catalogLoaded = useStorefrontStore((state) => state.catalogLoaded);
  const volumes = useStorefrontStore((state) => state.volumes);
  const product = volumes.find((v) => v.id === slug);

  if (!product) {
    // Products added after the build are only known once the catalogue loads.
    if (!catalogLoaded) return <CatalogPending />;
    notFound();
  }
  // A book belongs on its manga page.
  if (!isMerch(product)) redirect(`/manga/${product.id}`);
  return <ShopProductView product={product} />;
}

function ShopProductView({ product }: { product: MangaVolume }) {
  const { locale } = useTranslation();
  const isArabic = locale === "ar";
  const volumes = useStorefrontStore((state) => state.volumes);
  const shippingConfig = useStorefrontStore((state) => state.shippingConfig);
  const shippingArabicConfig = useStorefrontStore((state) => state.shippingArabicConfig);
  const addItem = useCartStore((state) => state.addItem);
  const { openCart } = useUIStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const mounted = useMounted();

  const variants = useMemo(() => product.variants || [], [product.variants]);
  // Preselect the first variant that can be bought.
  const [chosenSku, setChosenSku] = useState<string>(
    () => (variants.find((v) => v.stock > 0) || variants[0])?.sku || ""
  );
  const chosen: ProductVariant | undefined = variants.find((v) => v.sku === chosenSku) || variants[0];
  const row = chosen ? variantRow(product, chosen) : withVariantSummary(product);
  const stock = row.stock;
  const [quantity, setQuantity] = useState(1);
  const qty = Math.max(1, Math.min(quantity, Math.max(1, stock)));

  const images = useMemo(
    () => [product.coverImage, ...(product.gallery || [])].filter(Boolean),
    [product.coverImage, product.gallery]
  );
  const [imageIndex, setImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const type = productTypeOf(product);
  const merch = product.merch || {};
  const pick = (en?: string, ar?: string) => (isArabic && ar) || en || "";
  const franchise = pick(merch.franchise, merch.franchiseAr);

  const specs: { label: string; value: string }[] = [
    { label: isArabic ? "الأنمي" : "Franchise", value: franchise },
    ...(type === "figure"
      ? [
          { label: isArabic ? "الشخصية" : "Character", value: pick(merch.character, merch.characterAr) },
          { label: isArabic ? "الشركة المصنعة" : "Manufacturer", value: merch.manufacturer || "" },
          { label: isArabic ? "الطول" : "Height", value: merch.heightCm ? `${merch.heightCm} ${isArabic ? "سم" : "cm"}` : "" },
          { label: isArabic ? "الخامة" : "Material", value: pick(merch.material, merch.materialAr) },
          { label: isArabic ? "المقياس" : "Scale", value: merch.scale || "" },
        ]
      : [
          { label: isArabic ? "نوع الورق" : "Paper", value: pick(merch.paperType, merch.paperTypeAr) },
          { label: isArabic ? "التشطيب" : "Finish", value: pick(merch.finish, merch.finishAr) },
        ]),
    ...(merch.specs || []).map((s) => ({ label: pick(s.label, s.labelAr), value: pick(s.value, s.valueAr) })),
  ].filter((s) => s.label && s.value);

  const related = useMemo(() => {
    const franchiseKey = (merch.franchise || "").toLowerCase();
    return volumes
      .filter((v) => isMerch(v) && v.id !== product.id)
      .map((v) => ({
        v,
        points:
          ((v.merch?.franchise || "").toLowerCase() === franchiseKey && franchiseKey ? 2 : 0) +
          (productTypeOf(v) === type ? 1 : 0) +
          (withVariantSummary(v).stock > 0 ? 1 : 0),
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 4)
      .map((entry) => entry.v);
  }, [volumes, product.id, merch.franchise, type]);

  const saved = mounted && isInWishlist(product.id);
  const soldOut = stock <= 0;

  const handleAdd = () => {
    if (!chosen || soldOut) return;
    addItem(product, qty, chosen.sku);
    openCart();
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-ink text-paper pt-20 sm:pt-28 pb-16 sm:pb-20 px-3.5 sm:px-6 md:px-12">
      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-16">
        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono text-text-muted overflow-x-auto no-scrollbar py-1 whitespace-nowrap">
          <Link href="/" className="hover:text-paper">{isArabic ? "الرئيسية" : "HOME"}</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-paper">{isArabic ? "المتجر" : "SHOP"}</Link>
          <span>/</span>
          <Link href={`/shop?type=${type}`} className="hover:text-gold text-gold uppercase">
            {type === "figure" ? (isArabic ? "فيجرز" : "FIGURES") : (isArabic ? "بوسترات" : "POSTERS")}
          </Link>
          <span>/</span>
          <span className="text-paper-muted truncate">{product.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
          {/* Gallery */}
          <div className="lg:col-span-6 space-y-3">
            <div className="relative aspect-[3/4] max-w-sm sm:max-w-md mx-auto bg-ink-surface rounded-sm border border-ink-border/90 overflow-hidden shadow-[0_20px_70px_rgba(0,0,0,0.85)]">
              <AnimeVerseImage
                src={images[imageIndex] || product.coverImage}
                alt={product.title}
                sizes="(max-width: 639px) 90vw, 448px"
                preload
                className="w-full h-full object-cover"
              />
              <LiveEditButton target={{ type: "volume", volumeId: product.id }} label="Edit Product" variant="card" size="sm" />
              <div className="absolute top-3 start-3 flex flex-col gap-1">
                <span className="px-2.5 py-0.5 bg-ink/90 backdrop-blur-md rounded-xs border border-ink-border font-mono text-[10px] text-gold">
                  {volumeBadgeLabel(product, isArabic)}
                </span>
                <PromoBadge volume={row} isArabic={isArabic} />
              </div>
            </div>
            {images.length > 1 && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {images.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() => setImageIndex(index)}
                    className={`relative w-14 h-18 rounded-xs overflow-hidden border cursor-pointer ${
                      index === imageIndex ? "border-gold" : "border-ink-border opacity-70 hover:opacity-100"
                    }`}
                    aria-label={`${isArabic ? "صورة" : "Image"} ${index + 1}`}
                  >
                    <AnimeVerseImage src={src} alt="" sizes="56px" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Purchase column */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-8">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono tracking-[0.2em] text-gold uppercase truncate">{franchise}</span>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-1 text-[11px] font-mono text-text-muted hover:text-paper px-2 py-1 rounded-xs bg-ink-surface/60 border border-ink-border/80 cursor-pointer"
                >
                  {copied ? <Check strokeWidth={1.5} className="w-3.5 h-3.5 text-gold" /> : <Share2 strokeWidth={1.4} className="w-3.5 h-3.5" />}
                  <span className={copied ? "text-gold" : ""}>{copied ? (isArabic ? "تم النسخ" : "COPIED") : (isArabic ? "مشاركة" : "SHARE")}</span>
                </button>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold uppercase tracking-tight font-sans leading-tight">
                {product.title}
              </h1>
            </div>

            {/* Variant picker */}
            {variants.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-[11px] font-mono tracking-widest text-text-muted uppercase">
                  {type === "poster" ? (isArabic ? "المقاس" : "SIZE") : (isArabic ? "النوع" : "EDITION")}
                  {chosen && <span className="text-paper ms-2">{pick(chosen.label, chosen.labelAr)}</span>}
                </span>
                <div className="flex flex-wrap gap-2">
                  {variants.map((variant) => {
                    const active = variant.sku === chosen?.sku;
                    const out = variant.stock <= 0;
                    return (
                      <button
                        key={variant.sku}
                        type="button"
                        onClick={() => {
                          setChosenSku(variant.sku);
                          setQuantity(1);
                        }}
                        aria-pressed={active}
                        className={`min-w-[4.5rem] px-3.5 py-2 rounded-xs border text-xs font-mono transition-colors cursor-pointer flex flex-col items-center gap-0.5 ${
                          active
                            ? "border-gold bg-gold/15 text-gold"
                            : "border-ink-border bg-ink-surface text-paper hover:border-gold/60"
                        } ${out ? "opacity-50 line-through decoration-vermilion/70" : ""}`}
                      >
                        <span className="font-bold">{pick(variant.label, variant.labelAr)}</span>
                        <span className="text-[10px] text-text-muted no-underline">
                          {formatPrice(effectivePrice(variantRow(product, variant)))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="py-3.5 sm:py-4 border-y border-ink-border/70 flex items-center justify-between gap-3 font-mono flex-wrap">
              <PriceTag volume={row} isArabic={isArabic} size="lg" />
              {soldOut ? (
                <span className="text-[10px] text-vermilion bg-vermilion/15 border border-vermilion/40 px-2.5 py-1 rounded-xs uppercase tracking-wider font-bold">
                  {isArabic ? "غير متوفر" : "OUT OF STOCK"}
                </span>
              ) : stock <= 5 ? (
                <span className="text-[10px] text-vermilion bg-vermilion/10 border border-vermilion/30 px-2.5 py-0.5 rounded-xs uppercase tracking-wider font-semibold">
                  {isArabic ? `متبقي ${stock} فقط` : `ONLY ${stock} LEFT`}
                </span>
              ) : (
                <span className="text-[10px] text-gold bg-gold/10 px-2.5 py-0.5 rounded-xs uppercase tracking-wider font-medium">
                  {isArabic ? "متوفر في المخزن" : "IN STOCK"}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className={`flex items-center border border-ink-border bg-ink-surface rounded-sm h-12 flex-1 sm:flex-none ${soldOut ? "opacity-50 pointer-events-none" : ""}`}>
                  <button
                    type="button"
                    disabled={soldOut || qty <= 1}
                    onClick={() => setQuantity(qty - 1)}
                    className="p-3.5 text-text-muted hover:text-paper disabled:opacity-30 cursor-pointer"
                    aria-label="Decrease"
                  >
                    <Minus strokeWidth={1.4} className="w-4 h-4" />
                  </button>
                  <span className="px-4 font-mono text-sm font-bold text-center flex-1 sm:flex-none sm:min-w-[2.5rem]">{soldOut ? 0 : qty}</span>
                  <button
                    type="button"
                    disabled={soldOut || qty >= stock}
                    onClick={() => setQuantity(qty + 1)}
                    className="p-3.5 text-text-muted hover:text-paper disabled:opacity-30 cursor-pointer"
                    aria-label="Increase"
                  >
                    <Plus strokeWidth={1.4} className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => toggleWishlist(product)}
                  className={`h-12 w-12 border rounded-sm flex items-center justify-center shrink-0 cursor-pointer active:scale-95 ${
                    saved ? "border-vermilion bg-vermilion/15 text-vermilion" : "border-ink-border bg-ink-surface text-text-muted hover:text-paper"
                  }`}
                  aria-label={isArabic ? "المفضلة" : "Wishlist"}
                >
                  <Heart strokeWidth={1.5} className={`w-4 h-4 ${saved ? "fill-vermilion" : ""}`} />
                </button>
              </div>
              <button
                type="button"
                disabled={soldOut || !chosen}
                onClick={handleAdd}
                className={`w-full sm:flex-1 h-12 px-6 font-extrabold text-xs tracking-[0.15em] uppercase rounded-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                  soldOut ? "bg-ink-surface/80 border border-ink-border text-text-muted/60 cursor-not-allowed" : "bg-paper text-ink hover:bg-vermilion hover:text-white"
                }`}
              >
                <ShoppingBag strokeWidth={1.5} className="w-4 h-4" />
                <span className="truncate">
                  {soldOut
                    ? (isArabic ? "نفد من المخزن حالياً" : "CURRENTLY OUT OF STOCK")
                    : (isArabic ? `أضف للسلة — ${formatPrice(effectivePrice(row) * qty)}` : `ADD TO CART — ${formatPrice(effectivePrice(row) * qty)}`)}
                </span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-[11px] font-mono text-text-muted">
              <div className="flex items-center gap-1.5">
                <Truck strokeWidth={1.4} className="w-3.5 h-3.5 text-gold shrink-0" />
                <span>{isArabic ? shippingArabicConfig?.dispatchBadgeText || "شحن فوري من 6 أكتوبر (لكافة محافظات مصر)" : shippingConfig.dispatchBadgeText || "Dispatched from 6th of October (All Egypt)"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck strokeWidth={1.4} className="w-3.5 h-3.5 text-gold shrink-0" />
                <span>{isArabic ? "منتج أصلي 100%" : "Authenticity Guaranteed"}</span>
              </div>
            </div>

            {specs.length > 0 && (
              <div className="pt-4 border-t border-ink-border/60">
                <h3 className="text-xs font-mono tracking-widest text-gold uppercase mb-3">
                  {isArabic ? "المواصفات" : "SPECIFICATIONS"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-xs font-mono">
                  {specs.map((spec, index) => (
                    <div key={`${spec.label}-${index}`} className="flex justify-between py-1 border-b border-ink-border/40 gap-2">
                      <span className="text-text-muted shrink-0">{spec.label}:</span>
                      <span className="text-paper text-end">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(product.synopsis || product.synopsisAr) && (
              <div className="pt-2 space-y-2">
                <h3 className="text-xs font-mono tracking-widest text-gold uppercase">{isArabic ? "عن المنتج" : "ABOUT THIS PRODUCT"}</h3>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed whitespace-pre-line">
                  {isArabic && product.synopsisAr ? product.synopsisAr : product.synopsis}
                </p>
              </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="pt-12 sm:pt-16 border-t border-ink-border/60">
            <div className="mb-6 sm:mb-10 flex items-end justify-between">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight uppercase font-sans">
                {isArabic ? "قد يعجبك أيضاً" : "YOU MAY ALSO LIKE"}
              </h2>
              <Link href="/shop" className="h-9 px-4 rounded-sm bg-ink-surface border border-ink-border hover:border-gold text-paper hover:text-gold font-mono text-xs tracking-widest uppercase font-bold flex items-center">
                {isArabic ? "تصفح المتجر" : "BROWSE SHOP"}
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {related.map((item) => (
                <ShopProductCard key={item.id} product={item} isArabic={isArabic} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
