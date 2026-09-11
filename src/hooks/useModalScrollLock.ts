"use client";

import { useEffect } from "react";

/**
 * Custom hook to lock body scrolling and pause Lenis smooth scroll
 * whenever a modal dialog, drawer, or reader is mounted / active.
 */
export function useModalScrollLock(isOpen: boolean = true) {
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    if (window.__lenis) {
      window.__lenis.stop();
    }

    // The ticker keeps scrolling behind a modal's backdrop-blur, and blurring a
    // moving strip every frame reads as a stutter rather than smooth motion.
    // Nothing needs to move back there while a dialog has focus.
    document.body.classList.add("modal-open");

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      document.body.classList.remove("modal-open");
      if (window.__lenis) {
        window.__lenis.start();
        window.__lenis.resize();
      }
    };
  }, [isOpen]);
}
