"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Clock, Copy, Check, ShieldAlert } from "lucide-react";
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
  const [timeLeft, setTimeLeft] = useState<TimeRemaining | null>(() =>
    expiresAt ? calculateTimeRemaining(expiresAt) : null
  );

  // Real-time countdown timer
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

  // If claimed, no expiry, or already expired, do not render banner
  if (!mounted || !currentUser || !hasOffer || !expiresAt || (timeLeft && timeLeft.isExpired)) {
    return null;
  }

  const isApplied = appliedCoupon === voucherCode;

  const handleApplyOffer = () => {
    navigator.clipboard.writeText(voucherCode);
    applyCoupon(voucherCode, 20, true);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      openCart();
    }, 900);
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="relative overflow-hidden rounded-sm border border-gold/45 bg-linear-to-b from-ink-surface via-ink to-ink-surface p-5 sm:p-7 shadow-[0_12px_45px_rgba(212,175,55,0.12)] transition-all animate-in fade-in duration-300 group">
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        
        {/* Left Column: Personalized Grant Info */}
        <div className="space-y-2 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold/15 border border-gold/40 text-gold font-mono text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> FIRST-ORDER OFFER
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight font-sans text-paper">
            Welcome, {firstName.toUpperCase()} <span className="text-gold">— 20% OFF</span>
          </h2>
          <p className="text-xs text-text-muted font-mono">One use only. Valid for 24 hours.</p>
        </div>

        {/* Right Column: Urgency Timer & Ticket Voucher Box */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-4 w-full lg:w-auto shrink-0">
          
          {/* Live Urgency Countdown Dials */}
          <div className="bg-ink/90 border border-gold/30 rounded-xs p-2.5 px-4 flex items-center justify-between sm:justify-center gap-3 font-mono shadow-inner w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-gold uppercase tracking-wider font-bold">
              <Clock className="w-3.5 h-3.5 text-gold animate-pulse shrink-0" />
              <span className="text-[10px] text-text-muted">EXPIRES IN:</span>
            </div>
            
            {timeLeft ? (
              <div className="flex items-center gap-1.5 text-paper font-bold text-sm">
                <div className="flex flex-col items-center">
                  <span className="text-gold font-mono">{pad(timeLeft.hours)}</span>
                  <span className="text-[8px] text-text-muted -mt-0.5">HRS</span>
                </div>
                <span className="text-gold/50 -mt-2">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-gold font-mono">{pad(timeLeft.minutes)}</span>
                  <span className="text-[8px] text-text-muted -mt-0.5">MIN</span>
                </div>
                <span className="text-gold/50 -mt-2">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-gold font-mono">{pad(timeLeft.seconds)}</span>
                  <span className="text-[8px] text-text-muted -mt-0.5">SEC</span>
                </div>
              </div>
            ) : (
              <span className="text-xs text-text-muted">Loading...</span>
            )}
          </div>

          {/* Ticket Voucher Code & Action */}
          <div className="flex items-stretch gap-2 w-full sm:w-auto">
            {/* Voucher Code Box */}
            <div className="flex-1 sm:flex-initial flex items-center justify-center px-3.5 py-2.5 bg-ink border border-dashed border-gold/60 rounded-xs font-mono font-bold text-xs sm:text-sm text-gold tracking-widest select-all">
              {voucherCode}
            </div>

            {/* Copy / Apply Button */}
            <button
              type="button"
              onClick={handleApplyOffer}
              className={`px-4 py-2.5 font-bold text-xs font-mono uppercase tracking-wider rounded-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shrink-0 ${
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
                  <span>CLAIM PRIVILEGE</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Notice */}
          <div className="flex items-center gap-1 text-[9px] font-mono text-text-muted/80 justify-center lg:justify-end">
            <ShieldAlert className="w-2.5 h-2.5 text-gold/70" />
            <span>Valid for 24 hours from account activation • One-time use</span>
          </div>

        </div>

      </div>
    </div>
  );
}
