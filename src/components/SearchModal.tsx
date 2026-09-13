"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ArrowRight, ChevronRight, Clock, CornerDownLeft, Flame, Search, X } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { useMounted } from "@/store/useWishlistStore";
import { ALL_SERIES, ALL_VOLUMES, type MangaVolume } from "@/data/manga";
import { productHref, volumeBadgeLabel } from "@/lib/utils";
import { isBook, isMerch, withVariantSummary } from "@/lib/variants";
import { buildFranchises } from "@/lib/franchise";
import { searchVolumes, tokenize } from "@/lib/search";
import { useCatalogSearch } from "@/hooks/useCatalogSearch";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { useTranslation } from "@/hooks/useTranslation";
import { AnimeVerseImage } from "@/components/AnimeVerseImage";
import { PriceTag } from "@/components/PriceTag";

/** What this shopper searched for lately, kept in their browser only. */
const useRecentSearches = create<{ terms: string[]; add: (term: string) => void; clear: () => void }>()(
  persist(
    (set, get) => ({
      terms: [],
      add: (term) => {
        const clean = term.trim().slice(0, 60);
        if (clean.length < 2) return;
        set({ terms: [clean, ...get().terms.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, 6) });
      },
      clear: () => set({ terms: [] }),
    }),
    { name: "kairo_recent_searches" }
  )
);

type Tab = "ALL" | "MANGA" | "BOXSETS" | "COLLECTIBLES";

const inTab = (item: MangaVolume, tab: Tab) =>
  tab === "ALL" ||
  (tab === "MANGA" && isBook(item) && item.format !== "Box Set") ||
  (tab === "BOXSETS" && isBook(item) && item.format === "Box Set") ||
  (tab === "COLLECTIBLES" && isMerch(item));

/** Wraps the parts of `text` that the typed words match, for a quick visual scan. */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length || !text) return <>{text}</>;
  const escaped = terms.filter((t) => t.length > 0).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escaped.join("|")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-transparent text-gold">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

export function SearchModal() {
  const router = useRouter();
  const { t, locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const { isSearchOpen, closeSearch } = useUIStore();
  useModalScrollLock(isSearchOpen);
  const mounted = useMounted();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("ALL");
  const [active, setActive] = useState(0);
  const recent = useRecentSearches((s) => s.terms);
  const addRecent = useRecentSearches((s) => s.add);
  const clearRecent = useRecentSearches((s) => s.clear);

  const storeVolumes = useStorefrontStore((state) => state.volumes);
  const storeSeries = useStorefrontStore((state) => state.series);
  const volumes = useMemo(
    () => (storeVolumes && storeVolumes.length > 0 ? storeVolumes : ALL_VOLUMES).map(withVariantSummary),
    [storeVolumes]
  );
  const seriesList = storeSeries && storeSeries.length > 0 ? storeSeries : ALL_SERIES;

  // Focus the box whenever the dialog opens, so typing starts immediately.
  useEffect(() => {
    if (!isSearchOpen) return;
    const id = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 150);
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSearch();
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onEscape);
    };
  }, [isSearchOpen, closeSearch]);

  const hasQuery = query.trim().length > 0;
  const terms = useMemo(() => query.trim().split(/\s+/).filter((w) => w.length > 1 || /\d/.test(w)), [query]);

  const ranked = useCatalogSearch(volumes, query);
  const counts = useMemo(() => {
    const base = hasQuery ? ranked : volumes;
    return {
      ALL: base.length,
      MANGA: base.filter((v) => inTab(v, "MANGA")).length,
      BOXSETS: base.filter((v) => inTab(v, "BOXSETS")).length,
      COLLECTIBLES: base.filter((v) => inTab(v, "COLLECTIBLES")).length,
    };
  }, [ranked, volumes, hasQuery]);

  const products = useMemo(() => (hasQuery ? ranked.filter((v) => inTab(v, tab)).slice(0, 30) : []), [ranked, tab, hasQuery]);

  // Series whose name answers the query get their own row at the top.
  const matchedSeries = useMemo(() => {
    if (!hasQuery || (tab !== "ALL" && tab !== "MANGA") || tokenize(query).length === 0) return [];
    const searchable = seriesList.map((s) => ({
      slug: s.slug,
      title: s.title,
      author: s.author,
      aliases: [s.romajiTitle, s.japaneseTitle],
      image: s.featuredImage || s.bannerImage,
      count: volumes.filter((v) => v.seriesSlug === s.slug && v.format !== "Box Set" && isBook(v)).length,
    }));
    return searchVolumes(searchable, query).slice(0, 3);
  }, [hasQuery, tab, query, seriesList, volumes]);

  // Empty box: something to start from instead of a blank panel.
  const franchises = useMemo(() => buildFranchises(volumes, seriesList).filter((f) => f.image).slice(0, 8), [volumes, seriesList]);
  const trending = useMemo(
    () =>
      [...volumes]
        .filter((v) => v.stock > 0 && (v.isTrending || (isMerch(v) && v.isFeatured)))
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 6),
    [volumes]
  );

  // One flat list for the arrow keys: series first, then products.
  const links = useMemo(
    () => [
      ...matchedSeries.map((s) => `/series/${s.slug}`),
      ...(hasQuery ? products : trending).map((p) => productHref(p)),
    ],
    [matchedSeries, products, trending, hasQuery]
  );
  const activeIndex = Math.min(active, Math.max(0, links.length - 1));

  const go = (href: string) => {
    if (hasQuery) addRecent(query);
    closeSearch();
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!links.length) return;
      const next = (activeIndex + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
      setActive(next);
      listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && links[activeIndex]) {
      e.preventDefault();
      go(links[activeIndex]);
    }
  };

  const updateQuery = (value: string) => {
    setQuery(value);
    setActive(0);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "ALL", label: isArabic ? "الكل" : "All" },
    { id: "MANGA", label: isArabic ? "مانجا" : "Manga" },
    { id: "BOXSETS", label: isArabic ? "بوكسات" : "Box Sets" },
    { id: "COLLECTIBLES", label: isArabic ? "مقتنيات" : "Collectibles" },
  ];

  const sectionTitle = "text-[10px] font-mono tracking-[0.2em] uppercase text-text-muted mb-3 flex items-center gap-2";

  const productRow = (item: MangaVolume, index: number) => {
    const merch = isMerch(item);
    const eyebrow = merch ? (isArabic && item.merch?.franchiseAr) || item.merch?.franchise || "" : item.seriesTitle;
    const title = merch || item.format === "Box Set" ? item.title : `${isArabic ? "مجلد" : "Vol."} ${item.volumeNumber}: ${item.title}`;
    const sub = merch ? volumeBadgeLabel(item, isArabic) : item.author ? `${t.search.byAuthor} ${item.author}` : item.format;
    const isActive = index === activeIndex;
    return (
      <Link
        key={item.id}
        href={productHref(item)}
        data-index={index}
        onMouseEnter={() => setActive(index)}
        onClick={(e) => {
          e.preventDefault();
          go(productHref(item));
        }}
        className={`group flex items-center gap-3 sm:gap-4 px-3 py-2.5 rounded-sm border transition-colors ${
          isActive ? "bg-ink-elevated border-gold/40" : "border-transparent hover:bg-ink-elevated/60"
        }`}
      >
        <div className="relative w-11 h-[60px] shrink-0 overflow-hidden rounded-xs border border-ink-border bg-ink">
          <AnimeVerseImage src={item.coverImage} alt={item.title} sizes="44px" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-mono tracking-widest text-gold/90 uppercase block truncate">{eyebrow}</span>
          <h4 className="text-[13px] font-semibold text-paper truncate">
            <Highlight text={title} terms={terms} />
          </h4>
          <p className="text-[10px] text-text-muted truncate mt-0.5">{sub}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1 text-end">
          {item.stock <= 0 ? (
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-red-400">{isArabic ? "نفد" : "Sold out"}</span>
          ) : (
            <div className="flex items-baseline gap-1">
              {merch && (item.variants?.length || 0) > 1 && (
                <span className="text-[9px] font-mono uppercase text-text-muted">{isArabic ? "من" : "From"}</span>
              )}
              <PriceTag volume={item} isArabic={isArabic} showTimer={false} className="justify-end [&>span:nth-child(2)]:hidden sm:[&>span:nth-child(2)]:inline" />
            </div>
          )}
        </div>
        <ChevronRight
          strokeWidth={1.5}
          className={`hidden sm:block w-4 h-4 shrink-0 transition-colors ${isActive ? "text-gold" : "text-ink-border"} ${isRTL ? "rotate-180" : ""}`}
        />
      </Link>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isArabic ? "بحث" : "Search"}
      data-lenis-prevent
      className={`fixed inset-0 z-50 flex items-start justify-center sm:p-6 md:pt-20 transition-all duration-300 ${
        isSearchOpen ? "visible pointer-events-auto" : "invisible pointer-events-none"
      }`}
    >
      <div
        onClick={closeSearch}
        className={`fixed inset-0 bg-ink/80 backdrop-blur-md transition-opacity duration-300 ${isSearchOpen ? "opacity-100" : "opacity-0"}`}
      />

      <div
        data-lenis-prevent
        className={`relative z-10 w-full h-full sm:h-auto sm:max-h-[80vh] max-w-2xl flex flex-col bg-ink-surface sm:border border-ink-border sm:rounded-sm shadow-2xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isSearchOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 -translate-y-4"
        }`}
      >
        {/* Search box */}
        <div className="flex items-center gap-3 px-4 sm:px-5 h-16 border-b border-ink-border bg-ink shrink-0">
          <Search strokeWidth={1.6} className="w-5 h-5 text-gold shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={isArabic ? "ابحث عن مانجا، سلسلة، كاتب أو فيجر…" : "Search manga, series, authors or figures…"}
            className="flex-1 min-w-0 bg-transparent text-paper placeholder-text-muted/60 text-base focus:outline-none font-sans [&::-webkit-search-cancel-button]:hidden"
            aria-controls="search-results"
            autoComplete="off"
            enterKeyHint="search"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                updateQuery("");
                inputRef.current?.focus();
              }}
              className="text-[10px] font-mono uppercase tracking-wider text-text-muted hover:text-paper px-2 py-1 rounded-xs border border-ink-border cursor-pointer"
            >
              {t.search.clear}
            </button>
          )}
          <button
            type="button"
            onClick={closeSearch}
            aria-label={isArabic ? "إغلاق" : "Close"}
            className="p-1.5 text-text-muted hover:text-paper transition-colors cursor-pointer"
          >
            <X strokeWidth={1.4} className="w-5 h-5" />
          </button>
        </div>

        {/* Type tabs */}
        <div className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 border-b border-ink-border/60 bg-ink/50 overflow-x-auto no-scrollbar shrink-0">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setActive(0);
                inputRef.current?.focus();
              }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[11px] font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                tab === item.id ? "bg-gold/15 text-gold border border-gold/40" : "text-text-muted border border-transparent hover:text-paper"
              }`}
            >
              {item.label}
              {hasQuery && <span className={`text-[10px] ${tab === item.id ? "text-gold/80" : "text-text-muted/60"}`}>{counts[item.id]}</span>}
            </button>
          ))}
        </div>

        {/* Body */}
        <div id="search-results" ref={listRef} data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {!hasQuery ? (
            <div className="space-y-7 p-1 sm:p-2">
              {mounted && recent.length > 0 && (
                <section>
                  <div className={`${sectionTitle} justify-between`}>
                    <span className="flex items-center gap-2">
                      <Clock className="w-3 h-3" /> {t.search.recentSearches}
                    </span>
                    <button type="button" onClick={clearRecent} className="normal-case tracking-normal text-text-muted hover:text-vermilion cursor-pointer">
                      {t.search.clear}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          updateQuery(term);
                          inputRef.current?.focus();
                        }}
                        className="px-3 py-1.5 rounded-sm border border-ink-border bg-ink text-xs text-paper-muted hover:text-paper hover:border-gold/50 cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {franchises.length > 0 && (
                <section>
                  <div className={sectionTitle}>{isArabic ? "تصفح حسب الأنمي" : "Browse by anime"}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {franchises.map((f) => (
                      <Link
                        key={f.key}
                        href={f.href}
                        onClick={(e) => {
                          e.preventDefault();
                          go(f.href);
                        }}
                        className="group relative h-16 overflow-hidden rounded-sm border border-ink-border hover:border-gold/60 transition-colors"
                      >
                        <AnimeVerseImage src={f.image} alt={f.name} sizes="160px" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/10" />
                        <span className="absolute inset-x-2 bottom-1.5 text-[11px] font-bold uppercase tracking-tight text-paper truncate">
                          {isArabic && f.nameAr ? f.nameAr : f.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {trending.length > 0 && (
                <section>
                  <div className={sectionTitle}>
                    <Flame className="w-3 h-3 text-vermilion" /> {isArabic ? "الأكثر رواجاً" : "Trending now"}
                  </div>
                  <div className="space-y-1">{trending.map((item, i) => productRow(item, i))}</div>
                </section>
              )}
            </div>
          ) : products.length === 0 && matchedSeries.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-sm text-paper">
                {isArabic ? "مفيش نتائج لـ" : "No results for"} &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-text-muted">
                {tab !== "ALL" && counts.ALL > 0 ? (
                  <button type="button" onClick={() => setTab("ALL")} className="text-gold hover:underline cursor-pointer">
                    {isArabic ? `اعرض ${counts.ALL} نتيجة في كل الأقسام` : `Show ${counts.ALL} results in all categories`}
                  </button>
                ) : (
                  t.search.trySearching
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {matchedSeries.length > 0 && (
                <section>
                  <div className={`${sectionTitle} px-2`}>{isArabic ? "سلاسل" : "Series"}</div>
                  <div className="space-y-1">
                    {matchedSeries.map((s, i) => (
                      <Link
                        key={s.slug}
                        href={`/series/${s.slug}`}
                        data-index={i}
                        onMouseEnter={() => setActive(i)}
                        onClick={(e) => {
                          e.preventDefault();
                          go(`/series/${s.slug}`);
                        }}
                        className={`flex items-center gap-3 sm:gap-4 px-3 py-2.5 rounded-sm border transition-colors ${
                          i === activeIndex ? "bg-ink-elevated border-gold/40" : "border-transparent hover:bg-ink-elevated/60"
                        }`}
                      >
                        <div className="relative w-11 h-11 shrink-0 overflow-hidden rounded-full border border-gold/40 bg-ink">
                          <AnimeVerseImage src={s.image} alt={s.title} sizes="44px" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] font-semibold text-paper truncate">
                            <Highlight text={s.title} terms={terms} />
                          </h4>
                          <p className="text-[10px] text-text-muted truncate">
                            {s.author} · {isArabic ? `${s.count} مجلد` : `${s.count} volumes`}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-gold shrink-0">{isArabic ? "السلسلة" : "View series"}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
              {products.length > 0 && (
                <section>
                  {matchedSeries.length > 0 && <div className={`${sectionTitle} px-2`}>{isArabic ? "المنتجات" : "Products"}</div>}
                  <div className="space-y-1">{products.map((item, i) => productRow(item, i + matchedSeries.length))}</div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-ink-border bg-ink text-[10px] font-mono text-text-muted">
          <span className="hidden sm:flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-xs border border-ink-border">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded-xs border border-ink-border">↓</kbd>
              {isArabic ? "تنقل" : "navigate"}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-xs border border-ink-border">
                <CornerDownLeft className="w-2.5 h-2.5" />
              </kbd>
              {isArabic ? "فتح" : "open"}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-xs border border-ink-border">esc</kbd>
              {isArabic ? "إغلاق" : "close"}
            </span>
          </span>
          <div className="flex items-center gap-4 ms-auto">
            <Link href="/manga" onClick={closeSearch} className="flex items-center gap-1 uppercase tracking-wider text-paper hover:text-gold transition-colors">
              {isArabic ? "كل المانجا" : "All manga"}
              <ArrowRight strokeWidth={1.4} className={`w-3 h-3 ${isRTL ? "rotate-180" : ""}`} />
            </Link>
            <Link href="/shop" onClick={closeSearch} className="flex items-center gap-1 uppercase tracking-wider text-paper hover:text-gold transition-colors">
              {isArabic ? "كل المقتنيات" : "All collectibles"}
              <ArrowRight strokeWidth={1.4} className={`w-3 h-3 ${isRTL ? "rotate-180" : ""}`} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
