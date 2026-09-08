"use client";

import React, { useState } from "react";
import { KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { verifyAdminPinWithServer } from "@/lib/security";

export function AdminLoginOverlay() {
  const loginAdmin = useStorefrontStore((state) => state.loginAdmin);

  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setPinError("يرجى إدخال كود الـ PIN السري");
      return;
    }

    setIsSubmittingPin(true);
    setPinError("");

    try {
      // Direct verification via server API with authorized admin identity
      const res = await verifyAdminPinWithServer("admin@kairo.archive", pin.trim());
      setIsSubmittingPin(false);

      if (res.locked) {
        setPinError(res.message || "تم قفل لوحة التحكم مؤقتاً بسبب المحاولات الخاطئة.");
        return;
      }

      if (!res.success) {
        setPinError(res.message || "كود الـ PIN غير صحيح، تأكد من الكود وحاول مجدداً.");
        return;
      }

      // Success! Sign in directly to console
      loginAdmin(pin.trim(), "admin@kairo.archive");
    } catch {
      setIsSubmittingPin(false);
      setPinError("حدث خطأ أثناء الاتصال بالسيرفر للتحقق من الـ PIN.");
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
            KAIRO ARCHIVE CONSOLE
          </span>
          <h1 className="text-xl font-bold font-sans text-paper uppercase tracking-wider">
            لوحة تحكم الإدارة
          </h1>
          <p className="text-xs text-text-muted mt-1.5 font-mono">
            أدخل كود الـ PIN الرئيسي للدخول المباشر
          </p>
        </div>

        {/* PIN ONLY FORM */}
        <form onSubmit={handlePinSubmit} className="space-y-5">
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
                placeholder="أدخل كود الـ PIN هنا..."
                className="w-full bg-ink border border-ink-border focus:border-gold px-10 py-3.5 text-center text-lg font-mono tracking-[0.3em] text-paper rounded-sm outline-none transition-colors"
                autoFocus
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
            <span>{isSubmittingPin ? "جاري التحقق من السيرفر..." : "دخول لوحة التحكم (Access Console)"}</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-ink-border/50 text-center">
          <span className="text-[10px] font-mono text-text-muted tracking-wider uppercase flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3 text-gold" />
            <span>محمي بنظام التشفير المركزي — Neon DB</span>
          </span>
        </div>
      </div>
    </div>
  );
}
