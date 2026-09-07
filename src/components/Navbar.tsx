"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag, User, Menu, X, Compass, Heart, Sparkles } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore, useMounted } from "@/store/useWishlistStore";
import { useUIStore } from "@/store/useUIStore";
import { GlobalWelcomeOfferBar } from "@/components/GlobalWelcomeOfferBar";
import { useWelcomeOffer } from "@/hooks/useWelcomeOffer";
import { clearKairoSavedScroll } from "@/components/SmoothScrollProvider";

export function Navbar() {
  const pathname = usePathname();
  const mounted = useMounted();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeHash, setActiveHash] = useState("");

  const totalCartCount = useCartStore((state) => state.getTotalItems());
  const totalWishlistCount = useWishlistStore((state) => state.getTotalItems());
  const { openCart, openSearch } = useUIStore();
  const { hasOffer: hasWelcomeOffer, currentUser } = useWelcomeOffer();

  useEffect(() => {
    // If session is explicitly logged out and no user is active, purge any leftover cart/wishlist
    if (typeof window !== "undefined" && localStorage.getItem("kairo_active_session") === "logged_out" && !currentUser) {
      if (useCartStore.getState().items.length > 0) {
        useCartStore.getState().clearCart();
        localStorage.removeItem("kairo_cart_storage");
      }
      if (useWishlistStore.getState().items.length > 0) {
        useWishlistStore.getState().clearWishlist();
        localStorage.removeItem("kairo_wishlist_storage");
      }
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [currentUser]);

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
    { label: "MANGA", href: "/manga" },
    { label: "SERIES", href: "/series" },
    { label: "GENRES", href: "/#genres" },
    { label: "NEW RELEASES", href: "/#new-releases" },
    { label: "SALE", href: "/manga?sort=sale" },
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
          className={`max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between transition-all duration-300 ${
            isScrolled ? "py-3.5" : "py-5"
          }`}
        >
          {/* Brand Logo & Japanese Seal */}
          <Link
            href="/"
            onClick={handleLogoClick}
            className="group flex items-center gap-3.5 tracking-tight focus:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 rounded-sm bg-vermilion/90 flex items-center justify-center text-paper font-serif font-bold text-xs border border-vermilion/50 shadow-sm transition-transform duration-300 group-hover:scale-105">
              回路
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-[0.25em] text-lg text-paper uppercase transition-colors group-hover:text-vermilion">
                KAIRO
              </span>
              <span className="text-[9px] tracking-[0.2em] text-text-muted uppercase font-mono -mt-1">
                EDITORIAL MANGA
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 lg:gap-10">
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
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Search Trigger */}
            <button
              onClick={openSearch}
              className="h-9 px-2.5 flex items-center gap-2 text-paper-muted/80 hover:text-gold transition-all rounded-sm hover:bg-ink-surface/80 border border-transparent hover:border-ink-border/60 focus:outline-none cursor-pointer"
              title="Search (⌘K)"
              aria-label="Search manga catalog"
            >
              <Search strokeWidth={1.5} className="w-[18px] h-[18px]" />
              <span className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded-xs bg-ink-surface border border-ink-border/80 text-[10px] font-mono tracking-wider text-text-muted">
                ⌘K
              </span>
            </button>

            {/* Wishlist */}
            <Link
              href="/account?tab=WISHLIST"
              className="relative h-9 w-9 flex items-center justify-center text-paper-muted/80 hover:text-gold transition-all rounded-sm hover:bg-ink-surface/80 border border-transparent hover:border-ink-border/60"
              title="Curated Wishlist"
              aria-label="View Wishlist"
            >
              <Heart
                strokeWidth={1.5}
                className={`w-[18px] h-[18px] transition-colors ${
                  mounted && totalWishlistCount > 0 ? "text-gold fill-gold/20" : ""
                }`}
              />
              {mounted && totalWishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-gold text-ink text-[9px] font-mono font-bold rounded-full flex items-center justify-center ring-2 ring-ink shadow-sm pointer-events-none animate-in zoom-in-50">
                  {totalWishlistCount}
                </span>
              )}
            </Link>

            {/* Account / Dashboard */}
            <Link
              href="/account"
              className="h-9 px-2.5 flex items-center gap-2 text-paper-muted/80 hover:text-gold transition-all rounded-sm hover:bg-ink-surface/80 border border-transparent hover:border-ink-border/60 cursor-pointer"
              title={mounted && currentUser ? `Patron: ${currentUser.name} (${currentUser.id})` : "Sign In / Register"}
              aria-label="User Account"
            >
              <User
                strokeWidth={1.5}
                className={`w-[18px] h-[18px] transition-colors ${
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
              className="relative h-9 w-9 flex items-center justify-center text-paper-muted/80 hover:text-gold transition-all rounded-sm hover:bg-ink-surface/80 border border-transparent hover:border-ink-border/60 focus:outline-none cursor-pointer"
              title="View Cart"
              aria-label="Open Cart"
            >
              <ShoppingBag strokeWidth={1.5} className="w-[18px] h-[18px]" />
              {mounted && totalCartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-vermilion text-white text-[9px] font-mono font-bold rounded-full flex items-center justify-center ring-2 ring-ink shadow-sm pointer-events-none animate-in zoom-in-50">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden h-9 w-9 flex items-center justify-center text-paper-muted/80 hover:text-paper transition-colors rounded-sm focus:outline-none"
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

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-ink/95 backdrop-blur-xl md:hidden pt-24 px-8 pb-10 flex flex-col justify-between animate-in fade-in duration-300">
          <div className="space-y-6">
            <span className="text-[10px] tracking-[0.25em] text-text-muted font-mono uppercase">
              Navigation
            </span>
            <div className="flex flex-col space-y-5">
              {navLinks.map((link) => {
                const active = isLinkActive(link.href);
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className={`text-lg font-bold tracking-[0.15em] transition-colors flex items-center justify-between cursor-pointer ${
                      active ? "text-vermilion" : "text-paper hover:text-vermilion"
                    }`}
                  >
                    <span>{link.label}</span>
                    <Compass strokeWidth={1.2} className={`w-4 h-4 ${active ? "text-vermilion" : "text-text-muted"}`} />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="pt-8 border-t border-ink-border/80 flex items-center justify-between">
            <div className="flex flex-col gap-2.5 w-full">
              {hasWelcomeOffer && (
                <div className="p-2.5 bg-gold/10 border border-gold/40 rounded-xs flex items-center justify-between gap-2 text-xs font-mono mb-1">
                  <div className="flex items-center gap-1.5 text-gold truncate">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">20% Grant: <strong>{currentUser?.welcomeDiscountCode}</strong></span>
                  </div>
                  <Link
                    href="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-2 py-0.5 bg-gold text-ink font-bold text-[10px] rounded-xs uppercase tracking-wider shrink-0"
                  >
                    View
                  </Link>
                </div>
              )}
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-mono tracking-wider text-text-muted hover:text-paper flex items-center gap-2"
              >
                <User strokeWidth={1.4} className={`w-3.5 h-3.5 ${mounted && currentUser ? "text-gold" : ""}`} />
                <span>
                  {mounted && currentUser
                    ? `PATRON: ${currentUser.name.split(" ")[0].toUpperCase()}`
                    : "MY ACCOUNT / ORDERS"}
                </span>
              </Link>
              <Link
                href="/account?tab=WISHLIST"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-mono tracking-wider text-gold hover:text-paper flex items-center gap-2"
              >
                <Heart strokeWidth={1.4} className="w-3.5 h-3.5" />
                <span>WISHLIST ({mounted ? totalWishlistCount : 0})</span>
              </Link>
            </div>
            <span className="text-xs text-gold font-serif">回路アーカイブ</span>
          </div>
        </div>
      )}
    </>
  );
}
