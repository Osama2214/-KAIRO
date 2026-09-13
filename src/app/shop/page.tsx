"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Filter, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import type { MangaVolume, ProductType } from "@/data/manga";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { useMounted } from "@/store/useWishlistStore";
import { useCatalogSearch } from "@/hooks/useCatalogSearch";
import { useTranslation } from "@/hooks/useTranslation";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { useNow } from "@/hooks/useNow";
import { usePaginatedImagePrefetch } from "@/hooks/useImagePrefetch";
import { CustomSelect } from "@/components/CustomSelect";
import { ShopProductCard } from "@/components/shop/ShopProductCard";
import { isMerch, productTypeOf, withVariantSummary } from "@/lib/variants";
import { priceVolume } from "@/lib/pricing";
import { formatPrice } from "@/lib/utils";
import { franchiseKey } from "@/lib/franchise";

type MerchType = Exclude<ProductType, "book">;
type SortKey = "FEATURED" | "NEWEST" | "PRICE_ASC" | "PRICE_DESC" | "RATING";

const ITEMS_PER_PAGE = 12;
const TYPES: { id: MerchType; en: string; ar: string }[] = [
  { id: "figure", en: "Figures", ar: "فيجرز" },
  { id: "poster", en: "Posters", ar: "بوسترات" },
];

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div
      className={`w-4 h-4 rounded-xs border flex items-center justify-center transition-colors shrink-0 ${
        checked ? "bg-gold border-gold text-ink" : "border-ink-border group-hover:border-paper/60"
      }`}
    >
      {checked && <Check strokeWidth={2.5} className="w-3 h-3" />}
    </div>
  );
}

function Toggle({ on, isRTL }: { on: boolean; isRTL: boolean }) {
  return (
    <div className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${on ? "bg-vermilion" : "bg-ink border border-ink-border"}`}>
      <div className={`w-4 h-4 rounded-full bg-paper transition-transform ${on ? (isRTL ? "-translate-x-4" : "translate-x-4") : "translate-x-0"}`} />
    </div>
  );
}

function ShopCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const mounted = useMounted();

  const storeVolumes = useStorefrontStore((state) => state.volumes);
  // Figures and posters only, each carrying its "from" price and total stock.
  const products = useMemo(() => storeVolumes.filter(isMerch).map(withVariantSummary), [storeVolumes]);

  const readTypeParam = (): MerchType[] => {
    const type = searchParams.get("type");
    return type === "figure" || type === "poster" ? [type] : [];
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<MerchType[]>(readTypeParam);
  const [selectedFranchises, setSelectedFranchises] = useState<string[]>(() => {
    const franchise = franchiseKey(searchParams.get("franchise"));
    return franchise ? [franchise] : [];
  });
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(searchParams.get("sort") === "sale");
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("FEATURED");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  useModalScrollLock(mobileFilterOpen);

  // Footer and card links arrive as /shop?type=figure or ?franchise=naruto.
  useEffect(() => {
    const type = searchParams.get("type");
    const franchise = franchiseKey(searchParams.get("franchise"));
    const raf = requestAnimationFrame(() => {
      setSelectedTypes(type === "figure" || type === "poster" ? [type] : []);
      setSelectedFranchises(franchise ? [franchise] : []);
      setCurrentPage(1);
    });
    return () => cancelAnimationFrame(raf);
  }, [searchParams]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileFilterOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const franchises = useMemo(() => {
    const names = new Map<string, { label: string; count: number }>();
    for (const p of products) {
      const name = p.merch?.franchise?.trim();
      if (!name) continue;
      const key = franchiseKey(name);
      const entry = names.get(key);
      if (entry) entry.count += 1;
      else names.set(key, { label: (isArabic && p.merch?.franchiseAr) || name, count: 1 });
    }
    return [...names.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label));
  }, [products, isArabic]);

  const highestPrice = useMemo(() => {
    if (products.length === 0) return 500;
    return Math.max(100, Math.ceil(Math.max(...products.map((p) => p.price)) / 50) * 50);
  }, [products]);
  const effectivePriceMax = priceMax ?? highestPrice;

  const toggleType = (type: MerchType) => {
    setCurrentPage(1);
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };
  const toggleFranchise = (key: string) => {
    setCurrentPage(1);
    setSelectedFranchises((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  };

  const resetFilters = () => {
    setSelectedTypes([]);
    setSelectedFranchises([]);
    setInStockOnly(false);
    setOnSaleOnly(false);
    setPriceMax(null);
    setSortBy("FEATURED");
    setCurrentPage(1);
    if (searchParams.toString()) router.push("/shop");
  };

  // Ticking clock (null until mounted) so "on sale" follows offers that start or end.
  const now = useNow();
  const preSearch = useMemo(() => {
    return products
      .filter((p) => {
        if (selectedTypes.length > 0 && !selectedTypes.includes(productTypeOf(p) as MerchType)) return false;
        if (selectedFranchises.length > 0 && !selectedFranchises.includes(franchiseKey(p.merch?.franchise))) return false;
        if (inStockOnly && p.stock <= 0) return false;
        if (onSaleOnly) {
          const priced = priceVolume(p, now ?? 0);
          if (!priced.activePromo && !priced.listPrice) return false;
        }
        if (p.price > effectivePriceMax) return false;
        return true;
      })
      .sort((a: MangaVolume, b: MangaVolume) => {
        if (sortBy === "NEWEST") return String(b.publishDate || "").localeCompare(String(a.publishDate || ""));
        if (sortBy === "PRICE_ASC") return a.price - b.price;
        if (sortBy === "PRICE_DESC") return b.price - a.price;
        if (sortBy === "RATING") return (b.rating || 0) - (a.rating || 0);
        if (Boolean(a.isFeatured) !== Boolean(b.isFeatured)) return a.isFeatured ? -1 : 1;
        if (Boolean(a.isTrending) !== Boolean(b.isTrending)) return a.isTrending ? -1 : 1;
        return (b.stock > 0 ? 1 : 0) - (a.stock > 0 ? 1 : 0);
      });
  }, [products, selectedTypes, selectedFranchises, inStockOnly, onSaleOnly, effectivePriceMax, sortBy, now]);

  const filteredProducts = useCatalogSearch(preSearch, searchQuery);

  const activeFilterCount =
    selectedTypes.length +
    selectedFranchises.length +
    (inStockOnly ? 1 : 0) +
    (onSaleOnly ? 1 : 0) +
    (priceMax !== null && priceMax < highestPrice ? 1 : 0);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginated = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const allCovers = useMemo(() => filteredProducts.map((p) => p.coverImage), [filteredProducts]);
  usePaginatedImagePrefetch(allCovers, currentPage, ITEMS_PER_PAGE, gridRef);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.__lenis?.scrollTo(0, { immediate: true });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  };

  const franchiseLabel = (key: string) => franchises.find(([k]) => k === key)?.[1].label || key;

  // The same filter controls render in the sidebar and in the mobile sheet.
  const filterSections = (mobile: boolean) => (
    <>
      <div className="space-y-3">
        <h4 className="text-xs font-mono tracking-wider text-gold uppercase">{isArabic ? "نوع المنتج" : "PRODUCT TYPE"}</h4>
        <div className="space-y-2">
          {TYPES.map((type) => {
            const count = products.filter((p) => productTypeOf(p) === type.id).length;
            return (
              <label
                key={type.id}
                onClick={() => toggleType(type.id)}
                className="flex items-center justify-between text-xs text-text-muted hover:text-paper cursor-pointer group select-none py-1 gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Checkbox checked={selectedTypes.includes(type.id)} />
                  <span className="truncate">{isArabic ? type.ar : type.en}</span>
                </div>
                <span className="text-[10px] font-mono text-text-muted/60 shrink-0">{count}</span>
              </label>
            );
          })}
        </div>
      </div>

      {franchises.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-ink-border/60">
          <h4 className="text-xs font-mono tracking-wider text-gold uppercase">{isArabic ? "الأنمي" : "FRANCHISE"}</h4>
          <div data-lenis-prevent className={`space-y-2 ${mobile ? "max-h-52" : "max-h-60"} overflow-y-auto overscroll-contain pr-1`}>
            {franchises.map(([key, { label, count }]) => (
              <label
                key={key}
                onClick={() => toggleFranchise(key)}
                className="flex items-center justify-between text-xs text-text-muted hover:text-paper cursor-pointer group select-none py-1 gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Checkbox checked={selectedFranchises.includes(key)} />
                  <span className="truncate">{label}</span>
                </div>
                <span className="text-[10px] font-mono text-text-muted/60 shrink-0">{count}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 pt-4 border-t border-ink-border/60">
        <div className="flex items-center justify-between text-xs font-mono gap-2">
          <span className="text-gold uppercase whitespace-nowrap">{isArabic ? "الحد الأقصى للسعر" : "MAX PRICE"}</span>
          <span className="text-paper font-bold whitespace-nowrap">{formatPrice(effectivePriceMax)}</span>
        </div>
        <input
          type="range"
          min={10}
          max={highestPrice}
          step={10}
          value={effectivePriceMax}
          onChange={(e) => {
            setPriceMax(Number(e.target.value));
            setCurrentPage(1);
          }}
          className={`w-full accent-gold bg-ink-border ${mobile ? "h-1.5" : "h-1"} rounded-lg appearance-none cursor-pointer`}
        />
        <div className="flex justify-between text-[10px] font-mono text-text-muted">
          <span>{formatPrice(10)}</span>
          <span>{formatPrice(highestPrice)}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-ink-border/60 space-y-3">
        <label
          onClick={() => {
            setInStockOnly(!inStockOnly);
            setCurrentPage(1);
          }}
          className="flex items-center justify-between text-xs text-text-muted hover:text-paper cursor-pointer group select-none gap-2 py-1"
        >
          <span className="whitespace-nowrap">{isArabic ? "المتوفر في المخزن فقط" : "IN STOCK ONLY"}</span>
          <Toggle on={inStockOnly} isRTL={isRTL} />
        </label>
        <label
          onClick={() => {
            setOnSaleOnly(!onSaleOnly);
            setCurrentPage(1);
          }}
          className="flex items-center justify-between text-xs text-text-muted hover:text-paper cursor-pointer group select-none gap-2 py-1"
        >
          <span className="flex items-center gap-1.5 text-paper min-w-0">
            <span className="whitespace-nowrap truncate">{isArabic ? "عروض وتخفيضات فقط" : "ON SALE ONLY"}</span>
            <span className="text-[9px] px-1.5 py-0.5 bg-vermilion/20 text-vermilion border border-vermilion/30 rounded-xs font-mono font-bold shrink-0">
              {isArabic ? "تخفيض" : "SALE"}
            </span>
          </span>
          <Toggle on={onSaleOnly} isRTL={isRTL} />
        </label>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-ink pt-8 sm:pt-28 pb-20 px-6 md:px-12 text-paper">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-5 sm:mb-10 pb-5 sm:pb-6 border-b border-ink-border/70 flex flex-col md:flex-row md:items-end justify-between gap-3.5 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2 font-mono text-[10px] sm:text-[11px] text-gold tracking-widest uppercase">
              <span>{isArabic ? "فيجرز وبوسترات" : "FIGURES & POSTERS"}</span>
            </div>
            <h1 className="text-[1.7rem] sm:text-4xl lg:text-5xl font-extrabold tracking-tight uppercase font-sans">
              {isArabic ? "المقتنيات" : "COLLECTIBLES"}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto">
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="md:hidden flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-[38px] sm:h-[42px] bg-ink-surface border border-ink-border rounded-xs text-[11px] sm:text-xs font-mono tracking-wider uppercase hover:border-gold/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Filter strokeWidth={1.4} className="w-3.5 h-3.5 text-gold shrink-0" />
              <span>{isArabic ? `الفلاتر (${activeFilterCount})` : `FILTERS (${activeFilterCount})`}</span>
            </button>
            <div className="flex-1 sm:flex-none min-w-0">
              <CustomSelect
                options={[
                  { value: "FEATURED", label: isArabic ? "المميز أولاً" : "FEATURED" },
                  { value: "NEWEST", label: isArabic ? "الأحدث" : "NEWEST" },
                  { value: "PRICE_ASC", label: isArabic ? "السعر: تصاعدي" : "PRICE: LOW TO HIGH" },
                  { value: "PRICE_DESC", label: isArabic ? "السعر: تنازلي" : "PRICE: HIGH TO LOW" },
                  { value: "RATING", label: isArabic ? "الأعلى تقييماً" : "RATING (HIGH)" },
                ]}
                value={sortBy}
                onChange={(val) => setSortBy(val as SortKey)}
                labelPrefix={isArabic ? "ترتيب:" : "SORT:"}
                fullWidth={true}
                className="w-full sm:w-56 md:w-64"
                buttonClassName="h-[38px] sm:h-[42px] max-sm:px-3! max-sm:gap-2! max-sm:text-[11px]!"
              />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-5 sm:mb-6">
          <Search strokeWidth={1.5} className="w-4 h-4 text-gold absolute start-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={isArabic ? "ابحث بالاسم، الأنمي، الشخصية، أو الشركة المصنعة..." : "Search by name, franchise, character, or manufacturer..."}
            className="w-full h-[40px] sm:h-[46px] bg-ink-surface border border-ink-border rounded-xs ps-10 sm:ps-11 pe-10 sm:pe-11 text-[13px] sm:text-sm text-paper placeholder:text-text-muted/70 focus:border-gold outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="absolute end-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-paper transition-colors cursor-pointer"
              aria-label={isArabic ? "مسح البحث" : "Clear search"}
            >
              <X strokeWidth={1.6} className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-8 pb-4 border-b border-ink-border/50 text-xs font-mono">
            <span className="text-text-muted text-[11px] me-2">{isArabic ? "الفلاتر النشطة:" : "ACTIVE FILTERS:"}</span>
            {selectedTypes.map((type) => (
              <span key={type} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gold/10 text-gold border border-gold/30 uppercase">
                {isArabic ? TYPES.find((t) => t.id === type)?.ar : TYPES.find((t) => t.id === type)?.en}
                <button onClick={() => toggleType(type)}>
                  <X strokeWidth={1.5} className="w-3 h-3 hover:text-white" />
                </button>
              </span>
            ))}
            {selectedFranchises.map((key) => (
              <span key={key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gold/10 text-gold border border-gold/30 uppercase">
                {franchiseLabel(key)}
                <button onClick={() => toggleFranchise(key)}>
                  <X strokeWidth={1.5} className="w-3 h-3 hover:text-white" />
                </button>
              </span>
            ))}
            {priceMax !== null && priceMax < highestPrice && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gold/10 text-gold border border-gold/30 uppercase">
                {isArabic ? `حتى ${formatPrice(priceMax)}` : `UP TO ${formatPrice(priceMax)}`}
                <button onClick={() => setPriceMax(null)}>
                  <X strokeWidth={1.5} className="w-3 h-3 hover:text-white" />
                </button>
              </span>
            )}
            {inStockOnly && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gold/10 text-gold border border-gold/30 uppercase">
                {isArabic ? "المتوفر في المخزن فقط" : "IN STOCK ONLY"}
                <button onClick={() => setInStockOnly(false)}>
                  <X strokeWidth={1.5} className="w-3 h-3 hover:text-white" />
                </button>
              </span>
            )}
            {onSaleOnly && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-vermilion/20 text-vermilion border border-vermilion/40 uppercase font-semibold">
                {isArabic ? "عروض وتخفيضات فقط" : "ON SALE ONLY"}
                <button onClick={() => setOnSaleOnly(false)}>
                  <X strokeWidth={1.5} className="w-3 h-3 hover:text-white" />
                </button>
              </span>
            )}
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-text-muted hover:text-vermilion transition-colors ms-3 underline underline-offset-4"
            >
              <RotateCcw strokeWidth={1.3} className="w-3 h-3" />
              {isArabic ? "مسح الكل" : "CLEAR ALL"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Sidebar */}
          <aside className="hidden md:block md:col-span-4 lg:col-span-3 space-y-7 lg:space-y-8 bg-ink-surface/40 border border-ink-border/80 p-5 lg:p-6 rounded-sm sticky top-28">
            <div className="flex items-center justify-between pb-3 border-b border-ink-border/80">
              <span className="font-mono text-xs font-bold tracking-widest text-paper uppercase flex items-center gap-2">
                <SlidersHorizontal strokeWidth={1.4} className="w-3.5 h-3.5 text-gold" />
                {isArabic ? "تصفية" : "REFINE"}
              </span>
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} className="text-[10px] font-mono text-text-muted hover:text-vermilion cursor-pointer">
                  {isArabic ? "مسح" : "RESET"}
                </button>
              )}
            </div>
            {filterSections(false)}
          </aside>

          {/* Mobile filter sheet */}
          {mobileFilterOpen && mounted && typeof document !== "undefined" && createPortal(
            <div role="dialog" aria-modal="true" aria-label={isArabic ? "تصفية" : "Refine"} data-lenis-prevent className="fixed inset-0 z-[70] md:hidden flex">
              <div onClick={() => setMobileFilterOpen(false)} className="fixed inset-0 bg-black/85 backdrop-blur-md animate-in fade-in duration-200" aria-hidden="true" />
              <div data-lenis-prevent className="relative z-10 w-[88%] max-w-[360px] bg-ink border-ink-border h-full flex flex-col shadow-2xl overflow-hidden animate-in duration-300 slide-in-from-right ms-auto border-s">
                <div className="px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-ink-border flex items-center justify-between bg-ink/95 backdrop-blur-sm shrink-0">
                  <span className="font-mono text-xs sm:text-sm font-bold tracking-widest text-paper uppercase flex items-center gap-2">
                    <SlidersHorizontal strokeWidth={1.5} className="w-4 h-4 text-gold shrink-0" />
                    {isArabic ? "تصفية" : "REFINE"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileFilterOpen(false)}
                    className="w-8 h-8 rounded-sm bg-ink-surface border border-ink-border text-text-muted hover:text-paper flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                    aria-label={isArabic ? "إغلاق" : "Close"}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 overscroll-contain">{filterSections(true)}</div>
                <div className="p-4 sm:p-5 border-t border-ink-border bg-ink/95 backdrop-blur-sm flex gap-3 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      resetFilters();
                      setMobileFilterOpen(false);
                    }}
                    className="flex-1 py-3 bg-ink-surface hover:bg-ink-border border border-ink-border text-paper font-mono text-xs uppercase tracking-wider rounded-xs cursor-pointer font-bold text-center transition-colors active:scale-95"
                  >
                    {isArabic ? "مسح" : "CLEAR"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileFilterOpen(false)}
                    className="flex-1 py-3 bg-gold hover:bg-gold-muted text-ink font-mono text-xs uppercase tracking-wider rounded-xs cursor-pointer font-extrabold text-center shadow-lg transition-colors active:scale-95"
                  >
                    {isArabic ? `عرض النتائج (${filteredProducts.length})` : `APPLY (${filteredProducts.length})`}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Product grid */}
          <main className="md:col-span-8 lg:col-span-9">
            <div className="mb-6 flex justify-between items-center text-xs font-mono text-text-muted">
              <span>
                {filteredProducts.length === 0
                  ? (isArabic ? "لا توجد نتائج" : "NO RESULTS")
                  : isArabic
                    ? `عرض ${paginated.length} من ${filteredProducts.length} منتج`
                    : `SHOWING ${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} OF ${filteredProducts.length}`}
              </span>
              <span className="text-gold font-serif">蒐集の店</span>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="p-16 border border-ink-border/80 rounded-sm bg-ink-surface/30 text-center space-y-4">
                <p className="font-mono text-sm uppercase text-paper">
                  {products.length === 0
                    ? (isArabic ? "لا توجد مقتنيات بعد" : "No collectibles yet")
                    : (isArabic ? "لم نجد منتجات تطابق معايير التصفية" : "No products matched the refined criteria")}
                </p>
                {products.length > 0 && (
                  <>
                    <p className="text-xs text-text-muted">
                      {isArabic ? "جرّب تعديل نطاق السعر أو إلغاء بعض الفلاتر." : "Try adjusting the price slider or resetting some filters."}
                    </p>
                    <button
                      onClick={resetFilters}
                      className="px-6 py-2.5 bg-paper text-ink text-xs font-bold font-mono tracking-widest uppercase rounded-sm hover:bg-vermilion hover:text-white transition-colors"
                    >
                      {isArabic ? "إلغاء كافة الفلاتر" : "RESET ALL FILTERS"}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {paginated.map((product) => (
                  <ShopProductCard key={product.id} product={product} isArabic={isArabic} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2 font-mono">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-bold uppercase tracking-wider border border-ink-border text-text-muted hover:text-paper hover:border-gold/50 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className={`w-3.5 h-3.5 ${isRTL ? "rotate-180" : ""}`} />
                  <span className="hidden sm:inline">{isArabic ? "السابق" : "PREV"}</span>
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    const showPage = page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                    const ellipsis = (page === currentPage - 2 && currentPage > 3) || (page === currentPage + 2 && currentPage < totalPages - 2);
                    if (ellipsis) return <span key={page} className="w-8 text-center text-text-muted text-xs">…</span>;
                    if (!showPage) return null;
                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() => goToPage(page)}
                        className={`w-9 h-9 text-xs font-bold rounded-sm transition-colors cursor-pointer ${
                          page === currentPage ? "bg-gold text-ink border border-gold" : "border border-ink-border text-text-muted hover:text-paper hover:border-gold/50"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-bold uppercase tracking-wider border border-ink-border text-text-muted hover:text-paper hover:border-gold/50 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="hidden sm:inline">{isArabic ? "التالي" : "NEXT"}</span>
                  <ChevronRight className={`w-3.5 h-3.5 ${isRTL ? "rotate-180" : ""}`} />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function ShopCatalogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink" />}>
      <ShopCatalogContent />
    </Suspense>
  );
}
