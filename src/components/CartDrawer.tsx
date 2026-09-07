"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { X, Plus, Minus, Trash2, ArrowRight, ShieldCheck, Truck, Sparkles, Tag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useUIStore } from "@/store/useUIStore";
import { useMounted } from "@/store/useWishlistStore";
import { formatPrice } from "@/lib/utils";
import { useWelcomeOffer } from "@/hooks/useWelcomeOffer";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";

export function CartDrawer() {
  const mounted = useMounted();
  const { isCartOpen, closeCart } = useUIStore();
  useModalScrollLock(isCartOpen);
  const {
    items: cartItems,
    removeItem,
    updateQuantity,
    getSubtotal,
    getTotalItems,
    appliedCoupon,
    discountPercent,
    freeShippingGranted,
    applyCoupon,
    removeCoupon,
    getDiscountAmount,
    getGrandTotal,
  } = useCartStore();
  const { hasOffer: hasWelcomeOffer, voucherCode: welcomeCode } = useWelcomeOffer();

  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");

  const items = mounted ? cartItems : [];
  const subtotal = mounted ? getSubtotal() : 0;
  const discountAmount = mounted ? getDiscountAmount() : 0;
  const grandTotal = mounted ? getGrandTotal(0) : 0;
  const totalCount = mounted ? getTotalItems() : 0;
  const freeShippingThreshold = 500.0;
  const isFreeShipping = freeShippingGranted || subtotal >= freeShippingThreshold;
  const progressToFreeShipping = isFreeShipping ? 100 : Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const remainingForFreeShipping = isFreeShipping ? 0 : Math.max(0, freeShippingThreshold - subtotal);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCartOpen) {
        closeCart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCartOpen, closeCart]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-lenis-prevent
      className={`fixed inset-0 z-50 overflow-hidden overscroll-contain transition-all duration-500 ${
        isCartOpen ? "visible pointer-events-auto" : "invisible pointer-events-none"
      }`}
    >
      {/* Backdrop with smooth fade in/out */}
      <div
        onClick={closeCart}
        className={`absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-500 ease-out ${
          isCartOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Drawer Panel with cubic-bezier silky slide in/out */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          data-lenis-prevent
          className={`w-screen max-w-md bg-ink border-l border-ink-border flex flex-col shadow-2xl overscroll-contain transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isCartOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-ink-border flex items-center justify-between bg-ink-surface/50">
            <div className="flex items-center gap-2.5">
              <h2 className="font-extrabold tracking-[0.2em] text-sm uppercase text-paper">
                YOUR CART
              </h2>
              <span className="text-xs font-mono text-text-muted px-2 py-0.5 rounded bg-ink-surface border border-ink-border">
                {totalCount} {totalCount === 1 ? "VOL" : "VOLS"}
              </span>
            </div>
            <button
              onClick={closeCart}
              className="p-1.5 text-text-muted hover:text-paper rounded-sm hover:bg-ink-surface transition-colors cursor-pointer"
              aria-label="Close cart"
            >
              <X strokeWidth={1.4} className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress bar */}
          <div className="px-6 py-3 bg-ink-surface/30 border-b border-ink-border text-xs">
            <div className="flex items-center justify-between mb-1.5 font-mono text-[11px]">
              <span className="flex items-center gap-1.5 text-paper-muted">
                <Truck strokeWidth={1.4} className="w-3.5 h-3.5 text-gold" />
                {remainingForFreeShipping > 0
                  ? `Add ${formatPrice(remainingForFreeShipping)} for Free Shipping`
                  : "Unlocked Free Express Shipping!"}
              </span>
              <span className="text-gold font-semibold">{Math.round(progressToFreeShipping)}%</span>
            </div>
            <div className="w-full h-1 bg-ink-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gold transition-all duration-500 ease-out"
                style={{ width: `${progressToFreeShipping}%` }}
              />
            </div>
          </div>

          {/* Cart Item List */}
          <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-full border border-ink-border flex items-center justify-center text-text-muted">
                  <span className="font-serif text-2xl">空</span>
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-wider text-paper uppercase">
                    Your collection is empty
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Discover legendary manga volumes and light novels.
                  </p>
                </div>
                <button
                  onClick={closeCart}
                  className="mt-4 px-6 py-2.5 bg-paper text-ink font-semibold text-xs tracking-[0.16em] uppercase hover:bg-vermilion hover:text-white transition-colors cursor-pointer"
                >
                  EXPLORE ARCHIVE
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3 rounded-sm bg-ink-surface/40 border border-ink-border/70 hover:border-ink-border transition-colors group"
                >
                  {/* Thumbnail */}
                  <div className="relative w-18 h-26 shrink-0 overflow-hidden bg-ink-surface rounded-sm border border-ink-border/50">
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono tracking-widest text-gold uppercase block">
                        {item.seriesTitle}
                      </span>
                      <h4 className="text-xs font-bold text-paper tracking-wide line-clamp-1 mt-0.5">
                        Vol. {item.volumeNumber} — {item.title}
                      </h4>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] font-mono text-text-muted block">
                          {item.format}
                        </span>
                        {typeof item.maxStock === "number" && item.quantity >= item.maxStock && (
                          <span className="text-[9px] font-mono text-vermilion font-semibold">
                            MAX ({item.maxStock})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-ink-border/50">
                      {/* Quantity Selector */}
                      <div className="flex items-center border border-ink-border rounded-sm bg-ink">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 text-text-muted hover:text-paper hover:bg-ink-surface transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus strokeWidth={1.4} className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-mono font-medium text-paper">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={typeof item.maxStock === "number" && item.quantity >= item.maxStock}
                          className={`p-1 transition-colors ${
                            typeof item.maxStock === "number" && item.quantity >= item.maxStock
                              ? "text-text-muted/30 cursor-not-allowed"
                              : "text-text-muted hover:text-paper hover:bg-ink-surface cursor-pointer"
                          }`}
                          aria-label="Increase quantity"
                          title={typeof item.maxStock === "number" && item.quantity >= item.maxStock ? `Max available stock: ${item.maxStock}` : undefined}
                        >
                          <Plus strokeWidth={1.4} className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Price & Remove */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-paper">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-text-muted hover:text-vermilion transition-colors p-1 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 strokeWidth={1.3} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Action */}
          {items.length > 0 && (
            <div className="p-6 border-t border-ink-border bg-ink-surface/40 space-y-4">
              
              {/* Welcome Grant Quick-Apply Callout (if active and not applied) */}
              {hasWelcomeOffer && appliedCoupon !== welcomeCode && (
                <div className="p-2.5 bg-gold/10 border border-gold/30 rounded-xs flex items-center justify-between gap-2 text-xs font-mono animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-gold min-w-0">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">First Order Grant: <strong className="text-paper">{welcomeCode}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyCoupon(welcomeCode, 20, true)}
                    className="px-2.5 py-1 bg-gold text-ink font-bold text-[10px] rounded-xs uppercase tracking-wider hover:bg-paper transition-colors shrink-0 cursor-pointer shadow-xs"
                  >
                    APPLY 20%
                  </button>
                </div>
              )}

              {/* Active Voucher Tag or Voucher Code Input */}
              {appliedCoupon ? (
                <div className="p-2 bg-ink border border-gold/40 rounded-xs flex items-center justify-between text-xs font-mono text-gold">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    <span className="font-bold tracking-wider">{appliedCoupon}</span>
                    <span className="text-[10px] text-text-muted">(-{discountPercent}% & Free Delivery)</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-text-muted hover:text-vermilion transition-colors p-1 cursor-pointer"
                    title="Remove voucher"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-stretch gap-1.5 font-mono text-xs">
                    <input
                      type="text"
                      placeholder="VOUCHER / PROMO CODE"
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value);
                        if (promoError) setPromoError("");
                      }}
                      className="flex-1 bg-ink border border-ink-border px-3 py-1.5 text-xs text-paper uppercase placeholder:text-text-muted/40 focus:border-gold outline-none rounded-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!promoInput.trim()) return;
                        const res = applyCoupon(promoInput, 20, true);
                        if (res.success) {
                          setPromoSuccess(res.message);
                          setPromoInput("");
                          setTimeout(() => setPromoSuccess(""), 3000);
                        } else {
                          setPromoError(res.message);
                        }
                      }}
                      className="px-3 py-1.5 bg-ink-surface hover:bg-gold hover:text-ink text-gold border border-gold/40 font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                    >
                      APPLY
                    </button>
                  </div>
                  {promoError && (
                    <p className="text-[10px] text-vermilion font-mono">{promoError}</p>
                  )}
                  {promoSuccess && (
                    <p className="text-[10px] text-gold font-mono">{promoSuccess}</p>
                  )}
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-text-muted">
                  <span>SUBTOTAL</span>
                  <span className="text-paper font-semibold">{formatPrice(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-gold">
                    <span>PATRON PRIVILEGE (-{discountPercent}%)</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-text-muted">
                  <span>SHIPPING</span>
                  <span>
                    {freeShippingGranted ? (
                      <span className="text-gold font-semibold">FREE (PATRON GRANT)</span>
                    ) : remainingForFreeShipping === 0 ? (
                      <span className="text-gold font-semibold">FREE</span>
                    ) : (
                      "Calculated at checkout"
                    )}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="pt-3 border-t border-ink-border flex justify-between items-baseline font-mono">
                <span className="text-xs tracking-wider text-paper font-bold uppercase">
                  ESTIMATED TOTAL
                </span>
                <span className="text-lg font-bold text-gold">{formatPrice(grandTotal)}</span>
              </div>

              <Link
                href="/checkout"
                onClick={closeCart}
                className="w-full py-3.5 px-6 bg-paper text-ink font-extrabold text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-2 hover:bg-vermilion hover:text-white transition-all duration-300 shadow-lg group"
              >
                PROCEED TO CHECKOUT
                <ArrowRight strokeWidth={1.5} className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <div className="flex items-center justify-center gap-2 text-[10px] text-text-muted font-mono">
                <ShieldCheck strokeWidth={1.2} className="w-3.5 h-3.5 text-gold" />
                <span>Encrypted 256-Bit Editorial Checkout</span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
