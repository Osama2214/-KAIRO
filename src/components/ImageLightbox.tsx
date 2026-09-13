"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";

const ZOOM = 2.5;

/**
 * Full-screen view of a product's photos: the original file, not the
 * optimised thumbnail, so print detail on a cover or a figure's paint can be
 * inspected. Click (or double-tap) zooms in at that point and dragging pans;
 * arrows, swipes and the keyboard move between photos; Escape closes.
 */
export function ImageLightbox({
  images,
  index,
  alt,
  isArabic,
  onIndexChange,
  onClose,
}: {
  images: string[];
  index: number;
  alt: string;
  isArabic: boolean;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  useModalScrollLock(true);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [loaded, setLoaded] = useState(false);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const swipeStart = useRef<number | null>(null);
  const count = images.length;
  const src = images[index];

  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      setZoomed(false);
      setLoaded(false);
      onIndexChange((index + delta + count) % count);
    },
    [count, index, onIndexChange]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // In Arabic the page reads right to left, so the left arrow moves forward.
      else if (e.key === "ArrowRight") go(isArabic ? -1 : 1);
      else if (e.key === "ArrowLeft") go(isArabic ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, isArabic]);

  const pointAt = (clientX: number, clientY: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100)),
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
    swipeStart.current = zoomed ? null : e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
    if (zoomed && drag.current.moved) {
      // Pan so the picture follows the pointer. The rect is the scaled size;
      // shifting the transform origin by 1% moves the picture (ZOOM - 1)% of
      // its unscaled size the other way.
      const rect = e.currentTarget.getBoundingClientRect();
      const factor = (100 * ZOOM) / (ZOOM - 1);
      setOrigin((o) => ({
        x: Math.min(100, Math.max(0, o.x - (dx / rect.width) * factor)),
        y: Math.min(100, Math.max(0, o.y - (dy / rect.height) * factor)),
      }));
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    const state = drag.current;
    drag.current = null;
    if (!state) return;
    if (!zoomed && swipeStart.current !== null) {
      const dx = e.clientX - swipeStart.current;
      swipeStart.current = null;
      if (Math.abs(dx) > 60) {
        // In Arabic the next photo sits to the left.
        go((dx < 0 ? 1 : -1) * (isArabic ? -1 : 1));
        return;
      }
    }
    if (!state.moved) {
      if (!zoomed) setOrigin(pointAt(e.clientX, e.clientY, e.currentTarget));
      setZoomed((z) => !z);
    }
  };

  if (typeof document === "undefined" || !src) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isArabic ? "معاينة الصورة" : "Image preview"}
      data-lenis-prevent
      className="fixed inset-0 z-[90] bg-black/95 backdrop-blur-sm flex flex-col select-none animate-in fade-in duration-150"
    >
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 h-14 shrink-0 text-paper" dir="ltr">
        <span className="font-mono text-xs text-text-muted tabular-nums">{count > 1 ? `${index + 1} / ${count}` : ""}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            className="p-2 rounded-sm border border-white/15 hover:border-gold hover:text-gold transition-colors cursor-pointer"
            aria-label={zoomed ? (isArabic ? "تصغير" : "Zoom out") : isArabic ? "تكبير" : "Zoom in"}
          >
            {zoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-sm border border-white/15 hover:border-gold hover:text-gold transition-colors cursor-pointer"
            aria-label={isArabic ? "إغلاق" : "Close"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden px-2 sm:px-16"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {!loaded && <div className="absolute w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />}
        <img
          key={src}
          src={src}
          alt={alt}
          draggable={false}
          onLoad={() => setLoaded(true)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (drag.current = null)}
          style={{ transform: zoomed ? `scale(${ZOOM})` : "scale(1)", transformOrigin: `${origin.x}% ${origin.y}%`, touchAction: zoomed ? "none" : "pan-y" }}
          className={`max-h-full max-w-full object-contain transition-[transform,opacity] duration-200 ${loaded ? "opacity-100" : "opacity-0"} ${
            zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
          }`}
        />

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute start-2 sm:start-4 top-1/2 -translate-y-1/2 p-2.5 rounded-sm bg-black/60 border border-white/15 text-paper hover:border-gold hover:text-gold transition-colors cursor-pointer"
              aria-label={isArabic ? "السابق" : "Previous"}
            >
              <ChevronLeft className={`w-5 h-5 ${isArabic ? "rotate-180" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute end-2 sm:end-4 top-1/2 -translate-y-1/2 p-2.5 rounded-sm bg-black/60 border border-white/15 text-paper hover:border-gold hover:text-gold transition-colors cursor-pointer"
              aria-label={isArabic ? "التالي" : "Next"}
            >
              <ChevronRight className={`w-5 h-5 ${isArabic ? "rotate-180" : ""}`} />
            </button>
          </>
        )}
      </div>

      <p className="shrink-0 py-3 text-center font-mono text-[10px] tracking-wider text-text-muted">
        {isArabic ? "اضغط على الصورة للتكبير • اسحب للتحريك" : "Click the image to zoom • drag to move around"}
      </p>
    </div>,
    document.body
  );
}

/**
 * Placed inside a product photo's frame: the whole photo opens the preview,
 * and a small "view" chip in the corner says that it can.
 */
export function ImagePreviewTrigger({ onClick, isArabic }: { onClick: () => void; isArabic: boolean }) {
  const label = isArabic ? "عرض الصورة بالحجم الكامل" : "View full size";
  return (
    <>
      <button type="button" onClick={onClick} aria-label={label} className="absolute inset-0 z-[1] cursor-zoom-in" />
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="absolute bottom-3 end-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xs bg-ink/85 backdrop-blur-md border border-ink-border text-[10px] font-mono uppercase tracking-wider text-paper hover:text-gold hover:border-gold/60 transition-colors cursor-pointer"
      >
        <Maximize2 strokeWidth={1.6} className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{isArabic ? "تكبير" : "View"}</span>
      </button>
    </>
  );
}
