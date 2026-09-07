"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag, User, Menu, X, Compass, Heart, Sparkles, Globe } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore, useMounted } from "@/store/useWishlistStore";
import { useUIStore } from "@/store/useUIStore";
import { GlobalWelcomeOfferBar } from "@/components/GlobalWelcomeOfferBar";
import { useWelcomeOffer } from "@/hooks/useWelcomeOffer";
import { clearKairoSavedScroll } from "@/components/SmoothScrollProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { useStorefrontStore } from "@/store/useStorefrontStore";

export function Navbar() {
  const pathname = usePathname();
  const mounted = useMounted();
  const { t, locale, toggleLanguage } = useTranslation();
  const isArabic = locale === "ar";
  const arabicLanguageEnabled = useStorefrontStore((state) => state.arabicLanguageEnabled ?? true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeHash, setActiveHash] = useState("");

  const totalCartCount = useCartStore((state) => state.getTotalItems());
  const totalWishlistCount = useWishlistStore((state) => state.getTotalItems());
  const { openCart, openSearch } = useUIStore();
  const { hasOffer: hasWelcomeOffer, currentUser } = useWelcomeOffer();

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
    { label: t.nav.manga, href: "/manga" },
    { label: t.nav.series, href: "/series" },
    { label: t.nav.genres, href: "/#genres" },
    { label: t.nav.newReleases, href: "/#new-releases" },
    { label: t.nav.sale, href: "/manga?sort=sale" },
  ];

  const handleLogoClick = (e: React.MouseEvent) => {
    setMobileMenuOpen(false);
    try {
      clearKairoSavedScroll("/");
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
        clearKairoSavedScroll(href);
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
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
          isScrolled
            ? "bg-ink/85 backdrop-blur-md border-b border-ink-border/80 shadow-2xl"
            : "bg-transparent"
        }`}
      >
        {/* Global Personalized Welcome Grant Bar (Visible Across All Pages) */}
        <GlobalWelcomeOfferBar />

        <div
          className={`max-w-7xl mx-auto px-4 sm:px-6 md:px-10 flex items-center justify-between transition-all duration-300 ${
            isScrolled ? "py-2.5 sm:py-3.5" : "py-3 sm:py-5"
          }`}
        >
          {/* Brand Logo & Japanese Seal */}
          <Link
            href="/"
            onClick={handleLogoClick}
            className="group flex items-center gap-2.5 sm:gap-3.5 tracking-tight focus:outline-none cursor-pointer shrink-0"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-sm bg-vermilion/90 flex items-center justify-center text-paper font-serif font-bold text-[11px] sm:text-xs border border-vermilion/50 shadow-sm transition-transform duration-300 group-hover:scale-105">
              回路
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-[0.2em] sm:tracking-[0.25em] text-base sm:text-lg text-paper uppercase transition-colors group-hover:text-vermilion">
                KAIRO
              </span>
              <span className="text-[8px] sm:text-[9px] tracking-[0.18em] sm:tracking-[0.2em] text-text-muted uppercase font-mono -mt-1">
                EDITORIAL MANGA
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-10">
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
          <div className="flex items-center gap-0.5 sm:gap-2">
            {/* Language Switcher */}
            {arabicLanguageEnabled && (
              <button
                onClick={toggleLanguage}
                className="h-8 px-1.5 sm:px-2.5 flex items-center gap-1 text-paper-muted/90 hover:text-gold transition-all rounded-sm hover:bg-ink-surface/80 border border-ink-border/80 hover:border-gold/50 focus:outline-none cursor-pointer"
                title={locale === "en" ? "تبديل إلى اللغة العربية" : "Switch to English"}
                aria-label="Toggle language"
              >
                <Globe strokeWidth={1.5} className="w-3.5 h-3.5 text-gold" />
                <span className="text-[11px] font-bold font-sans tracking-wide">
                  {locale === "en" ? "العربية" : "EN"}
                </span>
              </button>
            )}

            {/* Search Trigger */}
            <button
              onClick={openSearch}
              className="h-8 w-8 sm:h-9 sm:w-auto sm:px-2.5 flex items-center justify-center gap-2 text-paper-muted/80 hover:text-gold transition-all rounded-sm hover:bg-ink-surface/80 border border-transparent hover:border-ink-border/60 focus:outline-none cursor-pointer"
              title="Search (⌘K)"
              aria-label="Search manga catalog"
            >
              <Search strokeWidth={1.5} className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px]" />
              <span className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded-xs bg-ink-surface border border-ink-border/80 text-[10px] font-mono tracking-wider text-text-muted">
                ⌘K
              </span>
            </button>

            {/* Wishlist */}
            <Link
              href="/account?tab=WISHLIST"
              className="relative h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center text-paper-muted/80 hover:text-gold transition-all rounded-sm hover:bg-ink-surface/80 border border-transparent hover:border-ink-border/60"
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

            {/* Account / Dashboard */}
            <Link
              href="/account"
              className="h-8 w-8 sm:h-9 sm:w-auto sm:px-2.5 flex items-center justify-center gap-2 text-paper-muted/80 hover:text-gold transition-all rounded-sm hover:bg-ink-surface/80 border border-transparent hover:border-ink-border/60 cursor-pointer"
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

      {/* Mobile Drawer Menu with Smooth Touch Layout and Safe-Area Support */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-ink/98 backdrop-blur-2xl md:hidden pt-24 px-6 sm:px-8 pb-8 pb-safe flex flex-col justify-between overflow-y-auto animate-in fade-in duration-300">
          <div className="space-y-6">
            <span className="text-[10px] tracking-[0.25em] text-text-muted font-mono uppercase">
              {isArabic ? "التنقل السريع" : "NAVIGATION"}
            </span>
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => {
                const active = isLinkActive(link.href);
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className={`py-2 px-3 rounded-xs text-base sm:text-lg font-bold tracking-[0.12em] transition-colors flex items-center justify-between cursor-pointer ${
                      active
                        ? "bg-ink-surface text-vermilion border border-vermilion/30"
                        : "text-paper hover:text-vermilion hover:bg-ink-surface/50"
                    }`}
                  >
                    <span>{link.label}</span>
                    <Compass strokeWidth={1.2} className={`w-4 h-4 ${active ? "text-vermilion" : "text-text-muted"}`} />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-ink-border/80 flex flex-col gap-3">
            {hasWelcomeOffer && (
              <div className="p-3 bg-gold/10 border border-gold/40 rounded-xs flex items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-gold truncate">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">20% Grant: <strong>{currentUser?.welcomeDiscountCode}</strong></span>
                </div>
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-2.5 py-1 bg-gold text-ink font-bold text-[10px] rounded-xs uppercase tracking-wider shrink-0"
                >
                  View
                </Link>
              </div>
            )}
            
            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 px-3 rounded-xs bg-ink-surface/60 border border-ink-border text-xs font-mono tracking-wider text-paper hover:text-gold flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <User strokeWidth={1.4} className={`w-4 h-4 ${mounted && currentUser ? "text-gold" : "text-text-muted"}`} />
                <span className="font-semibold">
                  {mounted && currentUser
                    ? `PATRON: ${currentUser.name.split(" ")[0].toUpperCase()}`
                    : (isArabic ? "حسابي / تتبع الطلبات" : "MY ACCOUNT / ORDERS")}
                </span>
              </div>
              <span className="text-[10px] text-text-muted font-serif">→</span>
            </Link>

            <Link
              href="/account?tab=WISHLIST"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 px-3 rounded-xs bg-ink-surface/60 border border-ink-border text-xs font-mono tracking-wider text-gold hover:text-paper flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Heart strokeWidth={1.4} className="w-4 h-4" />
                <span>{isArabic ? "قائمة الرغبات" : "WISHLIST"} ({mounted ? totalWishlistCount : 0})</span>
              </div>
              <span className="text-[10px] text-text-muted font-serif">→</span>
            </Link>

            {arabicLanguageEnabled && (
              <button
                type="button"
                onClick={() => {
                  toggleLanguage();
                  setMobileMenuOpen(false);
                }}
                className="py-2.5 px-3 rounded-xs bg-gold/10 border border-gold/30 text-xs font-bold text-gold hover:text-paper flex items-center justify-between font-sans cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Globe strokeWidth={1.4} className="w-4 h-4" />
                  <span>{locale === "en" ? "تغيير الواجهة إلى العربية" : "Switch Interface to English"}</span>
                </div>
                <span className="text-[11px] font-mono uppercase text-gold font-bold">
                  {locale === "en" ? "العربية" : "EN"}
                </span>
              </button>
            )}

            <div className="pt-2 flex items-center justify-between text-[11px] text-text-muted font-mono">
              <span>{isArabic ? "أرشيف مانجا كيرو الرسمي" : "KAIRO ARCHIVAL SYSTEM"}</span>
              <span className="text-gold font-serif">回路アーカイブ</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
