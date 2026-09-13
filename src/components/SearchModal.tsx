"use client";

import { useCatalogSearch } from "@/hooks/useCatalogSearch";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, X, Star, ArrowRight } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { ALL_VOLUMES, MangaVolume } from "@/data/manga";
import { formatPrice, productHref, volumeBadgeLabel } from "@/lib/utils";
import { isMerch } from "@/lib/variants";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { useTranslation } from "@/hooks/useTranslation";
import { AnimeVerseImage } from "@/components/AnimeVerseImage";

export function SearchModal() {
  const { t, isRTL } = useTranslation();
  const { isSearchOpen, closeSearch } = useUIStore();
  useModalScrollLock(isSearchOpen);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "POPULAR" | "TOP_RATED" | "BEST_SELLERS">("ALL");

  const storeVolumes = useStorefrontStore((state) => state.volumes);
  const allVolumes = storeVolumes && storeVolumes.length > 0 ? storeVolumes : ALL_VOLUMES;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSearchOpen) {
        closeSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, closeSearch]);

  // Tab filtering and text search are separate steps: the tab result is what
  // the search index is built from, and it only changes when a tab does.
  const tabFiltered = useMemo(() => {
    let list: MangaVolume[] = [...allVolumes];

    // A typed query searches the whole shop; the tab only narrows browsing.
    if (query.trim()) return list;

    if (activeFilter === "POPULAR") {
      list = list.filter((v) => v.isTrending);
    } else if (activeFilter === "TOP_RATED") {
      list = list.filter((v) => v.rating >= 4.9);
    } else if (activeFilter === "BEST_SELLERS") {
      // Sales volume is not recorded, so review count stands in for it — a
      // far better proxy than shelf stock, which measures the opposite.
      list = [...list].sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    }

      return list;
  }, [activeFilter, allVolumes, query]);

  const ranked = useCatalogSearch(tabFiltered, query);
  // An empty box is a browse, not a search, so it stays a short preview.
  const filteredVolumes = useMemo(
    () => (query.trim() ? ranked.slice(0, 24) : ranked.slice(0, 6)),
    [ranked, query]
  );

  const filterTabs = [
    { id: "ALL" as const, label: t.search.filterAll },
    { id: "POPULAR" as const, label: t.search.filterPopular },
    { id: "TOP_RATED" as const, label: t.search.filterTopRated },
    { id: "BEST_SELLERS" as const, label: t.search.filterBestSellers },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-lenis-prevent
      className={`fixed inset-0 z-50 overflow-y-auto overscroll-contain p-2.5 sm:p-6 md:p-20 pt-14 sm:pt-20 flex items-start justify-center transition-all duration-300 ${
        isSearchOpen ? "visible pointer-events-auto" : "invisible pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        onClick={closeSearch}
        className={`fixed inset-0 bg-ink/80 backdrop-blur-md transition-opacity duration-300 ${
          isSearchOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Modal Dialog */}
      <div
        data-lenis-prevent
        className={`relative w-full max-w-3xl bg-ink-surface border border-ink-border rounded-sm shadow-2xl overflow-hidden z-10 overscroll-contain transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isSearchOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 -translate-y-4"
        }`}
      >
        {/* Search Input Bar */}
        <div className="relative border-b border-ink-border flex items-center px-4 sm:px-6 py-3.5 sm:py-4 bg-ink">
          <Search strokeWidth={1.5} className={`w-5 h-5 text-gold shrink-0 ${isRTL ? "ml-3" : "mr-3"}`} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search.placeholder}
            className="w-full bg-transparent text-paper placeholder-text-muted/60 text-sm md:text-base focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className={`text-text-muted hover:text-paper text-xs font-mono px-1.5 py-0.5 cursor-pointer active:scale-95 ${isRTL ? "ml-2" : "mr-2"}`}
            >
              {t.search.clear}
            </button>
          )}
          <button
            onClick={closeSearch}
            className="p-1 text-text-muted hover:text-paper transition-colors cursor-pointer active:scale-95"
          >
            <X strokeWidth={1.4} className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Filter Tags */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-ink/50 border-b border-ink-border/60 flex items-center gap-2 overflow-x-auto no-scrollbar text-[11px] font-mono">
          <span className={`text-text-muted uppercase tracking-wider text-[10px] shrink-0 ${isRTL ? "ml-2" : "mr-2"}`}>
            {t.search.filtersLabel}
          </span>
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-2.5 py-1 rounded-sm transition-colors uppercase tracking-wider cursor-pointer shrink-0 active:scale-95 ${
                activeFilter === tab.id
                  ? "bg-gold/20 text-gold border border-gold/40"
                  : "text-text-muted hover:text-paper hover:bg-ink-surface"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results Container */}
        <div data-lenis-prevent className="max-h-[65vh] sm:max-h-96 overflow-y-auto p-3.5 sm:p-6 space-y-3 sm:space-y-4">
          {filteredVolumes.length === 0 ? (
            <div className="text-center py-12 text-text-muted space-y-2 font-mono text-xs">
              <p>{t.search.noVolumesFound} &quot;{query}&quot;</p>
              <p className="text-[11px] text-text-muted/60">
                {t.search.trySearching}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredVolumes.map((volume) => (
                <Link
                  key={volume.id}
                  href={productHref(volume)}
                  onClick={closeSearch}
                  className="flex gap-3.5 p-3 rounded-sm bg-ink/60 border border-ink-border/60 hover:border-gold/50 hover:bg-ink-elevated transition-all duration-200 group"
                >
                  <div className="relative w-14 h-20 shrink-0 overflow-hidden bg-ink rounded-sm border border-ink-border">
                    <AnimeVerseImage
                      src={volume.coverImage}
                      alt={volume.title}
                      sizes="56px"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                    <div>
                      <span className="text-[9px] font-mono tracking-widest text-gold uppercase block truncate">
                        {isMerch(volume)
                          ? (isRTL && volume.merch?.franchiseAr) || volume.merch?.franchise || volumeBadgeLabel(volume, isRTL)
                          : volume.seriesTitle}
                      </span>
                      <h4 className="text-xs font-bold text-paper truncate group-hover:text-gold transition-colors">
                        {isMerch(volume) ? volume.title : `Vol. ${volume.volumeNumber}: ${volume.title}`}
                      </h4>
                      <p className="text-[10px] text-text-muted truncate mt-0.5">
                        {isMerch(volume) ? volumeBadgeLabel(volume, isRTL) : `${t.search.byAuthor} ${volume.author}`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono pt-1">
                      <span className="text-gold font-bold">
                        {isMerch(volume) && (volume.variants?.length || 0) > 1 ? `${isRTL ? "من" : "From"} ` : ""}
                        {formatPrice(volume.price)}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-paper-muted">
                        <Star strokeWidth={1.5} className="w-3 h-3 text-gold fill-gold" />
                        {volume.rating}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-6 py-3 bg-ink border-t border-ink-border flex items-center justify-between text-[11px] font-mono text-text-muted">
          <span>{t.search.escHint}</span>
          <Link
            href="/manga"
            onClick={closeSearch}
            className="flex items-center gap-1.5 text-paper hover:text-vermilion transition-colors font-semibold"
          >
            {t.search.viewFullCatalog}
            <ArrowRight strokeWidth={1.4} className={`w-3.5 h-3.5 ${isRTL ? "rotate-180" : ""}`} />
          </Link>
        </div>
      </div>
    </div>
  );
}
