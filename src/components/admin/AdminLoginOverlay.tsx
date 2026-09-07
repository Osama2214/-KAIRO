"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Lock,
  ArrowLeft,
  KeyRound,
  Mail,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { useAuthStore } from "@/store/useAuthStore";
import { verifyAdminPinWithServer } from "@/lib/security";

export function AdminLoginOverlay() {
  const { currentUser, login, logout, loginDemo, isLoading } = useAuthStore();
  const loginAdmin = useStorefrontStore((state) => state.loginAdmin);
  const loginAdminWithToken = useStorefrontStore((state) => state.loginAdminWithToken);
  const isAuthorizedAdmin = useStorefrontStore((state) => state.isAuthorizedAdmin);

  const isCurrentAuthorized = currentUser ? isAuthorizedAdmin(currentUser.email) : false;

  // Step state: "account" (Step 1) or "pin" (Step 2)
  const [userSelectedStep, setUserSelectedStep] = useState<"account" | "pin" | null>(null);
  const step = userSelectedStep ?? (currentUser && isCurrentAuthorized ? "pin" : "account");
  const setStep = (s: "account" | "pin") => setUserSelectedStep(s);

  // Account form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);

  // PIN form fields
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);

  // Countdown timer for brute-force lockout
  useEffect(() => {
    if (lockoutSeconds === null || lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (!prev || prev <= 1) return null;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Handle Account Login (Step 1)
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setAccountError("Please enter your administrator email.");
      return;
    }
    if (!password) {
      setAccountError("Please enter your account password.");
      return;
    }

    // Pre-check if email is even on the authorized admin list
    if (!isAuthorizedAdmin(cleanEmail)) {
      setAccountError(
        `Access Denied: The account "${cleanEmail}" does not possess administrator privileges. Only authorized curator accounts can access this console.`
      );
      return;
    }

    setIsSubmittingAccount(true);
    setAccountError("");

    const res = await login(cleanEmail, password);
    setIsSubmittingAccount(false);

    if (res.success) {
      setAccountError("");
      setStep("pin");
    } else {
      setAccountError(res.message || "Invalid account credentials. Please verify your email and password.");
    }
  };

  // Quick fill demo curator credentials
  const handleUseDemo = () => {
    loginDemo();
    setStep("pin");
  };

  // Handle PIN Login (Step 2)
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isAuthorizedAdmin(currentUser.email)) {
      setPinError("Unauthorized account. Please sign in with an authorized curator account.");
      setStep("account");
      return;
    }

    if (lockoutSeconds && lockoutSeconds > 0) {
      setPinError(`Security lockout in effect. Please wait ${lockoutSeconds}s.`);
      return;
    }

    if (!pin.trim()) {
      setPinError("Please enter your Master Security PIN.");
      return;
    }

    setIsSubmittingPin(true);
    setPinError("");

    try {
      const res = await verifyAdminPinWithServer(currentUser.email, pin.trim());
      setIsSubmittingPin(false);

      if (res.locked) {
        setLockoutSeconds(res.remainingSec || 900);
        setPinError(res.message || "Too many failed attempts. Console locked for 15 minutes.");
        return;
      }

      if (!res.success) {
        setPinError(res.message || "Invalid Security PIN. Access denied.");
        return;
      }

      // PIN verified successfully!
      if (res.token) {
        loginAdminWithToken(res.token, res.pinHash);
      }
      loginAdmin(pin.trim(), currentUser.email);
    } catch {
      setIsSubmittingPin(false);
      setPinError("Connection error while validating Security PIN.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-ink flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-vermilion selection:text-white">
      {/* Subtle Japanese Watermark Accents */}
      <div className="absolute inset-0 bg-japanese-pattern opacity-40 pointer-events-none" />
      <div className="absolute top-1/3 w-[500px] h-[500px] rounded-full bg-gold/5 blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-ink-surface/95 border border-ink-border/80 backdrop-blur-xl p-8 rounded-sm shadow-2xl shadow-black/80">
        {/* Header Crest */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mb-4 text-gold shadow-lg shadow-gold/10">
            {step === "account" ? (
              <User strokeWidth={1.5} className="w-6 h-6" />
            ) : (
              <ShieldCheck strokeWidth={1.5} className="w-6 h-6" />
            )}
          </div>
          <span className="font-serif text-gold text-sm tracking-widest block mb-1">回路 • 管理コンソール</span>
          <h1 className="font-cinzel text-2xl font-bold text-paper tracking-wider">KAIRO ADMIN</h1>
        </div>

        {/* STEP 1: ACCOUNT LOGIN / VERIFICATION */}
        {step === "account" && (
          <div>
            {currentUser ? (
              isCurrentAuthorized ? (
                /* Already Logged In Authorized Admin Account Card */
                <div className="space-y-4">
                  <div className="p-4 bg-ink/70 border border-gold/30 rounded-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gold tracking-wider uppercase font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gold" />
                        Authorized Curator Account
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 bg-gold/10 border border-gold/30 text-gold rounded-xs uppercase">
                        Admin
                      </span>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <div className="w-10 h-10 rounded-full bg-gold/20 border border-gold/40 text-gold font-bold font-mono flex items-center justify-center text-sm">
                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "A"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-paper truncate">{currentUser.name}</div>
                        <div className="text-xs font-mono text-text-muted truncate">{currentUser.email}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep("pin")}
                    className="w-full py-3 bg-gold hover:bg-gold-muted text-ink font-mono text-xs font-bold uppercase tracking-widest rounded-sm transition-all duration-200 cursor-pointer shadow-lg shadow-gold/15 active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Security PIN</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setEmail("");
                      setPassword("");
                    }}
                    className="w-full py-2 bg-ink hover:bg-ink-elevated text-text-muted hover:text-paper border border-ink-border font-mono text-[11px] uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                  >
                    Switch Account / Sign In with Another
                  </button>
                </div>
              ) : (
                /* Logged In but Unauthorized Customer Account */
                <div className="space-y-4">
                  <div className="p-4 bg-vermilion/10 border border-vermilion/40 rounded-sm space-y-3 text-center">
                    <div className="w-10 h-10 mx-auto rounded-full bg-vermilion/20 text-vermilion flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-mono text-xs font-bold text-vermilion uppercase tracking-wider">
                        ACCESS RESTRICTED // NON-ADMIN ACCOUNT
                      </h3>
                      <p className="text-xs text-paper-muted">
                        Logged in as <strong className="text-paper">{currentUser.email}</strong>.
                      </p>
                      <p className="text-[11px] font-mono text-text-muted">
                        This account does not have administrator privileges. Even with a PIN code, only designated administrative accounts can access the KAIRO console.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setEmail("");
                      setPassword("");
                    }}
                    className="w-full py-3 bg-vermilion hover:bg-vermilion/90 text-white font-mono text-xs font-bold uppercase tracking-widest rounded-sm transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <span>Sign In with Authorized Admin Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )
            ) : (
              /* Email & Password Login Form */
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-text-muted mb-1.5 tracking-wider uppercase">
                    Admin / Curator Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gold/60 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setAccountError("");
                      }}
                      placeholder="curator@kairo.archive"
                      required
                      className="w-full bg-ink border border-ink-border focus:border-gold pl-10 pr-3 py-2.5 text-xs font-mono text-paper rounded-sm outline-none transition-colors"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-text-muted mb-1.5 tracking-wider uppercase">
                    Account Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gold/60 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setAccountError("");
                      }}
                      placeholder="••••••••"
                      required
                      className="w-full bg-ink border border-ink-border focus:border-gold pl-10 pr-10 py-2.5 text-xs font-mono text-paper rounded-sm outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-paper transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {accountError && (
                  <div className="p-2.5 bg-vermilion/10 border border-vermilion/30 rounded-sm flex items-start gap-2 text-xs font-mono text-vermilion">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{accountError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingAccount || isLoading}
                  className="w-full py-3 bg-gold hover:bg-gold-muted disabled:opacity-50 text-ink font-mono text-xs font-bold uppercase tracking-widest rounded-sm transition-all duration-200 cursor-pointer shadow-lg shadow-gold/15 active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {isSubmittingAccount ? (
                    <span>Verifying Account...</span>
                  ) : (
                    <>
                      <span>Sign In & Proceed to PIN</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-2 border-t border-ink-border/40">
                  <button
                    type="button"
                    onClick={handleUseDemo}
                    className="w-full py-2 bg-ink hover:bg-gold/10 hover:border-gold/50 text-gold border border-gold/30 font-mono text-[11px] font-semibold uppercase tracking-wider rounded-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Use Demo Curator Account</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* STEP 2: SECURITY PIN VERIFICATION */}
        {step === "pin" && (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            {/* Authenticated User Badge */}
            {currentUser && (
              <div className="p-3 bg-ink/70 border border-ink-border rounded-sm flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gold/20 text-gold font-bold font-mono text-xs flex items-center justify-center shrink-0">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "A"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-paper truncate">{currentUser.name}</div>
                    <div className="text-[10px] font-mono text-text-muted truncate">{currentUser.email}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep("account")}
                  className="text-[10px] font-mono text-gold hover:underline uppercase shrink-0 ml-2 cursor-pointer"
                >
                  Switch
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-text-muted mb-2 tracking-wider uppercase">
                Enter Master Curator PIN
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gold/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setPinError("");
                  }}
                  placeholder="••••"
                  className="w-full bg-ink border border-ink-border focus:border-gold px-10 py-3 text-center text-lg font-mono tracking-[0.4em] text-paper rounded-sm outline-none transition-colors"
                  autoFocus
                />
              </div>
              {pinError && (
                <p className="text-xs font-mono text-vermilion mt-2 text-center animate-shake">
                  {pinError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmittingPin || (lockoutSeconds !== null && lockoutSeconds > 0)}
              className="w-full py-3 bg-gold hover:bg-gold-muted disabled:opacity-50 disabled:cursor-not-allowed text-ink font-mono text-xs font-bold uppercase tracking-widest rounded-sm transition-all duration-200 cursor-pointer shadow-lg shadow-gold/15 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isSubmittingPin
                  ? "Authenticating Security PIN..."
                  : lockoutSeconds && lockoutSeconds > 0
                  ? `Locked (${lockoutSeconds}s)`
                  : "Unlock Admin Dashboard"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStep("account")}
              className="w-full py-2 bg-ink hover:bg-ink-elevated text-text-muted hover:text-paper border border-ink-border font-mono text-[11px] uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
            >
              Back to Account Step
            </button>
          </form>
        )}

        {/* Back Link & Hint */}
        <div className="mt-8 pt-6 border-t border-ink-border/50 flex items-center justify-between text-xs font-mono text-text-muted">
          <Link
            href="/"
            className="flex items-center gap-1.5 hover:text-paper transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Storefront</span>
          </Link>
          <span className="text-[10px] text-text-muted/40 font-mono tracking-wider uppercase">
            KAIRO ARCHIVE SECURITY
          </span>
        </div>
      </div>
    </div>
  );
}
