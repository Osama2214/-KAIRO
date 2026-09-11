"use client";

import React, { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useUIStore } from "@/store/useUIStore";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Advertises whichever coupon the curator has marked as announced.
 *
 * The bar this replaces only ever knew about one coupon — a private per-patron
 * welcome code at a fixed 20%, with the percentage written into the markup in
 * three places, so a curator running a different promotion had no way to say so.
 * This reads whatever is currently announced and describes it from its own
 * terms: a percentage, an amount, free delivery, or a combination.
 *
 * Shown to everyone, signed in or not. Claiming it still requires signing in —
 * the server records a redemption against an address — and the cart says so.
 */

interface AnnouncedCoupon {
  code: string;
  label: string;
  percentOff: number;
  amountOff: number;
  freeShipping: boolean;
  expiresAt: number | null;
}

const DISMISSED_KEY = "kairo_coupon_bar_dismissed";

export function AnnouncedCouponBar() {
  const { locale } = useTranslation();
  const isArabic = locale === "ar";
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const appliedCoupon = useCartStore((state) => state.appliedCoupon);
  const openCart = useUIStore((state) => state.openCart);

  const [coupon, setCoupon] = useState<AnnouncedCoupon | null>(null);
  const [copied, setCopied] = useState(false);
  // A dismissal lasts the session: closing the bar should not mean never seeing
  // the shop's next promotion either. Read lazily rather than in an effect so
  // the bar never flashes before it is known to be dismissed.
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let active = true;
    fetch("/api/coupons/announced")
      .then((response) => response.json())
      .then((payload) => {
        if (active && payload?.success && payload.coupon) setCoupon(payload.coupon);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  if (!coupon || dismissed) return null;

  /** The offer in the shop's own terms, rather than a hard-coded "20% off". */
  const describe = (): string => {
    if (coupon.label) return coupon.label;
    const parts: string[] = [];
    if (coupon.percentOff > 0) parts.push(isArabic ? `خصم ${coupon.percentOff}%` : `${coupon.percentOff}% off`);
    if (coupon.amountOff > 0) parts.push(isArabic ? `خصم ${coupon.amountOff} جنيه` : `EGP ${coupon.amountOff} off`);
    if (coupon.freeShipping) parts.push(isArabic ? "شحن مجاني" : "free delivery");
    return parts.join(isArabic ? " + " : " + ");
  };

  const isApplied = appliedCoupon === coupon.code;

  const claim = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
    } catch {
      // Copying is a convenience; the code is on screen either way.
    }
    setCopied(true);
    const result = await applyCoupon(coupon.code);
    setTimeout(() => {
      setCopied(false);
      if (result.success) openCart();
    }, 700);
  };

  const close = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // A browser refusing storage just means it reappears next page.
    }
  };

  return (
    <aside
      aria-label={isArabic ? "عرض خاص" : "Current offer"}
      dir={isArabic ? "rtl" : "ltr"}
      className="relative z-50 w-full bg-ink-surface border-b border-gold/30 text-paper px-3 sm:px-6 py-2 shadow-[0_4px_20px_rgba(212,175,55,0.06)] animate-in fade-in duration-300"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 text-xs font-mono min-w-0">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <p className="text-paper-muted leading-tight text-[11px] sm:text-xs font-sans truncate">
            {describe()}
          </p>

          <button
            type="button"
            onClick={claim}
            title={isArabic ? "انسخ الكود وطبّقه" : "Copy and apply this code"}
            className="hidden sm:inline-flex min-w-0 items-center gap-1 px-2 py-0.5 bg-ink border border-dashed border-gold/60 rounded-xs text-gold font-bold text-[11px] tracking-wider hover:bg-gold/15 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span className="truncate max-w-[140px]">{coupon.code}</span>
            {copied ? <Check className="w-3 h-3 shrink-0" /> : <Copy className="w-3 h-3 opacity-70 shrink-0" />}
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={claim}
            disabled={isApplied}
            className={`px-2.5 sm:px-3 py-1 rounded-xs text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-colors ${
              isApplied
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 cursor-default"
                : "bg-gold hover:bg-gold-light text-ink cursor-pointer"
            }`}
          >
            {isApplied
              ? isArabic
                ? "مُطبَّق"
                : "Applied"
              : isArabic
                ? "استخدم العرض"
                : "Claim offer"}
          </button>

          <button
            type="button"
            onClick={close}
            aria-label={isArabic ? "إغلاق" : "Dismiss"}
            className="text-text-muted hover:text-paper p-1 cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
