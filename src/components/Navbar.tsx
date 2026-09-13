"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import storeMark from "../../public/animeverse-mark.png";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag, User, Menu, X, Heart, Sparkles, Globe, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore, useMounted } from "@/store/useWishlistStore";
import { useUIStore } from "@/store/useUIStore";
import { AnnouncedCouponBar } from "@/components/AnnouncedCouponBar";
import { useWelcomeOffer } from "@/hooks/useWelcomeOffer";
import { clearAnimeVerseSavedScroll } from "@/components/SmoothScrollProvider";
import { useTranslation } from "@/hooks/useTranslation";

export function Navbar() {
  const pathname = usePathname();
  const mounted = useMounted();
  const { t, locale, toggleLanguage, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const [isScrolled, setIsScrolled] = useState(false);
  const isHomepage = pathname === "/";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeHash, setActiveHash] = useState("");

  const totalCartCount = useCartStore((state) => state.getTotalItems());
  const totalWishlistCount = useWishlistStore((state) => state.getTotalItems());
  const { openCart, openSearch } = useUIStore();
  const { hasOffer: hasWelcomeOffer, voucherCode: welcomeVoucherCode, currentUser } = useWelcomeOffer();
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (headerRef.current) ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track current URL hash on client
  useEffect(() => {
    const updateHash = () => {
      setActiveHash(window.location.hash);
    };
    window.addEventListener("hashchange", updateHash);
    updateHash();
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  // Keyboard shortcut listener for Command/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openSearch]);

  const navLinks = [
    { label: t.nav.manga, href: "/manga", kanji: "漫画" },
    { label: t.nav.series, href: "/series", kanji: "連載" },
    { label: t.nav.genres, href: "/#genres", kanji: "分類" },
    { label: t.nav.newReleases, href: "/#new-releases", kanji: "新刊" },
    { label: t.nav.shop, href: "/shop", kanji: "グッズ" },
    { label: t.nav.sale, href: "/manga?sort=sale", kanji: "特選" },
  ];

  const handleLogoClick = (e: React.MouseEvent) => {
    setMobileMenuOpen(false);
    try {
      clearAnimeVerseSavedScroll("/");
      sessionStorage.removeItem("kairo_scroll_/");
    } catch {}
    if (pathname === "/") {
      e.preventDefault();
      if (window.__lenis) {
        window.__lenis.scrollTo(0, {
          duration: 0.85,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      history.pushState(null, "", "/");
      setActiveHash("");
      window.dispatchEvent(new Event("hashchange"));
    }
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setMobileMenuOpen(false);

    // If internal section hash link on homepage
    if (href.startsWith("/#") || href.startsWith("#")) {
      const hashId = href.replace(/^\/?#/, "");
      if (pathname === "/") {
        e.preventDefault();
        const targetElement = document.getElementById(hashId);
        if (targetElement) {
          if (window.__lenis) {
            window.__lenis.scrollTo(targetElement, {
              offset: -80,
              duration: 0.85,
              easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            });
          } else {
            targetElement.scrollIntoView({ behavior: "smooth" });
          }
          history.pushState(null, "", `#${hashId}`);
          setActiveHash(`#${hashId}`);
          window.dispatchEvent(new Event("hashchange"));
        }
        return;
      }
    }

    // If clicking current page's direct link, smoothly scroll to top
    if (pathname === href) {
      e.preventDefault();
      try {
        clearAnimeVerseSavedScroll(href);
        sessionStorage.removeItem(`kairo_scroll_${href}`);
      } catch {}
      if (window.__lenis) {
        window.__lenis.scrollTo(0, { duration: 0.8 });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const isLinkActive = (href: string) => {
    if (href === "/series") {
      return pathname.startsWith("/series");
    }
    if (href === "/shop") {
      return pathname.startsWith("/shop");
    }
    if (href === "/manga?sort=sale") {
      return (
        pathname === "/manga" &&
        mounted &&
        typeof window !== "undefined" &&
        window.location.search.includes("sort=sale")
      );
    }
    if (href === "/manga") {
      return (
        pathname === "/manga" &&
        (!mounted ||
          typeof window === "undefined" ||
          !window.location.search.includes("sort=sale"))
      );
    }
    if (href === "/#genres") {
      return pathname === "/" && activeHash === "#genres";
    }
    if (href === "/#new-releases") {
      return pathname === "/" && activeHash === "#new-releases";
    }
    return false;
  };

  return (
    <>
      <header
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
          isScrolled
            ? "bg-ink/70 backdrop-blur-sm border-b border-ink-border/60 shadow-xl"
            : "bg-transparent"
        }`}
      >
        {/* Global Personalized Welcome Grant Bar (Visible Across All Pages) */}
        <AnnouncedCouponBar />

        <div
          className={`max-w-[1700px] mx-auto px-4 sm:px-6 md:px-10 xl:px-14 2xl:px-20 flex items-center justify-between lg:grid lg:grid-cols-[1fr_auto_1fr] transition-all duration-300 ${
            isScrolled ? "py-2.5 sm:py-3.5" : "py-3 sm:py-5"
          }`}
        >
          {/* Brand Logo. `data-intro-logo-target` is how the opening title
              sequence finds this box: its closing scene measures it and flies
              the assembled intro lockup into it, so the intro ends by
              *becoming* this logo. Measured rather than hard-coded because the
              mark changes height on scroll and its left edge moves with the
              responsive gutter. */}
          <Link
            href="/"
            onClick={handleLogoClick}
            aria-label="AnimeVerse — Your Universe of Manga & Collector Editions"
            className="group flex items-center focus:outline-none cursor-pointer shrink-0"
            data-intro-logo-target=""
          >
            <Image
              src={storeMark}
              alt="AnimeVerse — Your Universe of Manga & Collector Editions"
              sizes="180px"
              quality={90}
              priority
              className={`w-auto brightness-[0.80] transition-all duration-300 group-hover:brightness-100 ${
                isScrolled ? "h-9 sm:h-10" : "h-11 sm:h-12"
              }`}
            />
          </Link>

          {/* Desktop Navigation Links */}
          {/* Six links since SHOP was added: the tight gap is kept only for the
              narrowest desktop widths, where wider spacing runs into the logo. */}
          <nav className="hidden lg:flex items-center gap-4 min-[1150px]:gap-7 xl:gap-9 2xl:gap-11">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`text-[12px] font-semibold tracking-[0.16em] uppercase transition-all duration-300 relative py-1 cursor-pointer ${
                    active
                      ? "text-paper"
                      : "text-paper-muted/70 hover:text-paper hover:tracking-[0.2em]"
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-vermilion animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1 xl:gap-2 lg:justify-self-end">
            {/* Language Switcher — full label at every size. There is room for it
                now that wishlist and account moved into the mobile drawer. */}
            <button
              onClick={toggleLanguage}
              className="flex h-8 px-1.5 sm:px-2.5 items-center gap-1 text-paper-muted/90 hover:text-gold transition-all rounded-sm hover:bg-ink-surface/80 focus:outline-none cursor-pointer shrink-0"
              title={locale === "en" ? "تبديل إلى اللغة العربية" : "Switch to English"}
              aria-label="Toggle language"
            >
              <Globe strokeWidth={1.5} className="w-3.5 h-3.5 text-gold shrink-0" />
              <span className="hidden xl:inline text-[11px] font-bold font-sans tracking-wide whitespace-nowrap">
                {locale === "en" ? "العربية" : "EN"}
              </span>
            </button>

            {/* Search Trigger */}
            <button
              onClick={openSearch}
              className="h-8 w-8 sm:h-9 sm:w-auto sm:px-2.5 flex items-center justify-center gap-2 text-paper-muted/80 hover:text-gold transition-all rounded-sm hover:bg-ink-surface/80 border border-transparent hover:border-ink-border/60 focus:outline-none cursor-pointer"
              title="Search (⌘K)"
              aria-label="Search manga catalog"
            >
              <Search strokeWidth={1.5} className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px]" />
              <span className="hidden 2xl:inline-flex items-center px-1.5 py-0.5 rounded-xs bg-ink-surface border border-ink-border/80 text-[10px] font-mono tracking-wider text-text-muted">
                ⌘K
              </span>
            </button>

            {/* Wishlist — reachable from the mobile drawer's quick actions */}
            <Link
              href="/account?tab=WISHLIST"
              className="relative hidden sm:flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center text-paper-muted/80 hover:text-gold transition-all rounded-sm hover:bg-ink-surface/80 border border-transparent hover:border-ink-border/60"
              title="Curated Wishlist"
              aria-label="View Wishlist"
            >
              <Heart
                strokeWidth={1.5}
                className={`w-[17px] h-[17px] sm:w-[18px] sm:h-[18px] transition-colors ${
                  mounted && totalWishlistCount > 0 ? "text-gold fill-gold/20" : ""
                }`}
              />
              {mounted && totalWishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 bg-gold text-ink text-[9px] font-mono font-bold rounded-full flex items-center justify-center ring-2 ring-ink shadow-sm pointer-events-none animate-in zoom-in-50">
                  {totalWishlistCount}
                </span>
              )}
            </Link>

            {/* Account — reachable from the mobile drawer's quick actions */}
            <Link
              href="/account"
              className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-auto sm:px-2.5 items-center justify-center gap-2 text-paper-muted/80 hover:text-gold transition-all rounded-sm hover:bg-ink-surface/80 border border-transparent hover:border-ink-border/60 cursor-pointer"
              title={mounted && currentUser ? `Patron: ${currentUser.name} (${currentUser.id})` : "Sign In / Register"}
              aria-label="User Account"
            >
              <User
                strokeWidth={1.5}
                className={`w-[17px] h-[17px] sm:w-[18px] sm:h-[18px] transition-colors ${
                  mounted && currentUser ? "text-gold" : ""
                }`}
              />
              {mounted && currentUser && (
                <span className="hidden xl:inline text-[11px] font-mono tracking-wider text-gold font-semibold max-w-[85px] truncate">
                  {currentUser.name.split(" ")[0].toUpperCase()}
                </span>
              )}
            </Link>

            {/* Cart Drawer Trigger */}
            <button
              onClick={openCart}
              className="relative h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center text-paper-muted/80 hover:text-gold transition-all rounded-sm hover:bg-ink-surface/80 border border-transparent hover:border-ink-border/60 focus:outline-none cursor-pointer"
              title="View Cart"
              aria-label="Open Cart"
            >
              <ShoppingBag strokeWidth={1.5} className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px]" />
              {mounted && totalCartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 bg-vermilion text-white text-[9px] font-mono font-bold rounded-full flex items-center justify-center ring-2 ring-ink shadow-sm pointer-events-none animate-in zoom-in-50">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden h-8 w-8 flex items-center justify-center text-paper-muted/80 hover:text-paper transition-colors rounded-sm focus:outline-none cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? (
                <X strokeWidth={1.5} className="w-5 h-5" />
              ) : (
                <Menu strokeWidth={1.5} className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/*
        Spacer that reserves room for the fixed header on ordinary pages.
        The homepage hero is full-bleed and already carries its own top padding
        to sit beneath the transparent header — adding the spacer there pushed
        it down and left a detached strip of page background above the artwork.
      */}
      {!isHomepage && <div style={{ height: headerHeight }} aria-hidden="true" />}

      {/* Mobile Drawer Menu with Smooth Touch Layout and Safe-Area Support */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-[#0a0a0d]/98 backdrop-blur-2xl lg:hidden pt-16 px-4.5 sm:px-8 pb-8 flex flex-col overflow-y-auto animate-in fade-in duration-300">
          <div className="relative z-10 flex flex-col space-y-5 md:space-y-8 py-2 md:py-6 max-w-lg sm:max-w-xl md:max-w-2xl mx-auto w-full">
            {/* Quick Archive Search Pill */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                openSearch();
              }}
              className="w-full py-2.5 md:py-3.5 px-3.5 md:px-5 bg-[#121216] hover:bg-ink-surface border border-ink-border/80 hover:border-gold/50 rounded-xs flex items-center justify-between text-xs md:text-sm text-text-muted transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 md:gap-3">
                <Search strokeWidth={1.5} className="w-4 h-4 md:w-4.5 md:h-4.5 text-gold group-hover:scale-110 transition-transform" />
                <span className="font-sans text-paper-muted group-hover:text-paper transition-colors">
                  {isArabic ? "ابحث عن مانجا، مؤلف، أو تصنيف..." : "Search archive, title, author..."}
                </span>
              </div>
              <span className="text-[10.5px] md:text-xs font-serif text-gold/85 px-2 py-0.5 rounded-xs bg-ink/90 border border-ink-border">
                {isArabic ? "بحث" : "検索"}
              </span>
            </button>

            {/* Primary Navigation Links */}
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-ink-border/50">
                <span className="text-[10px] md:text-[11px] tracking-[0.25em] text-text-muted font-mono uppercase">
                  {isArabic ? "الأرشيف الرئيسي" : "PRIMARY DIRECTORY"}
                </span>
                <span className="text-[10px] md:text-[11px] font-serif text-vermilion">目録</span>
              </div>
              <div className="flex flex-col divide-y divide-ink-border/30">
                {navLinks.map((link, idx) => {
                  const active = isLinkActive(link.href);
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={(e) => handleNavClick(e, link.href)}
                      className={`group py-2.5 md:py-3.5 px-2 md:px-3 rounded-xs transition-all flex items-center justify-between cursor-pointer ${
                        active
                          ? "text-vermilion bg-ink-surface/40"
                          : "text-paper hover:text-gold hover:bg-ink-surface/20"
                      }`}
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        <span className={`text-[10px] md:text-xs font-mono font-medium ${active ? "text-vermilion" : "text-gold/80 group-hover:text-gold"}`}>
                          0{idx + 1}
                        </span>
                        <span className="text-base md:text-lg font-bold tracking-[0.14em] uppercase font-sans">
                          {link.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3">
                        <span className="text-xs md:text-sm font-serif text-text-muted/60 group-hover:text-gold/80 transition-colors">
                          {link.kanji}
                        </span>
                        <ArrowRight
                          strokeWidth={1.5}
                          className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-transform ${
                            active
                              ? "text-vermilion translate-x-0.5 rtl:-translate-x-0.5"
                              : "text-text-muted/50 group-hover:text-gold group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                          } ${isRTL ? "rotate-180" : ""}`}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Curated Format Shortcuts */}
            <div>
              <span className="text-[10px] md:text-[11px] tracking-[0.22em] text-text-muted/70 font-mono uppercase block mb-2">
                {isArabic ? "تنسيقات مميزة" : "CURATED FORMATS"}
              </span>
              <div className="grid grid-cols-2 gap-3 xs:gap-3.5 md:gap-4">
                {/* Deluxe Hardcovers Card with Hand-drawn Illustration Cover */}
                <Link
                  href="/manga?format=Deluxe+Edition"
                  onClick={() => setMobileMenuOpen(false)}
                  className="relative p-3 xs:p-3.5 md:p-4 min-h-[96px] xs:min-h-[104px] md:min-h-[116px] bg-[#101014] hover:bg-ink-surface border border-ink-border/80 hover:border-gold/50 rounded-xs transition-all flex items-center group overflow-hidden"
                >
                  <img
                    src="/images/deluxe-hardcover-cover.webp"
                    alt="Deluxe Hardcovers"
                    className="absolute inset-0 w-full h-full object-cover object-left pointer-events-none group-hover:scale-105 transition-transform duration-500"
                    draggable={false}
                  />

                  {/* Text Container matching Complete Boxsets */}
                  <div className="relative z-10 flex flex-col flex-1 min-w-0 pl-[53%] xs:pl-[55%] md:pl-[52%] pr-3 md:pr-4 pt-3.5 md:pt-4 pb-0.5">
                    <span className="font-serif font-bold text-[13px] xs:text-[14.5px] md:text-[16px] leading-[1.15] text-paper group-hover:text-gold transition-colors tracking-tight drop-shadow-md">
                      {isArabic ? (
                        <>طبعات<br />Deluxe</>
                      ) : (
                        <>Deluxe<br />Hardcovers</>
                      )}
                    </span>
                    <span className="text-[9px] xs:text-[10px] md:text-[11px] leading-[1.25] text-text-muted font-mono mt-1.5 drop-shadow-md">
                      {isArabic ? (
                        <>مجلدات<br />مقواة</>
                      ) : (
                        <>Collector<br />Bindings</>
                      )}
                    </span>
                  </div>

                  {/* Golden Kanji matching user design: 豪華 */}
                  <span className="absolute top-2.5 right-2.5 md:top-3 md:right-3.5 z-10 text-[12.5px] xs:text-[13.5px] md:text-[15px] text-gold/90 font-serif drop-shadow-md font-medium">豪華</span>

                  {/* Sleek navigation arrow */}
                  <ArrowRight
                    strokeWidth={1.5}
                    className="absolute bottom-2.5 right-2.5 md:bottom-3 md:right-3.5 z-10 w-4 h-4 md:w-4.5 md:h-4.5 text-paper/70 group-hover:text-gold group-hover:translate-x-1 transition-all drop-shadow-md"
                  />
                </Link>

                {/* Complete Boxsets Card matching User Mockup exactly */}
                <Link
                  href="/manga?format=Box+Set"
                  onClick={() => setMobileMenuOpen(false)}
                  className="relative p-3 xs:p-3.5 md:p-4 min-h-[96px] xs:min-h-[104px] md:min-h-[116px] bg-[#101014] hover:bg-ink-surface border border-ink-border/80 hover:border-gold/50 rounded-xs transition-all flex items-center group overflow-hidden"
                >
                  <img
                    src="/images/complete-boxset-cover.webp"
                    alt="Complete Boxsets"
                    className="absolute inset-0 w-full h-full object-cover object-left pointer-events-none group-hover:scale-105 transition-transform duration-500"
                    draggable={false}
                  />

                  {/* Text Container matching the mockup layout */}
                  <div className="relative z-10 flex flex-col flex-1 min-w-0 pl-[53%] xs:pl-[55%] md:pl-[52%] pr-3 md:pr-4 pt-3.5 md:pt-4 pb-0.5">
                    <span className="font-serif font-bold text-[13px] xs:text-[14.5px] md:text-[16px] leading-[1.15] text-paper group-hover:text-gold transition-colors tracking-tight drop-shadow-md">
                      {isArabic ? (
                        <>مجموعات<br />بوكس سيت</>
                      ) : (
                        <>Complete<br />Boxsets</>
                      )}
                    </span>
                    <span className="font-mono text-[9px] xs:text-[10px] md:text-[11px] leading-[1.25] text-text-muted mt-1.5 drop-shadow-md">
                      {isArabic ? (
                        <>سلاسل<br />كاملة</>
                      ) : (
                        <>Full Story<br />Arcs</>
                      )}
                    </span>
                  </div>

                  {/* Golden Kanji matching user mockup: 全集 */}
                  <span className="absolute top-2.5 right-2.5 md:top-3 md:right-3.5 z-10 text-[12.5px] xs:text-[13.5px] md:text-[15px] text-gold/90 font-serif drop-shadow-md font-medium">全集</span>

                  {/* Sleek navigation arrow matching user mockup */}
                  <ArrowRight
                    strokeWidth={1.5}
                    className="absolute bottom-2.5 right-2.5 md:bottom-3 md:right-3.5 z-10 w-4 h-4 md:w-4.5 md:h-4.5 text-paper/70 group-hover:text-gold group-hover:translate-x-1 transition-all drop-shadow-md"
                  />
                </Link>
              </div>
            </div>

            {/* Welcome Grant Voucher Pill (if active) */}
            {hasWelcomeOffer && (
              <div className="p-2.5 md:p-3.5 bg-gold/10 border border-gold/40 rounded-xs flex items-center justify-between gap-2 text-xs md:text-sm font-mono">
                <div className="flex items-center gap-1.5 md:gap-2 text-gold truncate">
                  <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                  <span className="truncate">20% Grant: <strong>{welcomeVoucherCode}</strong></span>
                </div>
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-2 md:px-3 py-0.5 md:py-1 bg-gold text-ink font-bold text-[9px] md:text-[10px] rounded-xs uppercase tracking-wider shrink-0"
                >
                  View
                </Link>
              </div>
            )}

            {/* User Quick Actions Grid (Account & Wishlist) */}
            <div className="grid grid-cols-2 gap-3 xs:gap-3.5 md:gap-4">
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="relative p-3.5 xs:p-4 md:p-4.5 min-h-[76px] xs:min-h-[82px] md:min-h-[92px] rounded-xs bg-[#101014] hover:bg-ink-surface border border-ink-border/80 hover:border-gold/50 flex items-center gap-3.5 md:gap-4 group transition-all overflow-hidden"
              >
                <User strokeWidth={1.5} className={`w-6 h-6 xs:w-6.5 xs:h-6.5 md:w-7 md:h-7 shrink-0 ${mounted && currentUser ? "text-gold" : "text-paper/80 group-hover:text-gold"}`} />
                <div className="flex flex-col flex-1 min-w-0 pr-4">
                  <div className="text-[12.5px] xs:text-[13.5px] md:text-sm font-bold text-paper group-hover:text-gold transition-colors truncate font-mono">
                    {mounted && currentUser ? currentUser.name.split(" ")[0].toUpperCase() : (isArabic ? "حسابي" : "MY ACCOUNT")}
                  </div>
                  <div className="text-[10px] xs:text-[10.5px] md:text-xs text-text-muted font-mono truncate mt-0.5">
                    {isArabic ? "تتبع الطلبات" : "Order Tracking"}
                  </div>
                </div>
                <ArrowRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-4.5 md:h-4.5 text-text-muted/40 group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href="/account?tab=WISHLIST"
                onClick={() => setMobileMenuOpen(false)}
                className="relative p-3.5 xs:p-4 md:p-4.5 min-h-[76px] xs:min-h-[82px] md:min-h-[92px] rounded-xs bg-[#101014] hover:bg-ink-surface border border-ink-border/80 hover:border-gold/50 flex items-center gap-3.5 md:gap-4 group transition-all overflow-hidden"
              >
                <Heart strokeWidth={1.5} className="w-6 h-6 xs:w-6.5 xs:h-6.5 md:w-7 md:h-7 text-vermilion fill-vermilion/10 group-hover:fill-vermilion/30 transition-all shrink-0" />
                <div className="flex flex-col flex-1 min-w-0 pr-4">
                  <div className="text-[12.5px] xs:text-[13.5px] md:text-sm font-bold text-paper group-hover:text-gold transition-colors truncate font-mono">
                    {isArabic ? "المفضلة" : "WISHLIST"}
                  </div>
                  <div className="text-[10px] xs:text-[10.5px] md:text-xs text-text-muted font-mono truncate mt-0.5">
                    {isArabic ? "المجلدات المحفوظة" : "Saved Volumes"}
                  </div>
                </div>
                <ArrowRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-4.5 md:h-4.5 text-text-muted/40 group-hover:text-gold group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>

            {/* Faint Japanese watermark. The language switch that used to sit here
                now lives in the header at every screen size. */}
            <div className="relative pt-8 md:pt-14 pb-4 md:pb-8 overflow-hidden min-h-[140px] md:min-h-[220px]">
              <div
                className="absolute -right-10 md:-right-16 -bottom-16 md:-bottom-24 pointer-events-none select-none z-0"
                aria-hidden="true"
              >
                <span className="text-[230px] xs:text-[270px] md:text-[380px] font-serif font-bold text-white/[0.022] tracking-[0.02em] leading-none whitespace-nowrap">
                  漫画
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
