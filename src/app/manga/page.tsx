"use client";

import React, { useState, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Filter,
  SlidersHorizontal,
  Star,
  Eye,
  X,
  Check,
  RotateCcw,
  Heart,
  ChevronLeft,
  ChevronRight,
  Search,
  ShoppingBag,
} from "lucide-react";
import { ALL_VOLUMES, GENRES } from "@/data/manga";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore, useMounted } from "@/store/useWishlistStore";
import { useUIStore } from "@/store/useUIStore";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { useCatalogSearch } from "@/hooks/useCatalogSearch";
import { formatPrice, volumeBadgeLabel } from "@/lib/utils";
import { isBook } from "@/lib/variants";
import { createPortal } from "react-dom";
import { CustomSelect } from "@/components/CustomSelect";
import { LiveEditButton } from "@/components/admin/LiveEditButton";
import { useTranslation } from "@/hooks/useTranslation";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { AnimeVerseImage } from "@/components/AnimeVerseImage";
import { usePaginatedImagePrefetch } from "@/hooks/useImagePrefetch";

function MangaCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const initialGenre = searchParams.get("genre");
  const isSaleParam = searchParams.get("sort") === "sale";
  // Header and footer link straight to a format ("/manga?format=Box+Set"); without
  // this the visitor landed on the unfiltered catalogue.
  const initialFormat = searchParams.get("format");

  const storeVolumes = useStorefrontStore((state) => state.volumes);
  const storeGenres = useStorefrontStore((state) => state.genres);
  const storeFormats = useStorefrontStore((state) => state.formats);

  // The manga catalogue lists books only; figures and posters live in /shop.
  const activeVolumes = useMemo(
    () => (storeVolumes && storeVolumes.length > 0 ? storeVolumes : ALL_VOLUMES).filter(isBook),
    [storeVolumes]
  );
  // The genre list follows the CMS and also picks up any genre a volume
  // carries that the curator has not added to the directory yet, so new
  // genres never leave their books unfilterable.
  const activeGenres = useMemo(() => {
    const base = storeGenres && storeGenres.length > 0 ? storeGenres : GENRES;
    // Dedupe on both name and id: the directory lists "Dark Fantasy" under
    // the id "dark", and a volume tagged plain "Dark" slugifies to that same
    // id — which React saw as two children sharing one key.
    const knownNames = new Set(base.map((g) => g.name.toLowerCase()));
    const knownIds = new Set(base.map((g) => g.id.toLowerCase()));
    const extras: typeof base = [];

    for (const volume of activeVolumes) {
      for (const name of volume.genre || []) {
        const label = name.toLowerCase();
        // The filter compares a selected id against volume genre names, so
        // the id has to be the lowercased name to stay filterable.
        if (knownNames.has(label) || knownIds.has(label)) continue;
        knownNames.add(label);
        knownIds.add(label);
        extras.push({ id: label, name, japanese: name, description: "", coverImage: "", popularTitle: "" });
      }
    }

    return [...base, ...extras];
  }, [storeGenres, activeVolumes]);

  const [searchQuery, setSearchQuery] = useState("");

  const availableFormats = useMemo(() => {
    const base = storeFormats && storeFormats.length > 0
      ? storeFormats
      : ["Manga", "Deluxe Edition", "Box Set", "Light Novel"];
    const volumeFormats = activeVolumes.map((v) => v.format).filter(Boolean);
    return Array.from(new Set([...base, ...volumeFormats]));
  }, [storeFormats, activeVolumes]);

  const highestPrice = useMemo(() => {
    if (!activeVolumes || activeVolumes.length === 0) return 500;
    const max = Math.max(...activeVolumes.map((v) => v.price));
    return Math.max(100, Math.ceil(max / 50) * 50);
  }, [activeVolumes]);

  // Filters State
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    initialGenre ? [initialGenre.toLowerCase()] : []
  );
  const [selectedFormats, setSelectedFormats] = useState<string[]>(
    initialFormat ? [initialFormat] : []
  );
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(isSaleParam);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const effectivePriceMax = priceMax ?? highestPrice;
  const [sortBy, setSortBy] = useState<"POPULAR" | "NEWEST" | "PRICE_ASC" | "PRICE_DESC" | "RATING">("POPULAR");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const mounted = useMounted();
  useModalScrollLock(mobileFilterOpen);

  // Close mobile filter on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileFilterOpen) {
        setMobileFilterOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileFilterOpen]);

  // Sync state when URL query parameters change (e.g. clicking SALE or GENRE from header)
  React.useEffect(() => {
    const isSale = searchParams.get("sort") === "sale";
    const genre = searchParams.get("genre");
    const format = searchParams.get("format");
    const raf = requestAnimationFrame(() => {
      setOnSaleOnly(isSale);
      if (genre) {
        setSelectedGenres([genre.toLowerCase()]);
      }
      if (format) {
        setSelectedFormats([format]);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [searchParams]);

  const addItem = useCartStore((state) => state.addItem);
  const { openCart, openReader } = useUIStore();

  const handleCardClick = (volumeId: string) => {
    router.push(`/manga/${volumeId}`);
  };

  const toggleGenre = (genreId: string) => {
    setCurrentPage(1);
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((g) => g !== genreId) : [...prev, genreId]
    );
  };

  const toggleFormat = (format: string) => {
    setCurrentPage(1);
    setSelectedFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  };

  const resetFilters = () => {
    setSelectedGenres([]);
    setSelectedFormats([]);
    setInStockOnly(false);
    setOnSaleOnly(false);
    setPriceMax(null);
    setSortBy("POPULAR");
    setCurrentPage(1);
    if (searchParams.toString()) {
      router.push("/manga");
    }
  };

  // Filtered and Sorted Volumes
  const preSearchVolumes = useMemo(() => {
    return activeVolumes.filter((volume) => {
      // Sale filter
      if (onSaleOnly && (!volume.originalPrice || volume.originalPrice <= volume.price)) {
        return false;
      }

      // Genre filter
      if (selectedGenres.length > 0) {
        const volumeGenreLower = volume.genre.map((g) => g.toLowerCase());
        const hasMatch = selectedGenres.some((sg) => volumeGenreLower.includes(sg));
        if (!hasMatch) return false;
      }

      // Format filter
      if (selectedFormats.length > 0) {
        if (!selectedFormats.includes(volume.format)) return false;
      }

      // In-stock filter
      if (inStockOnly && volume.stock <= 0) {
        return false;
      }

      // Price filter
      if (volume.price > effectivePriceMax) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "NEWEST") return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
      if (sortBy === "PRICE_ASC") return a.price - b.price;
      if (sortBy === "PRICE_DESC") return b.price - a.price;
      if (sortBy === "RATING") return b.rating - a.rating;
      // Default: POPULAR (trending first, then rating, then stock)
      if (a.isTrending && !b.isTrending) return -1;
      if (!a.isTrending && b.isTrending) return 1;
      return b.rating - a.rating;
    });
  }, [selectedGenres, selectedFormats, inStockOnly, onSaleOnly, effectivePriceMax, sortBy, activeVolumes]);

  // Relevance ordering only makes sense while something is typed; otherwise
  // the shopper's chosen sort stands.
  const filteredVolumes = useCatalogSearch(preSearchVolumes, searchQuery);

  const activeFilterCount =
    selectedGenres.length +
    selectedFormats.length +
    (inStockOnly ? 1 : 0) +
    (onSaleOnly ? 1 : 0) +
    (priceMax !== null && priceMax < highestPrice ? 1 : 0);

  const totalPages = Math.ceil(filteredVolumes.length / ITEMS_PER_PAGE);
  const paginatedVolumes = filteredVolumes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Shoppers page through this grid, so the covers on the page they are heading
  // for are fetched quietly while the current one is being read.
  const gridRef = useRef<HTMLDivElement | null>(null);
  const allCovers = useMemo(
    () => filteredVolumes.map((volume) => volume.coverImage),
    [filteredVolumes]
  );
  usePaginatedImagePrefetch(allCovers, currentPage, ITEMS_PER_PAGE, gridRef);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    // Pagination changes the client state without changing the route, so Lenis
    // must be moved explicitly; native window scrolling alone is ignored by it.
    window.__lenis?.scrollTo(0, { immediate: true });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  };

  return (
    <div className="min-h-screen bg-ink pt-8 sm:pt-28 pb-20 px-6 md:px-12 text-paper">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-5 sm:mb-10 pb-5 sm:pb-6 border-b border-ink-border/70 flex flex-col md:flex-row md:items-end justify-between gap-3.5 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2 font-mono text-[10px] sm:text-[11px] text-gold tracking-widest uppercase">
              <span>{isArabic ? "مستودع الأرشيف المعتمد" : "ARCHIVE REPOSITORY"}</span>
              <span>/</span>
              <span>{isArabic ? "الكتالوج" : "CATALOG"}</span>
            </div>
            <h1 className="text-[1.7rem] sm:text-4xl lg:text-5xl font-extrabold tracking-tight uppercase font-sans">
              {isArabic ? "كتالوج المانجا" : "MANGA CATALOG"}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="md:hidden flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-[38px] sm:h-[42px] bg-ink-surface border border-ink-border rounded-xs text-[11px] sm:text-xs font-mono tracking-wider uppercase hover:border-gold/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Filter strokeWidth={1.4} className="w-3.5 h-3.5 text-gold shrink-0" />
              <span>{isArabic ? `الفلاتر (${activeFilterCount})` : `FILTERS (${activeFilterCount})`}</span>
            </button>

            {/* Sort Dropdown */}
            <div className="flex-1 sm:flex-none min-w-0">
              <CustomSelect
                options={[
                  { value: "POPULAR", label: isArabic ? "الأكثر رواجاً" : "POPULAR" },
                  { value: "NEWEST", label: isArabic ? "أحدث المجلدات" : "NEWEST" },
                  { value: "PRICE_ASC", label: isArabic ? "السعر: تصاعدي" : "PRICE: LOW TO HIGH" },
                  { value: "PRICE_DESC", label: isArabic ? "السعر: تنازلي" : "PRICE: HIGH TO LOW" },
                  { value: "RATING", label: isArabic ? "الأعلى تقييماً" : "RATING (HIGH)" },
                ]}
                value={sortBy}
                onChange={(val) => setSortBy(val as typeof sortBy)}
                labelPrefix={isArabic ? "ترتيب:" : "SORT:"}
                fullWidth={true}
                className="w-full sm:w-56 md:w-64"
                buttonClassName="h-[38px] sm:h-[42px] max-sm:px-3! max-sm:gap-2! max-sm:text-[11px]!"
              />
            </div>
          </div>
        </div>


        {/* Catalogue Search */}
        <div className="relative mb-5 sm:mb-6">
          <Search strokeWidth={1.5} className="w-4 h-4 text-gold absolute start-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={
              isArabic
                ? "ابحث بالاسم، المؤلف، رقم المجلد، أو ISBN..."
                : "Search by title, author, volume number, or ISBN..."
            }
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

        {/* Active Filter Chips Bar */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-8 pb-4 border-b border-ink-border/50 text-xs font-mono">
            <span className="text-text-muted text-[11px] mr-2">{isArabic ? "الفلاتر النشطة:" : "ACTIVE FILTERS:"}</span>
            {selectedGenres.map((g) => (
              <span
                key={g}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gold/10 text-gold border border-gold/30 uppercase"
              >
                {g}
                <button onClick={() => toggleGenre(g)}>
                  <X strokeWidth={1.5} className="w-3 h-3 hover:text-white" />
                </button>
              </span>
            ))}
            {selectedFormats.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gold/10 text-gold border border-gold/30 uppercase"
              >
                {f}
                <button onClick={() => toggleFormat(f)}>
                  <X strokeWidth={1.5} className="w-3 h-3 hover:text-white" />
                </button>
              </span>
            ))}
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
                <button
                  onClick={() => {
                    setOnSaleOnly(false);
                    if (searchParams.get("sort") === "sale") {
                      router.push("/manga");
                    }
                  }}
                >
                  <X strokeWidth={1.5} className="w-3 h-3 hover:text-white" />
                </button>
              </span>
            )}
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-text-muted hover:text-vermilion transition-colors ml-3 underline underline-offset-4"
            >
              <RotateCcw strokeWidth={1.3} className="w-3 h-3" />
              {isArabic ? "مسح الكل" : "CLEAR ALL"}
            </button>
          </div>
        )}

        {/* Main Catalog Layout (Sidebar Filters + Product Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Filters Sidebar Desktop / iPad */}
          <aside className="hidden md:block md:col-span-4 lg:col-span-3 space-y-7 lg:space-y-8 bg-ink-surface/40 border border-ink-border/80 p-5 lg:p-6 rounded-sm sticky top-28">
            <div className="flex items-center justify-between pb-3 border-b border-ink-border/80">
              <span className="font-mono text-xs font-bold tracking-widest text-paper uppercase flex items-center gap-2">
                <SlidersHorizontal strokeWidth={1.4} className="w-3.5 h-3.5 text-gold" />
                {isArabic ? "تصفية الكتالوج" : "REFINE CATALOG"}
              </span>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-[10px] font-mono text-text-muted hover:text-vermilion cursor-pointer"
                >
                  RESET
                </button>
              )}
            </div>

            {/* Genre Multi-select */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono tracking-wider text-gold uppercase">
                {isArabic ? "التصنيف الأدبي" : "GENRE"}
              </h4>
              <div data-lenis-prevent className="space-y-2 max-h-60 overflow-y-auto overscroll-contain pr-1">
                {activeGenres.map((genre) => {
                  const isChecked = selectedGenres.includes(genre.id.toLowerCase());
                  return (
                    <label
                      key={genre.id}
                      onClick={() => toggleGenre(genre.id.toLowerCase())}
                      className="flex items-center justify-between text-xs text-text-muted hover:text-paper cursor-pointer group select-none py-1 gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-xs border flex items-center justify-center transition-colors shrink-0 ${
                            isChecked
                              ? "bg-gold border-gold text-ink"
                              : "border-ink-border group-hover:border-paper/60"
                          }`}
                        >
                          {isChecked && <Check strokeWidth={2.5} className="w-3 h-3" />}
                        </div>
                        <span className="truncate">{genre.name}</span>
                      </div>
                      <span className="font-serif text-[11px] text-text-muted/60 shrink-0 whitespace-nowrap">
                        {genre.japanese}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Format Multi-select */}
            <div className="space-y-3 pt-4 border-t border-ink-border/60">
              <h4 className="text-xs font-mono tracking-wider text-gold uppercase">
                {isArabic ? "نوع الطبعة" : "FORMAT"}
              </h4>
              <div className="space-y-2">
                {availableFormats.map((format) => {
                  const isChecked = selectedFormats.includes(format);
                  return (
                    <label
                      key={format}
                      onClick={() => toggleFormat(format)}
                      className="flex items-center justify-between text-xs text-text-muted hover:text-paper cursor-pointer group select-none py-1 gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-xs border flex items-center justify-center transition-colors shrink-0 ${
                            isChecked
                              ? "bg-gold border-gold text-ink"
                              : "border-ink-border group-hover:border-paper/60"
                          }`}
                        >
                          {isChecked && <Check strokeWidth={2.5} className="w-3 h-3" />}
                        </div>
                        <span className="truncate">{format}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Price Range Slider */}
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
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="w-full accent-gold bg-ink-border h-1 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-text-muted">
                <span>{formatPrice(10)}</span>
                <span>{formatPrice(highestPrice)}</span>
              </div>
            </div>

            {/* In Stock Toggle */}
            <div className="pt-4 border-t border-ink-border/60">
              <label
                onClick={() => setInStockOnly(!inStockOnly)}
                className="flex items-center justify-between text-xs text-text-muted hover:text-paper cursor-pointer group select-none gap-2"
              >
                <span className="whitespace-nowrap">{isArabic ? "المتوفر في المخزن فقط" : "IN STOCK ONLY"}</span>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                    inStockOnly ? "bg-vermilion" : "bg-ink border border-ink-border"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-paper transition-transform ${
                      inStockOnly ? (isRTL ? "-translate-x-4" : "translate-x-4") : "translate-x-0"
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* On Sale Toggle */}
            <div className="pt-4 border-t border-ink-border/60">
              <label
                onClick={() => {
                  const nextSale = !onSaleOnly;
                  setOnSaleOnly(nextSale);
                  if (!nextSale && searchParams.get("sort") === "sale") {
                    router.push("/manga");
                  }
                }}
                className="flex items-center justify-between text-xs text-text-muted hover:text-paper cursor-pointer group select-none gap-2"
              >
                <span className="flex items-center gap-1.5 text-paper min-w-0">
                  <span className="whitespace-nowrap truncate">{isArabic ? "عروض وتخفيضات فقط" : "ON SALE ONLY"}</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-vermilion/20 text-vermilion border border-vermilion/30 rounded-xs font-mono font-bold shrink-0">
                    {isArabic ? "تخفيض" : "SALE"}
                  </span>
                </span>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                    onSaleOnly ? "bg-vermilion" : "bg-ink border border-ink-border"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-paper transition-transform ${
                      onSaleOnly ? (isRTL ? "-translate-x-4" : "translate-x-4") : "translate-x-0"
                    }`}
                  />
                </div>
              </label>
            </div>
          </aside>

          {/* Mobile Filter Slide-over Sheet Modal */}
          {mobileFilterOpen && mounted && typeof document !== "undefined" && createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={isArabic ? "تصفية الكتالوج" : "Refine Catalog"}
              data-lenis-prevent
              className="fixed inset-0 z-[70] md:hidden flex"
            >
              {/* Backdrop */}
              <div
                onClick={() => setMobileFilterOpen(false)}
                className="fixed inset-0 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
                aria-hidden="true"
              />

              {/* Drawer Sheet */}
              <div
                data-lenis-prevent
                className={`relative z-10 w-[88%] max-w-[360px] bg-ink border-ink-border h-full flex flex-col shadow-2xl overflow-hidden animate-in duration-300 ${
                  isRTL
                    ? "slide-in-from-right mr-0 ml-auto border-l"
                    : "slide-in-from-right ml-auto border-l"
                }`}
              >
                {/* Header - Sticky with safe area padding */}
                <div className="px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-ink-border flex items-center justify-between bg-ink/95 backdrop-blur-sm shrink-0">
                  <span className="font-mono text-xs sm:text-sm font-bold tracking-widest text-paper uppercase flex items-center gap-2">
                    <SlidersHorizontal strokeWidth={1.5} className="w-4 h-4 text-gold shrink-0" />
                    {isArabic ? "تصفية الكتالوج" : "REFINE CATALOG"}
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

                {/* Scrollable Content Body */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 overscroll-contain">
                  {/* Genre Multi-select */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono tracking-wider text-gold uppercase">
                      {isArabic ? "التصنيف الأدبي" : "GENRE"}
                    </h4>
                    <div data-lenis-prevent className="space-y-2.5 max-h-52 overflow-y-auto overscroll-contain pr-1">
                      {activeGenres.map((genre) => {
                        const isChecked = selectedGenres.includes(genre.id.toLowerCase());
                        return (
                          <label
                            key={genre.id}
                            onClick={() => toggleGenre(genre.id.toLowerCase())}
                            className="flex items-center justify-between text-xs text-text-muted hover:text-paper cursor-pointer py-1 select-none transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 rounded-xs border flex items-center justify-center transition-colors shrink-0 ${
                                  isChecked
                                    ? "bg-gold border-gold text-ink"
                                    : "border-ink-border"
                                }`}
                              >
                                {isChecked && <Check strokeWidth={2.5} className="w-3 h-3" />}
                              </div>
                              <span>{genre.name}</span>
                            </div>
                            <span className="font-serif text-[11px] text-text-muted/60">
                              {genre.japanese}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Format Multi-select */}
                  <div className="space-y-3 pt-4 border-t border-ink-border/60">
                    <h4 className="text-xs font-mono tracking-wider text-gold uppercase">
                      {isArabic ? "نوع الطبعة" : "FORMAT"}
                    </h4>
                    <div className="space-y-2.5">
                      {availableFormats.map((format) => {
                        const isChecked = selectedFormats.includes(format);
                        return (
                          <label
                            key={format}
                            onClick={() => toggleFormat(format)}
                            className="flex items-center justify-between text-xs text-text-muted hover:text-paper cursor-pointer py-1 select-none transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 rounded-xs border flex items-center justify-center transition-colors shrink-0 ${
                                  isChecked
                                    ? "bg-gold border-gold text-ink"
                                    : "border-ink-border"
                                }`}
                              >
                                {isChecked && <Check strokeWidth={2.5} className="w-3 h-3" />}
                              </div>
                              <span>{format}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price Range Slider */}
                  <div className="space-y-3 pt-4 border-t border-ink-border/60">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-gold uppercase">{isArabic ? "الحد الأقصى للسعر" : "MAX PRICE"}</span>
                      <span className="text-paper font-bold">{formatPrice(effectivePriceMax)}</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={highestPrice}
                      step={10}
                      value={effectivePriceMax}
                      onChange={(e) => setPriceMax(Number(e.target.value))}
                      className="w-full accent-gold bg-ink-border h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-text-muted">
                      <span>{formatPrice(10)}</span>
                      <span>{formatPrice(highestPrice)}</span>
                    </div>
                  </div>

                  {/* Stock & Sale Toggles */}
                  <div className="space-y-3 pt-4 border-t border-ink-border/60">
                    <label
                      onClick={() => setInStockOnly(!inStockOnly)}
                      className="flex items-center justify-between text-xs text-text-muted hover:text-paper cursor-pointer select-none py-1"
                    >
                      <span>{isArabic ? "المتوفر في المخزن فقط" : "IN STOCK ONLY"}</span>
                      <div
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                          inStockOnly ? "bg-vermilion" : "bg-ink border border-ink-border"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-paper transition-transform ${
                            inStockOnly ? (isRTL ? "-translate-x-4" : "translate-x-4") : "translate-x-0"
                          }`}
                        />
                      </div>
                    </label>

                    <label
                      onClick={() => {
                        const nextSale = !onSaleOnly;
                        setOnSaleOnly(nextSale);
                        if (!nextSale && searchParams.get("sort") === "sale") {
                          router.push("/manga");
                        }
                      }}
                      className="flex items-center justify-between text-xs text-text-muted hover:text-paper cursor-pointer select-none py-1"
                    >
                      <span className="flex items-center gap-1.5 text-paper">
                        <span>{isArabic ? "عروض وتخفيضات فقط" : "ON SALE ONLY"}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-vermilion/20 text-vermilion border border-vermilion/30 rounded-xs font-mono font-bold shrink-0">
                          {isArabic ? "تخفيض" : "SALE"}
                        </span>
                      </span>
                      <div
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                          onSaleOnly ? "bg-vermilion" : "bg-ink border border-ink-border"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-paper transition-transform ${
                            onSaleOnly ? (isRTL ? "-translate-x-4" : "translate-x-4") : "translate-x-0"
                          }`}
                        />
                      </div>
                    </label>
                  </div>
                </div>

                {/* Mobile Bottom Filter Actions - Sticky Footer */}
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
                    {isArabic ? `عرض النتائج (${filteredVolumes.length})` : `APPLY (${filteredVolumes.length})`}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Product Grid Area */}
          <main className="md:col-span-8 lg:col-span-9">
            <div className="mb-6 flex justify-between items-center text-xs font-mono text-text-muted">
              <span>
                {isArabic
                  ? `عرض ${paginatedVolumes.length} من ${filteredVolumes.length} مجلداً`
                  : `SHOWING ${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, filteredVolumes.length)} OF ${filteredVolumes.length}`}
              </span>
              <span className="text-gold font-serif">悠久の書庫</span>
            </div>

            {filteredVolumes.length === 0 ? (
              <div className="p-16 border border-ink-border/80 rounded-sm bg-ink-surface/30 text-center space-y-4">
                <p className="font-mono text-sm uppercase text-paper">
                  {isArabic ? "لم نجد أي مجلدات تطابق معايير التصفية" : "No volumes matched the refined criteria"}
                </p>
                <p className="text-xs text-text-muted">
                  {isArabic ? "جرّب تعديل نطاق السعر أو إلغاء بعض التصنيفات المحددة." : "Try adjusting the price slider or resetting selected genre filters."}
                </p>
                <button
                  onClick={resetFilters}
                  className="px-6 py-2.5 bg-paper text-ink text-xs font-bold font-mono tracking-widest uppercase rounded-sm hover:bg-vermilion hover:text-white transition-colors"
                >
                  {isArabic ? "إلغاء كافة الفلاتر" : "RESET ALL FILTERS"}
                </button>
              </div>
            ) : (
              <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {paginatedVolumes.map((volume) => (
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
                        sizes="(max-width: 1023px) 50vw, 33vw"
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
                        <span className="px-2 py-0.5 rounded-xs bg-ink/90 backdrop-blur-md text-[9px] font-mono tracking-wider text-gold border border-ink-border">
                          {volumeBadgeLabel(volume, isArabic)}
                        </span>
                        {volume.originalPrice && volume.originalPrice > volume.price && (
                          <span className="px-2 py-0.5 rounded-xs bg-vermilion text-[8px] font-mono font-bold tracking-wider text-white shadow-sm">
                            SALE -{Math.round(((volume.originalPrice - volume.price) / volume.originalPrice) * 100)}%
                          </span>
                        )}
                        {volume.format === "Deluxe Edition" && (
                          <span className="px-2 py-0.5 rounded-xs bg-gold/90 text-[8px] font-mono tracking-wider text-ink font-bold">
                            DELUXE
                          </span>
                        )}
                        {volume.comingSoon ? (
                          <span className="px-2 py-0.5 rounded-xs bg-gold/15 border border-gold/60 text-[8px] font-mono font-bold tracking-wider text-gold uppercase">
                            {isArabic ? "قريبًا" : "COMING SOON"}
                          </span>
                        ) : volume.stock <= 0 && (
                          <span className="px-2 py-0.5 rounded-xs bg-red-950/90 border border-red-800/80 text-[8px] font-mono font-bold tracking-wider text-red-400 uppercase">
                            {isArabic ? "نفد من المخزن" : "OUT OF STOCK"}
                          </span>
                        )}
                      </div>

                      {/* Floating Action Triggers */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-10">
                        {/* Wishlist Trigger */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleWishlist(volume);
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-90 shadow-sm ${
                            mounted && isInWishlist(volume.id)
                              ? "bg-ink/95 border-vermilion text-vermilion"
                              : "bg-black/60 border-white/15 text-paper-muted hover:text-gold hover:border-gold/60 opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                          }`}
                          title={mounted && isInWishlist(volume.id) ? (isArabic ? "في قائمة الرغبات" : "Saved in Wishlist") : (isArabic ? "إضافة للرغبات" : "Save to Wishlist")}
                          aria-label="Wishlist"
                        >
                          <Heart
                            strokeWidth={1.5}
                            className={`w-3.5 h-3.5 transition-transform ${
                              mounted && isInWishlist(volume.id) ? "fill-vermilion text-vermilion scale-110" : ""
                            }`}
                          />
                        </button>

                        {/* Quick Read Trigger */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openReader(volume);
                          }}
                          className="w-7 h-7 rounded-full flex items-center justify-center bg-black/60 backdrop-blur-md border border-white/15 text-paper-muted hover:text-gold hover:border-gold transition-colors opacity-90 sm:opacity-0 sm:group-hover:opacity-100 active:scale-90 shadow-sm"
                          title={isArabic ? "معاينة عينة (RTL)" : "Read Sample (RTL)"}
                          aria-label="Read Sample"
                        >
                          <Eye strokeWidth={1.5} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-3 sm:p-4 flex flex-col justify-between flex-1">
                      <div>
                        <span className="text-[9px] font-mono tracking-widest text-gold uppercase block truncate">
                          {volume.seriesTitle}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-paper tracking-wide group-hover:text-gold transition-colors line-clamp-1 mt-0.5 block">
                          {volume.title}
                        </h3>
                        <p className="text-[10px] text-text-muted mt-0.5 line-clamp-1">
                          {isArabic ? "تأليف: " : "By "} {volume.author}
                        </p>

                        <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[11px] font-mono text-text-muted">
                          <Star strokeWidth={1.5} className="w-3 h-3 text-gold fill-gold shrink-0" />
                          <span className="text-paper font-semibold">{volume.rating.toFixed(1)}</span>
                          <span className="text-[10px] text-text-muted/70 truncate">
                            ({volume.reviewCount.toLocaleString("en-US")}{" "}{isArabic ? "تقييم" : "reviews"})
                          </span>
                        </div>
                      </div>

                      {/* Price and Cart Button — same shape as the New Releases grid */}
                      <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-ink-border/50 flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5">
                        <div className="flex flex-wrap items-baseline gap-x-2 leading-tight">
                          <span className="text-sm font-mono font-extrabold text-paper">
                            {volume.price > 0 ? formatPrice(volume.price) : (isArabic ? "السعر قريبًا" : "PRICE TBA")}
                          </span>
                          {volume.originalPrice && volume.originalPrice > volume.price && (
                            <span className="text-[11px] font-mono text-text-muted/70 line-through">
                              {formatPrice(volume.originalPrice)}
                            </span>
                          )}
                        </div>
                        {volume.comingSoon || volume.price <= 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleWishlist(volume);
                            }}
                            className="grow basis-auto px-3 py-2 bg-gold/10 border border-gold/50 text-gold hover:bg-gold hover:text-ink text-[9px] font-mono font-bold tracking-widest uppercase rounded-sm transition-colors whitespace-nowrap"
                          >
                            {mounted && isInWishlist(volume.id) ? (isArabic ? "محفوظ بالمفضلة" : "SAVED TO WISHLIST") : (isArabic ? "أضف للمفضلة" : "SAVE TO WISHLIST")}
                          </button>
                        ) : volume.stock <= 0 ? (
                          <button
                            type="button"
                            disabled
                            className="grow basis-auto px-3 py-2 bg-ink-surface/90 border border-ink-border text-text-muted text-[9px] font-mono font-bold tracking-widest uppercase rounded-sm cursor-not-allowed opacity-80 whitespace-nowrap"
                          >
                            {isArabic ? "نفد من المخزن" : "OUT OF STOCK"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addItem(volume, 1);
                              openCart();
                            }}
                            className="grow basis-auto px-3 py-2 bg-ink-elevated border border-ink-border hover:border-vermilion hover:bg-vermilion hover:text-white text-paper text-[10px] font-mono font-bold tracking-wider uppercase transition-all rounded-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-95 z-10 whitespace-nowrap"
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
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2 font-mono">
                {/* Prev */}
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-bold uppercase tracking-wider border border-ink-border text-text-muted hover:text-paper hover:border-gold/50 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isArabic ? "السابق" : "PREV"}</span>
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first, last, current, and neighbors; show ellipsis for gaps
                    const showPage =
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1;
                    const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                    const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

                    if (showEllipsisBefore || showEllipsisAfter) {
                      return (
                        <span key={page} className="w-8 text-center text-text-muted text-xs">…</span>
                      );
                    }
                    if (!showPage) return null;

                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() => goToPage(page)}
                        className={`w-9 h-9 text-xs font-bold rounded-sm transition-colors cursor-pointer ${
                          page === currentPage
                            ? "bg-gold text-ink border border-gold"
                            : "border border-ink-border text-text-muted hover:text-paper hover:border-gold/50"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                {/* Next */}
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-bold uppercase tracking-wider border border-ink-border text-text-muted hover:text-paper hover:border-gold/50 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="hidden sm:inline">{isArabic ? "التالي" : "NEXT"}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function MangaCatalogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink pt-32 text-center font-mono">LOADING CATALOG...</div>}>
      <MangaCatalogContent />
    </Suspense>
  );
}
