"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package,
  BookOpen,
  Heart,
  Settings,
  CheckCircle2,
  Truck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  Trash2,
  ShoppingBag,
  FileText,
  Copy,
  ShieldCheck,
  Printer,
  X,
  Check,
  Star,
  LogOut,
  Mail,
  UserPlus,
  LogIn,
  KeyRound,
  ArrowLeft,
  SlidersHorizontal,
  Clock,
  Banknote,
  Smartphone,
  Zap,
  Lock,
} from "lucide-react";
import { ALL_VOLUMES, MangaVolume } from "@/data/manga";
import { useCartStore } from "@/store/useCartStore";
import { useWishlistStore, useMounted } from "@/store/useWishlistStore";
import { useUIStore } from "@/store/useUIStore";
import { useAuthStore, SavedOrder, SavedOrderItem } from "@/store/useAuthStore";
import { useReaderStore } from "@/store/useReaderStore";
import { formatPrice } from "@/lib/utils";
import { escapeHtml, validateEmail, validatePassword, verifyEmailAddress, sendOtpEmail, verifyOtpCode } from "@/lib/security";
import { CustomSelect } from "@/components/CustomSelect";
import { WelcomeOfferBanner } from "@/components/WelcomeOfferBanner";

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

interface GoogleTokenClient {
  requestAccessToken: () => void;
}

interface GoogleOAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    prompt?: string;
    callback: (response: GoogleTokenResponse) => void | Promise<void>;
    error_callback?: () => void;
  }) => GoogleTokenClient;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleOAuth2;
      };
    };
  }
}

const GOVERNORATE_OPTIONS = [
  { value: "Cairo", label: "Cairo" },
  { value: "Giza", label: "Giza" },
  { value: "Alexandria", label: "Alexandria" },
  { value: "Qalyubia", label: "Qalyubia" },
  { value: "Sharqia", label: "Sharqia" },
  { value: "Dakahlia", label: "Dakahlia" },
  { value: "Gharbia", label: "Gharbia" },
  { value: "Monufia", label: "Monufia" },
  { value: "Beheira", label: "Beheira" },
  { value: "Ismailia", label: "Ismailia" },
  { value: "Suez", label: "Suez" },
  { value: "Port Said", label: "Port Said" },
  { value: "Red Sea", label: "Red Sea" },
  { value: "Luxor", label: "Luxor" },
  { value: "Aswan", label: "Aswan" },
  { value: "Asyut", label: "Asyut" },
  { value: "Sohag", label: "Sohag" },
  { value: "Beni Suef", label: "Beni Suef" },
  { value: "Fayoum", label: "Fayoum" },
  { value: "Minya", label: "Minya" },
  { value: "Qena", label: "Qena" },
  { value: "Damietta", label: "Damietta" },
  { value: "Kafr El Sheikh", label: "Kafr El Sheikh" },
  { value: "North Sinai", label: "North Sinai" },
  { value: "South Sinai", label: "South Sinai" },
  { value: "Matrouh", label: "Matrouh" },
  { value: "New Valley", label: "New Valley" },
];

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

// Helper to resolve canonical manga volume by any identifier
function getCanonicalVolume(item: (SavedOrderItem & { volumeId?: string }) | Partial<MangaVolume> | undefined): MangaVolume | undefined {
  if (!item) return undefined;
  const targetVolId = "volumeId" in item && typeof item.volumeId === "string" ? item.volumeId : undefined;
  return ALL_VOLUMES.find(
    (v) =>
      (targetVolId && v.id === targetVolId) ||
      v.id === item.id ||
      (typeof item.title === "string" && v.title.toLowerCase() === item.title.toLowerCase()) ||
      (typeof item.seriesTitle === "string" &&
        v.seriesTitle.toLowerCase() === item.seriesTitle.toLowerCase() &&
        Number(v.volumeNumber) === Number(item.volumeNumber))
  );
}

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const newOrderId = searchParams.get("newOrder");
  const tabParam = searchParams.get("tab");
  const progressMap = useReaderStore((state) => state.progressMap);
  const [activeTab, setActiveTab] = useState<"ORDERS" | "LIBRARY" | "WISHLIST" | "SETTINGS">(
    tabParam && ["ORDERS", "LIBRARY", "WISHLIST", "SETTINGS"].includes(tabParam.toUpperCase())
      ? (tabParam.toUpperCase() as "ORDERS" | "LIBRARY" | "WISHLIST" | "SETTINGS")
      : "ORDERS"
  );
  const [orders, setOrders] = useState<SavedOrder[]>([]);

  // Auth Store
  const currentUser = useAuthStore((state) => state.currentUser);
  const users = useAuthStore((state) => state.users);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const logout = useAuthStore((state) => state.logout);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const loginDemo = useAuthStore((state) => state.loginDemo);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);

  // Global Wishlist Store
  const mounted = useMounted();
  const rawWishlist = useWishlistStore((state) => state.items);
  const wishlist = mounted ? rawWishlist : [];
  const removeFromWishlist = useWishlistStore((state) => state.removeItem);
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);

  const [introResetMessage, setIntroResetMessage] = useState("");
  const [copiedTracking, setCopiedTracking] = useState(false);
  const playIntro = useUIStore((state) => state.playIntro);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<SavedOrder | null>(null);

  // Google OAuth States
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");

  useEffect(() => {
    // Preload Google Identity Services script
    if (typeof window !== "undefined" && !window.google?.accounts?.oauth2) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError("");
    setAuthSuccess("");

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (googleClientId && googleClientId !== "your-google-client-id.apps.googleusercontent.com") {
      setIsGoogleLoading(true);
      try {
        // Ensure google script is loaded
        if (typeof window !== "undefined" && !window.google?.accounts?.oauth2) {
          await new Promise<void>((resolve) => {
            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => resolve();
            document.body.appendChild(script);
          });
        }

        if (typeof window !== "undefined" && window.google?.accounts?.oauth2) {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: googleClientId,
            scope: "email profile openid",
            prompt: "select_account",
            callback: async (tokenResponse: GoogleTokenResponse) => {
              if (tokenResponse?.access_token) {
                try {
                  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                  });
                  const googleUser = await res.json();
                  if (googleUser?.email) {
                    await loginWithGoogle({
                      email: googleUser.email,
                      name: googleUser.name || googleUser.email.split("@")[0],
                      avatar: googleUser.picture,
                    });
                  }
                } catch (fetchErr) {
                  console.error("Failed to retrieve Google userinfo", fetchErr);
                  setAuthError("Failed to fetch Google profile info.");
                }
              }
              setIsGoogleLoading(false);
            },
            error_callback: () => {
              setIsGoogleLoading(false);
              setAuthError("Google authentication was canceled or failed.");
            },
          });
          client.requestAccessToken();
          return;
        }
      } catch (e) {
        console.error("Google OAuth error", e);
        setIsGoogleLoading(false);
      }
    }

    // Fallback interactive Google account picker when no Client ID is provided yet
    setShowGoogleModal(true);
  };

  // Auth Portal State
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authGovernorate, setAuthGovernorate] = useState("Giza");
  const [authAddress, setAuthAddress] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [emailSuggestion, setEmailSuggestion] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const handleEmailBlur = async () => {
    setEmailSuggestion("");
    setEmailVerified(false);
    const trimmed = authEmail.trim();
    if (!trimmed || !trimmed.includes("@")) return;

    setIsCheckingEmail(true);
    try {
      const res = await verifyEmailAddress(trimmed);
      if (!res.valid) {
        if (res.suggestion) {
          setEmailSuggestion(res.suggestion);
        }
        setAuthError(res.message || "Invalid or non-existent email domain.");
      } else {
        setEmailVerified(true);
        if (authError && (authError.includes("email") || authError.includes("domain") || authError.includes("mail"))) {
          setAuthError("");
        }
      }
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // OTP Verification States
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setAuthError("");
    setAuthSuccess("");
    const res = await sendOtpEmail(authEmail);
    if (!res.success) {
      setAuthError(res.message || "Failed to resend verification code.");
      if (res.waitSec) setResendCooldown(res.waitSec);
    } else {
      setResendCooldown(45);
      setAuthSuccess(`New verification code dispatched to ${authEmail}. Please check your inbox.`);
      setTimeout(() => setAuthSuccess(""), 4000);
    }
  };

  // Forgot Password States & Handlers
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState<"EMAIL" | "OTP_PASSWORD">("EMAIL");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldown]);

  const handleRequestForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setForgotError("Please enter a valid patron email address.");
      return;
    }

    const registeredUser = users[cleanEmail];
    if (!registeredUser) {
      setForgotError("No patron account found with this email. Please verify spelling or create an account.");
      return;
    }

    setIsSubmittingForgot(true);
    try {
      const res = await sendOtpEmail(cleanEmail, "RESET_PASSWORD");
      if (!res.success) {
        setForgotError(res.message || "Failed to dispatch recovery code.");
        if (res.waitSec) setForgotCooldown(res.waitSec);
      } else {
        setForgotStep("OTP_PASSWORD");
        setForgotCooldown(45);
        setForgotSuccess(`A 6-digit recovery code has been dispatched to ${cleanEmail}.`);
      }
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  const handleResendForgotOtp = async () => {
    if (forgotCooldown > 0) return;
    setForgotError("");
    setForgotSuccess("");
    const cleanEmail = forgotEmail.trim().toLowerCase();
    const res = await sendOtpEmail(cleanEmail, "RESET_PASSWORD");
    if (!res.success) {
      setForgotError(res.message || "Failed to resend recovery code.");
      if (res.waitSec) setForgotCooldown(res.waitSec);
    } else {
      setForgotCooldown(45);
      setForgotSuccess(`New recovery code dispatched to ${cleanEmail}. Please check your inbox.`);
      setTimeout(() => setForgotSuccess(""), 4000);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (forgotOtp.trim().length !== 6) {
      setForgotError("Please enter the complete 6-digit code.");
      return;
    }

    if (forgotNewPassword.length < 8) {
      setForgotError("Password must be at least 8 characters with letters & numbers.");
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }

    setIsSubmittingForgot(true);
    try {
      const cleanEmail = forgotEmail.trim().toLowerCase();
      // 1. Verify OTP code
      const otpRes = await verifyOtpCode(cleanEmail, forgotOtp.trim());
      if (!otpRes.success) {
        setForgotError(otpRes.message || "Invalid or expired recovery code.");
        return;
      }

      // 2. Reset password in database
      const resetRes = await resetPassword(cleanEmail, forgotNewPassword);
      if (!resetRes.success) {
        setForgotError(resetRes.message || "Failed to update password.");
        return;
      }

      // 3. Immediately log patron into session
      await login(cleanEmail, forgotNewPassword);
      setForgotSuccess("Password updated successfully! Welcome back to the Archive.");
      setTimeout(() => {
        setIsForgotMode(false);
        setForgotStep("EMAIL");
        setForgotOtp("");
        setForgotNewPassword("");
        setForgotConfirmPassword("");
      }, 1200);
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  // Settings State
  const [shippingAddress, setShippingAddress] = useState(
    currentUser?.address || "Al Motamayez District, 6th of October City, Giza, Egypt"
  );
  const [patronName, setPatronName] = useState(currentUser?.name || "Karim El-Sayed");
  const [patronPhone, setPatronPhone] = useState(currentUser?.phone || "+20 100 234 5678");
  const [patronGovernorate, setPatronGovernorate] = useState(currentUser?.governorate || "Giza");
  const [settingsSavedMessage, setSettingsSavedMessage] = useState("");

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (currentUser) {
        setPatronName(currentUser.name);
        setShippingAddress(currentUser.address);
        setPatronPhone(currentUser.phone);
        setPatronGovernorate(currentUser.governorate);

        const seen = new Set<string>();
        const uniqueOrders: SavedOrder[] = [];
        for (const ord of (currentUser.orders || [])) {
          if (!ord?.id || seen.has(ord.id)) continue;
          seen.add(ord.id);
          uniqueOrders.push(ord);
        }
        setOrders(uniqueOrders);
      } else {
        setOrders([]);
        setPatronName("");
        setShippingAddress("");
        setPatronPhone("");
        setPatronGovernorate("Giza");

        if (typeof window !== "undefined" && localStorage.getItem("kairo_active_session") === "logged_out") {
          if (useCartStore.getState().items.length > 0) {
            useCartStore.getState().clearCart();
            localStorage.removeItem("kairo_cart_storage");
          }
          if (useWishlistStore.getState().items.length > 0) {
            useWishlistStore.getState().clearWishlist();
            localStorage.removeItem("kairo_wishlist_storage");
          }
        }
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [currentUser]);

  const handlePrintInvoice = (order: SavedOrder) => {
    // Create an isolated hidden iframe dedicated strictly to the invoice receipt
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const itemsRows = (order.items || [])
      .map(
        (item: SavedOrderItem) => `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e5e5e5; font-size: 11px;">
            <strong style="font-family: sans-serif; font-size: 12px;">${escapeHtml(item.seriesTitle || "Manga")}</strong>
            <span style="color: #666; font-size: 11px;"> — ${escapeHtml(item.title || "Collector Edition")}</span>
            <div style="font-family: monospace; font-size: 9px; color: #888; margin-top: 2px;">FORMAT: ${escapeHtml(item.format || "Tankōbon Edition")}</div>
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e5e5e5; text-align: center; font-size: 11px; font-family: monospace;">
            ${Number(item.quantity || 1)}
          </td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e5e5e5; text-align: right; font-size: 11px; font-family: monospace; font-weight: bold;">
            ${formatPrice((Number(item.price) || 12.99) * (Number(item.quantity) || 1))}
          </td>
        </tr>
      `
      )
      .join("");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>INVOICE_${order.id}_KAIRO</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              background: #ffffff;
              color: #111111;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
            }
            .receipt-card {
              max-width: 680px;
              margin: 0 auto;
              border: 1.5px solid #111111;
              padding: 24px 28px;
              background: #ffffff;
            }
            .header {
              text-align: center;
              border-bottom: 1.5px solid #111111;
              padding-bottom: 14px;
              margin-bottom: 16px;
            }
            .brand-row {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              margin-bottom: 4px;
            }
            .brand-seal {
              background: #D94A3A;
              color: #ffffff;
              width: 24px;
              height: 24px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 12px;
              border-radius: 2px;
            }
            .brand-name {
              font-size: 15px;
              font-weight: 900;
              letter-spacing: 2px;
              text-transform: uppercase;
            }
            .hub-line {
              font-family: monospace;
              font-size: 10px;
              letter-spacing: 1.5px;
              color: #666666;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .receipt-h1 {
              font-size: 18px;
              font-weight: 800;
              letter-spacing: 0.5px;
              margin-top: 2px;
            }
            .meta-line {
              font-family: monospace;
              font-size: 11px;
              color: #555555;
              margin-top: 2px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              margin-bottom: 16px;
              font-size: 11px;
              background: #f8f8f8;
              padding: 10px 14px;
              border: 1px solid #e0e0e0;
            }
            .info-grid strong {
              display: block;
              font-family: monospace;
              font-size: 9px;
              color: #666666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
            }
            table.items {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 14px;
            }
            table.items th {
              background: #f2f2f2;
              border-top: 1px solid #111111;
              border-bottom: 1px solid #111111;
              padding: 7px 10px;
              font-family: monospace;
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .totals-block {
              width: 100%;
              margin-bottom: 14px;
            }
            .totals-block td {
              padding: 3px 10px;
              font-size: 11px;
            }
            .grand-total-row td {
              border-top: 1.5px solid #111111;
              padding-top: 6px;
              font-size: 15px;
              font-weight: 900;
            }
            .stamp-section {
              border: 1px solid #111111;
              padding: 10px 14px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-family: monospace;
              font-size: 10px;
              background: #fafafa;
            }
            .stamp-title {
              color: #D94A3A;
              font-weight: bold;
            }
            .footer-strip {
              text-align: center;
              font-family: monospace;
              font-size: 9px;
              color: #777777;
              margin-top: 12px;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            <div class="header">
              <div class="brand-row">
                <div class="brand-seal">回路</div>
                <span class="brand-name">KAIRO PUBLISHING ARCHIVE</span>
              </div>
              <div class="hub-line">6th of October Central Archival Hub • Giza, Egypt</div>
              <div class="receipt-h1">OFFICIAL ORDER RECEIPT</div>
              <div class="meta-line">INVOICE #${escapeHtml(order.id)} • DATE: ${escapeHtml(order.date)}</div>
            </div>

            <div class="info-grid">
              <div>
                <strong>Patron & Shipping Destination:</strong>
                ${escapeHtml(patronName || "Karim El-Sayed")}<br>
                ${escapeHtml(shippingAddress || "Al Motamayez District, 6th of October City, Giza, Egypt")}
              </div>
              <div style="text-align: right;">
                <strong>Logistics & Courier:</strong>
                ${escapeHtml(order.courier || "Bosta Egypt Express — 6th of October Hub")}<br>
                Tracking: <strong>${escapeHtml(order.trackingNumber || "EG-OCT-9842-CAI")}</strong>
              </div>
            </div>

            <table class="items">
              <thead>
                <tr>
                  <th style="text-align: left;">Item Description</th>
                  <th style="text-align: center; width: 60px;">Qty</th>
                  <th style="text-align: right; width: 100px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <table class="totals-block">
              <tr>
                <td style="color: #666666;">Subtotal:</td>
                <td style="text-align: right; font-family: monospace;">${formatPrice(order.subtotal)}</td>
              </tr>
              <tr>
                <td style="color: #666666;">Reinforced Shipping (Bosta Egypt Express):</td>
                <td style="text-align: right; font-family: monospace;">${formatPrice(order.shippingCost || 4.0)}</td>
              </tr>
              <tr class="grand-total-row">
                <td><strong>Grand Total:</strong></td>
                <td style="text-align: right; font-family: monospace;"><strong>${formatPrice(order.total)}</strong></td>
              </tr>
            </table>

            <div class="stamp-section">
              <div>
                <span class="stamp-title">AUTHENTICITY VERIFIED:</span><br>
                KAIRO EGYPT ARCHIVE SEAL #KRO-OCT-88219
              </div>
              <div style="text-align: right;">
                <span>DISPATCH STATUS:</span><br>
                <strong>PRE-DISPATCH INSPECTION PASSED</strong>
              </div>
            </div>

            <div class="footer-strip">
              精神と物質の回路 • 100% LICENSED JAPANESE EDITIONS • 14-DAY COLLECTOR REPLACEMENT GUARANTEE
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }, 200);
  };

  const addItem = useCartStore((state) => state.addItem);
  const { openCart, openReader } = useUIStore();

  useEffect(() => {
    let rafId: number;
    // Load persisted orders from localStorage and self-heal any old image URLs
    const saved = localStorage.getItem("kairo_orders");
    if (saved) {
      try {
        const parsed: SavedOrder[] = JSON.parse(saved);
        const seen = new Set<string>();
        const sanitized: SavedOrder[] = [];

        for (const order of parsed) {
          if (!order?.id || seen.has(order.id)) continue;
          seen.add(order.id);
          sanitized.push({
            ...order,
            trackingNumber: order.trackingNumber || "EG-OCT-9842-CAI",
            courier: order.courier || "Bosta Egypt Express — 6th of October Hub",
            estimatedDelivery: order.estimatedDelivery || "Sep 08 – Sep 09, 2026 (All Egypt Delivery)",
            items: (order.items || []).map((item) => {
              const canonical = getCanonicalVolume(item);
              return {
                ...item,
                volumeId: canonical?.id || item.volumeId || item.id,
                title: canonical?.title || item.title,
                seriesTitle: canonical?.seriesTitle || item.seriesTitle,
                volumeNumber: canonical?.volumeNumber || item.volumeNumber,
                coverImage: canonical?.coverImage || item.coverImage,
                format: canonical?.format || item.format || "Tankōbon",
                price: item.price || canonical?.price || 12.99,
              };
            }),
          });
        }
        rafId = requestAnimationFrame(() => {
          setOrders(sanitized);
        });
        localStorage.setItem("kairo_orders", JSON.stringify(sanitized));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Default initial mock order matching the 4 authentic items shown in screenshot
      const initialMockOrder: SavedOrder = {
        id: "KRO-1582",
        date: "2026-09-06",
        trackingNumber: "EG-OCT-9842-CAI",
        courier: "Bosta Egypt Express — 6th of October Hub",
        estimatedDelivery: "Sep 08 – Sep 09, 2026 (All Egypt Delivery)",
        items: [
          {
            id: "csm-01",
            volumeId: "csm-01",
            title: "Dog & Chainsaw",
            seriesTitle: "Chainsaw Man",
            volumeNumber: 1,
            price: 11.99,
            coverImage: "https://dw9to29mmj727.cloudfront.net/products/1974709930.jpg",
            format: "Manga",
            quantity: 1,
          },
          {
            id: "op-02",
            volumeId: "op-02",
            title: "Buggy the Clown",
            seriesTitle: "One Piece",
            volumeNumber: 2,
            price: 12.99,
            coverImage: "https://dw9to29mmj727.cloudfront.net/products/159116057X.jpg",
            format: "Manga",
            quantity: 1,
          },
          {
            id: "berserk-01",
            volumeId: "berserk-01",
            title: "Deluxe Edition Vol. 01",
            seriesTitle: "Berserk",
            volumeNumber: 1,
            price: 49.99,
            coverImage: "https://images-na.ssl-images-amazon.com/images/P/1506711987.01._SX700_SCLZZZZZZZ_.jpg",
            format: "Deluxe Edition",
            quantity: 1,
          },
          {
            id: "op-01",
            volumeId: "op-01",
            title: "Romance Dawn",
            seriesTitle: "One Piece",
            volumeNumber: 1,
            price: 12.99,
            coverImage: "https://dw9to29mmj727.cloudfront.net/products/1569319014.jpg",
            format: "Manga",
            quantity: 1,
          },
        ],
        subtotal: 87.96,
        shippingCost: 11.99,
        total: 99.95,
        status: "Preparing",
        timeline: ["Confirmed", "Preparing"],
      };
      rafId = requestAnimationFrame(() => {
        setOrders([initialMockOrder]);
      });
      localStorage.setItem("kairo_orders", JSON.stringify([initialMockOrder]));
    }
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleResetIntro = () => {
    try {
      sessionStorage.removeItem("kairo_intro_seen");
      localStorage.removeItem("kairo_intro_seen");
      localStorage.removeItem("introSeen");
    } catch (e) {
      console.error(e);
    }
    setIntroResetMessage("Intro sequence reset! Redirecting to experience cinematic intro...");
    playIntro();
    setTimeout(() => {
      router.push("/");
    }, 350);
  };

  const handleCopyTracking = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2500);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: patronName,
      address: shippingAddress,
      phone: patronPhone,
      governorate: patronGovernorate,
    });
    setSettingsSavedMessage("Collector profile preferences successfully updated.");
    setTimeout(() => setSettingsSavedMessage(""), 4000);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (authMode === "LOGIN") {
      if (!authEmail.trim()) {
        setAuthError("Please enter your email address.");
        return;
      }
      if (!validateEmail(authEmail)) {
        setAuthError("Please enter a valid email address (e.g. name@domain.com).");
        return;
      }
      setIsSubmittingAuth(true);
      try {
        const res = await login(authEmail, authPassword);
        if (!res.success) {
          const check = await verifyEmailAddress(authEmail);
          if (check.suggestion) {
            setEmailSuggestion(check.suggestion);
          }
          setAuthError(res.message || "Failed to sign in.");
        }
      } catch {
        setAuthError("An unexpected error occurred. Please try again.");
      } finally {
        setIsSubmittingAuth(false);
      }
    } else {
      if (!authName.trim()) {
        setAuthError("Please enter your full name.");
        return;
      }
      if (!authEmail.trim()) {
        setAuthError("Please enter your email address.");
        return;
      }
      if (!validateEmail(authEmail)) {
        setAuthError("Please enter a valid email address (e.g. name@domain.com).");
        return;
      }
      const passVal = validatePassword(authPassword);
      if (!passVal.isValid) {
        setAuthError(passVal.message || "Password must be at least 8 characters with letters & numbers.");
        return;
      }
      if (!authAddress.trim()) {
        setAuthError("Please enter your Egypt delivery address.");
        return;
      }
      setIsSubmittingAuth(true);
      try {
        // Real DNS & MX Existence Verification
        const emailCheck = await verifyEmailAddress(authEmail);
        if (!emailCheck.valid) {
          if (emailCheck.suggestion) {
            setEmailSuggestion(emailCheck.suggestion);
          }
          setAuthError(emailCheck.message || "The email domain does not exist or has no active mail servers.");
          setIsSubmittingAuth(false);
          return;
        }

        // 2. Dispatch OTP code to email
        const otpRes = await sendOtpEmail(authEmail);
        if (!otpRes.success) {
          setAuthError(otpRes.message || "Failed to dispatch verification code.");
          if (otpRes.waitSec) setResendCooldown(otpRes.waitSec);
          setIsSubmittingAuth(false);
          return;
        }

        // 3. Switch to OTP verification view
        setResendCooldown(45);
        setIsOtpStep(true);
        setAuthSuccess("");
      } catch {
        setAuthError("Failed to initiate registration. Please try again.");
      } finally {
        setIsSubmittingAuth(false);
      }
    }
  };

  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    const cleanOtp = otpCode.trim().replace(/\D/g, "");
    if (cleanOtp.length < 6) {
      setAuthError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      // 1. Verify OTP with server
      const verifyRes = await verifyOtpCode(authEmail, cleanOtp);
      if (!verifyRes.success) {
        setAuthError(verifyRes.message || "Incorrect verification code.");
        setIsVerifyingOtp(false);
        return;
      }

      // 2. Register account now that email is verified!
      const res = await register({
        name: authName,
        email: authEmail,
        password: authPassword,
        phone: authPhone || "+20 100 000 0000",
        governorate: authGovernorate,
        address: authAddress,
      });

      if (!res.success) {
        setAuthError(res.message || "Failed to finalize registration.");
      } else {
        setAuthSuccess("Patron account verified & created! Welcome to KAIRO Archive.");
        setIsOtpStep(false);
      }
    } catch {
      setAuthError("Failed to complete verification. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleReorder = (order: SavedOrder) => {
    order.items.forEach((item) => {
      const canonical = getCanonicalVolume(item);
      if (canonical) {
        addItem(canonical, item.quantity || 1);
      }
    });
    openCart();
  };

  const moveAllWishlistToCart = () => {
    wishlist.forEach((vol) => addItem(vol, 1));
    openCart();
  };

  // Dynamically derive unlocked digital library editions strictly from confirmed & paid orders
  const digitalLibraryVolumes = useMemo(() => {
    const volumeMap = new Map<string, MangaVolume>();

    orders.forEach((order) => {
      const isPaid =
        order.paymentStatus === "Verified & Paid" ||
        (order.paymentMethod === "cash" && order.status === "Delivered");
      if (!isPaid) return;

      (order.items || []).forEach((item) => {
        const canonical = getCanonicalVolume(item);
        if (canonical && !volumeMap.has(canonical.id)) {
          volumeMap.set(canonical.id, canonical);
        }
      });
    });

    return Array.from(volumeMap.values());
  }, [orders]);

  // Volumes ordered but awaiting payment verification
  const pendingLibraryVolumes = useMemo(() => {
    const volumeMap = new Map<string, { volume: MangaVolume; order: SavedOrder }>();

    orders.forEach((order) => {
      const isPaid =
        order.paymentStatus === "Verified & Paid" ||
        (order.paymentMethod === "cash" && order.status === "Delivered");
      if (isPaid) return;

      (order.items || []).forEach((item) => {
        const canonical = getCanonicalVolume(item);
        if (canonical && !volumeMap.has(canonical.id)) {
          volumeMap.set(canonical.id, { volume: canonical, order });
        }
      });
    });

    return Array.from(volumeMap.values());
  }, [orders]);

  // Prevent hydration mismatch between server render (initial currentUser is null) and client (persisted session)
  if (!mounted) {
    return (
      <div className="min-h-[calc(100dvh-80px)] bg-transparent text-paper pt-24 pb-12 px-4 sm:px-6 md:px-12 flex items-center justify-center relative">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
          <span className="text-xs font-mono text-text-muted tracking-widest uppercase">
            Accessing Patron Archive...
          </span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, display luxury Patron Authentication Portal
  if (!currentUser) {
    // 1. Dedicated, Minimalist OTP Verification Screen (Zero Clutter)
    if (isOtpStep) {
      return (
        <div className="min-h-[calc(100dvh-80px)] bg-transparent text-paper pt-24 pb-12 px-4 sm:px-6 md:px-12 flex items-center justify-center relative">
          <div className="max-w-md w-full bg-ink-surface/90 border border-gold/40 rounded-sm p-6 sm:p-8 backdrop-blur-md shadow-[0_25px_80px_rgba(0,0,0,0.95)] space-y-6 animate-in fade-in zoom-in-95 duration-200 relative z-10">
            
            {/* Header */}
            <div className="text-center space-y-2 pb-1">
              <div className="w-12 h-12 mx-auto rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center text-gold shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight font-sans text-paper">
                VERIFY YOUR EMAIL
              </h1>
              <p className="text-xs text-text-muted font-mono leading-relaxed">
                Enter the 6-digit security code sent to:
                <br />
                <span className="text-gold font-bold">{authEmail}</span>
              </p>
            </div>

            {/* Error Alert */}
            {authError && (
              <div className="p-3 bg-vermilion/15 border border-vermilion/50 rounded-xs text-vermilion text-xs font-mono animate-in fade-in text-center">
                {authError}
              </div>
            )}

            {/* Success Alert (e.g. for resend) */}
            {authSuccess && (
              <div className="p-2.5 bg-gold/10 border border-gold/40 rounded-xs text-gold text-xs font-mono animate-in fade-in text-center">
                {authSuccess}
              </div>
            )}

            {/* OTP Form */}
            <form onSubmit={handleVerifyOtpAndRegister} className="space-y-5 text-xs font-mono">
              <div className="space-y-2">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="------"
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtpCode(val);
                    if (authError) setAuthError("");
                  }}
                  className="w-full bg-ink border border-ink-border focus:border-gold px-4 py-3 text-2xl font-mono tracking-[0.45em] text-center text-gold rounded-xs outline-none cursor-text caret-gold placeholder:text-text-muted/30 placeholder:tracking-[0.45em]"
                  autoFocus
                />
                <div className="flex items-center justify-between text-[10px] text-text-muted px-1">
                  <span>Expires in 10 minutes</span>
                  <span>5 attempts allowed</span>
                </div>
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={isVerifyingOtp || otpCode.length < 6}
                className="w-full py-3 bg-gold text-ink hover:bg-paper disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs uppercase tracking-widest rounded-xs transition-colors cursor-pointer shadow-md"
              >
                {isVerifyingOtp ? "VERIFYING CODE..." : "CONFIRM & REGISTER"}
              </button>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-ink-border/80 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpStep(false);
                    setOtpCode("");
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                  className="text-text-muted hover:text-paper transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Email</span>
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0}
                  onClick={handleResendOtp}
                  className="text-gold hover:text-paper disabled:text-text-muted/60 disabled:cursor-not-allowed transition-colors cursor-pointer font-bold"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </button>
              </div>
            </form>

          </div>
        </div>
      );
    }

    // 1.5. Dedicated Minimalist Forgot / Reset Password Screen
    if (isForgotMode) {
      return (
        <div className="min-h-[calc(100dvh-80px)] bg-transparent text-paper pt-24 pb-12 px-4 sm:px-6 md:px-12 flex items-center justify-center relative">
          <div className="max-w-md w-full bg-ink-surface/90 border border-gold/40 rounded-sm p-6 sm:p-8 backdrop-blur-md shadow-[0_25px_80px_rgba(0,0,0,0.95)] space-y-6 animate-in fade-in zoom-in-95 duration-200 relative z-10">
            
            {/* Header */}
            <div className="text-center space-y-2 pb-1">
              <div className="w-12 h-12 mx-auto rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center text-gold shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight font-sans text-paper">
                {forgotStep === "EMAIL" ? "RESET PASSWORD" : "SET NEW PASSWORD"}
              </h1>
              <p className="text-xs text-text-muted font-mono leading-relaxed">
                {forgotStep === "EMAIL" ? (
                  "Enter your registered patron email to receive a 6-digit recovery code."
                ) : (
                  <>
                    Enter the 6-digit recovery code sent to:
                    <br />
                    <span className="text-gold font-bold">{forgotEmail}</span>
                  </>
                )}
              </p>
            </div>

            {/* Error Alert */}
            {forgotError && (
              <div className="p-3 bg-vermilion/15 border border-vermilion/50 rounded-xs text-vermilion text-xs font-mono animate-in fade-in text-center">
                {forgotError}
              </div>
            )}

            {/* Success Alert */}
            {forgotSuccess && (
              <div className="p-3 bg-gold/10 border border-gold/40 rounded-xs text-gold text-xs font-mono animate-in fade-in text-center">
                {forgotSuccess}
              </div>
            )}

            {/* STEP 1: Enter Email */}
            {forgotStep === "EMAIL" ? (
              <form onSubmit={handleRequestForgotOtp} className="space-y-5 text-xs font-mono">
                <div>
                  <label className="block text-[10px] text-text-muted uppercase mb-1">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        if (forgotError) setForgotError("");
                      }}
                      className="w-full bg-ink border border-ink-border px-3.5 py-2.5 pr-10 text-paper rounded-xs focus:border-gold outline-none cursor-text caret-gold"
                      autoFocus
                    />
                    <Mail strokeWidth={1.4} className="w-4 h-4 text-text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingForgot || !forgotEmail.includes("@")}
                  className="w-full py-3 bg-gold text-ink hover:bg-paper disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs uppercase tracking-widest rounded-xs transition-colors cursor-pointer shadow-md"
                >
                  {isSubmittingForgot ? "DISPATCHING CODE..." : "SEND RECOVERY CODE"}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(false);
                      setForgotError("");
                      setForgotSuccess("");
                    }}
                    className="text-text-muted hover:text-paper font-mono text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: Enter OTP & New Password */
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs font-mono">
                {/* 6-Digit Code */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-text-muted uppercase">
                    6-Digit Security Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="------"
                    value={forgotOtp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setForgotOtp(val);
                      if (forgotError) setForgotError("");
                    }}
                    className="w-full bg-ink border border-ink-border focus:border-gold px-4 py-2.5 text-2xl font-mono tracking-[0.45em] text-center text-gold rounded-xs outline-none cursor-text caret-gold placeholder:text-text-muted/30 placeholder:tracking-[0.45em]"
                    autoFocus
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-[10px] text-text-muted uppercase mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showForgotNewPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className="w-full bg-ink border border-ink-border px-3.5 py-2.5 pr-10 text-paper rounded-xs focus:border-gold outline-none cursor-text caret-gold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-gold transition-colors cursor-pointer p-0.5"
                    >
                      {showForgotNewPassword ? (
                        <EyeOff strokeWidth={1.4} className="w-4 h-4 text-gold" />
                      ) : (
                        <Eye strokeWidth={1.4} className="w-4 h-4 text-text-muted" />
                      )}
                    </button>
                  </div>
                  <span className="text-[10px] text-text-muted/80 mt-1 block">
                    Min 8 characters, containing both letters & numbers.
                  </span>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-[10px] text-text-muted uppercase mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showForgotConfirmPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      className="w-full bg-ink border border-ink-border px-3.5 py-2.5 pr-10 text-paper rounded-xs focus:border-gold outline-none cursor-text caret-gold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-gold transition-colors cursor-pointer p-0.5"
                    >
                      {showForgotConfirmPassword ? (
                        <EyeOff strokeWidth={1.4} className="w-4 h-4 text-gold" />
                      ) : (
                        <Eye strokeWidth={1.4} className="w-4 h-4 text-text-muted" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingForgot || forgotOtp.length < 6 || forgotNewPassword.length < 8}
                  className="w-full py-3 bg-gold text-ink hover:bg-paper disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs uppercase tracking-widest rounded-xs transition-colors cursor-pointer shadow-md mt-2"
                >
                  {isSubmittingForgot ? "UPDATING PASSWORD..." : "CONFIRM & SIGN IN"}
                </button>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-ink-border/80 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep("EMAIL");
                      setForgotOtp("");
                      setForgotError("");
                    }}
                    className="text-text-muted hover:text-paper transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Email</span>
                  </button>

                  <button
                    type="button"
                    disabled={forgotCooldown > 0}
                    onClick={handleResendForgotOtp}
                    className="text-gold hover:text-paper disabled:text-text-muted/60 disabled:cursor-not-allowed transition-colors cursor-pointer font-bold"
                  >
                    {forgotCooldown > 0 ? `Resend in ${forgotCooldown}s` : "Resend Code"}
                  </button>
                </div>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(false);
                      setForgotError("");
                      setForgotSuccess("");
                    }}
                    className="text-[11px] text-text-muted hover:text-paper underline cursor-pointer"
                  >
                    Cancel and return to Sign In
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      );
    }

    // 2. Standard Patron Authentication Portal
    return (
      <div className="min-h-[calc(100dvh-80px)] bg-transparent text-paper pt-24 pb-12 px-4 sm:px-6 md:px-12 flex items-center justify-center relative">
        <div className="max-w-md w-full bg-ink-surface/85 border border-gold/40 rounded-sm p-6 sm:p-8 backdrop-blur-md shadow-[0_25px_80px_rgba(0,0,0,0.95)] space-y-6 animate-in fade-in zoom-in-95 duration-300 relative z-10">
          
          {/* Header */}
          <div className="text-center space-y-1.5 border-b border-ink-border/80 pb-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight font-sans text-paper">
              PATRON PORTAL
            </h1>
            <p className="text-xs text-text-muted font-mono">
              Sign in to access your archive.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-ink rounded-xs border border-ink-border font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                setAuthMode("LOGIN");
                setAuthError("");
                setIsOtpStep(false);
                setOtpCode("");
              }}
              className={`py-2 rounded-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === "LOGIN"
                  ? "bg-gold text-ink font-bold shadow-md"
                  : "text-text-muted hover:text-paper"
              }`}
            >
              <LogIn strokeWidth={1.5} className="w-3.5 h-3.5" />
              <span>SIGN IN</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("REGISTER");
                setAuthError("");
              }}
              className={`py-2 rounded-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === "REGISTER"
                  ? "bg-gold text-ink font-bold shadow-md"
                  : "text-text-muted hover:text-paper"
              }`}
            >
              <UserPlus strokeWidth={1.5} className="w-3.5 h-3.5" />
              <span>CREATE ACCOUNT</span>
            </button>
          </div>

          {/* Error Alert */}
          {authError && (
            <div className="p-3 bg-vermilion/15 border border-vermilion/50 rounded-xs text-vermilion text-xs font-mono animate-in fade-in">
              {authError}
            </div>
          )}

          {/* Success Alert */}
          {authSuccess && (
            <div className="p-3 bg-gold/15 border border-gold/50 rounded-xs text-gold text-xs font-mono animate-in fade-in">
              {authSuccess}
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs font-mono">
            {authMode === "REGISTER" && (
              <div>
                <label className="block text-[10px] text-text-muted uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Ahmed Hassan"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full bg-ink border border-ink-border px-3.5 py-2.5 text-paper rounded-xs focus:border-gold outline-none cursor-text caret-gold"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] text-text-muted uppercase">
                  Email Address
                </label>
                {isCheckingEmail && (
                  <span className="text-[10px] font-mono text-gold animate-pulse">
                    Verifying server...
                  </span>
                )}
                {emailVerified && !authError && !isCheckingEmail && (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Domain verified</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => {
                    setAuthEmail(e.target.value);
                    if (emailSuggestion) setEmailSuggestion("");
                    if (emailVerified) setEmailVerified(false);
                  }}
                  onBlur={handleEmailBlur}
                  className="w-full bg-ink border border-ink-border px-3.5 py-2.5 pr-10 text-paper rounded-xs focus:border-gold outline-none cursor-text caret-gold"
                />
                <Mail strokeWidth={1.4} className="w-4 h-4 text-text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {emailSuggestion && (
                <div className="mt-1.5 p-2 bg-gold/10 border border-gold/40 rounded-xs text-[10px] font-mono text-gold flex items-center justify-between gap-2">
                  <span>Did you mean <strong>{emailSuggestion}</strong>?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthEmail(emailSuggestion);
                      setEmailSuggestion("");
                      setAuthError("");
                      setEmailVerified(true);
                    }}
                    className="px-2 py-0.5 bg-gold text-ink font-bold rounded-xs hover:bg-paper transition-colors cursor-pointer uppercase text-[9px]"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] text-text-muted uppercase">
                  Password
                </label>
                {authMode === "LOGIN" && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(authEmail);
                      setForgotStep("EMAIL");
                      setForgotOtp("");
                      setForgotNewPassword("");
                      setForgotConfirmPassword("");
                      setForgotError("");
                      setForgotSuccess("");
                      setIsForgotMode(true);
                    }}
                    className="text-[10px] font-mono text-gold hover:text-paper hover:underline cursor-pointer tracking-wider uppercase transition-colors"
                  >
                    FORGOT PASSWORD?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={authMode === "LOGIN" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-ink border border-ink-border px-3.5 py-2.5 pr-10 text-paper rounded-xs focus:border-gold outline-none cursor-text caret-gold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-gold transition-colors cursor-pointer p-0.5"
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff strokeWidth={1.4} className="w-4 h-4 text-gold" />
                  ) : (
                    <Eye strokeWidth={1.4} className="w-4 h-4 text-text-muted hover:text-gold" />
                  )}
                </button>
              </div>
              {authMode === "REGISTER" && (
                <p className="text-[10px] text-text-muted/80 mt-1 font-mono">
                  Min 8 characters, containing both letters & numbers.
                </p>
              )}
            </div>

            {authMode === "REGISTER" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      autoComplete="tel"
                      placeholder="+20 100..."
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      className="w-full bg-ink border border-ink-border px-3.5 py-2.5 text-paper rounded-xs focus:border-gold outline-none cursor-text caret-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-muted uppercase mb-1">
                      Governorate
                    </label>
                    <CustomSelect
                      options={GOVERNORATE_OPTIONS}
                      value={authGovernorate}
                      onChange={(val) => setAuthGovernorate(val)}
                      fullWidth
                      buttonClassName="bg-ink py-2.5 text-xs border-ink-border"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-text-muted uppercase mb-1">
                    Delivery Address (Egypt)
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="street-address"
                    placeholder="Building, Street, District (e.g. Dokki, Nasr City, Zayed)"
                    value={authAddress}
                    onChange={(e) => setAuthAddress(e.target.value)}
                    className="w-full bg-ink border border-ink-border px-3.5 py-2.5 text-paper rounded-xs focus:border-gold outline-none cursor-text caret-gold"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSubmittingAuth}
              className="w-full py-3 bg-paper text-ink hover:bg-gold disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs uppercase tracking-widest rounded-xs transition-colors cursor-pointer mt-2"
            >
              {isSubmittingAuth
                ? "AUTHENTICATING..."
                : authMode === "LOGIN"
                ? "SIGN IN TO ARCHIVE"
                : "CREATE PATRON ACCOUNT"}
            </button>
          </form>

          {/* Social Auth Divider */}
          <div className="relative flex items-center justify-center pt-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink-border/80" />
            </div>
            <div className="relative bg-ink-surface px-3 text-[9px] uppercase font-mono text-text-muted">
              OR CONTINUE WITH
            </div>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full py-2.5 bg-ink hover:bg-ink-border/40 border border-ink-border hover:border-gold/50 text-paper font-mono text-xs uppercase tracking-wider rounded-xs transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-sm"
          >
            <GoogleIcon className="w-4 h-4 shrink-0" />
            <span>{isGoogleLoading ? "CONNECTING TO GOOGLE..." : "SIGN IN WITH GOOGLE"}</span>
          </button>

          {/* Quick Demo Login Option */}
          <div className="pt-3 border-t border-ink-border/80 text-center space-y-2">
            <span className="text-[10px] font-mono text-text-muted block uppercase">
              OR EXPLORE WITH ARCHIVE PREVIEW
            </span>
            <button
              type="button"
              onClick={() => loginDemo()}
              className="w-full py-2 bg-ink border border-gold/40 text-gold hover:bg-gold hover:text-ink text-xs font-mono uppercase tracking-wider rounded-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              <span>QUICK DEMO PATRON (KARIM EL-SAYED)</span>
            </button>
          </div>

        </div>

        {/* Google Account Selection Modal */}
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-ink-surface border border-gold/40 rounded-sm max-w-sm w-full p-6 shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-200">
              
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-paper cursor-pointer p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Google Modal Header */}
              <div className="text-center space-y-2 pt-1">
                <div className="w-10 h-10 mx-auto rounded-full bg-paper flex items-center justify-center shadow-md">
                  <GoogleIcon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-paper font-sans">
                  Sign in with Google
                </h3>
                <p className="text-xs text-text-muted font-mono">
                  Choose an account to continue to <strong className="text-gold">KAIRO ARCHIVE</strong>
                </p>
              </div>

              {/* Account List */}
              <div className="space-y-2 font-mono text-xs">
                {/* Detected / Primary Google Account */}
                <button
                  type="button"
                  onClick={async () => {
                    setIsGoogleLoading(true);
                    setShowGoogleModal(false);
                    await loginWithGoogle({
                      name: "Osama Hamad",
                      email: "osamahamad261981@gmail.com",
                      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=OsamaHamad",
                    });
                    setIsGoogleLoading(false);
                  }}
                  className="w-full p-3 bg-ink hover:bg-gold/10 border border-ink-border hover:border-gold/60 rounded-xs flex items-center gap-3 transition-colors text-left cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-full bg-linear-to-tr from-amber-600 to-gold text-ink font-bold font-sans flex items-center justify-center text-sm shadow-sm shrink-0">
                    OH
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-paper font-bold block truncate group-hover:text-gold transition-colors">
                      Osama Hamad
                    </span>
                    <span className="text-[10px] text-text-muted block truncate">
                      osamahamad261981@gmail.com
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                {/* Custom Google Account Form */}
                <div className="pt-2 border-t border-ink-border/80 space-y-2">
                  <span className="text-[10px] text-text-muted uppercase block">
                    Or enter another Google account:
                  </span>
                  <input
                    type="text"
                    placeholder="Full Name (e.g. Ahmed Ali)"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    className="w-full bg-ink border border-ink-border px-3 py-2 text-paper text-xs rounded-xs focus:border-gold outline-none cursor-text caret-gold"
                  />
                  <input
                    type="email"
                    placeholder="Google Email (e.g. user@gmail.com)"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    className="w-full bg-ink border border-ink-border px-3 py-2 text-paper text-xs rounded-xs focus:border-gold outline-none cursor-text caret-gold"
                  />
                  <button
                    type="button"
                    disabled={!customGoogleEmail.includes("@")}
                    onClick={async () => {
                      if (!customGoogleEmail.trim()) return;
                      setIsGoogleLoading(true);
                      setShowGoogleModal(false);
                      await loginWithGoogle({
                        name: customGoogleName.trim() || customGoogleEmail.split("@")[0],
                        email: customGoogleEmail.trim().toLowerCase(),
                        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customGoogleName || customGoogleEmail)}`,
                      });
                      setIsGoogleLoading(false);
                    }}
                    className="w-full py-2 bg-gold text-ink font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-paper transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Continue with this Account
                  </button>
                </div>
              </div>

              {/* Note */}
              <div className="pt-2 border-t border-ink-border/60 text-center">
                <span className="text-[9px] font-mono text-text-muted">
                  OAuth Verified • Instant Patron Access
                </span>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-paper pt-28 pb-24 px-4 sm:px-6 md:px-12 relative z-10">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Streamlined Clean Profile Header */}
        <div className="border-b border-ink-border/80 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-linear-to-tr from-amber-600 to-gold text-ink font-bold font-sans flex items-center justify-center text-lg shadow-md shrink-0">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight uppercase font-sans text-paper">
                  {currentUser.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-[10px] font-mono uppercase tracking-wider">
                  {currentUser.tier || "Collector"}
                </span>
              </div>
              <p className="text-xs text-text-muted font-mono flex items-center gap-2 mt-1">
                <span>{currentUser.email}</span>
                <span>•</span>
                <span>{currentUser.governorate}</span>
                <span>•</span>
                <span className="text-gold/80">ID: #{currentUser.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentUser && currentUser.role === "admin" && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-gold/15 hover:bg-gold text-gold hover:text-ink border border-gold/40 text-xs font-mono font-bold uppercase tracking-wider rounded-xs transition-all cursor-pointer"
                title="Enter Admin Management Dashboard"
              >
                <SlidersHorizontal strokeWidth={1.4} className="w-3.5 h-3.5" />
                <span>Curator Console</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ink-surface/60 hover:bg-vermilion/15 border border-ink-border hover:border-vermilion/60 text-text-muted hover:text-vermilion text-xs font-mono uppercase tracking-wider rounded-xs transition-all cursor-pointer"
              title="Sign out of current account"
            >
              <LogOut strokeWidth={1.4} className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* New Order Notification Banner */}
        {newOrderId && (
          <div className="p-4 bg-gold/10 border border-gold/40 rounded-sm text-gold text-xs font-mono flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 strokeWidth={1.8} className="w-5 h-5 text-gold shrink-0" />
              <span>Order #{newOrderId} has been registered into our 6th of October Central Archive and is being prepared for dispatch across Egypt!</span>
            </div>
            <button
              onClick={() => router.replace("/account")}
              className="text-[11px] uppercase tracking-wider underline hover:text-paper"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Personalized Limited-Time Welcome Offer Banner */}
        <WelcomeOfferBanner />

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto border-b border-ink-border/60 pb-3 font-mono text-xs no-scrollbar">
          {([
            { id: "ORDERS", label: `My Orders (${orders.length})`, icon: Package },
            { id: "LIBRARY", label: `My Library (${digitalLibraryVolumes.length})`, icon: BookOpen },
            { id: "WISHLIST", label: `Wishlist (${wishlist.length})`, icon: Heart },
            { id: "SETTINGS", label: "Settings", icon: Settings },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xs tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-paper text-ink font-bold shadow-md shadow-black/30"
                    : "text-text-muted hover:text-paper hover:bg-ink-surface/60 border border-transparent"
                }`}
              >
                <Icon strokeWidth={1.5} className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: MY ORDERS (Order Tracking Timeline & Real Covers) */}
        {/* ========================================================= */}
        {activeTab === "ORDERS" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {orders.length === 0 ? (
              <div className="p-16 border border-ink-border bg-ink-surface/30 rounded-sm text-center space-y-4">
                <Package strokeWidth={1.2} className="w-12 h-12 text-text-muted mx-auto" />
                <p className="font-mono text-sm text-paper">NO ORDERS PLACED IN THIS SESSION</p>
                <p className="text-xs text-text-muted max-w-sm mx-auto">
                  Explore our curated manga catalog and build your definitive collector box set with direct delivery across all Egyptian governorates.
                </p>
                <Link
                  href="/manga"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-paper text-ink font-bold text-xs font-mono uppercase tracking-widest hover:bg-vermilion hover:text-white transition-colors rounded-xs"
                >
                  <span>BROWSE ARCHIVE</span>
                  <ArrowRight strokeWidth={1.5} className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              orders.map((order, orderIdx) => {
                const isElectronic = order.paymentMethod === "wallet" || order.paymentMethod === "instapay";
                const isPaid =
                  order.paymentStatus === "Verified & Paid" ||
                  (order.paymentMethod === "cash" && order.status === "Delivered");
                const isPendingVerification = isElectronic && order.paymentStatus !== "Verified & Paid";

                let steps: { key: string; label: string; detail: string }[] = [];
                let currentStepIndex = 0;

                if (isElectronic) {
                  if (!isPaid) {
                    steps = [
                      { key: "Placed", label: "ORDER PLACED", detail: "Cart Checked Out" },
                      { key: "Verification", label: "PAYMENT PENDING", detail: "Awaiting Confirmation" },
                      { key: "Preparing", label: "VAULT PACKAGING", detail: "Quality Inspection" },
                      { key: "Delivered", label: "DELIVERED", detail: "Destination Arrival" },
                    ];
                    currentStepIndex = 1;
                  } else {
                    steps = [
                      { key: "Paid", label: "PAYMENT VERIFIED", detail: "Transfer Approved" },
                      { key: "Preparing", label: "VAULT PACKAGING", detail: "Inspection & Seal" },
                      { key: "Shipped", label: "IN TRANSIT", detail: "Dispatched with Courier" },
                      { key: "Delivered", label: "DELIVERED", detail: "Archival Delivery" },
                    ];
                    if (order.status === "Delivered") currentStepIndex = 3;
                    else if (order.status === "Shipped") currentStepIndex = 2;
                    else currentStepIndex = 1;
                  }
                } else {
                  // Cash on Delivery
                  steps = [
                    { key: "Confirmed", label: "ORDER CONFIRMED", detail: "Scheduled with Hub" },
                    { key: "Preparing", label: "VAULT PACKAGING", detail: "Inspection & Seal" },
                    { key: "Shipped", label: "IN TRANSIT", detail: "Courier Doorstep Route" },
                    { key: "Delivered", label: "COLLECTED & COMPLETE", detail: "Cash Received" },
                  ];
                  if (order.status === "Delivered") currentStepIndex = 3;
                  else if (order.status === "Shipped") currentStepIndex = 2;
                  else if (order.status === "Processing" || order.status === "Preparing") currentStepIndex = 1;
                  else currentStepIndex = 0;
                }

                return (
                  <div
                    key={`${order.id}-${orderIdx}`}
                    className="bg-ink-surface/40 border border-ink-border/80 rounded-sm p-5 sm:p-7 space-y-6 shadow-xl"
                  >
                    {/* Order Title & Protocol Meta */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-ink-border/70 gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="text-lg sm:text-xl font-bold font-mono text-paper tracking-wider">
                            ORDER #{order.id}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-xs bg-ink border border-ink-border text-[10px] font-mono text-text-muted">
                              {order.paymentMethod === "wallet"
                                ? "Mobile Wallet"
                                : order.paymentMethod === "instapay"
                                ? "InstaPay"
                                : "Cash On Delivery"}
                            </span>

                            {/* Payment Verification Status Badge */}
                            {isPaid ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1.5 border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>PAYMENT: VERIFIED & PAID</span>
                              </span>
                            ) : isPendingVerification ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1.5 border bg-amber-500/10 border-amber-500/40 text-amber-400">
                                <span>PAYMENT: PENDING VERIFICATION</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1.5 border bg-gold/10 border-gold/40 text-gold">
                                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                                <span>PAYMENT: DOORSTEP COLLECTION</span>
                              </span>
                            )}

                            {/* Order Fulfillment Status Badge */}
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1.5 border bg-ink border-ink-border text-paper">
                              <span>ORDER: {order.status ? order.status.toUpperCase() : "PROCESSING"}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                        <div className="text-right">
                          <span className="text-[10px] text-text-muted block">TIMESTAMP</span>
                          <span className="text-paper">{order.date}</span>
                        </div>
                        <div className="h-8 w-px bg-ink-border hidden sm:block" />
                        <div className="text-right">
                          <span className="text-[10px] text-text-muted block">TOTAL AMOUNT</span>
                          <span className="text-paper text-base font-bold">{formatPrice(order.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pending Verification Notice Banner */}
                    {isPendingVerification && (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xs flex items-start gap-3 text-xs font-mono animate-in fade-in">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <div className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-2">
                            <span>Payment Verification In Progress</span>
                          </div>
                          <p className="text-text-muted leading-relaxed">
                            Thank you for your order. Our concierge team will contact you shortly via WhatsApp or Phone to provide our verified transfer coordinates ({order.paymentMethod === "wallet" ? "Mobile Wallet" : "InstaPay"}) and confirm receipt. Once verified by the administrator, your digital reader access will unlock immediately and your order will advance to vault packaging.
                          </p>
                          {order.paymentSenderDetail && (
                            <div className="text-[11px] text-text-muted pt-1">
                              Registered Sender Reference: <strong className="text-paper">{order.paymentSenderDetail}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Cash on Delivery Notice Banner */}
                    {order.paymentMethod === "cash" && order.status !== "Delivered" && (
                      <div className="p-4 bg-ink-surface/80 border border-gold/30 rounded-xs flex items-start gap-3 text-xs font-mono animate-in fade-in">
                        <Banknote className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <div className="text-gold font-bold uppercase tracking-wider flex items-center gap-2">
                            <span>Doorstep Cash Collection</span>
                          </div>
                          <p className="text-text-muted leading-relaxed">
                            Your order is confirmed and scheduled for packaging. Please ensure the exact cash amount ({formatPrice(order.total)}) is ready upon doorstep delivery. Digital reading access unlocks automatically once the parcel is delivered.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Shipping Courier Details Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-ink/70 rounded-xs border border-ink-border/60 text-xs font-mono">
                      <div className="flex items-center gap-2 text-text-muted">
                        <Truck strokeWidth={1.4} className="w-4 h-4 text-gold shrink-0" />
                        <span>{order.courier || "Bosta Egypt Express — 6th of October Hub"}</span>
                        <span className="text-paper font-semibold">({order.trackingNumber || "EG-OCT-9842-CAI"})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleCopyTracking(order.trackingNumber || "EG-OCT-9842-CAI")}
                          className="text-[10px] text-gold hover:text-paper flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedTracking ? (
                            <>
                              <Check strokeWidth={1.5} className="w-3 h-3 text-gold" />
                              <span className="text-gold font-bold">COPIED</span>
                            </>
                          ) : (
                            <>
                              <Copy strokeWidth={1.4} className="w-3 h-3" />
                              <span>COPY WAYBILL</span>
                            </>
                          )}
                        </button>
                        <span className="text-text-muted">•</span>
                        <span className="text-text-muted text-[10px]">
                          ETA: <span className="text-paper">{order.estimatedDelivery || "Sep 08 – Sep 09 (Egypt Express)"}</span>
                        </span>
                      </div>
                    </div>

                    {/* Timeline Progression Line: Exact pixel-perfect alignment */}
                    <div className="py-6 px-4 sm:px-8 bg-ink/50 rounded-sm border border-ink-border/50">
                      <div className="relative max-w-2xl mx-auto">
                        {/* Connecting Line Track */}
                        <div className="absolute top-3 left-3 right-3 h-0.5 z-0 pointer-events-none">
                          <div className="w-full h-full bg-ink-border" />
                          <div
                            className="absolute top-0 left-0 h-full bg-gold transition-all duration-500"
                            style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                          />
                        </div>

                        <div className="relative z-10 flex justify-between items-center">
                          {steps.map((step, idx) => {
                            const isDone = idx <= currentStepIndex;
                            const isCurrent = idx === currentStepIndex;

                            return (
                              <div key={step.key} className="flex flex-col items-center">
                                {/* Step Circle with Clean Subtle Pulse on Active Point */}
                                <div className="relative flex items-center justify-center">
                                  {isCurrent && (
                                    <span className="absolute -inset-1 rounded-full bg-gold/50 animate-ping pointer-events-none" />
                                  )}

                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                      isDone
                                        ? "bg-gold text-ink font-bold shadow-sm"
                                        : "bg-ink border-2 border-ink-border text-text-muted"
                                    }`}
                                  >
                                    {isDone ? (
                                      <CheckCircle2 strokeWidth={2.5} className="w-3.5 h-3.5" />
                                    ) : (
                                      <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                                    )}
                                  </div>
                                </div>

                                <span
                                  className={`text-[10px] font-mono tracking-wider uppercase mt-2 text-center ${
                                    isCurrent ? "text-gold font-bold" : isDone ? "text-paper" : "text-text-muted"
                                  }`}
                                >
                                  {step.label}
                                </span>
                                <span className="text-[9px] font-mono text-text-muted/70 hidden sm:block">
                                  {step.detail}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Enclosed Volumes Grid with Authentic High-Res Covers */}
                    <div className="space-y-3 pt-2">
                      <span className="text-[11px] font-mono tracking-wider text-text-muted uppercase block">
                        ITEMS ({order.items.length}):
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {order.items.map((item, i) => {
                          const canonical = getCanonicalVolume(item);
                          const cover = canonical?.coverImage || item.coverImage || "https://dw9to29mmj727.cloudfront.net/products/1569319014.jpg";
                          const targetVolumeId = canonical?.id || item.volumeId || item.id;

                          return (
                            <div
                              key={i}
                              className="group flex items-center gap-3.5 p-3 rounded-xs bg-ink/60 border border-ink-border/60 hover:border-gold/40 transition-colors"
                            >
                              {/* Book Cover */}
                              <div className="relative w-14 h-20 sm:w-16 sm:h-22 shrink-0 overflow-hidden rounded-xs border border-ink-border bg-ink">
                                <img
                                  src={cover}
                                  alt={item.title}
                                  onError={(e) => {
                                    if (canonical?.coverImage && e.currentTarget.src !== canonical.coverImage) {
                                      e.currentTarget.src = canonical.coverImage;
                                    } else {
                                      e.currentTarget.src = "https://dw9to29mmj727.cloudfront.net/products/1569319014.jpg";
                                    }
                                  }}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                {!isPaid && (
                                  <div className="absolute inset-0 bg-ink/60 flex items-center justify-center pointer-events-none">
                                    <Lock className="w-4 h-4 text-amber-400" />
                                  </div>
                                )}
                              </div>

                              {/* Book Metadata */}
                              <div className="flex-1 min-w-0 flex flex-col justify-between h-20 sm:h-22 py-0.5">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono text-gold uppercase tracking-wider">
                                      {item.seriesTitle}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded-xs bg-ink text-[8px] font-mono text-text-muted border border-ink-border">
                                      {item.format || "Tankōbon"}
                                    </span>
                                  </div>
                                  <Link
                                    href={`/manga/${targetVolumeId}`}
                                    className="font-bold text-paper hover:text-gold transition-colors text-xs sm:text-sm line-clamp-1 block mt-0.5"
                                  >
                                    {item.title}
                                  </Link>
                                  <p className="text-[10px] font-mono text-text-muted">
                                    Volume {item.volumeNumber} • Qty: {item.quantity || 1}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-ink-border/40">
                                  <span className="font-mono text-paper font-semibold text-xs">
                                    {formatPrice(item.price ?? 0)}
                                  </span>

                                  {canonical && (
                                    isPaid ? (
                                      <button
                                        type="button"
                                        onClick={() => openReader(canonical)}
                                        className="text-[10px] font-mono text-gold hover:text-paper transition-colors flex items-center gap-1 cursor-pointer"
                                      >
                                        <BookOpen strokeWidth={1.3} className="w-3 h-3" />
                                        <span>READ ARCHIVE</span>
                                      </button>
                                    ) : (
                                      <div
                                        className="flex items-center gap-1 text-[9px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-xs border border-amber-500/30 select-none"
                                        title="Reading access is locked until payment is confirmed by administrator"
                                      >
                                        <Lock strokeWidth={1.3} className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                        <span>LOCKED (AWAITING PAYMENT)</span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Order Action Protocol Bar */}
                    <div className="pt-4 border-t border-ink-border/60 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedInvoiceOrder(order)}
                          className="px-4 py-2 bg-ink border border-ink-border hover:border-gold text-paper hover:text-gold font-mono text-[11px] tracking-wider uppercase rounded-xs transition-colors flex items-center gap-1.5"
                        >
                          <FileText strokeWidth={1.4} className="w-3.5 h-3.5" />
                          <span>ARCHIVE RECEIPT / INVOICE</span>
                        </button>
                        <button
                          onClick={() => handleReorder(order)}
                          className="px-4 py-2 bg-ink border border-ink-border hover:border-gold text-paper hover:text-gold font-mono text-[11px] tracking-wider uppercase rounded-xs transition-colors flex items-center gap-1.5"
                        >
                          <RotateCcw strokeWidth={1.4} className="w-3.5 h-3.5" />
                          <span>REORDER VOLUMES</span>
                        </button>
                      </div>

                      <span className="text-[10px] font-mono text-text-muted">
                        Reinforced Packaging with Corner Protectors (Dispatched from 6th of October Hub)
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: DIGITAL LIBRARY (Cloud & Offline Reader)          */}
        {/* ========================================================= */}
        {activeTab === "LIBRARY" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-ink-border/60 gap-2">
              <div>
                <span className="text-xs font-mono text-gold uppercase tracking-wider block">
                  UNLOCKED DIGITAL ARCHIVE ({digitalLibraryVolumes.length} EDITIONS)
                </span>
                <span className="text-[11px] text-text-muted font-mono">
                  Continuous High-Resolution Japanese Right-to-Left (RTL) Reader
                </span>
              </div>
              <span className="text-[10px] font-mono text-text-muted bg-ink-surface px-2.5 py-1 rounded-xs border border-ink-border">
                CLOUD SYNC: ACTIVE
              </span>
            </div>

            {digitalLibraryVolumes.length === 0 ? (
              <div className="p-16 border border-ink-border bg-ink-surface/30 rounded-sm text-center space-y-4">
                <BookOpen strokeWidth={1.2} className="w-12 h-12 text-text-muted mx-auto" />
                <p className="font-mono text-sm text-paper">NO DIGITAL EDITIONS UNLOCKED YET</p>
                <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
                  Every physical manga volume you order from KAIRO automatically unlocks lifetime instant cloud reading access in your digital archive.
                </p>
                <Link
                  href="/manga"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-paper text-ink font-bold text-xs font-mono uppercase tracking-widest hover:bg-vermilion hover:text-white transition-colors rounded-xs"
                >
                  <span>BROWSE ARCHIVE</span>
                  <ArrowRight strokeWidth={1.5} className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {digitalLibraryVolumes.map((volume) => {
                  const progress = progressMap[volume.id];
                  const percentage = progress ? progress.percentage : 0;
                  const isCompleted = progress ? progress.isCompleted : false;
                  const currentPageNum = progress ? progress.currentPage + 1 : 0;
                  const totalPagesNum = progress ? progress.totalPages : (volume.previewPages?.length || 1);

                  return (
                    <div
                      key={volume.id}
                      onClick={() => openReader(volume)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openReader(volume);
                        }
                      }}
                      className="group bg-ink-surface/40 border border-ink-border/70 rounded-sm overflow-hidden hover:border-gold/60 transition-all flex flex-col justify-between cursor-pointer hover:shadow-xl hover:shadow-black/50 select-none"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-ink">
                        <img
                          src={volume.coverImage}
                          alt={volume.title}
                          draggable={false}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                        />
                        <div className="absolute top-2.5 left-2.5 pointer-events-none z-10 flex flex-col gap-1">
                          <span className="px-2 py-0.5 rounded-xs bg-ink/90 text-[9px] font-mono text-gold border border-ink-border">
                            VOL. {volume.volumeNumber}
                          </span>
                          {isCompleted ? (
                            <span className="px-2 py-0.5 rounded-xs bg-gold/15 text-[8px] font-mono text-gold font-bold border border-gold/40">
                              COMPLETED
                            </span>
                          ) : percentage > 0 ? (
                            <span className="px-2 py-0.5 rounded-xs bg-gold/90 text-[8px] font-mono text-ink font-bold border border-gold">
                              IN PROGRESS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-xs bg-ink/90 text-[8px] font-mono text-text-muted border border-ink-border">
                              UNREAD
                            </span>
                          )}
                        </div>

                        {/* Real Dynamic Reading Progress Bar at Bottom of Cover */}
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-ink/90 z-10">
                          <div
                            className="h-full bg-gold transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div>
                          <span className="text-[9px] font-mono text-gold uppercase block">
                            {volume.seriesTitle}
                          </span>
                          <h4 className="text-xs font-bold text-paper line-clamp-1 group-hover:text-gold transition-colors">
                            {volume.title}
                          </h4>
                          <span className="text-[10px] font-mono text-text-muted block mt-0.5">
                            {isCompleted
                              ? `100% Read • Completed`
                              : percentage > 0
                              ? `${percentage}% Read • Page ${currentPageNum} of ${totalPagesNum}`
                              : `Not Started • ${volume.pages} Pages`}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openReader(volume);
                          }}
                          className={`w-full py-2 font-bold text-xs font-mono tracking-wider uppercase transition-colors rounded-xs flex items-center justify-center gap-1.5 z-10 active:scale-95 ${
                            isCompleted
                              ? "bg-ink border border-ink-border hover:border-gold text-paper hover:text-gold"
                              : percentage > 0
                              ? "bg-gold text-ink hover:bg-paper shadow-md shadow-gold/20"
                              : "bg-paper text-ink hover:bg-gold"
                          }`}
                        >
                          <Eye strokeWidth={1.4} className="w-3.5 h-3.5" />
                          <span>
                            {isCompleted
                              ? "READ AGAIN (RTL)"
                              : percentage > 0
                              ? `CONTINUE (P. 0${currentPageNum})`
                              : "START READING (RTL)"}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Locked Editions awaiting payment confirmation */}
            {pendingLibraryVolumes.length > 0 && (
              <div className="pt-6 border-t border-ink-border/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                      LOCKED EDITIONS — AWAITING PAYMENT CONFIRMATION ({pendingLibraryVolumes.length})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted">
                    Instant reader access automatically activates once payment is verified
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {pendingLibraryVolumes.map(({ volume, order }) => (
                    <div
                      key={volume.id}
                      className="bg-ink-surface/20 border border-ink-border/50 rounded-sm overflow-hidden flex flex-col justify-between select-none opacity-80"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-ink">
                        <img
                          src={volume.coverImage}
                          alt={volume.title}
                          className="w-full h-full object-cover filter grayscale contrast-125 pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-ink/70 flex flex-col items-center justify-center p-3 text-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                            <Lock className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                            LOCKED
                          </span>
                          <span className="text-[9px] font-mono text-text-muted">
                            Order #{order.id} • {order.paymentMethod === "wallet" ? "Mobile Wallet" : order.paymentMethod === "instapay" ? "InstaPay" : "Cash on Delivery"}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-2 bg-ink/60">
                        <span className="text-[9px] font-mono text-text-muted uppercase block">
                          {volume.seriesTitle}
                        </span>
                        <h4 className="text-xs font-bold text-text-muted line-clamp-1">
                          {volume.title}
                        </h4>
                        <div className="text-[9px] font-mono text-amber-400/80 pt-1 border-t border-ink-border/40 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Awaiting Payment Approval</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: WISHLIST                                          */}
        {/* ========================================================= */}
        {activeTab === "WISHLIST" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Wishlist Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-ink-border/70 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-gold" />
                  <span className="text-[11px] font-mono tracking-widest text-gold uppercase">
                    CURATED ARCHIVE COLLECTION
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-paper">
                  SAVED WISHLIST ({wishlist.length} {wishlist.length === 1 ? "VOLUME" : "VOLUMES"})
                </h2>
                <p className="text-xs text-text-muted font-mono mt-0.5">
                  Priority bookmark queue with live 6th of October archive inventory and delivery across all Egypt.
                </p>
              </div>

              {wishlist.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={clearWishlist}
                    className="px-3 py-2 border border-ink-border hover:border-vermilion hover:text-vermilion text-text-muted text-[11px] font-mono uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                  >
                    CLEAR ALL
                  </button>
                  <button
                    type="button"
                    onClick={moveAllWishlistToCart}
                    className="px-4 py-2 bg-paper text-ink hover:bg-vermilion hover:text-white text-[11px] font-mono font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer"
                  >
                    <ShoppingBag strokeWidth={1.4} className="w-3.5 h-3.5" />
                    <span>MOVE ALL TO CART</span>
                  </button>
                </div>
              )}
            </div>

            {wishlist.length === 0 ? (
              <div className="py-20 px-6 border border-ink-border/80 bg-ink-surface/25 rounded-sm text-center space-y-4 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center select-none font-serif text-9xl text-gold">
                  回路
                </div>
                <div className="relative z-10 max-w-md mx-auto space-y-3">
                  <div className="w-14 h-14 rounded-full bg-ink-surface border border-ink-border flex items-center justify-center mx-auto text-text-muted">
                    <Heart strokeWidth={1.3} className="w-6 h-6 text-gold" />
                  </div>
                  <h3 className="font-mono text-base font-bold text-paper tracking-wider uppercase">
                    YOUR WISHLIST IS CURRENTLY EMPTY
                  </h3>
                  <p className="text-xs text-text-muted font-sans leading-relaxed">
                    Bookmark collector editions, new releases, and upcoming volumes while browsing the catalog. Your saved titles will appear here with live stock tracking.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/manga"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-paper text-ink font-bold text-xs font-mono uppercase tracking-widest hover:bg-vermilion hover:text-white transition-all rounded-xs shadow-xl active:scale-95"
                    >
                      <span>EXPLORE ARCHIVE CATALOG</span>
                      <ArrowRight strokeWidth={1.5} className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                {wishlist.map((volume) => (
                  <div
                    key={volume.id}
                    className="group bg-ink-surface/40 border border-ink-border/70 rounded-sm overflow-hidden hover:border-gold/60 transition-all duration-300 flex flex-col justify-between hover:shadow-xl hover:shadow-black/50 select-none"
                  >
                    {/* Cover Media Container */}
                    <div className="relative aspect-[3/4] overflow-hidden bg-ink">
                      <Link href={`/manga/${volume.id}`} className="block w-full h-full">
                        <img
                          src={volume.coverImage}
                          alt={volume.title}
                          draggable={false}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                        />
                      </Link>

                      {/* Badges Overlay */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none z-10">
                        <span className="px-2 py-0.5 rounded-xs bg-ink/90 backdrop-blur-md text-[9px] font-mono tracking-wider text-gold border border-ink-border">
                          VOL. {volume.volumeNumber < 10 ? `0${volume.volumeNumber}` : volume.volumeNumber}
                        </span>
                        {volume.format === "Deluxe Edition" && (
                          <span className="px-2 py-0.5 rounded-xs bg-gold/90 text-[8px] font-mono tracking-wider text-ink font-bold">
                            DELUXE
                          </span>
                        )}
                        {volume.originalPrice && volume.originalPrice > volume.price && (
                          <span className="px-2 py-0.5 rounded-xs bg-vermilion text-[8px] font-mono font-bold tracking-wider text-white shadow-sm">
                            SALE -{Math.round(((volume.originalPrice - volume.price) / volume.originalPrice) * 100)}%
                          </span>
                        )}
                      </div>

                      {/* Action Buttons Top Right: Remove & Preview */}
                      <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
                        <button
                          type="button"
                          onClick={() => removeFromWishlist(volume.id)}
                          className="p-1.5 rounded-xs bg-ink/80 backdrop-blur-md border border-ink-border text-paper-muted hover:text-vermilion hover:border-vermilion transition-colors active:scale-90 cursor-pointer"
                          title="Remove from wishlist"
                          aria-label="Remove volume"
                        >
                          <Trash2 strokeWidth={1.4} className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openReader(volume)}
                          className="p-1.5 rounded-xs bg-ink/80 backdrop-blur-md border border-ink-border text-paper-muted hover:text-gold hover:border-gold transition-colors opacity-0 group-hover:opacity-100 active:scale-90 cursor-pointer"
                          title="Read Sample (RTL)"
                        >
                          <Eye strokeWidth={1.4} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-4 flex flex-col justify-between flex-1">
                      <div>
                        <span className="text-[9px] font-mono tracking-widest text-gold uppercase block">
                          {volume.seriesTitle}
                        </span>
                        <Link
                          href={`/manga/${volume.id}`}
                          className="text-xs sm:text-sm font-bold text-paper tracking-wide group-hover:text-gold transition-colors line-clamp-1 mt-0.5 block"
                        >
                          {volume.title}
                        </Link>
                        <p className="text-[10px] text-text-muted mt-0.5 line-clamp-1">
                          By {volume.author}
                        </p>

                        {/* Rating & Stock */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-ink-border/40 text-[10px] font-mono">
                          <div className="flex items-center gap-1 text-text-muted">
                            <Star strokeWidth={1.5} className="w-3 h-3 text-gold fill-gold" />
                            <span className="text-paper font-semibold">{volume.rating.toFixed(1)}</span>
                          </div>
                          <span className="text-gold tracking-wider uppercase">
                            IN STOCK
                          </span>
                        </div>
                      </div>

                      {/* Price & Add to Cart Action */}
                      <div className="mt-4 pt-3 border-t border-ink-border/50 flex items-center justify-between">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-mono font-bold text-paper">
                            {formatPrice(volume.price)}
                          </span>
                          {volume.originalPrice && volume.originalPrice > volume.price && (
                            <span className="text-[10px] font-mono text-text-muted/70 line-through">
                              {formatPrice(volume.originalPrice)}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            addItem(volume, 1);
                            openCart();
                          }}
                          className="px-3.5 py-1.5 bg-paper text-ink hover:bg-vermilion hover:text-white font-bold text-[10px] font-mono tracking-widest uppercase transition-colors rounded-xs flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                        >
                          <ShoppingBag strokeWidth={1.3} className="w-3 h-3" />
                          <span>ADD</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: SETTINGS                                          */}
        {/* ========================================================= */}
        {activeTab === "SETTINGS" && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Delivery & Shipping Info Card */}
            <form onSubmit={handleSaveSettings} className="p-6 sm:p-7 bg-ink-surface/40 border border-ink-border/80 rounded-sm space-y-5 shadow-sm">
              <div className="border-b border-ink-border/60 pb-3">
                <h3 className="text-xs font-mono tracking-widest text-gold uppercase font-bold flex items-center gap-2">
                  <Truck strokeWidth={1.5} className="w-4 h-4 text-gold" />
                  <span>SHIPPING & DELIVERY PREFERENCES</span>
                </h3>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className="text-[10px] text-text-muted uppercase block mb-1.5 font-medium">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={patronName}
                    onChange={(e) => setPatronName(e.target.value)}
                    className="w-full bg-ink border border-ink-border px-3.5 py-2.5 text-paper rounded-xs focus:border-gold outline-none cursor-text caret-gold text-xs transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-text-muted uppercase block mb-1.5 font-medium">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={patronPhone}
                      onChange={(e) => setPatronPhone(e.target.value)}
                      className="w-full bg-ink border border-ink-border px-3.5 py-2.5 text-paper rounded-xs focus:border-gold outline-none cursor-text caret-gold text-xs transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted uppercase block mb-1.5 font-medium">
                      Governorate
                    </label>
                    <CustomSelect
                      options={GOVERNORATE_OPTIONS}
                      value={patronGovernorate}
                      onChange={(val) => setPatronGovernorate(val)}
                      fullWidth
                      buttonClassName="bg-ink py-2.5 text-xs border-ink-border"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-text-muted uppercase block mb-1.5 font-medium">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Street, building, apartment, landmark..."
                    className="w-full bg-ink border border-ink-border px-3.5 py-2.5 text-paper rounded-xs focus:border-gold outline-none cursor-text caret-gold text-xs transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-paper text-ink hover:bg-gold font-mono font-bold text-xs uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
                {settingsSavedMessage && (
                  <span className="text-xs text-gold font-mono animate-in fade-in flex items-center gap-1.5">
                    <Check strokeWidth={1.8} className="w-3.5 h-3.5" />
                    <span>{settingsSavedMessage}</span>
                  </span>
                )}
              </div>
            </form>

            {/* Account Details & Security Card */}
            <div className="p-6 sm:p-7 bg-ink-surface/40 border border-ink-border/80 rounded-sm space-y-4 shadow-sm">
              <div className="border-b border-ink-border/60 pb-3">
                <h3 className="text-xs font-mono tracking-widest text-gold uppercase font-bold flex items-center gap-2">
                  <ShieldCheck strokeWidth={1.5} className="w-4 h-4 text-gold" />
                  <span>ACCOUNT & SECURITY</span>
                </h3>
              </div>

              <div className="space-y-2.5 text-xs font-mono text-text-muted">
                <div className="flex items-center justify-between py-1.5 border-b border-ink-border/40">
                  <span>Registered Email</span>
                  <div className="flex items-center gap-2">
                    <span className="text-paper font-semibold">{currentUser.email}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px]">
                      Verified
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-ink-border/40">
                  <span>Membership ID</span>
                  <span className="text-gold font-semibold">#{currentUser.id}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span>Member Since</span>
                  <span className="text-paper">{currentUser.joinedDate || "Sep 2026"}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-ink-border/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(currentUser.email);
                    setForgotStep("EMAIL");
                    setForgotOtp("");
                    setForgotNewPassword("");
                    setForgotConfirmPassword("");
                    setForgotError("");
                    setForgotSuccess("");
                    setIsForgotMode(true);
                  }}
                  className="text-xs font-mono text-gold hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound strokeWidth={1.4} className="w-3.5 h-3.5" />
                  <span>Reset / Change Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => logout()}
                  className="px-4 py-2 bg-vermilion/10 border border-vermilion/40 text-vermilion hover:bg-vermilion hover:text-white font-mono text-xs uppercase tracking-wider rounded-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  <LogOut strokeWidth={1.4} className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Subtle Replay Tour link */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleResetIntro}
                className="text-[11px] font-mono text-text-muted/60 hover:text-gold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw strokeWidth={1.4} className="w-3 h-3" />
                <span>Replay Cinematic Intro Tour</span>
              </button>
              {introResetMessage && (
                <p className="text-xs text-gold font-mono animate-in fade-in mt-2">
                  {introResetMessage}
                </p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ========================================================= */}
      {/* EGYPT ARCHIVAL INVOICE MODAL                              */}
      {/* ========================================================= */}
      {selectedInvoiceOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-transparent print:static print:block">
          <div
            id="invoice-print-area"
            className="bg-ink border border-ink-border w-full max-w-xl rounded-sm p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200 print:shadow-none print:border print:border-black/20 print:bg-white print:text-black print:p-6 print:m-0"
          >
            {/* Close Button - hidden in print */}
            <button
              onClick={() => setSelectedInvoiceOrder(null)}
              className="absolute top-5 right-5 text-text-muted hover:text-paper print-hidden print:hidden cursor-pointer"
            >
              <X strokeWidth={1.5} className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="border-b border-ink-border/80 print:border-black/20 pb-4 text-center space-y-1">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <div className="w-6 h-6 bg-vermilion rounded-xs flex items-center justify-center text-paper font-serif font-bold text-xs print:bg-neutral-900 print:text-white">
                  回路
                </div>
                <span className="font-extrabold tracking-[0.2em] text-sm uppercase text-paper print:text-black font-sans">
                  KAIRO PUBLISHING ARCHIVE
                </span>
              </div>
              <span className="text-[10px] font-mono tracking-[0.3em] text-gold print:text-neutral-700 uppercase block">
                6TH OF OCTOBER CENTRAL ARCHIVAL HUB — EGYPT
              </span>
              <h2 className="text-xl font-extrabold tracking-tight uppercase font-sans text-paper print:text-black">
                OFFICIAL ORDER RECEIPT
              </h2>
              <p className="text-[11px] font-mono text-text-muted print:text-neutral-600">
                INVOICE #{selectedInvoiceOrder.id} • DATE: {selectedInvoiceOrder.date}
              </p>
            </div>

            {/* Details Table */}
            <div className="space-y-3 font-mono text-xs">
              <div className="border border-ink-border/60 print:border-black/20 rounded-xs overflow-hidden">
                <div className="grid grid-cols-12 bg-ink-surface/80 print:bg-neutral-100 p-2.5 text-[10px] text-text-muted print:text-neutral-700 uppercase border-b border-ink-border/60 print:border-black/20 font-bold">
                  <div className="col-span-7">ITEM DESCRIPTION</div>
                  <div className="col-span-2 text-center">QTY</div>
                  <div className="col-span-3 text-right">AMOUNT</div>
                </div>

                <div className="divide-y divide-ink-border/40 print:divide-black/10">
                  {selectedInvoiceOrder.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 p-2.5 text-[11px] text-paper print:text-black">
                      <div className="col-span-7 line-clamp-1 print:line-clamp-none">
                        {item.seriesTitle} — {item.title}
                      </div>
                      <div className="col-span-2 text-center text-text-muted print:text-neutral-700">
                        {item.quantity || 1}
                      </div>
                      <div className="col-span-3 text-right font-bold">
                        {formatPrice((item.price || 12.99) * (item.quantity || 1))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Calculations */}
              <div className="space-y-1.5 pt-2 border-t border-ink-border/60 print:border-black/20 text-xs">
                <div className="flex justify-between text-text-muted print:text-neutral-700">
                  <span>Subtotal</span>
                  <span className="font-bold">{formatPrice(selectedInvoiceOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-text-muted print:text-neutral-700">
                  <span>Reinforced Shipping (Bosta Egypt Express)</span>
                  <span className="font-bold">{formatPrice(selectedInvoiceOrder.shippingCost || 4.00)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-paper print:text-black pt-2 border-t border-ink-border/80 print:border-black/30">
                  <span>Grand Total</span>
                  <span className="text-gold print:text-black font-extrabold">{formatPrice(selectedInvoiceOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Courier Stamp / Seal */}
            <div className="p-3 bg-ink-surface/50 print:bg-neutral-50 border border-ink-border print:border-black/20 rounded-xs flex items-center justify-between text-[10px] font-mono text-text-muted print:text-neutral-700">
              <div>
                <span className="text-gold print:text-black block font-semibold">AUTHENTICITY STAMP:</span>
                <span>KAIRO EGYPT SEAL #KRO-OCT-88219</span>
              </div>
              <div className="text-right">
                <span className="block">TRACKING CODE:</span>
                <span className="text-paper print:text-black font-bold">{selectedInvoiceOrder.trackingNumber || "EG-OCT-9842-CAI"}</span>
              </div>
            </div>

            {/* Actions - hidden when printing */}
            <div className="flex items-center justify-end gap-3 pt-2 print-hidden print:hidden">
              <button
                type="button"
                onClick={() => setSelectedInvoiceOrder(null)}
                className="px-4 py-2 border border-ink-border text-paper hover:bg-ink-surface text-xs font-mono uppercase rounded-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handlePrintInvoice(selectedInvoiceOrder)}
                className="px-5 py-2 bg-paper text-ink hover:bg-gold font-mono font-bold text-xs uppercase rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer strokeWidth={1.4} className="w-3.5 h-3.5" />
                <span>PRINT / SAVE PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink pt-32 text-center font-mono">LOADING ACCOUNT...</div>}>
      <AccountContent />
    </Suspense>
  );
}
