"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  ShoppingBag,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useCartStore } from "@/store/useCartStore";
import { useReaderStore } from "@/store/useReaderStore";
import { useAuthStore, SavedOrder, SavedOrderItem } from "@/store/useAuthStore";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { useTranslation } from "@/hooks/useTranslation";

export function MangaReaderModal() {
  const { locale } = useTranslation();
  const isArabic = locale === "ar";
  const { isReaderOpen, activeReaderVolume, closeReader } = useUIStore();
  useModalScrollLock(isReaderOpen && Boolean(activeReaderVolume));
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useUIStore((state) => state.openCart);
  const currentUser = useAuthStore((state) => state.currentUser);

  const saveProgress = useReaderStore((state) => state.saveProgress);
  const getProgress = useReaderStore((state) => state.getProgress);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Check if active reader volume is owned and paid for by the authenticated user
  const isOwned = React.useMemo(() => {
    if (!currentUser || !activeReaderVolume) return false;
    const orders = currentUser.orders || [];
    return orders.some((order: SavedOrder) => {
      const isPaid =
        order.paymentStatus === "Verified & Paid" ||
        (order.paymentMethod === "cash" && order.status === "Delivered");
      if (!isPaid) return false;

      return (order.items || []).some(
        (item: SavedOrderItem) =>
          item.volumeId === activeReaderVolume.id ||
          item.id === activeReaderVolume.id ||
          (typeof item.title === "string" && item.title.toLowerCase() === activeReaderVolume.title.toLowerCase()) ||
          (typeof item.seriesTitle === "string" &&
            item.seriesTitle.toLowerCase() === activeReaderVolume.seriesTitle.toLowerCase() &&
            Number(item.volumeNumber) === Number(activeReaderVolume.volumeNumber))
      );
    });
  }, [activeReaderVolume, currentUser]);

  // Pages array
  const pages = activeReaderVolume
    ? activeReaderVolume.previewPages.length > 0
      ? activeReaderVolume.previewPages
      : [activeReaderVolume.coverImage]
    : [];

  const changePage = React.useCallback((newIndex: number) => {
    setCurrentPageIndex(newIndex);
    if (activeReaderVolume) {
      saveProgress(activeReaderVolume.id, newIndex, pages.length);
    }
  }, [activeReaderVolume, pages.length, saveProgress]);

  const handleNextPage = React.useCallback(() => {
    if (currentPageIndex < pages.length - 1) {
      changePage(currentPageIndex + 1);
    }
  }, [changePage, currentPageIndex, pages.length]);

  const handlePrevPage = React.useCallback(() => {
    if (currentPageIndex > 0) {
      changePage(currentPageIndex - 1);
    }
  }, [changePage, currentPageIndex]);

  // Restore bookmarked page or start fresh
  useEffect(() => {
    if (activeReaderVolume) {
      const pagesCount = activeReaderVolume.previewPages.length > 0
        ? activeReaderVolume.previewPages.length
        : 1;
      const saved = getProgress(activeReaderVolume.id);

      const target = (saved && !saved.isCompleted && saved.currentPage > 0 && saved.currentPage < pagesCount)
        ? saved.currentPage
        : 0;

      const raf = requestAnimationFrame(() => {
        setCurrentPageIndex(target);
        setZoomLevel(1);
        if (target === 0) {
          saveProgress(activeReaderVolume.id, 0, pagesCount);
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [activeReaderVolume, getProgress, saveProgress]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isReaderOpen) return;
      if (e.key === "Escape") closeReader();
      // Japanese RTL: Left arrow advances to next page, Right arrow goes back!
      if (e.key === "ArrowLeft") handleNextPage();
      if (e.key === "ArrowRight") handlePrevPage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReaderOpen, handleNextPage, handlePrevPage, closeReader]);

  if (!isReaderOpen || !activeReaderVolume) return null;

  const isLastPage = currentPageIndex === pages.length - 1;

  const handleAddToCartAndClose = () => {
    addItem(activeReaderVolume, 1);
    closeReader();
    openCart();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-lenis-prevent
      className="fixed inset-0 z-50 overflow-hidden overscroll-contain bg-ink/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300"
    >
      {/* Top Controls Bar */}
      <header className="h-16 px-6 md:px-10 border-b border-ink-border/80 flex items-center justify-between bg-ink/90 shrink-0 z-20">
        {/* Left: Volume Meta */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xs bg-vermilion text-paper flex items-center justify-center font-serif font-bold text-xs border border-vermilion/80 shadow-md shrink-0">
            回路
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-gold uppercase flex items-center gap-1.5">
              {isOwned ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                  <span className="text-gold font-bold">
                    {isArabic ? "نسخة الأرشيف الرقمي • مفتوحة بالكامل" : "DIGITAL ARCHIVE EDITION • UNLOCKED"}
                  </span>
                </>
              ) : (
                isArabic ? "عينة رسمية (قارئ مانجا ياباني)" : "OFFICIAL SAMPLER (JAPANESE RTL READER)"
              )}
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-paper line-clamp-1">
              {activeReaderVolume.seriesTitle} — {isArabic ? "المجلد" : "Vol."} {activeReaderVolume.volumeNumber} ({activeReaderVolume.title})
            </h3>
          </div>
        </div>

        {/* Center: Page Status & Navigation Hint */}
        <div className="hidden sm:flex items-center gap-3 font-mono text-xs text-text-muted">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-sm bg-ink-surface border border-ink-border">
            <span className="text-text-muted">{isArabic ? "صفحة" : "PAGE"}</span>
            <span className="text-paper font-bold">
              0{currentPageIndex + 1} / 0{pages.length}
            </span>
          </div>

          <span className="text-[11px] text-gold font-semibold">
            {isLastPage
              ? isOwned
                ? (isArabic ? "اكتمل قراءة الفصل" : "VOLUME CHAPTER COMPLETE")
                : (isArabic ? "نهاية فصل المعاينة" : "END OF PREVIEW CHAPTER")
              : (isArabic ? "[← الصفحة التالية (RTL)]" : "[← NEXT PAGE (RTL)]")}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.15))}
            className="p-2 text-text-muted hover:text-paper transition-colors rounded-sm hover:bg-ink-surface cursor-pointer"
            title={isArabic ? "تكبير" : "Zoom In"}
          >
            <ZoomIn strokeWidth={1.4} className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.85, z - 0.15))}
            className="p-2 text-text-muted hover:text-paper transition-colors rounded-sm hover:bg-ink-surface cursor-pointer"
            title={isArabic ? "تصغير" : "Zoom Out"}
          >
            <ZoomOut strokeWidth={1.4} className="w-4 h-4" />
          </button>
          <button
            onClick={closeReader}
            className="p-2 text-text-muted hover:text-vermilion transition-colors rounded-sm hover:bg-ink-surface ml-1 cursor-pointer"
            title={isArabic ? "إغلاق القارئ (ESC)" : "Close Viewer (ESC)"}
          >
            <X strokeWidth={1.5} className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Reader Stage: Centered Realistic Manga Page Frame */}
      <div
        className="flex-1 relative flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Book Container with Intimate Navigation Chevrons */}
        <div className="relative flex items-center justify-center">
          {/* RTL Next Page Button (On Left in RTL reading!) */}
          <button
            onClick={handleNextPage}
            disabled={isLastPage}
            className={`hidden md:flex absolute -left-16 lg:-left-20 top-1/2 -translate-y-1/2 z-20 w-12 h-20 rounded-sm bg-ink-surface/90 border border-ink-border flex-col items-center justify-center text-paper transition-all hover:border-gold hover:text-gold hover:scale-105 disabled:opacity-20 disabled:pointer-events-none shadow-2xl ${
              isLastPage ? "cursor-not-allowed" : "cursor-pointer"
            }`}
            title={isArabic ? "الصفحة التالية (RTL)" : "Next Page (RTL)"}
          >
            <ChevronLeft strokeWidth={1.5} className="w-6 h-6" />
            <span className="text-[8px] font-mono tracking-wider mt-1 text-gold">{isArabic ? "التالي" : "NEXT"}</span>
          </button>

          {/* RTL Previous Page Button (On Right in RTL reading!) */}
          <button
            onClick={handlePrevPage}
            disabled={currentPageIndex <= 0}
            className={`hidden md:flex absolute -right-16 lg:-right-20 top-1/2 -translate-y-1/2 z-20 w-12 h-20 rounded-sm bg-ink-surface/90 border border-ink-border flex-col items-center justify-center text-paper transition-all hover:border-gold hover:text-gold hover:scale-105 disabled:opacity-20 disabled:pointer-events-none shadow-2xl ${
              currentPageIndex <= 0 ? "cursor-not-allowed" : "cursor-pointer"
            }`}
            title={isArabic ? "الصفحة السابقة (RTL)" : "Previous Page (RTL)"}
          >
            <ChevronRight strokeWidth={1.5} className="w-6 h-6" />
            <span className="text-[8px] font-mono tracking-wider mt-1 text-text-muted">{isArabic ? "السابق" : "PREV"}</span>
          </button>

          {/* Mobile Overlay Arrows */}
          <button
            onClick={handleNextPage}
            disabled={isLastPage}
            className="md:hidden absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-black/80 rounded-full text-white disabled:opacity-20"
          >
            <ChevronLeft strokeWidth={2} className="w-5 h-5" />
          </button>
          <button
            onClick={handlePrevPage}
            disabled={currentPageIndex <= 0}
            className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-black/80 rounded-full text-white disabled:opacity-20"
          >
            <ChevronRight strokeWidth={2} className="w-5 h-5" />
          </button>

          {/* The Physical Manga Tankōbon Page Frame (Enlarged & Immersive) */}
          <div
            className="relative w-[85vw] sm:w-[540px] md:w-[620px] lg:w-[700px] xl:w-[760px] aspect-[2/3] max-h-[85vh] rounded-sm overflow-hidden border border-ink-border/90 shadow-[0_30px_120px_rgba(0,0,0,0.98)] bg-[#111114] transition-transform duration-200 ease-out flex flex-col justify-between"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Manga Artwork Page */}
            <img
              src={pages[currentPageIndex]}
              alt={`Manga Page ${currentPageIndex + 1}`}
              className={`w-full h-full object-cover object-top pointer-events-none transition-all duration-500 ${
                isLastPage ? "blur-xl scale-110 opacity-35" : ""
              }`}
            />

            {/* Authentic Japanese Inner Spine Shadow (Simulates Physical Binding) */}
            {!isLastPage && (
              <div className="absolute inset-y-0 left-0 w-8 bg-linear-to-r from-black/45 via-black/15 to-transparent pointer-events-none" />
            )}

            {/* Top Chapter Header Stamp - only visible during active reading */}
            {!isLastPage && (
              <div className="absolute top-3 left-4 px-2.5 py-1 rounded-xs bg-black/70 backdrop-blur-md border border-white/10 font-mono text-[9px] text-text-muted tracking-widest uppercase flex items-center gap-1.5">
                <span>第１話 // CHAPTER 01</span>
                <span className="text-gold">•</span>
                <span className="text-gold font-bold">
                  {isOwned
                    ? (isArabic ? "أرشيف مفتوح" : "UNLOCKED ARCHIVE")
                    : (isArabic ? "عينة مجانية" : "SAMPLE PREVIEW")}
                </span>
              </div>
            )}

            {/* Official Editorial Bottom Watermark Bar - only visible during active reading */}
            {!isLastPage && (
              <div className="absolute bottom-3 inset-x-3 sm:inset-x-4 flex items-center justify-between px-3.5 py-2 rounded-xs bg-ink/95 backdrop-blur-md border border-ink-border/90 shadow-[0_8px_30px_rgba(0,0,0,0.95)] z-20">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Official Vermilion Hanko Stamp */}
                  <div className="h-5 px-2 rounded-xs bg-vermilion text-white flex items-center justify-center shrink-0 border border-vermilion/80 shadow-xs select-none">
                    <span className="font-serif font-bold text-[10px] tracking-tight leading-none whitespace-nowrap">
                      回路
                    </span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-mono font-extrabold text-paper tracking-[0.16em] uppercase whitespace-nowrap">
                      {isArabic ? "أرشيف كايرو" : "KAIRO ARCHIVE"}
                    </span>
                    <span className="text-ink-border hidden sm:inline">•</span>
                    <span className="text-[9px] font-mono text-gold tracking-widest uppercase truncate hidden sm:inline">
                      {isOwned
                        ? (isArabic ? "نسخة رقمية مرخصة" : "LICENSED DIGITAL EDITION")
                        : (isArabic ? "عينة رسمية" : "OFFICIAL SAMPLER")}
                    </span>
                    <span className="text-text-muted/60 text-[9px] font-mono hidden md:inline">
                      {isArabic ? "// مستودع 6 أكتوبر" : "// 6TH OF OCTOBER HUB"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] shrink-0 pl-3">
                  <span className="text-gold font-bold">{isArabic ? "صفحة" : "PAGE"}</span>
                  <span className="text-paper font-semibold">
                    0{currentPageIndex + 1}
                  </span>
                  <span className="text-text-muted">/</span>
                  <span className="text-text-muted font-normal">
                    0{pages.length}
                  </span>
                </div>
              </div>
            )}

            {/* Last Page Call-To-Action Overlay with Uniform Full-Frame Blur */}
            {isLastPage && (
              <div className="absolute inset-0 bg-ink/75 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center space-y-3.5 animate-in fade-in duration-300 z-30">
                <div className="w-12 h-12 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center text-gold shadow-lg shadow-gold/10">
                  <CheckCircle2 strokeWidth={1.6} className="w-6 h-6" />
                </div>

                {isOwned ? (
                  /* ================= OWNED VOLUME STATE ================= */
                  <>
                    <div className="space-y-1 max-w-xs">
                      <h4 className="text-base sm:text-lg font-bold uppercase text-paper tracking-wider font-mono">
                        {isArabic ? "اكتملت القراءة" : "CHAPTER COMPLETED"}
                      </h4>
                      <p className="text-xs text-text-muted font-sans">
                        {isArabic
                          ? "متاح دائماً في مكتبتك الرقمية."
                          : "Permanently unlocked in your library."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                      <button
                        onClick={() => changePage(0)}
                        className="px-4 py-2 bg-paper text-ink font-bold text-xs font-mono tracking-wider uppercase rounded-xs hover:bg-gold transition-colors flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                      >
                        <RotateCcw strokeWidth={1.4} className="w-3.5 h-3.5" />
                        <span>{isArabic ? "إعادة القراءة" : "READ AGAIN"}</span>
                      </button>

                      <button
                        onClick={closeReader}
                        className="px-4 py-2 bg-ink border border-ink-border hover:border-gold text-paper hover:text-gold font-bold text-xs font-mono tracking-wider uppercase rounded-xs transition-colors cursor-pointer active:scale-95"
                      >
                        <span>{isArabic ? "العودة للأرشيف" : "RETURN TO ARCHIVE"}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  /* ================= UNOWNED / STORE PREVIEW STATE ================= */
                  <>
                    <div className="space-y-1 max-w-xs">
                      <h4 className="text-base sm:text-lg font-bold uppercase text-paper tracking-wider font-mono">
                        {isArabic ? "نهاية العينة" : "PREVIEW COMPLETED"}
                      </h4>
                      <p className="text-xs text-text-muted font-sans">
                        {isArabic
                          ? "اطلب نسختك الورقية مع شحن سريع لباب منزلك."
                          : "Order your physical copy with express delivery."}
                      </p>
                    </div>
                    <button
                      onClick={handleAddToCartAndClose}
                      className="px-5 py-2.5 bg-paper text-ink font-bold text-xs font-mono tracking-wider uppercase rounded-xs hover:bg-vermilion hover:text-white transition-all shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 mt-1"
                    >
                      <ShoppingBag strokeWidth={1.4} className="w-4 h-4" />
                      <span>{isArabic ? "أضف للسلة" : "ADD TO CART"}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Page Thumbnails Bar */}
      <footer className="h-20 px-4 sm:px-6 border-t border-ink-border bg-ink/95 flex items-center justify-start sm:justify-center gap-3 sm:gap-4 shrink-0 overflow-x-auto no-scrollbar pb-safe">
        {pages.map((page, idx) => {
          const isActive = currentPageIndex === idx;
          return (
            <button
              key={idx}
              onClick={() => changePage(idx)}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                isActive ? "scale-105" : "opacity-50 hover:opacity-100"
              }`}
            >
              <div
                className={`relative w-9 h-13 rounded-xs overflow-hidden border ${
                  isActive ? "border-gold shadow-md shadow-gold/20" : "border-ink-border"
                }`}
              >
                <img src={page} alt="" className="w-full h-full object-cover pointer-events-none" />
              </div>
              <span className="text-[9px] font-mono text-text-muted">
                P. 0{idx + 1}
              </span>
            </button>
          );
        })}
      </footer>
    </div>
  );
}
