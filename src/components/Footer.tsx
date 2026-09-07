"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Truck, RefreshCw, Copyright } from "lucide-react";
import { PolicyModal, PolicyTab } from "./PolicyModal";

import { useAuthStore } from "@/store/useAuthStore";
import { useMounted } from "@/store/useWishlistStore";

export function Footer() {
  const pathname = usePathname();
  const [policyOpen, setPolicyOpen] = useState(false);
  const [activePolicyTab, setActivePolicyTab] = useState<PolicyTab>("shipping");
  const currentUser = useAuthStore((state) => state.currentUser);
  const mounted = useMounted();

  const openPolicy = (tab: PolicyTab) => {
    setActivePolicyTab(tab);
    setPolicyOpen(true);
  };

  // Completely hide footer on login / unauthenticated patron authentication portal
  const isAccountRoute = pathname === "/account" || pathname?.startsWith("/account");
  const isLoginPage = pathname === "/login" || (isAccountRoute && !currentUser);

  if (mounted && isLoginPage) {
    return null;
  }
  if (!mounted && (pathname === "/login" || pathname === "/account")) {
    return null;
  }

  return (
    <footer className="bg-ink border-t border-ink-border/80 pt-20 pb-12 text-text-muted relative overflow-hidden">
      {/* Background Japanese Watermark */}
      <div className="absolute -bottom-10 right-4 font-serif text-[180px] font-bold text-white/[0.015] pointer-events-none select-none">
        回路
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10">
        {/* Value Props Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 border-b border-ink-border/60">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-ink-surface border border-ink-border rounded-sm text-gold shrink-0">
              <Truck strokeWidth={1.4} className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-widest text-paper uppercase">
                EGYPT-WIDE EXPRESS DISPATCH
              </h4>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Central archive hub in 6th of October City. Direct delivery to all Egyptian governorates with protective reinforced slip-sleeves.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-ink-surface border border-ink-border rounded-sm text-gold shrink-0">
              <ShieldCheck strokeWidth={1.4} className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-widest text-paper uppercase">
                AUTHENTIC JAPANESE EDITIONS
              </h4>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                100% licensed Tankōbon, Kanzenban, and oversized collector hardcovers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-ink-surface border border-ink-border rounded-sm text-gold shrink-0">
              <RefreshCw strokeWidth={1.4} className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-widest text-paper uppercase">
                COLLECTOR REPLACEMENT GUARANTEE
              </h4>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Corner protection assurance. We replace any volume damaged during transit.
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 py-16">
          {/* Brand Info */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-vermilion rounded-sm flex items-center justify-center text-paper font-serif font-bold text-xs">
                回路
              </div>
              <span className="font-extrabold tracking-[0.25em] text-lg text-paper uppercase">
                KAIRO
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed max-w-sm">
              An editorial archive celebrating sequential art, Japanese literary epics, and tactile physical printing craftsmanship.
            </p>
            <div className="pt-2 flex items-center gap-3 font-mono text-[11px] text-paper-muted">
              <span>6TH OF OCTOBER</span>
              <span>•</span>
              <span>CAIRO</span>
              <span>•</span>
              <span>ALEXANDRIA</span>
              <span>•</span>
              <span>ALL EGYPT</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h5 className="text-[11px] font-mono tracking-[0.2em] uppercase text-paper font-semibold mb-4">
              ARCHIVE
            </h5>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/manga" className="hover:text-paper transition-colors">
                  All Volumes
                </Link>
              </li>
              <li>
                <Link href="/manga?format=Deluxe+Edition" className="hover:text-paper transition-colors">
                  Deluxe Hardcovers
                </Link>
              </li>
              <li>
                <Link href="/manga?format=Box+Set" className="hover:text-paper transition-colors">
                  Collector Box Sets
                </Link>
              </li>
              <li>
                <Link href="/#genres" className="hover:text-paper transition-colors">
                  Explore by Genre
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-[11px] font-mono tracking-[0.2em] uppercase text-paper font-semibold mb-4">
              SERIES
            </h5>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/series/jujutsu-kaisen" className="hover:text-paper transition-colors">
                  Jujutsu Kaisen
                </Link>
              </li>
              <li>
                <Link href="/series/one-piece" className="hover:text-paper transition-colors">
                  One Piece
                </Link>
              </li>
              <li>
                <Link href="/series/berserk" className="hover:text-paper transition-colors">
                  Berserk (Deluxe)
                </Link>
              </li>
              <li>
                <Link href="/series/chainsaw-man" className="hover:text-paper transition-colors">
                  Chainsaw Man
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-[11px] font-mono tracking-[0.2em] uppercase text-paper font-semibold mb-4">
              CUSTOMER CARE
            </h5>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/account?tab=ORDERS" className="hover:text-gold transition-colors block">
                  Order Tracking
                </Link>
              </li>
              <li>
                <Link href="/account?tab=LIBRARY" className="hover:text-gold transition-colors block">
                  Digital Library
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openPolicy("shipping")}
                  className="hover:text-gold transition-colors text-left text-text-muted cursor-pointer block"
                >
                  Shipping Policies
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openPolicy("authenticity")}
                  className="hover:text-gold transition-colors text-left text-text-muted cursor-pointer block"
                >
                  Authenticity Certificate
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Sub-bar */}
        <div className="pt-8 border-t border-ink-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono">
          <div className="flex items-center gap-2 text-[11px] font-mono tracking-wider text-text-muted">
            <Copyright strokeWidth={1.6} className="w-3.5 h-3.5 text-gold shrink-0" />
            <span>{new Date().getFullYear()}</span>
            <span className="text-paper font-semibold">KAIRO PUBLISHING ARCHIVE.</span>
            <span className="text-text-muted/75">ALL RIGHTS RESERVED.</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-gold font-serif">精神と物質の回路</span>
            <button
              type="button"
              onClick={() => openPolicy("privacy")}
              className="text-text-muted hover:text-gold transition-colors cursor-pointer uppercase tracking-wider text-[11px] font-mono"
            >
              PRIVACY PROTOCOL
            </button>
            <button
              type="button"
              onClick={() => openPolicy("terms")}
              className="text-text-muted hover:text-gold transition-colors cursor-pointer uppercase tracking-wider text-[11px] font-mono"
            >
              TERMS OF SALE
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Policy & Customer Care Modal */}
      <PolicyModal
        isOpen={policyOpen}
        onClose={() => setPolicyOpen(false)}
        activeTab={activePolicyTab}
        onTabChange={setActivePolicyTab}
      />
    </footer>
  );
}
