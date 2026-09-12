"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Home, Layers, Search } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useMounted } from "@/store/useWishlistStore";

/**
 * The app had no not-found file, so every bad URL fell through to Next's
 * default white page — off-brand, English-only, and with no way back into the
 * catalogue. This renders inside the storefront shell, so the navbar, ticker
 * and footer stay in place.
 */
export default function NotFound() {
  const { locale } = useTranslation();
  const mounted = useMounted();
  const isArabic = mounted && locale === "ar";

  const links = [
    {
      href: "/manga",
      icon: BookOpen,
      label: isArabic ? "كل المجلدات" : "All Volumes",
      hint: isArabic ? "تصفّح الكتالوج" : "Browse the catalogue",
    },
    {
      href: "/series",
      icon: Layers,
      label: isArabic ? "السلاسل" : "Series",
      hint: isArabic ? "الأرشيفات الكاملة" : "Complete archives",
    },
    {
      href: "/",
      icon: Home,
      label: isArabic ? "الرئيسية" : "Home",
      hint: isArabic ? "ابدأ من الأول" : "Start over",
    },
  ];

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="relative min-h-[calc(100vh-5rem)] bg-ink text-paper flex items-center overflow-hidden px-4 sm:px-6 md:px-12 py-16 sm:py-24"
    >
      {/* Layered backdrop: tiled Japanese type, a warm centre glow, and a rule grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-japanese-pattern opacity-50" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% 42%, rgba(199,167,108,0.045) 0%, rgba(8,8,10,0) 68%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(244,240,232,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(244,240,232,0.035) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
          maskImage: "radial-gradient(ellipse 75% 65% at 50% 45%, #000 30%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 45%, #000 30%, transparent 78%)",
        }}
      />

      {/* Vertical Japanese columns down both edges, not one glyph in the middle */}
      <span
        aria-hidden
        className="writing-mode-vertical pointer-events-none select-none absolute left-3 sm:left-8 md:left-14 top-1/2 -translate-y-1/2 font-serif text-[11px] sm:text-xs tracking-[0.5em] text-paper/[0.09]"
      >
        頁が見つかりません
      </span>
      <span
        aria-hidden
        className="writing-mode-vertical pointer-events-none select-none absolute right-3 sm:right-8 md:right-14 top-1/2 -translate-y-1/2 font-serif text-[11px] sm:text-xs tracking-[0.5em] text-paper/[0.09]"
      >
        物語の外側・巻末
      </span>

      {/* Ghost numeral behind the copy */}
      <span
        aria-hidden
        className="pointer-events-none select-none absolute inset-x-0 top-1/2 -translate-y-[58%] text-center font-cinzel font-bold leading-none text-[30vw] sm:text-[24vw] md:text-[19vw] text-paper/[0.02]"
      >
        404
      </span>

      <div className="relative z-10 max-w-2xl mx-auto w-full text-center">
        {/* Eyebrow */}
        <div className="flex items-center justify-center gap-3 font-mono text-[10px] tracking-[0.32em] uppercase text-gold/90">
          <span className="hidden sm:block h-px w-10 bg-gradient-to-r from-transparent to-gold/40" />
          <span>404</span>
          <span className="text-gold/40">•</span>
          <span>{isArabic ? "صفحة غير موجودة" : "Page Not Found"}</span>
          <span className="hidden sm:block h-px w-10 bg-gradient-to-l from-transparent to-gold/40" />
        </div>

        <h1 className="mt-5 font-cinzel text-2xl sm:text-[32px] md:text-[40px] font-bold leading-[1.15] tracking-tight text-paper">
          {isArabic ? "هذا المجلد ليس في الأرشيف" : "This Volume Isn’t in the Archive"}
        </h1>

        <span className="mt-3 block font-serif text-xs sm:text-sm tracking-[0.4em] text-gold/70">
          迷 &nbsp;— &nbsp;{isArabic ? "ضللتَ الطريق" : "LOST"}
        </span>

        <p className="mt-5 text-xs sm:text-[13px] leading-relaxed text-text-muted font-mono max-w-md mx-auto">
          {isArabic
            ? "الصفحة التي تبحث عنها انتقلت أو لم تكن موجودة أصلًا. ابدأ من الكتالوج، أو ابحث عن الكتاب بالاسم."
            : "The page you are looking for has moved, or never existed. Start from the catalogue, or search for the book by name."}
        </p>

        {/* Primary action */}
        <div className="mt-8">
          <Link
            href="/manga"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gold hover:bg-gold-muted text-ink font-mono text-[11px] font-extrabold uppercase tracking-[0.18em] rounded-sm transition-colors shadow-lg shadow-gold/15"
          >
            <Search strokeWidth={2.2} className="w-4 h-4" />
            <span>{isArabic ? "ابحث في الكتالوج" : "Search the Catalogue"}</span>
          </Link>
        </div>

        {/* Secondary routes */}
        <div className="mt-8 pt-7 border-t border-ink-border/60 grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
          {links.map(({ href, icon: Icon, label, hint }) => (
            <Link
              key={href}
              href={href}
              className="group px-3.5 py-3 bg-ink-surface/60 hover:bg-ink-surface border border-ink-border/70 hover:border-gold/50 rounded-sm transition-colors text-start flex items-center gap-2.5"
            >
              <Icon
                strokeWidth={1.6}
                className="w-4 h-4 text-gold/80 shrink-0 group-hover:text-gold transition-colors"
              />
              <span className="min-w-0">
                <span className="block text-[11px] font-bold text-paper truncate">{label}</span>
                <span className="block text-[10px] text-text-muted truncate">{hint}</span>
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-7">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted hover:text-gold transition-colors"
          >
            <ArrowLeft strokeWidth={1.8} className={`w-3.5 h-3.5 ${isArabic ? "rotate-180" : ""}`} />
            <span>{isArabic ? "رجوع للرئيسية" : "Back to Home"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
