"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

declare global {
  interface Window {
    __lenis?: Lenis;
    __lenisResize?: () => void;
  }
}

const STORAGE_PREFIX_KEY = "kairo_scroll_key_";
const STORAGE_PREFIX_PATH = "kairo_scroll_path_";

function getHistoryKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.history.state?.key || null;
}

function normalizePath(path: string): string {
  if (!path) return "/";
  const clean = path.split("?")[0].split("#")[0].replace(/\/+$/, "");
  return clean || "/";
}

export function saveYujiScroll(path: string, y: number) {
  if (typeof window === "undefined") return;
  const rounded = Math.max(0, Math.round(y));
  const hKey = getHistoryKey();
  const nPath = normalizePath(path);

  try {
    if (hKey) {
      sessionStorage.setItem(`${STORAGE_PREFIX_KEY}${hKey}`, rounded.toString());
    }
    sessionStorage.setItem(`${STORAGE_PREFIX_PATH}${nPath}`, rounded.toString());
  } catch {}
}

export function getYujiSavedScroll(path: string): number {
  if (typeof window === "undefined") return 0;
  const hKey = getHistoryKey();
  const nPath = normalizePath(path);

  try {
    if (hKey) {
      const val = sessionStorage.getItem(`${STORAGE_PREFIX_KEY}${hKey}`);
      if (val !== null) {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }

    const pathVal = sessionStorage.getItem(`${STORAGE_PREFIX_PATH}${nPath}`);
    if (pathVal !== null) {
      const parsed = parseInt(pathVal, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {}

  return 0;
}

export function clearYujiSavedScroll(path: string) {
  if (typeof window === "undefined") return;
  const hKey = getHistoryKey();
  const nPath = normalizePath(path);
  try {
    if (hKey) {
      sessionStorage.removeItem(`${STORAGE_PREFIX_KEY}${hKey}`);
    }
    sessionStorage.removeItem(`${STORAGE_PREFIX_PATH}${nPath}`);
  } catch {}
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const prevPathnameRef = useRef(pathname);
  const lenisRef = useRef<Lenis | null>(null);
  const isRestoringRef = useRef(false);
  const cancelRestorationRef = useRef(false);
  const lastSavedTime = useRef(0);
  const isInitialMount = useRef(true);
  const isPopStateRef = useRef(false);
  const userIsScrollingRef = useRef(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set manual browser scroll restoration & track PopState (browser Back / Forward)
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const onPopState = () => {
      isPopStateRef.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Track genuine user-initiated scrolling (wheel, touchmove, pointer dragging)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onUserInteraction = () => {
      userIsScrollingRef.current = true;
      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
      userScrollTimeoutRef.current = setTimeout(() => {
        userIsScrollingRef.current = false;
      }, 250);
    };

    window.addEventListener("wheel", onUserInteraction, { passive: true });
    window.addEventListener("touchmove", onUserInteraction, { passive: true });
    window.addEventListener("pointerdown", onUserInteraction, { passive: true });

    return () => {
      window.removeEventListener("wheel", onUserInteraction);
      window.removeEventListener("touchmove", onUserInteraction);
      window.removeEventListener("pointerdown", onUserInteraction);
      if (userScrollTimeoutRef.current) clearTimeout(userScrollTimeoutRef.current);
    };
  }, []);

  const mountTimeRef = useRef<number>(0);

  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, []);

  const revealRestoration = (immediate = false) => {
    if (typeof document === "undefined") return;
    if (immediate) {
      document.documentElement.classList.remove("yuji-restoring");
      document.documentElement.classList.remove("yuji-loading");
      return;
    }
    const start = mountTimeRef.current || Date.now();
    const elapsed = Date.now() - start;
    const minDelay = Math.max(0, 260 - elapsed);
    setTimeout(() => {
      document.documentElement.classList.remove("yuji-restoring");
      document.documentElement.classList.remove("yuji-loading");
    }, minDelay);
  };

  // Helper to safely restore a target Y coordinate using an active multi-frame anchor loop
  const restoreScrollPosition = (targetY: number) => {
    if (targetY <= 0) {
      revealRestoration(true);
      return;
    }

    isRestoringRef.current = true;
    cancelRestorationRef.current = false;

    // 01 — SYNCHRONOUS IMMEDIATE PRE-PAINT SNAP (Eliminates the Hero flash!)
    if (typeof window !== "undefined") {
      const docH = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const maxScroll = Math.max(0, docH - window.innerHeight);
      const clampTarget = Math.min(targetY, maxScroll > 0 ? maxScroll : targetY);

      if (window.__lenis) {
        window.__lenis.resize();
        window.__lenis.scrollTo(clampTarget, { immediate: true });
      }
      window.scrollTo({ top: clampTarget, left: 0, behavior: "instant" as ScrollBehavior });
      document.documentElement.scrollTop = clampTarget;
      document.body.scrollTop = clampTarget;

      if (typeof ScrollTrigger !== "undefined") {
        ScrollTrigger.update();
      }

      if (clampTarget >= targetY - 40) {
        revealRestoration();
      }
    }

    let frames = 0;
    const maxFrames = 120; // ~2.0s max window for progressive image/font hydration
    let stableConsecutiveHits = 0;
    let prevHeight = 0;

    const onUserScroll = (e: Event) => {
      // Only yield if the user makes a real, intentional scroll gesture
      if (e.type === "wheel") {
        const we = e as WheelEvent;
        if (Math.abs(we.deltaY) > 6) {
          cancelRestorationRef.current = true;
          isRestoringRef.current = false;
          cleanup();
        }
      } else if (e.type === "touchmove") {
        cancelRestorationRef.current = true;
        isRestoringRef.current = false;
        cleanup();
      }
    };

    const cleanup = () => {
      revealRestoration();
      window.removeEventListener("wheel", onUserScroll);
      window.removeEventListener("touchmove", onUserScroll);
    };

    window.addEventListener("wheel", onUserScroll, { passive: true });
    window.addEventListener("touchmove", onUserScroll, { passive: true });

    const step = () => {
      if (cancelRestorationRef.current) {
        cleanup();
        return;
      }

      frames++;
      const currentLenis = window.__lenis;
      const docH = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const maxScroll = Math.max(0, docH - window.innerHeight);
      const clampTarget = Math.min(targetY, maxScroll);

      if (currentLenis) {
        currentLenis.resize();
        currentLenis.scrollTo(clampTarget, { immediate: true });
      }
      window.scrollTo({ top: clampTarget, left: 0, behavior: "instant" as ScrollBehavior });
      document.documentElement.scrollTop = clampTarget;
      document.body.scrollTop = clampTarget;

      if (typeof ScrollTrigger !== "undefined") {
        ScrollTrigger.update();
      }

      const currentScroll = currentLenis ? currentLenis.scroll : window.scrollY;
      const reachedTarget = Math.abs(currentScroll - targetY) < 30;
      const heightIsSufficient = maxScroll >= targetY - 20 || docH >= targetY + 50;
      const heightIsStable = docH === prevHeight && heightIsSufficient;

      if (reachedTarget) {
        revealRestoration();
      }

      if (heightIsStable && reachedTarget) {
        stableConsecutiveHits++;
      } else {
        stableConsecutiveHits = 0;
      }
      prevHeight = docH;

      // Require 4 consecutive stable frames with target reached AND height stable, or timeout
      if (stableConsecutiveHits >= 4 || frames >= maxFrames) {
        if (currentLenis) {
          currentLenis.resize();
          currentLenis.scrollTo(targetY, { immediate: true });
        }
        window.scrollTo({ top: targetY, left: 0, behavior: "instant" as ScrollBehavior });
        if (typeof ScrollTrigger !== "undefined") {
          ScrollTrigger.refresh();
        }
        cleanup();
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 100);
        return;
      }

      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Disable default browser scroll jumping to allow Lenis restoration
    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
    } catch {}

    // Helper to persist current scroll position for the current route
    const saveCurrentScroll = () => {
      if (isRestoringRef.current) return;
      try {
        const y = window.__lenis ? window.__lenis.scroll : window.scrollY;
        if (y > 20 || userIsScrollingRef.current) {
          saveYujiScroll(pathnameRef.current, y);
        }
      } catch {}
    };

    // Register GSAP ScrollTrigger plugin safely
    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }

    // Hijacking the wheel is disorienting for anyone who has asked the system
    // for reduced motion; leave native scrolling alone for them.
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Initialize Lenis with fast, snappy, responsive velocity settings
    const lenis = new Lenis({
      duration: prefersReducedMotion ? 0 : 0.55,
      smoothWheel: !prefersReducedMotion,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      wheelMultiplier: 1.4,
      touchMultiplier: 1.2,
      syncTouch: false,
      autoResize: true,
      naiveDimensions: true,
      prevent: (node) => {
        if (!node || typeof (node as HTMLElement).closest !== "function") return false;
        return Boolean(
          (node as HTMLElement).closest("[data-lenis-prevent]") ||
          (node as HTMLElement).closest('[role="dialog"]') ||
          (node as HTMLElement).closest('[role="listbox"]') ||
          (node as HTMLElement).closest(".fixed")
        );
      },
    });

    lenisRef.current = lenis;
    window.__lenis = lenis;

    const initialSavedY = getYujiSavedScroll(pathnameRef.current);
    if (initialSavedY > 30) {
      lenis.scrollTo(initialSavedY, { immediate: true });
    }

    // Synchronize Lenis with ScrollTrigger and continuously persist scroll position (throttled)
    const handleLenisScroll = (e: { scroll: number }) => {
      ScrollTrigger.update();
      if (isRestoringRef.current) return; // NEVER overwrite during restoration!

      const currentY = Math.round(e.scroll);

      // CRITICAL SHIELD: If scroll suddenly reports 0 without active user scroll gesture,
      // it is a synthetic reset triggered by Next.js router or page unmount.
      // Do NOT overwrite user's saved position with synthetic 0!
      if (currentY <= 15 && !userIsScrollingRef.current) {
        return;
      }

      const now = Date.now();
      if (now - lastSavedTime.current > 75) {
        lastSavedTime.current = now;
        saveYujiScroll(pathnameRef.current, currentY);
      }
    };
    lenis.on("scroll", handleLenisScroll);

    // Save scroll on page hide, beforeunload, or clicking ANY link/card
    const handleInteractiveClick = (e: MouseEvent) => {
      const interactive = (e.target as HTMLElement).closest("a, button, [role='button']");
      if (interactive) {
        saveCurrentScroll();
      }
    };
    document.addEventListener("click", handleInteractiveClick, { capture: true });
    window.addEventListener("pagehide", saveCurrentScroll);
    window.addEventListener("beforeunload", saveCurrentScroll);

    // Synchronize Lenis loop with GSAP's ticker for locked 60-120fps smooth scrub
    const tickerUpdate = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerUpdate);
    gsap.ticker.lagSmoothing(0);

    // Global resize trigger function
    const triggerResize = () => {
      lenis.resize();
      ScrollTrigger.refresh();
    };
    window.__lenisResize = triggerResize;

    // 1. Observe body & documentElement dimension changes
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        triggerResize();
      });
      if (document.body) resizeObserver.observe(document.body);
      if (document.documentElement) resizeObserver.observe(document.documentElement);
    }

    // 2. Observe DOM mutations
    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined" && document.body) {
      let debounceTimer: NodeJS.Timeout | null = null;
      mutationObserver = new MutationObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          triggerResize();
        }, 120);
      });
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    // 3. Listen for image load events anywhere in the page
    const handleImageLoad = (e: Event) => {
      if ((e.target as HTMLElement)?.tagName === "IMG") {
        triggerResize();
      }
    };
    document.addEventListener("load", handleImageLoad, true);

    // 4. Window & visibility events
    window.addEventListener("resize", triggerResize);
    window.addEventListener("orientationchange", triggerResize);
    window.addEventListener("focus", triggerResize);
    const handleVisibilityChange = () => {
      if (!document.hidden) triggerResize();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 5. Intercept internal anchor link clicks for smooth jumping
    const handleAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a[href*="#"]');
      if (anchor) {
        const href = anchor.getAttribute("href");
        if (!href) return;

        const isHashOnly = href.startsWith("#") && href.length > 1;
        const isHomeHashOnHome =
          (window.location.pathname === "/" || window.location.pathname === "") &&
          href.startsWith("/#") &&
          href.length > 2;

        if (isHashOnly || isHomeHashOnHome) {
          const targetId = href.replace(/^\/?#/, "");
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            e.preventDefault();
            lenis.resize();
            lenis.scrollTo(targetElement, {
              offset: -80,
              duration: 0.6,
              easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            });
            history.pushState(null, "", `#${targetId}`);
            window.dispatchEvent(new Event("hashchange"));
          }
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);

    // Initial resize pass after mount to ensure accurate initial document limits
    triggerResize();
    const initTimer = setTimeout(triggerResize, 200);

    return () => {
      gsap.ticker.remove(tickerUpdate);
      clearTimeout(initTimer);
      document.removeEventListener("click", handleInteractiveClick, { capture: true });
      document.removeEventListener("click", handleAnchorClick);
      document.removeEventListener("load", handleImageLoad, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", saveCurrentScroll);
      window.removeEventListener("beforeunload", saveCurrentScroll);
      window.removeEventListener("resize", triggerResize);
      window.removeEventListener("orientationchange", triggerResize);
      window.removeEventListener("focus", triggerResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
      lenis.off("scroll", handleLenisScroll);
      lenis.destroy();
      delete window.__lenis;
      delete window.__lenisResize;
    };
  }, []);

  // Handle route changes, page refreshes, and Back/Forward scroll restoration
  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const lenis = window.__lenis;
    const prevPath = prevPathnameRef.current;
    const currentPath = pathname;
    prevPathnameRef.current = currentPath;
    pathnameRef.current = currentPath;

    // Save scroll position of the page we are leaving if it had meaningful scroll
    const scrollBeforeTransition = lenis ? lenis.scroll : window.scrollY;
    if (prevPath !== currentPath && scrollBeforeTransition > 30) {
      saveYujiScroll(prevPath, scrollBeforeTransition);
    }

    const hash = window.location.hash;

    // Case 1: Cross-page or direct hash navigation (#trending, #new-releases, etc.)
    if (hash && hash.length > 1) {
      const targetId = hash.replace(/^#/, "");
      let attempts = 0;
      const maxAttempts = 25;

      const checkAndScroll = () => {
        const targetElement = document.getElementById(targetId);
        if (targetElement && window.__lenis) {
          window.__lenis.resize();
          window.__lenis.scrollTo(targetElement, {
            offset: -80,
            duration: 0.6,
          });
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkAndScroll, 50);
        }
      };

      const timer = setTimeout(checkAndScroll, 70);
      return () => clearTimeout(timer);
    }

    const wasPopState = isPopStateRef.current;
    isPopStateRef.current = false;

    // Retrieve saved scroll position for this specific route
    const savedY = getYujiSavedScroll(currentPath);

    // Case 2: If we are returning via Back/Forward (popstate) OR reloading the page (F5 / initial mount)
    // with an active saved position, RESTORE IT!
    if (savedY > 30 && (isInitialMount.current || wasPopState)) {
      isInitialMount.current = false;
      restoreScrollPosition(savedY);
      return;
    }

    revealRestoration(true);

    // Case 3: Fresh arrival on a new page via standard forward link click:
    // Scroll cleanly to the top of the new page
    if (!isInitialMount.current) {
      if (lenis) {
        lenis.stop();
        lenis.scrollTo(0, { immediate: true });
        lenis.start();
        lenis.resize();
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }

    isInitialMount.current = false;

    // Progressive resize triggers as new page content hydrates and renders
    const timers = [
      setTimeout(() => window.__lenis?.resize(), 80),
      setTimeout(() => window.__lenis?.resize(), 250),
      setTimeout(() => window.__lenis?.resize(), 600),
      setTimeout(() => {
        window.__lenis?.resize();
        if (typeof ScrollTrigger !== "undefined") {
          ScrollTrigger.refresh();
        }
      }, 1200),
    ];

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [pathname]);

  return <>{children}</>;
}
