"use client";

import React, { useState, useEffect } from "react";
import { Clock, Copy, Check } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useUIStore } from "@/store/useUIStore";

import { useWelcomeOffer } from "@/hooks/useWelcomeOffer";

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

export function WelcomeOfferBanner() {
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const appliedCoupon = useCartStore((state) => state.appliedCoupon);
  const openCart = useUIStore((state) => state.openCart);

  const { mounted, currentUser, hasOffer, voucherCode, expiresAt, firstName } = useWelcomeOffer();

  const [copied, setCopied] = useState(false);
  // Re-render once a second; the remaining time itself is derived below so it
  // is never stale on the first paint.
  const [, tick] = useState(0);

  // Real-time countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      tick((value) => value + 1);
      if (calculateTimeRemaining(expiresAt).isExpired) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const timeLeft: TimeRemaining | null = expiresAt ? calculateTimeRemaining(expiresAt) : null;

  // If claimed, no expiry, or already expired, do not render banner
  if (!mounted || !currentUser || !hasOffer || !expiresAt || !timeLeft || timeLeft.isExpired) {
    return null;
  }

  const isApplied = appliedCoupon === voucherCode;

  const handleApplyOffer = () => {
    navigator.clipboard.writeText(voucherCode);
    void applyCoupon(voucherCode);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      openCart();
    }, 900);
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="relative overflow-hidden rounded-sm border border-gold/35 bg-ink-surface/80 p-4 sm:p-5 shadow-[0_8px_28px_rgba(212,175,55,0.08)] animate-in fade-in duration-300">
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
        
        {/* Left Column: Personalized Grant Info */}
        <div className="space-y-1 max-w-xl">
          <h2 className="text-lg sm:text-xl font-extrabold uppercase tracking-tight font-sans text-paper">
            Welcome, {firstName.toUpperCase()} <span className="text-gold">— 20% OFF</span>
          </h2>
          <p className="text-[11px] text-text-muted font-mono">First order only · valid for 24 hours.</p>
        </div>

        {/* Right Column: Urgency Timer & Ticket Voucher Box */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto shrink-0">
          
          {/* Live Urgency Countdown */}
          <div className="bg-ink/70 border border-gold/25 rounded-xs px-3 py-2 flex items-center gap-2 font-mono shrink-0">
            <div className="flex items-center gap-1 text-xs text-gold uppercase tracking-wider font-bold">
              <Clock className="w-3.5 h-3.5 text-gold shrink-0" />
              <span className="text-[10px] text-text-muted">ENDS:</span>
            </div>
            
            {timeLeft ? (
              <div className="text-gold font-bold text-xs sm:text-sm tabular-nums">
                {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
              </div>
            ) : (
              <span className="text-xs text-text-muted">Loading...</span>
            )}
          </div>

          {/* Ticket Voucher Code & Action */}
          <div className="flex items-stretch gap-2 min-w-0 flex-1 sm:flex-initial">
            {/* Voucher Code Box */}
            <div className="min-w-0 flex-1 sm:flex-initial flex items-center justify-center px-3 py-2 bg-ink border border-dashed border-gold/50 rounded-xs font-mono font-bold text-xs text-gold tracking-wider select-all whitespace-nowrap">
              {voucherCode}
            </div>

            {/* Copy / Apply Button */}
            <button
              type="button"
              onClick={handleApplyOffer}
              className={`px-3 sm:px-4 py-2 font-bold text-[11px] font-mono uppercase tracking-wider rounded-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shrink-0 ${
                copied || isApplied
                  ? "bg-gold text-ink font-extrabold"
                  : "bg-paper text-ink hover:bg-gold"
              }`}
            >
              {copied || isApplied ? (
                <>
                  <Check strokeWidth={2.5} className="w-3.5 h-3.5" />
                  <span>{copied ? "COPIED & APPLIED!" : "APPLIED TO CART"}</span>
                </>
              ) : (
                <>
                  <Copy strokeWidth={1.8} className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">CLAIM PRIVILEGE</span><span className="sm:hidden">CLAIM</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
