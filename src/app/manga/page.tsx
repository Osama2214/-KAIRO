"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Filter,
  SlidersHorizontal,
  Star,
  Plus,
  Eye,
  X,
  Check,
  RotateCcw,
  Heart,
} from "lucide-react";
import { ALL_VOLUMES, GENRES } from "@/data/manga";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore, useMounted } from "@/store/useWishlistStore";
import { useUIStore } from "@/store/useUIStore";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { formatPrice } from "@/lib/utils";
import { CustomSelect } from "@/components/CustomSelect";
import { LiveEditButton } from "@/components/admin/LiveEditButton";

function MangaCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGenre = searchParams.get("genre");
  const isSaleParam = searchParams.get("sort") === "sale";

  const storeVolumes = useStorefrontStore((state) => state.volumes);
  const storeGenres = useStorefrontStore((state) => state.genres);

  const activeVolumes = storeVolumes && storeVolumes.length > 0 ? storeVolumes : ALL_VOLUMES;
  const activeGenres = storeGenres && storeGenres.length > 0 ? storeGenres : GENRES;

  const highestPrice = useMemo(() => {
    if (!activeVolumes || activeVolumes.length === 0) return 500;
    const max = Math.max(...activeVolumes.map((v) => v.price));
    return Math.max(100, Math.ceil(max / 50) * 50);
  }, [activeVolumes]);

  // Filters State
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    initialGenre ? [initialGenre.toLowerCase()] : []
  );
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(isSaleParam);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const effectivePriceMax = priceMax ?? highestPrice;
  const [sortBy, setSortBy] = useState<"POPULAR" | "NEWEST" | "PRICE_ASC" | "PRICE_DESC" | "RATING">("POPULAR");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const mounted = useMounted();

  // Sync state when URL query parameters change (e.g. clicking SALE or GENRE from header)
  React.useEffect(() => {
    const isSale = searchParams.get("sort") === "sale";
    const genre = searchParams.get("genre");
    const raf = requestAnimationFrame(() => {
      setOnSaleOnly(isSale);
      if (genre) {
        setSelectedGenres([genre.toLowerCase()]);
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
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((g) => g !== genreId) : [...prev, genreId]
    );
  };

  const toggleFormat = (format: string) => {
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
    if (searchParams.toString()) {
      router.push("/manga");
    }
  };

  // Filtered and Sorted Volumes
  const filteredVolumes = useMemo(() => {
    return activeVolumes.filter((volume) => {
      // Sale filter
      if (onSaleOnly && (!volume.originalPrice || volume.originalPrice <= volume.price)) {
        return false;
      }

      // Genre filter
      if (selectedGenres.length > 0) {
        const matchesGenre = volume.genre.some((g) =>
          selectedGenres.includes(g.toLowerCase())
        );
        if (!matchesGenre) return false;
      }

      // Format filter
      if (selectedFormats.length > 0) {
        if (!selectedFormats.includes(volume.format)) return false;
      }

      // Stock filter
      if (inStockOnly && volume.stock <= 0) return false;

      // Price filter
      if (volume.price > effectivePriceMax) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === "POPULAR") return (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0);
      if (sortBy === "NEWEST") return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
      if (sortBy === "PRICE_ASC") return a.price - b.price;
      if (sortBy === "PRICE_DESC") return b.price - a.price;
      if (sortBy === "RATING") return b.rating - a.rating;
      return 0;
    });
  }, [selectedGenres, selectedFormats, inStockOnly, onSaleOnly, effectivePriceMax, sortBy, activeVolumes]);

  const activeFilterCount =
    selectedGenres.length +
    selectedFormats.length +
    (inStockOnly ? 1 : 0) +
    (onSaleOnly ? 1 : 0) +
    (priceMax !== null && priceMax < highestPrice ? 1 : 0);

  return (
    <div className="min-h-screen bg-ink pt-28 pb-20 px-6 md:px-12 text-paper">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-10 pb-6 border-b border-ink-border/70 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 font-mono text-[11px] text-gold tracking-widest uppercase">
              <span>ARCHIVE REPOSITORY</span>
              <span>/</span>
              <span>CATALOG</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight uppercase font-sans">
              MANGA CATALOG
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="md:hidden flex items-center gap-2 px-4 py-2.5 bg-ink-surface border border-ink-border rounded-xs text-xs font-mono tracking-widest uppercase hover:border-gold/60 transition-colors cursor-pointer"
            >
              <Filter strokeWidth={1.4} className="w-3.5 h-3.5 text-gold" />
              <span>FILTERS ({activeFilterCount})</span>
            </button>

            {/* Sort Dropdown */}
            <CustomSelect
              options={[
                { value: "POPULAR", label: "POPULAR" },
                { value: "NEWEST", label: "NEWEST" },
                { value: "PRICE_ASC", label: "PRICE: LOW TO HIGH" },
                { value: "PRICE_DESC", label: "PRICE: HIGH TO LOW" },
                { value: "RATING", label: "RATING (HIGH TO LOW)" },
              ]}
              value={sortBy}
              onChange={(val) => setSortBy(val as typeof sortBy)}
              labelPrefix="SORT BY:"
              className="w-56 sm:w-64"
            />
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-8 pb-4 border-b border-ink-border/50 text-xs font-mono">
            <span className="text-text-muted text-[11px] mr-2">ACTIVE FILTERS:</span>
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
                IN STOCK ONLY
                <button onClick={() => setInStockOnly(false)}>
                  <X strokeWidth={1.5} className="w-3 h-3 hover:text-white" />
                </button>
              </span>
            )}
            {onSaleOnly && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-vermilion/20 text-vermilion border border-vermilion/40 uppercase font-semibold">
                🔥 ON SALE ONLY
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
              CLEAR ALL
            </button>
          </div>
        )}

        {/* Main Catalog Layout (Sidebar Filters + Product Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Filters Sidebar Desktop */}
          <aside
            className={`md:col-span-3 space-y-8 bg-ink-surface/40 border border-ink-border/80 p-6 rounded-sm ${
              mobileFilterOpen ? "block" : "hidden md:block"
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-ink-border/80">
              <span className="font-mono text-xs font-bold tracking-widest text-paper uppercase flex items-center gap-2">
                <SlidersHorizontal strokeWidth={1.4} className="w-3.5 h-3.5 text-gold" />
                REFINE CATALOG
              </span>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-[10px] font-mono text-text-muted hover:text-vermilion"
                >
                  RESET
                </button>
              )}
            </div>

            {/* Genre Multi-select */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono tracking-wider text-gold uppercase">
                GENRE
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activeGenres.map((genre) => {
                  const isChecked = selectedGenres.includes(genre.id.toLowerCase());
                  return (
                    <label
                      key={genre.id}
                      className="flex items-center justify-between text-xs text-text-muted hover:text-paper cursor-pointer group select-none py-1"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          onClick={() => toggleGenre(genre.id.toLowerCase())}
                          className={`w-4 h-4 rounded-xs border flex items-center justify-center transition-colors ${
                            isChecked
                              ? "bg-gold border-gold text-ink"
                              : "border-ink-border group-hover:border-paper/60"
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

            {/* Format Filter */}
            <div className="space-y-3 pt-4 border-t border-ink-border/60">
              <h4 className="text-xs font-mono tracking-wider text-gold uppercase">
                FORMAT
              </h4>
              <div className="space-y-2">
                {["Manga", "Deluxe Edition", "Box Set", "Light Novel"].map((fmt) => {
                  const isChecked = selectedFormats.includes(fmt);
                  return (
                    <label
                      key={fmt}
                      onClick={() => toggleFormat(fmt)}
                      className="flex items-center gap-2.5 text-xs text-text-muted hover:text-paper cursor-pointer group select-none py-1"
                    >
                      <div
                        className={`w-4 h-4 rounded-xs border flex items-center justify-center transition-colors ${
                          isChecked
                            ? "bg-gold border-gold text-ink"
                            : "border-ink-border group-hover:border-paper/60"
                        }`}
                      >
                        {isChecked && <Check strokeWidth={2.5} className="w-3 h-3" />}
                      </div>
                      <span>{fmt}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Price Max Slider */}
            <div className="space-y-3 pt-4 border-t border-ink-border/60">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="tracking-wider text-gold uppercase">MAX PRICE</span>
                <span className="text-paper font-bold">{formatPrice(effectivePriceMax)}</span>
              </div>
              <input
                type="range"
                min={10}
                max={highestPrice}
                step={5}
                value={effectivePriceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="w-full accent-gold cursor-pointer"
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
                className="flex items-center justify-between text-xs text-text-muted hover:text-paper cursor-pointer group select-none"
              >
                <span>IN STOCK ONLY</span>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                    inStockOnly ? "bg-vermilion" : "bg-ink border border-ink-border"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-paper transition-transform ${
                      inStockOnly ? "translate-x-4" : "translate-x-0"
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
                className="flex items-center justify-between text-xs text-text-muted hover:text-paper cursor-pointer group select-none"
              >
                <span className="flex items-center gap-1.5 text-paper">
                  <span>ON SALE ONLY</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-vermilion/20 text-vermilion border border-vermilion/30 rounded-xs font-mono font-bold">
                    SALE
                  </span>
                </span>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                    onSaleOnly ? "bg-vermilion" : "bg-ink border border-ink-border"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-paper transition-transform ${
                      onSaleOnly ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </label>
            </div>
          </aside>

          {/* Product Grid Area */}
          <main className="md:col-span-9">
            <div className="mb-6 flex justify-between items-center text-xs font-mono text-text-muted">
              <span>SHOWING {filteredVolumes.length} EDITIONS</span>
              <span className="text-gold font-serif">回路書庫</span>
            </div>

            {filteredVolumes.length === 0 ? (
              <div className="p-16 border border-ink-border/80 rounded-sm bg-ink-surface/30 text-center space-y-4">
                <p className="font-mono text-sm uppercase text-paper">
                  No volumes matched the refined criteria
                </p>
                <p className="text-xs text-text-muted">
                  Try adjusting the price slider or resetting selected genre filters.
                </p>
                <button
                  onClick={resetFilters}
                  className="px-6 py-2.5 bg-paper text-ink text-xs font-bold font-mono tracking-widest uppercase rounded-sm hover:bg-vermilion hover:text-white transition-colors"
                >
                  RESET ALL FILTERS
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {filteredVolumes.map((volume) => (
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
                      <img
                        src={volume.coverImage}
                        alt={volume.title}
                        draggable={false}
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
                          VOL. {volume.volumeNumber < 10 ? `0${volume.volumeNumber}` : volume.volumeNumber}
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
                        {volume.stock <= 0 && (
                          <span className="px-2 py-0.5 rounded-xs bg-red-950/90 border border-red-800/80 text-[8px] font-mono font-bold tracking-wider text-red-400 uppercase">
                            OUT OF STOCK
                          </span>
                        )}
                      </div>

                      {/* Floating Action Triggers */}
                      <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
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
                              ? "bg-ink/90 border-vermilion text-vermilion"
                              : "bg-ink/80 border-ink-border text-paper-muted hover:text-gold hover:border-gold/60 opacity-0 group-hover:opacity-100"
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

                        {/* Quick Read Trigger */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openReader(volume);
                          }}
                          className="p-1.5 rounded-xs bg-ink/80 backdrop-blur-md border border-ink-border text-paper-muted hover:text-gold hover:border-gold transition-colors opacity-0 group-hover:opacity-100 active:scale-90"
                          title="Read Sample (RTL)"
                        >
                          <Eye strokeWidth={1.4} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-4 flex flex-col justify-between flex-1">
                      <div>
                        <span className="text-[9px] font-mono tracking-widest text-gold uppercase block">
                          {volume.seriesTitle}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold text-paper tracking-wide group-hover:text-gold transition-colors line-clamp-1 mt-0.5 block">
                          {volume.title}
                        </h3>
                        <p className="text-[10px] text-text-muted mt-0.5 line-clamp-1">
                          By {volume.author}
                        </p>

                        <div className="flex items-center gap-1 mt-2 text-[11px] font-mono text-text-muted">
                          <Star strokeWidth={1.5} className="w-3 h-3 text-gold fill-gold" />
                          <span className="text-paper font-semibold">{volume.rating.toFixed(1)}</span>
                          <span className="text-[10px] text-text-muted/70">
                            ({volume.reviewCount})
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-ink-border/50 flex items-center justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-mono font-bold text-paper">
                            {formatPrice(volume.price)}
                          </span>
                          {volume.originalPrice && volume.originalPrice > volume.price && (
                            <span className="text-[11px] font-mono text-text-muted/70 line-through">
                              {formatPrice(volume.originalPrice)}
                            </span>
                          )}
                        </div>
                        {volume.stock <= 0 ? (
                          <span className="px-2.5 py-1 bg-ink-surface/90 border border-ink-border text-text-muted text-[9px] font-mono font-bold uppercase rounded-xs cursor-not-allowed opacity-80">
                            OUT OF STOCK
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
                            className="px-3 py-1.5 bg-paper text-ink hover:bg-vermilion hover:text-white font-bold text-[10px] font-mono tracking-widest uppercase transition-colors rounded-xs flex items-center gap-1 z-10 active:scale-95"
                          >
                            <Plus strokeWidth={1.5} className="w-3 h-3" />
                            ADD
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
