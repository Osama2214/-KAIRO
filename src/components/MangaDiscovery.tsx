"use client";

import React, { useState, useMemo } from "react";
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

export function MangaDiscovery() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"POPULAR" | "TOP_RATED" | "BEST_SELLERS" | "RECENTLY_ADDED">("POPULAR");

  const storeVolumes = useStorefrontStore((state) => state.volumes);
  const addItem = useCartStore((state) => state.addItem);
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const mounted = useMounted();
  const { openCart } = useUIStore();

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

    if (!searchTerm.trim()) return list.slice(0, 4);

    const term = searchTerm.toLowerCase();
    return list.filter(
      (v) =>
        v.title.toLowerCase().includes(term) ||
        v.seriesTitle.toLowerCase().includes(term) ||
        v.author.toLowerCase().includes(term) ||
        v.genre.some((g) => g.toLowerCase().includes(term))
    ).slice(0, 4);
  }, [searchTerm, activeTab, storeVolumes]);

  return (
    <section className="py-24 px-6 md:px-12 bg-ink border-t border-ink-border/60">
      <div className="max-w-7xl mx-auto">
        {/* Section Title */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-[11px] font-mono tracking-[0.25em] text-gold uppercase">
            INSTANT ARCHIVAL LOOKUP
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight uppercase text-paper font-sans">
            FIND YOUR NEXT MANGA
          </h2>
          <p className="text-xs text-text-muted">
            Query across titles, authors, genres, or ISBN registry.
          </p>
        </div>

        {/* Large Search Bar */}
        <div className="max-w-3xl mx-auto relative mb-6">
          <div className="relative flex items-center bg-ink-surface border border-ink-border rounded-sm shadow-2xl focus-within:border-gold transition-colors">
            <Search strokeWidth={1.5} className="w-5 h-5 text-gold ml-5 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search manga, author, or series... (e.g. Eiichiro Oda, Dark Fantasy, Solo Leveling)"
              className="w-full py-4.5 px-4 bg-transparent text-paper placeholder-text-muted/60 text-sm focus:outline-none font-sans"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="mr-4 text-xs font-mono text-text-muted hover:text-paper"
              >
                RESET
              </button>
            )}
          </div>
        </div>

        {/* Tabs Below Search */}
        <div className="flex justify-center items-center gap-2 sm:gap-3 flex-wrap mb-12">
          {[
            { id: "POPULAR" as const, label: "POPULAR" },
            { id: "TOP_RATED" as const, label: "TOP RATED" },
            { id: "BEST_SELLERS" as const, label: "BEST SELLERS" },
            { id: "RECENTLY_ADDED" as const, label: "RECENTLY ADDED" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-sm text-xs font-mono tracking-widest uppercase transition-all ${
                activeTab === tab.id
                  ? "bg-paper text-ink font-bold shadow-md"
                  : "bg-ink-surface text-text-muted hover:text-paper border border-ink-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 4 Preview Cards Results */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  <span className="px-2 py-0.5 rounded-xs bg-ink/90 text-[9px] font-mono tracking-wider text-gold border border-ink-border">
                    VOL. {volume.volumeNumber < 10 ? `0${volume.volumeNumber}` : volume.volumeNumber}
                  </span>
                  {volume.stock <= 0 && (
                    <span className="px-2 py-0.5 rounded-xs bg-red-950/90 border border-red-800/80 text-[8px] font-mono tracking-wider text-red-400 font-bold uppercase">
                      OUT OF STOCK
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
              </div>

              <div className="p-4 flex flex-col justify-between flex-1">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-gold uppercase block">
                    {volume.seriesTitle}
                  </span>
                  <h3 className="text-xs font-bold text-paper tracking-wide group-hover:text-gold transition-colors line-clamp-1 mt-1 block">
                    {volume.title}
                  </h3>
                  <p className="text-[10px] text-text-muted mt-0.5">By {volume.author}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-ink-border/50 flex items-center justify-between font-mono text-xs">
                  <span className="text-paper font-bold">{formatPrice(volume.price)}</span>
                  {volume.stock <= 0 ? (
                    <span className="px-2 py-1 bg-ink-surface/80 border border-ink-border text-text-muted text-[9px] font-mono uppercase rounded-xs">
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
                      className="px-3 py-1 bg-ink border border-ink-border hover:border-vermilion hover:bg-vermilion hover:text-white text-[10px] font-bold uppercase transition-colors rounded-xs z-10 active:scale-95"
                    >
                      + ADD
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Link to full catalog */}
        <div className="text-center mt-12">
          <Link
            href="/manga"
            className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-text-muted hover:text-gold transition-colors"
          >
            <span>GO TO COMPLETE MANGA CATALOG</span>
            <ArrowRight strokeWidth={1.4} className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
