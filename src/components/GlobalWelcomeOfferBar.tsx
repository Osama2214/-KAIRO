"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Clock, Copy, Check, X } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useUIStore } from "@/store/useUIStore";
import { useWelcomeOffer } from "@/hooks/useWelcomeOffer";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { LiveEditButton } from "@/components/admin/LiveEditButton";

interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeRemaining(expiresAt: number): TimeRemaining {
  const diff = expiresAt - Date.now();
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds, isExpired: false };
}

export function GlobalWelcomeOfferBar() {
  const announcement = useStorefrontStore((state) => state.announcement);
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const appliedCoupon = useCartStore((state) => state.appliedCoupon);
  const openCart = useUIStore((state) => state.openCart);

  const [copied, setCopied] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const { mounted, currentUser, hasOffer, voucherCode, expiresAt } = useWelcomeOffer();
  const discountPercent = 20;

  const [timeLeft, setTimeLeft] = useState<TimeRemaining | null>(() =>
    expiresAt ? calculateTimeRemaining(expiresAt) : null
  );

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(expiresAt);
      setTimeLeft(remaining);
      if (remaining.isExpired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, setTimeLeft]);

  // If not mounted, disabled in CMS, not logged in, claimed, no expiry, or expired
  if (
    !mounted ||
    !announcement.enabled ||
    !currentUser ||
    !hasOffer ||
    !expiresAt ||
    !timeLeft ||
    timeLeft.isExpired
  ) {
    return null;
  }

  const isApplied = appliedCoupon === voucherCode;

  const handleApplyOffer = () => {
    navigator.clipboard.writeText(voucherCode);
    applyCoupon(voucherCode, discountPercent, true);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      openCart();
    }, 900);
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  // If user dismissed the top bar, show a compact floating gold privilege pill in bottom-right
  if (isDismissed) {
    return (
      <aside
        aria-label="Floating Welcome Offer"
        className="fixed bottom-5 right-5 z-40 animate-in fade-in slide-in-from-bottom-3 duration-300"
      >
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className="flex items-center gap-2.5 px-3.5 py-2 bg-ink-surface/95 hover:bg-ink border border-gold/50 hover:border-gold rounded-full shadow-[0_8px_30px_rgba(212,175,55,0.25)] backdrop-blur-md text-gold text-xs font-mono transition-all cursor-pointer group"
          title="Open your exclusive welcome offer"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-gold" />
          <span className="font-bold tracking-wider">{voucherCode}</span>
          <span className="text-paper text-[11px] font-sans font-bold">• 20% OFF</span>
          {timeLeft && (
            <span className="text-text-muted text-[10px] hidden sm:inline">
              ({pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)})
            </span>
          )}
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Exclusive Welcome Offer"
      className="relative z-50 w-full bg-ink-surface border-b border-gold/30 text-paper px-3 sm:px-6 py-2 shadow-[0_4px_20px_rgba(212,175,55,0.06)] animate-in fade-in duration-300"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 text-xs font-mono min-w-0">
        
        {/* Left Side: Personalized Grant Badge & Info */}
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <p className="text-paper-muted leading-tight text-[11px] sm:text-xs font-sans whitespace-nowrap shrink-0">
            <span className="sm:hidden">20% OFF</span><span className="hidden sm:inline">20% off your first order.</span>
          </p>
          <button
            type="button"
            onClick={handleApplyOffer}
            className="hidden sm:inline-flex min-w-0 items-center gap-1 px-2 py-0.5 bg-ink border border-dashed border-gold/60 rounded-xs text-gold font-bold text-[11px] tracking-wider hover:bg-gold/15 transition-colors cursor-pointer whitespace-nowrap"
            title="Click to copy & apply voucher"
          >
            <span className="truncate max-w-[120px]">{voucherCode}</span>
            <Copy className="w-3 h-3 opacity-70 shrink-0" />
          </button>

          <LiveEditButton target={{ type: "announcement" }} label="Edit Offer" variant="badge" size="xs" />
        </div>

        {/* Right Side: Live Countdown & Auto-Apply Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Live Urgency Countdown Timer */}
          {timeLeft && (
            <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
              <Clock className="w-3 h-3 text-gold animate-pulse shrink-0" />
              <span className="text-[10px] text-text-muted hidden md:inline">
                ENDS IN:
              </span>
              <span className="text-gold font-bold">
                {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
              </span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            onClick={handleApplyOffer}
            className={`px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 font-sans ${
              copied || isApplied
                ? "bg-gold text-ink font-extrabold"
                : "bg-paper text-ink hover:bg-gold"
            }`}
          >
            {copied || isApplied ? (
              <>
                <Check strokeWidth={2.5} className="w-3 h-3" />
                <span>{copied ? "APPLIED!" : "APPLIED (-20%)"}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-ink" />
                <span className="hidden sm:inline">CLAIM 20% OFF</span><span className="sm:hidden">CLAIM</span>
              </>
            )}
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 text-text-muted hover:text-paper transition-colors cursor-pointer"
            title="Minimize banner"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>

        </div>

      </div>
    </aside>
  );
}
