"use client";

import React, { useState } from "react";
import Link from "next/link";
import { KeyRound, ShieldCheck, ArrowLeft, Mail } from "lucide-react";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { useAuthStore } from "@/store/useAuthStore";
import { verifyAdminPinWithServer } from "@/lib/security";

export function AdminLoginOverlay() {
  const loginAdmin = useStorefrontStore((state) => state.loginAdmin);
  const currentUserEmail = useAuthStore((state) => state.currentUser?.email || "");

  /**
   * The console used to sign in as one hard-coded address no matter who was at
   * the keyboard, so every other curator on the allow-list was locked out and
   * they all shared one lockout counter. The signed-in patron's address is
   * pre-filled, and can be overridden for a curator using someone else's
   * browser.
   */
  const [email, setEmail] = useState(currentUserEmail);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setPinError("Enter the curator email for this console.");
      return;
    }
    if (!pin.trim()) {
      setPinError("PIN is required.");
      return;
    }

    setIsSubmittingPin(true);
    setPinError("");

    try {
      const res = await verifyAdminPinWithServer(email.trim().toLowerCase(), pin.trim());
      setIsSubmittingPin(false);

      if (res.locked) {
        setPinError(res.message || "Console locked due to too many failed attempts.");
        return;
      }

      if (!res.success) {
        setPinError(res.message || "Incorrect PIN. Please try again.");
        return;
      }

      loginAdmin(pin.trim(), email.trim().toLowerCase());
    } catch {
      setIsSubmittingPin(false);
      setPinError("Server error while verifying PIN. Please try again.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-ink flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-vermilion selection:text-white">
      <div className="absolute inset-0 bg-japanese-pattern opacity-40 pointer-events-none" />
      <div className="absolute top-1/3 w-[500px] h-[500px] rounded-full bg-gold/5 blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-ink-surface/95 border border-ink-border/80 backdrop-blur-xl p-8 rounded-sm shadow-2xl shadow-black/80">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mb-4 text-gold shadow-lg shadow-gold/10">
            <KeyRound className="w-7 h-7 text-gold" />
          </div>
          <span className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase block mb-1">
            ANIMEVERSE ARCHIVE CONSOLE
          </span>
          <h1 className="text-xl font-bold font-sans text-paper uppercase tracking-wider">
            Curator Access
          </h1>
          <p className="text-xs text-text-muted mt-1.5 font-mono">
            Enter your curator email and master PIN
          </p>
        </div>

        {/* PIN Form */}
        <form onSubmit={handlePinSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="w-4 h-4 text-gold/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setPinError("");
              }}
              placeholder="curator@email.com"
              className="w-full bg-ink border border-ink-border focus:border-gold pl-10 pr-3 py-3 text-sm font-mono text-paper rounded-sm outline-none transition-colors"
            />
          </div>

          <div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-gold/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                maxLength={64}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setPinError("");
                }}
                autoComplete="current-password"
                placeholder="Enter PIN..."
                className="w-full bg-ink border border-ink-border focus:border-gold px-10 py-3.5 text-center text-lg font-mono tracking-[0.3em] text-paper rounded-sm outline-none transition-colors"
                autoFocus={Boolean(currentUserEmail)}
              />
            </div>
            {pinError && (
              <p className="text-xs font-mono text-vermilion mt-2.5 text-center font-semibold animate-shake">
                {pinError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmittingPin}
            className="w-full py-3.5 bg-gold hover:bg-gold-muted disabled:opacity-50 text-ink font-mono text-xs font-bold uppercase tracking-widest rounded-sm transition-all duration-200 cursor-pointer shadow-lg shadow-gold/15 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isSubmittingPin ? "Verifying..." : "Access Console"}</span>
          </button>
        </form>

        {/* Way out: the console is a dead end without the PIN. */}
        <Link
          href="/account"
          className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 text-[11px] font-mono uppercase tracking-widest text-text-muted hover:text-gold border border-ink-border/70 hover:border-gold/40 rounded-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Account</span>
        </Link>
      </div>
    </div>
  );
}
