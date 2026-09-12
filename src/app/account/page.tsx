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
  Lock,
  Smartphone,
  Zap,
} from "lucide-react";
import { ALL_VOLUMES, MangaVolume } from "@/data/manga";
import { EGYPT_GOVERNORATES } from "@/data/governorates";
import { useCartStore } from "@/store/useCartStore";
import { useStorefrontStore, getActiveGovernorates } from "@/store/useStorefrontStore";
import { useWishlistStore, useMounted } from "@/store/useWishlistStore";
import { useUIStore } from "@/store/useUIStore";
import { fetchGuestOrders, readGuestOrderRefs } from "@/lib/guestOrders";
import { useAuthStore, SavedOrder, SavedOrderItem } from "@/store/useAuthStore";
import { useReaderStore } from "@/store/useReaderStore";
import { formatPrice } from "@/lib/utils";
import { escapeHtml, validateEmail, validatePassword, validateEgyptianPhone, verifyEmailAddress, sendOtpEmail, verifyOtpCode } from "@/lib/security";
import { CustomSelect } from "@/components/CustomSelect";
import { WelcomeOfferBanner } from "@/components/WelcomeOfferBanner";
import { useTranslation } from "@/hooks/useTranslation";
import { PLACEHOLDER_COVER } from "@/config/mediaDefaults";
import { AnimeVerseImage } from "@/components/AnimeVerseImage";

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
    error_callback?: (error: { type?: string }) => void;
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

const GOVERNORATE_OPTIONS = EGYPT_GOVERNORATES.map((g) => ({
  value: g.value,
  label: g.labelAr ? `${g.label} (${g.labelAr})` : g.label,
}));

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
  const { locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
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
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const logout = useAuthStore((state) => state.logout);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const shippingConfig = useStorefrontStore((state) => state.shippingConfig);
  const storeEditorial = useStorefrontStore((state) => state.editorialConfig);
  const storeContactEmail = storeEditorial?.contactEmail || "";
  const storeContactPhone = storeEditorial?.contactPhone || "";

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
                  const res = await fetch("/api/auth/google", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ accessToken: tokenResponse.access_token }),
                  });
                  const data = await res.json().catch(() => null);
                  if (!data?.success || !data.user?.id) {
                    throw new Error(data?.message || "Google profile verification failed");
                  }
                  await loginWithGoogle({
                    ...data.user,
                    name: data.user.name || data.profile?.name || data.user.email.split("@")[0],
                    avatar: data.profile?.picture,
                  });
                } catch (fetchErr) {
                  console.error("Failed to verify Google account", fetchErr);
                  setAuthError(fetchErr instanceof Error ? fetchErr.message : "Google account verification failed. Please try again.");
                }
              }
              setIsGoogleLoading(false);
            },
            error_callback: (error: { type?: string }) => {
              console.error("Google OAuth popup error", error);
              setIsGoogleLoading(false);
              setAuthError(
                error?.type === "popup_closed"
                  ? "Google sign-in window was closed before completion."
                  : "Google authentication could not complete. Please try again."
              );
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

    // Without a configured Client ID there is no way to prove the account is
    // real, and a client-only "session" would vanish on the next refresh.
    setIsGoogleLoading(false);
    setAuthError("Google sign-in is not configured. Please sign in with your email and password.");
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
      
      // Reset password securely on server
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          otp: forgotOtp.trim(),
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setForgotError(data.message || "Failed to update password.");
        return;
      }

      // Immediately log patron into session
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
  const [shippingAddress, setShippingAddress] = useState(currentUser?.address || "");
  const [patronName, setPatronName] = useState(currentUser?.name || "");
  const [patronPhone, setPatronPhone] = useState(currentUser?.phone || "");
  const [patronGovernorate, setPatronGovernorate] = useState(
    currentUser?.governorate
      ? EGYPT_GOVERNORATES.find((g) => g.value.toLowerCase().includes((currentUser.governorate || "").toLowerCase()))?.value || "Cairo"
      : "Cairo"
  );
  const [patronCity, setPatronCity] = useState(currentUser?.city || "");
  const [patronDeliveryNotes, setPatronDeliveryNotes] = useState(currentUser?.deliveryNotes || "");
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<"cash" | "wallet" | "instapay">(
    currentUser?.preferredPaymentMethod || "cash"
  );
  const [paymentSenderDetail, setPaymentSenderDetail] = useState(currentUser?.paymentSenderDetail || "");
  const [settingsSavedMessage, setSettingsSavedMessage] = useState("");
  const [settingsErrorMessage, setSettingsErrorMessage] = useState("");

  const activeGovernorates = useMemo(() => {
    return getActiveGovernorates(shippingConfig);
  }, [shippingConfig]);

  const governorateSelectOptions = useMemo(() => {
    return activeGovernorates.map((g) => ({
      value: g.value,
      label: isArabic ? (g.labelAr || g.label) : g.label,
    }));
  }, [activeGovernorates, isArabic]);

  useEffect(() => {
    // async: the guest branch below resolves order references against the server.
    const raf = requestAnimationFrame(async () => {
      if (currentUser) {
        const matchedGov = activeGovernorates.find((g) =>
          g.value.toLowerCase().includes((currentUser.governorate || "").toLowerCase()) ||
          (currentUser.governorate || "").toLowerCase().includes(g.value.toLowerCase())
        );
        setPatronName(currentUser.name || "");
        setShippingAddress(currentUser.address || "");
        setPatronPhone(currentUser.phone || "");
        setPatronGovernorate(matchedGov ? matchedGov.value : (currentUser.governorate || "Cairo"));
        setPatronCity(currentUser.city || "");
        setPatronDeliveryNotes(currentUser.deliveryNotes || "");
        setPreferredPaymentMethod(currentUser.preferredPaymentMethod || "cash");
        setPaymentSenderDetail(currentUser.paymentSenderDetail || "");

        const seen = new Set<string>();
        const uniqueOrders: SavedOrder[] = [];
        for (const ord of (currentUser.orders || [])) {
          if (!ord?.id || seen.has(ord.id)) continue;
          seen.add(ord.id);
          uniqueOrders.push({
            ...ord,
            trackingNumber: ord.trackingNumber || "EG-OCT-9842-CAI",
            courier: ord.courier || "Bosta Egypt Express — 6th of October Hub",
            estimatedDelivery: ord.estimatedDelivery || "Sep 08 – Sep 09, 2026 (All Egypt Delivery)",
            items: (ord.items || []).map((item) => {
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
        setOrders(uniqueOrders);
      } else {
        // Guest user: the device holds order references only, so the records
        // are read back from the server rather than from localStorage.
        const guestOrders: SavedOrder[] = [];
        if (typeof window !== "undefined") {
          try {
            const parsed = (await fetchGuestOrders()) as unknown as SavedOrder[];
            {
              {
                const seen = new Set<string>();
                for (const ord of parsed) {
                  if (!ord?.id || seen.has(ord.id)) continue;
                  seen.add(ord.id);
                  guestOrders.push({
                    ...ord,
                    trackingNumber: ord.trackingNumber || "EG-OCT-9842-CAI",
                    courier: ord.courier || "Bosta Egypt Express — 6th of October Hub",
                    estimatedDelivery: ord.estimatedDelivery || "Sep 08 – Sep 09, 2026 (All Egypt Delivery)",
                    items: (ord.items || []).map((item: SavedOrderItem) => {
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
              }
            }
          } catch {
            // ignore
          }
        }
        setOrders(guestOrders);
        if (guestOrders.length > 0) {
          setPatronName(guestOrders[0]?.customerName || "");
          setShippingAddress(guestOrders[0]?.customerAddress || "");
          setPatronPhone(guestOrders[0]?.customerPhone || "");
          setPatronGovernorate(guestOrders[0]?.customerGovernorate || "Cairo");
          setPatronCity(guestOrders[0]?.customerCity || "");
          setPatronDeliveryNotes(guestOrders[0]?.deliveryNotes || "");
        } else {
          setPatronName("");
          setShippingAddress("");
          setPatronPhone("");
          setPatronGovernorate("Cairo");
          setPatronCity("");
          setPatronDeliveryNotes("");
          setPreferredPaymentMethod("cash");
          setPaymentSenderDetail("");
        }
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [currentUser, activeGovernorates]);

  // Google patrons receive a signed server session. Refresh their orders from
  // Neon so an admin status change appears without relying on stale browser
  // Refresh patron orders directly from server Neon DB so admin status changes
  // (e.g. Confirmed, In Transit, Shipped, Delivered) reflect immediately on the site.
  // The poll below reads the orders it already knows about, but it must not be
  // torn down and restarted every time that list changes — it runs on an eight
  // second timer and a focus listener. A ref carries the latest list in without
  // becoming a dependency.
  const ordersRef = React.useRef<SavedOrder[]>(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    let disposed = false;

    const refreshCentralOrders = async () => {
      try {
        if (currentUser?.email) {
          // 1. Authenticated user: fetch their verified orders from server
          const response = await fetch("/api/orders/mine", { cache: "no-store" });
          const payload = await response.json().catch(() => null);
          if (!disposed && payload?.success && Array.isArray(payload.orders)) {
            setOrders(payload.orders as SavedOrder[]);
            return;
          }
        }

        // 2. Guest user or fallback: sync status of locally known order IDs from Neon DB
        const currentOrderIds = (ordersRef.current || []).map((o) => o.id).filter(Boolean);
        if (typeof window !== "undefined") {
          for (const ref of readGuestOrderRefs()) {
            if (!currentOrderIds.includes(ref.id)) currentOrderIds.push(ref.id);
          }
        }

        if (currentOrderIds.length > 0) {
          const res = await fetch("/api/orders/status-check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderIds: currentOrderIds }),
          });
          const data = await res.json().catch(() => null);
          if (!disposed && data?.success && Array.isArray(data.orders) && data.orders.length > 0) {
            // The endpoint returns status fields only — never the customer's
            // address or phone — so these are merged over the local order.
            const updatedMap = new Map<string, Partial<SavedOrder>>(
              data.orders.map((o: Partial<SavedOrder>) => [o.id, o])
            );
            setOrders((prev) =>
              prev.map((ord) => {
                const fresh = updatedMap.get(ord.id);
                return fresh ? { ...ord, ...fresh } : ord;
              })
            );

          }
        }
      } catch {
        // Keep existing orders visible on transient network error
      }
    };

    void refreshCentralOrders();
    const interval = window.setInterval(refreshCentralOrders, 8_000); // Poll every 8 seconds
    window.addEventListener("focus", refreshCentralOrders);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshCentralOrders);
    };
  }, [currentUser?.email]);

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

    // The receipt is written into an about:blank iframe, which resolves no
    // relative paths of its own, so the logo needs an absolute URL.
    const assetBase = window.location.origin;

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
          <title>INVOICE_${order.id}_ANIMEVERSE</title>
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
            .brand-logo {
              height: 46px;
              width: auto;
              object-fit: contain;
            }
            .brand-name {
              font-size: 11px;
              font-weight: 900;
              letter-spacing: 4px;
              text-transform: uppercase;
              color: #475569;
              margin-bottom: 4px;
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
                <img class="brand-logo" src="${assetBase}/animeverse-logo.png" alt="AnimeVerse" />
              </div>
              <div class="brand-name">PUBLISHING ARCHIVE</div>
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
                AnimeVerse Egypt Archive Seal #AV-OCT-88219
              </div>
              <div style="text-align: right;">
                <span>DISPATCH STATUS:</span><br>
                <strong>PRE-DISPATCH INSPECTION PASSED</strong>
              </div>
            </div>

            <div class="footer-strip">
              物語と記憶のかたち • 100% LICENSED JAPANESE EDITIONS • 14-DAY COLLECTOR REPLACEMENT GUARANTEE
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Printing on a bare timer raced the logo and produced a logo-less receipt.
    const startPrint = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    };

    const logo = doc.querySelector("img.brand-logo") as HTMLImageElement | null;
    if (logo && !logo.complete) {
      let started = false;
      const once = () => {
        if (started) return;
        started = true;
        setTimeout(startPrint, 120);
      };
      logo.addEventListener("load", once);
      logo.addEventListener("error", once);
      setTimeout(once, 2500);
    } else {
      setTimeout(startPrint, 200);
    }
  };

  const addItem = useCartStore((state) => state.addItem);
  const { openCart, openReader } = useUIStore();


  const handleResetIntro = () => {
    try {
      sessionStorage.removeItem("kairo_intro_seen");
      // The intro is session-scoped now, but a device that visited before the
      // change may still carry the old device-wide marks; clearing them here
      // keeps this control working for those visitors too.
      localStorage.removeItem("kairo_intro_seen");
      localStorage.removeItem("introSeen");
      document.cookie = "kairo_intro_seen=; path=/; max-age=0; SameSite=Lax";
      (window as unknown as { __kairo_intro_seen?: boolean }).__kairo_intro_seen = false;
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
    setSettingsErrorMessage("");
    setSettingsSavedMessage("");

    let normalizedPhone = patronPhone;
    if (patronPhone.trim()) {
      const phoneVal = validateEgyptianPhone(patronPhone);
      if (!phoneVal.isValid) {
        setSettingsErrorMessage(
          isArabic
            ? "يرجى إدخال رقم هاتف مصري صحيح مكون من 11 رقماً (مثال: 01012345678)"
            : (phoneVal.message || "Please enter a valid 11-digit Egyptian mobile number.")
        );
        return;
      }
      normalizedPhone = phoneVal.normalized || patronPhone;
      setPatronPhone(normalizedPhone);
    }

    updateProfile({
      name: patronName,
      address: shippingAddress,
      phone: normalizedPhone,
      governorate: patronGovernorate,
      city: patronCity,
      deliveryNotes: patronDeliveryNotes,
      preferredPaymentMethod,
      paymentSenderDetail,
    });
    setSettingsSavedMessage(
      isArabic
        ? "تم حفظ تفضيلات الشحن والطلب السريع بنجاح."
        : "Collector shipping and fast checkout preferences successfully updated."
    );
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
      if (authPhone.trim()) {
        const phoneVal = validateEgyptianPhone(authPhone);
        if (!phoneVal.isValid) {
          setAuthError(phoneVal.message || "Please enter a valid 11-digit Egyptian mobile number.");
          return;
        }
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
        setAuthSuccess("Patron account verified & created! Welcome to ANIMEVERSE Archive.");
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
  // Also keep showing spinner while the session check (initSession → /api/auth/me) is still in flight
  if (!mounted || !isAuthInitialized) {
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
                  <ArrowLeft className={`w-3.5 h-3.5 ${isRTL ? "rotate-180" : ""}`} />
                  <span>{isArabic ? "تغيير البريد الإلكتروني" : "Change Email"}</span>
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
                    <ArrowLeft className={`w-3.5 h-3.5 ${isRTL ? "rotate-180" : ""}`} />
                    <span>{isArabic ? "العودة لتسجيل الدخول" : "Back to Sign In"}</span>
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
                    <ArrowLeft className={`w-3.5 h-3.5 ${isRTL ? "rotate-180" : ""}`} />
                    <span>{isArabic ? "تغيير البريد الإلكتروني" : "Change Email"}</span>
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
    const activeGuestOrder = newOrderId ? orders.find((o) => o.id === newOrderId) || null : null;

    return (
      <div className="min-h-[calc(100dvh-80px)] bg-transparent text-paper pt-24 pb-12 px-4 sm:px-6 md:px-12 flex items-center justify-center relative">
        <div className="max-w-md w-full bg-ink-surface/85 border border-gold/40 rounded-sm p-6 sm:p-8 backdrop-blur-md shadow-[0_25px_80px_rgba(0,0,0,0.95)] space-y-6 animate-in fade-in zoom-in-95 duration-300 relative z-10">
          
          {/* Header */}
          <div className="text-center space-y-1.5 border-b border-ink-border/80 pb-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight font-sans text-paper">
              ANIMEVERSE
            </h1>
            <p className="text-xs text-text-muted font-mono">
              Sign in to access your archive.
            </p>
          </div>

          {/* Guest Order Confirmation Banner */}
          {newOrderId && (
            <div className="p-4 bg-ink/90 border border-gold/50 rounded-sm space-y-3 font-mono animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-gold font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-gold" />
                  ORDER RECEIVED: #{newOrderId}
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-gold/15 text-gold border border-gold/30 rounded-xs uppercase font-bold">
                  Confirmed
                </span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Thank you for your order! Your volumes are being prepared for express delivery.
              </p>
              {activeGuestOrder && (
                <div className="pt-2 border-t border-ink-border/60 flex items-center justify-between text-xs">
                  <span className="text-paper">
                    Total: <strong className="text-gold">{formatPrice(activeGuestOrder.total)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePrintInvoice(activeGuestOrder)}
                    className="px-2.5 py-1 bg-ink-surface hover:bg-gold hover:text-ink text-gold border border-gold/30 rounded-xs text-[10px] uppercase font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Printer className="w-3 h-3" />
                    <span>Print Invoice</span>
                  </button>
                </div>
              )}
              <div className="text-[10px] text-text-muted/80 bg-ink-surface/50 p-2 rounded-xs border border-ink-border/40">
                💡 Want to save and track all your orders? Create a patron account below to link your order.
              </div>
              {/* Reassurance at the point it matters most: a cash-on-delivery
                  buyer has just committed with no payment trail. */}
              {(storeContactPhone || storeContactEmail) && (
                <div className="pt-2 border-t border-ink-border/60 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-text-muted">
                  <span className="uppercase tracking-wider">Questions?</span>
                  {storeContactPhone && (
                    <a href={`tel:${storeContactPhone.replace(/\s/g, "")}`} className="text-gold hover:underline" dir="ltr">
                      {storeContactPhone}
                    </a>
                  )}
                  {storeContactEmail && (
                    <a href={`mailto:${storeContactEmail}`} className="text-gold hover:underline break-all" dir="ltr">
                      {storeContactEmail}
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

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
                  <span className="text-[10px] font-mono text-gold flex items-center gap-1">
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
                ? "SIGN IN"
                : "CREATE ACCOUNT"}
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
        </div>


      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-paper pt-20 sm:pt-28 pb-16 sm:pb-24 px-3.5 sm:px-6 md:px-12 relative z-10">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-10">
        
        {/* Streamlined Clean Profile Header */}
        <div className="border-b border-ink-border/80 pb-5 sm:pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-linear-to-tr from-amber-600 to-gold text-ink font-bold font-sans flex items-center justify-center text-base sm:text-lg shadow-md shrink-0 overflow-hidden border border-gold/40">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight uppercase font-sans text-paper truncate">
                  {currentUser.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-gold/10 border border-gold/30 text-gold text-[9px] sm:text-[10px] font-mono uppercase tracking-wider shrink-0">
                  {currentUser.tier || "Collector"}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-text-muted font-mono flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                <span className="truncate max-w-[150px] xs:max-w-none">{currentUser.email}</span>
                <span>•</span>
                <span>{currentUser.governorate}</span>
                <span>•</span>
                <span className="text-gold/80">ID: #{currentUser.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {currentUser?.role === "admin" && (
              <Link
                href="/admin"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gold/15 hover:bg-gold text-gold hover:text-ink border border-gold/40 text-xs font-mono font-bold uppercase tracking-wider rounded-xs transition-all cursor-pointer text-center"
                title="Enter Admin Management Dashboard"
              >
                <SlidersHorizontal strokeWidth={1.4} className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">{isArabic ? "لوحة الإدارة" : "Curator Console"}</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => logout()}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-ink-surface/60 hover:bg-vermilion/15 border border-ink-border hover:border-vermilion/60 text-text-muted hover:text-vermilion text-xs font-mono uppercase tracking-wider rounded-xs transition-all cursor-pointer text-center"
              title="Sign out of current account"
            >
              <LogOut strokeWidth={1.4} className="w-3.5 h-3.5 shrink-0" />
              <span>{isArabic ? "تسجيل الخروج" : "Sign Out"}</span>
            </button>
          </div>
        </div>

        {/* New Order Notification Banner */}
        {newOrderId && (
          <div className="p-4 bg-gold/10 border border-gold/40 rounded-sm text-gold text-xs font-mono flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 strokeWidth={1.8} className="w-5 h-5 text-gold shrink-0" />
              <span>
                {isArabic
                  ? `تم تسجيل الطلب #${newOrderId} بنجاح في أرشيف مركز 6 أكتوبر المركزي وجاري تجهيزه للشحن!`
                  : `Order #${newOrderId} has been registered into our 6th of October Central Archive and is being prepared for dispatch across Egypt!`}
              </span>
            </div>
            <button
              onClick={() => router.replace("/account")}
              className="text-[11px] uppercase tracking-wider underline hover:text-paper"
            >
              {isArabic ? "إغلاق" : "Dismiss"}
            </button>
          </div>
        )}

        {/* Personalized Limited-Time Welcome Offer Banner */}
        <WelcomeOfferBanner />

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto border-b border-ink-border/60 pb-3 font-mono text-xs no-scrollbar -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
          {([
            { id: "ORDERS", shortLabel: isArabic ? `طلباتي (${orders.length})` : `Orders (${orders.length})`, fullLabel: isArabic ? `طلباتي (${orders.length})` : `My Orders (${orders.length})`, icon: Package },
            { id: "LIBRARY", shortLabel: isArabic ? `مكتبتي (${digitalLibraryVolumes.length})` : `Library (${digitalLibraryVolumes.length})`, fullLabel: isArabic ? `مكتبتي الرقمية (${digitalLibraryVolumes.length})` : `My Library (${digitalLibraryVolumes.length})`, icon: BookOpen },
            { id: "WISHLIST", shortLabel: isArabic ? `المفضلة (${wishlist.length})` : `Wishlist (${wishlist.length})`, fullLabel: isArabic ? `قائمة الرغبات (${wishlist.length})` : `Wishlist (${wishlist.length})`, icon: Heart },
            { id: "SETTINGS", shortLabel: isArabic ? "الإعدادات" : "Settings", fullLabel: isArabic ? "إعدادات الحساب" : "Account Settings", icon: Settings },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xs tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer shrink-0 text-[11px] sm:text-xs ${
                  isActive
                    ? "bg-paper text-ink font-bold shadow-md shadow-black/30"
                    : "text-text-muted hover:text-paper hover:bg-ink-surface/60 border border-transparent"
                }`}
              >
                <Icon strokeWidth={1.5} className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{tab.fullLabel}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
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
              <div className="py-12 sm:py-16 px-4 sm:px-6 border border-ink-border/80 bg-ink-surface/25 rounded-sm text-center relative">
                <div className="max-w-sm mx-auto space-y-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-ink-surface border border-ink-border flex items-center justify-center mx-auto text-text-muted">
                    <Package strokeWidth={1.4} className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-mono text-sm sm:text-base font-bold text-paper tracking-wider uppercase">
                    {isArabic ? "لا توجد طلبات سابقة" : "NO ORDERS YET"}
                  </h3>
                  <p className="text-xs text-text-muted font-sans">
                    {isArabic
                      ? "ستظهر سجلات طلباتك وتتبع الشحن هنا فور إتمام الشراء."
                      : "Your orders and live delivery tracking will appear here."}
                  </p>
                  <div className="pt-1.5">
                    <Link
                      href="/manga"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-paper text-ink font-bold text-xs font-mono uppercase tracking-wider hover:bg-vermilion hover:text-white transition-all rounded-xs shadow-md active:scale-95"
                    >
                      <span>{isArabic ? "تصفح الكتالوج" : "BROWSE CATALOG"}</span>
                      <ArrowRight strokeWidth={1.5} className={`w-3.5 h-3.5 ${isRTL ? "rotate-180" : ""}`} />
                    </Link>
                  </div>
                </div>
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
                      { key: "Placed", label: isArabic ? "تم الطلب" : "ORDERED", detail: isArabic ? "تسجيل الطلب" : "Order Placed" },
                      { key: "Verification", label: isArabic ? "التحقق" : "VERIFYING", detail: isArabic ? "مطابقة التحويل" : "Awaiting Transfer" },
                      { key: "Preparing", label: isArabic ? "التجهيز" : "PACKAGING", detail: isArabic ? "التغليف المصفح" : "Vault Packaging" },
                      { key: "Delivered", label: isArabic ? "التوصيل" : "DELIVERED", detail: isArabic ? "الاستلام" : "Doorstep Arrival" },
                    ];
                    currentStepIndex = 1;
                  } else {
                    steps = [
                      { key: "Paid", label: isArabic ? "مدفوع" : "PAID", detail: isArabic ? "اعتماد الدفع" : "Payment Verified" },
                      { key: "Preparing", label: isArabic ? "التجهيز" : "PACKAGING", detail: isArabic ? "التغليف المصفح" : "Vault Packaging" },
                      { key: "Shipped", label: isArabic ? "في الطريق" : "IN TRANSIT", detail: isArabic ? "مع المندوب" : "Dispatched" },
                      { key: "Delivered", label: isArabic ? "تم الاستلام" : "DELIVERED", detail: isArabic ? "تم التوصيل" : "Doorstep Arrival" },
                    ];
                    if (order.status === "Delivered") currentStepIndex = 3;
                    else if (order.status === "Shipped") currentStepIndex = 2;
                    else currentStepIndex = 1;
                  }
                } else {
                  // Cash on Delivery
                  steps = [
                    { key: "Confirmed", label: isArabic ? "مؤكد" : "CONFIRMED", detail: isArabic ? "تم التأكيد" : "Order Confirmed" },
                    { key: "Preparing", label: isArabic ? "التجهيز" : "PACKAGING", detail: isArabic ? "التغليف المصفح" : "Vault Packaging" },
                    { key: "Shipped", label: isArabic ? "في الطريق" : "IN TRANSIT", detail: isArabic ? "مع المندوب" : "Out for Delivery" },
                    { key: "Delivered", label: isArabic ? "تم الاستلام" : "DELIVERED", detail: isArabic ? "الاستلام والسداد" : "Collected & Complete" },
                  ];
                  if (order.status === "Delivered") currentStepIndex = 3;
                  else if (order.status === "Shipped") currentStepIndex = 2;
                  else if (order.status === "Processing" || order.status === "Preparing") currentStepIndex = 1;
                  else currentStepIndex = 0;
                }

                return (
                  <div
                    key={`${order.id}-${orderIdx}`}
                    className="bg-ink-surface/40 border border-ink-border/80 rounded-sm p-3 sm:p-6 space-y-3.5 sm:space-y-5 shadow-xl"
                  >
                    {/* Order Title & Protocol Meta */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-ink-border/70 gap-2.5 sm:gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base sm:text-xl font-bold font-mono text-paper tracking-wider">
                            ORDER #{order.id}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-xs bg-ink border border-ink-border text-[9px] sm:text-[10px] font-mono text-text-muted">
                              {order.paymentMethod === "wallet"
                                ? (isArabic ? "محفظة" : "Wallet")
                                : order.paymentMethod === "instapay"
                                ? (isArabic ? "إنستاباي" : "InstaPay")
                                : (isArabic ? "عند الاستلام" : "Cash on Delivery")}
                            </span>

                            {/* Payment Verification Status Badge */}
                            {isPaid ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-semibold flex items-center gap-1 border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>{isArabic ? "تم السداد" : "PAID"}</span>
                              </span>
                            ) : isPendingVerification ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-semibold flex items-center gap-1 border bg-amber-500/10 border-amber-500/40 text-amber-400">
                                <span>{isArabic ? "قيد التحقق" : "VERIFYING"}</span>
                              </span>
                            ) : null}

                            {/* Order Fulfillment Status Badge */}
                            <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-semibold flex items-center gap-1 border bg-ink border-ink-border text-paper">
                              <span>
                                {isArabic
                                  ? (order.status === "Delivered"
                                      ? "تم التوصيل"
                                      : order.status === "Shipped"
                                      ? "في الطريق"
                                      : order.status === "Confirmed"
                                      ? "مؤكد"
                                      : order.status === "Cancelled"
                                      ? "ملغي"
                                      : "قيد التجهيز")
                                  : (order.status ? order.status.toUpperCase() : "PROCESSING")}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 text-xs font-mono pt-1.5 sm:pt-0 border-t sm:border-t-0 border-ink-border/40">
                        <div className={isRTL ? "text-right sm:text-left" : "text-left sm:text-right"}>
                          <span className="text-[9px] sm:text-[10px] text-text-muted block uppercase">{isArabic ? "التاريخ" : "DATE"}</span>
                          <span className="text-paper text-xs">{order.date}</span>
                        </div>
                        <div className="h-6 w-px bg-ink-border" />
                        <div className={isRTL ? "text-left" : "text-right"}>
                          <span className="text-[9px] sm:text-[10px] text-text-muted block uppercase">{isArabic ? "الإجمالي" : "TOTAL"}</span>
                          <span className="text-paper text-sm sm:text-base font-bold">{formatPrice(order.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pending Verification Notice Banner */}
                    {isPendingVerification && (
                      <div className="p-2.5 sm:p-3 bg-amber-500/10 border border-amber-500/30 rounded-xs flex items-center gap-2.5 text-xs font-mono animate-in fade-in">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <div className="flex-1 min-w-0 text-[11px] sm:text-xs leading-normal text-text-muted">
                          <p>
                            {isArabic
                              ? `جاري التحقق من تحويل (${order.paymentMethod === "wallet" ? "المحفظة" : "إنستاباي"}). سيتم التجهيز فور الاعتماد.`
                              : `Verifying your ${order.paymentMethod === "wallet" ? "Mobile Wallet" : "InstaPay"} transfer. Preparing once confirmed.`}
                          </p>
                          {order.paymentSenderDetail && (
                            <div className="text-[10px] text-text-muted/80 pt-0.5">
                              {isArabic ? "رقم التحويل: " : "Ref: "}
                              <strong className="text-paper">{order.paymentSenderDetail}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Cash on Delivery Notice Banner */}
                    {order.paymentMethod === "cash" && order.status !== "Delivered" && (
                      <div className="p-2.5 sm:p-3 bg-ink-surface/80 border border-gold/30 rounded-xs flex items-center gap-2.5 text-xs font-mono animate-in fade-in">
                        <Banknote className="w-4 h-4 text-gold shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-text-muted text-[11px] sm:text-xs leading-normal">
                            {isArabic ? (
                              <>
                                الدفع عند الاستلام: يرجى تجهيز <strong className="text-paper font-bold">{formatPrice(order.total)}</strong> نقداً للمندوب.
                              </>
                            ) : (
                              <>
                                Cash on delivery: Please prepare <strong className="text-paper font-bold">{formatPrice(order.total)}</strong> for the courier.
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Shipping Courier Details Banner */}
                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 px-3 py-2 bg-ink/70 rounded-xs border border-ink-border/60 text-xs font-mono">
                      <div className="flex items-center gap-2 min-w-0">
                        <Truck strokeWidth={1.4} className="w-3.5 h-3.5 text-gold shrink-0" />
                        <span className="text-text-muted text-[11px] sm:text-xs truncate">
                          {isArabic ? "بوسطة إكسبريس" : "Bosta Express"}
                        </span>
                        <span className="text-paper font-semibold shrink-0 text-[11px]">
                          ({order.trackingNumber || "EG-OCT-9842-CAI"})
                        </span>
                      </div>
                      <div className="flex items-center justify-between xs:justify-end gap-2.5 text-[10px] pt-1 xs:pt-0 border-t xs:border-t-0 border-ink-border/30">
                        <button
                          onClick={() => handleCopyTracking(order.trackingNumber || "EG-OCT-9842-CAI")}
                          className="text-gold hover:text-paper flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedTracking ? (
                            <>
                              <Check strokeWidth={1.5} className="w-3 h-3 text-gold" />
                              <span className="text-gold font-bold">{isArabic ? "تم النسخ" : "COPIED"}</span>
                            </>
                          ) : (
                            <>
                              <Copy strokeWidth={1.4} className="w-3 h-3" />
                              <span>{isArabic ? "نسخ الشحنة" : "COPY WAYBILL"}</span>
                            </>
                          )}
                        </button>
                        <span className="text-text-muted">•</span>
                        <span className="text-text-muted">
                          {isArabic ? "الموعد:" : "ETA:"} <span className="text-paper font-medium">{isArabic ? "خلال 24-48 ساعة" : "24–48h"}</span>
                        </span>
                      </div>
                    </div>

                    {/* Timeline Progression Line: Pixel-perfect mobile & desktop alignment */}
                    <div className="py-3 sm:py-4 px-2 sm:px-6 bg-ink/50 rounded-sm border border-ink-border/50 overflow-hidden">
                      <div className="relative max-w-2xl mx-auto">
                        {/* Connecting Line Track */}
                        <div className="absolute top-2.5 sm:top-3 left-4 right-4 h-0.5 z-0 pointer-events-none">
                          <div className="w-full h-full bg-ink-border" />
                          <div
                            className="absolute top-0 left-0 h-full bg-gold transition-all duration-500"
                            style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                          />
                        </div>

                        <div className="relative z-10 flex justify-between items-start">
                          {steps.map((step, idx) => {
                            const isDone = idx <= currentStepIndex;
                            const isCurrent = idx === currentStepIndex;

                            return (
                              <div key={step.key} className="flex flex-col items-center flex-1 text-center px-0.5">
                                {/* Step Circle with Clean Subtle Pulse on Active Point */}
                                <div className="relative flex items-center justify-center">
                                  {isCurrent && (
                                    <span className="absolute -inset-1 rounded-full bg-gold/50 animate-ping pointer-events-none" />
                                  )}

                                  <div
                                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all ${
                                      isDone
                                        ? "bg-gold text-ink font-bold shadow-sm"
                                        : "bg-ink border-2 border-ink-border text-text-muted"
                                    }`}
                                  >
                                    {isDone ? (
                                      <CheckCircle2 strokeWidth={2.5} className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                    ) : (
                                      <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                                    )}
                                  </div>
                                </div>

                                <span
                                  className={`text-[8px] sm:text-[10px] font-mono tracking-wider uppercase mt-1.5 sm:mt-2 text-center leading-tight ${
                                    isCurrent ? "text-gold font-bold" : isDone ? "text-paper" : "text-text-muted"
                                  }`}
                                >
                                  {step.label}
                                </span>
                                <span className="text-[9px] font-mono text-text-muted/70 hidden sm:block mt-0.5">
                                  {step.detail}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Enclosed Volumes Grid with Authentic High-Res Covers */}
                    <div className="space-y-2.5 pt-1">
                      <span className="text-[10px] sm:text-[11px] font-mono tracking-wider text-text-muted uppercase block">
                        {isArabic ? `المنتجات (${order.items.length}):` : `ITEMS (${order.items.length}):`}
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                        {order.items.map((item, i) => {
                          const canonical = getCanonicalVolume(item);
                          const cover = canonical?.coverImage || item.coverImage || PLACEHOLDER_COVER;
                          const targetVolumeId = canonical?.id || item.volumeId || item.id;

                          return (
                            <div
                              key={i}
                              className="group flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 rounded-xs bg-ink/60 border border-ink-border/60 hover:border-gold/40 transition-colors"
                            >
                              {/* Book Cover */}
                              <div className="relative w-12 h-16 sm:w-14 sm:h-20 shrink-0 overflow-hidden rounded-xs border border-ink-border bg-ink">
                                <img
                                  src={cover}
                                  alt={item.title}
                                  onError={(e) => {
                                    if (canonical?.coverImage && e.currentTarget.src !== canonical.coverImage) {
                                      e.currentTarget.src = canonical.coverImage;
                                    } else {
                                      e.currentTarget.src = PLACEHOLDER_COVER;
                                    }
                                  }}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                {!isPaid && (
                                  <div className="absolute inset-0 bg-ink/60 flex items-center justify-center pointer-events-none">
                                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                                  </div>
                                )}
                              </div>

                              {/* Book Metadata */}
                              <div className="flex-1 min-w-0 flex flex-col justify-between h-16 sm:h-20 py-0.5">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[8px] sm:text-[9px] font-mono text-gold uppercase tracking-wider truncate">
                                      {item.seriesTitle}
                                    </span>
                                    <span className="px-1 py-0.2 rounded-xs bg-ink text-[8px] font-mono text-text-muted border border-ink-border shrink-0">
                                      {item.format || "Tankōbon"}
                                    </span>
                                  </div>
                                  <Link
                                    href={`/manga/${targetVolumeId}`}
                                    className="font-bold text-paper hover:text-gold transition-colors text-xs sm:text-sm line-clamp-1 block mt-0.5"
                                  >
                                    {item.title}
                                  </Link>
                                  <p className="text-[9px] sm:text-[10px] font-mono text-text-muted">
                                    Vol. {item.volumeNumber} • Qty: {item.quantity || 1}
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
                                        className="text-[9px] sm:text-[10px] font-mono text-gold hover:text-paper transition-colors flex items-center gap-1 cursor-pointer"
                                      >
                                        <BookOpen strokeWidth={1.3} className="w-3 h-3" />
                                        <span>{isArabic ? "قراءة" : "READ"}</span>
                                      </button>
                                    ) : (
                                      <div
                                        className="flex items-center gap-1 text-[8px] sm:text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-xs border border-amber-500/30 select-none"
                                        title="Reading access is locked until payment is confirmed"
                                      >
                                        <Lock strokeWidth={1.3} className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                        <span>{isArabic ? "مغلق" : "LOCKED"}</span>
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
                    <div className="pt-3 border-t border-ink-border/60 flex flex-col xs:flex-row xs:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 w-full xs:w-auto">
                        <button
                          onClick={() => setSelectedInvoiceOrder(order)}
                          className="flex-1 xs:flex-none justify-center px-3 py-1.5 bg-ink border border-ink-border hover:border-gold text-paper hover:text-gold font-mono text-[10px] sm:text-[11px] tracking-wider uppercase rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText strokeWidth={1.4} className="w-3.5 h-3.5" />
                          <span>{isArabic ? "الفاتورة" : "INVOICE"}</span>
                        </button>
                        <button
                          onClick={() => handleReorder(order)}
                          className="flex-1 xs:flex-none justify-center px-3 py-1.5 bg-ink border border-ink-border hover:border-gold text-paper hover:text-gold font-mono text-[10px] sm:text-[11px] tracking-wider uppercase rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw strokeWidth={1.4} className="w-3.5 h-3.5" />
                          <span>{isArabic ? "إعادة الطلب" : "REORDER"}</span>
                        </button>
                      </div>

                      <span className="text-[9px] font-mono text-text-muted hidden sm:block">
                        {isArabic ? "مركز شحن 6 أكتوبر" : "6th of October Central Hub"}
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
                <h2 className="text-base sm:text-lg font-bold font-mono uppercase tracking-wider text-paper">
                  {isArabic
                    ? `المكتبة الرقمية (${digitalLibraryVolumes.length})`
                    : `DIGITAL LIBRARY (${digitalLibraryVolumes.length})`}
                </h2>
              </div>
              <span className="text-[10px] font-mono text-text-muted bg-ink-surface px-2.5 py-1 rounded-xs border border-ink-border w-fit">
                CLOUD SYNC: ACTIVE
              </span>
            </div>

            {digitalLibraryVolumes.length === 0 ? (
              <div className="py-12 sm:py-16 px-4 sm:px-6 border border-ink-border/80 bg-ink-surface/25 rounded-sm text-center relative">
                <div className="max-w-sm mx-auto space-y-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-ink-surface border border-ink-border flex items-center justify-center mx-auto text-text-muted">
                    <BookOpen strokeWidth={1.4} className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-mono text-sm sm:text-base font-bold text-paper tracking-wider uppercase">
                    {isArabic ? "لم يتم فتح أي مجلدات بعد" : "NO DIGITAL EDITIONS YET"}
                  </h3>
                  <p className="text-xs text-text-muted font-sans">
                    {isArabic
                      ? "تُفتح القراءة الرقمية تلقائياً مع طلباتك للمجلدات الورقية."
                      : "Digital reading access unlocks automatically with your volume orders."}
                  </p>
                  <div className="pt-1.5">
                    <Link
                      href="/manga"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-paper text-ink font-bold text-xs font-mono uppercase tracking-wider hover:bg-vermilion hover:text-white transition-all rounded-xs shadow-md active:scale-95"
                    >
                      <span>{isArabic ? "تصفح الكتالوج" : "BROWSE CATALOG"}</span>
                      <ArrowRight strokeWidth={1.5} className={`w-3.5 h-3.5 ${isRTL ? "rotate-180" : ""}`} />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {digitalLibraryVolumes.map((volume) => {
                  const progress = progressMap[volume.id];
                  const percentage = progress ? progress.percentage : 0;
                  const isCompleted = progress ? progress.isCompleted : false;
                  const currentPageNum = progress ? progress.currentPage + 1 : 0;

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
                        <AnimeVerseImage
                          src={volume.coverImage}
                          alt={volume.title}
                          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                        />
                        <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 pointer-events-none z-10 flex flex-col gap-1">
                          <span className="px-1.5 sm:px-2 py-0.5 rounded-xs bg-ink/90 text-[8px] sm:text-[9px] font-mono text-gold border border-ink-border">
                            VOL. {volume.volumeNumber}
                          </span>
                          {isCompleted ? (
                            <span className="px-1.5 sm:px-2 py-0.5 rounded-xs bg-gold/15 text-[7px] sm:text-[8px] font-mono text-gold font-bold border border-gold/40">
                              COMPLETED
                            </span>
                          ) : percentage > 0 ? (
                            <span className="px-1.5 sm:px-2 py-0.5 rounded-xs bg-gold/90 text-[7px] sm:text-[8px] font-mono text-ink font-bold border border-gold">
                              IN PROGRESS
                            </span>
                          ) : (
                            <span className="px-1.5 sm:px-2 py-0.5 rounded-xs bg-ink/90 text-[7px] sm:text-[8px] font-mono text-text-muted border border-ink-border">
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

                      <div className="p-2.5 sm:p-4 space-y-2 sm:space-y-3">
                        <div>
                          <span className="text-[8px] sm:text-[9px] font-mono text-gold uppercase block truncate">
                            {volume.seriesTitle}
                          </span>
                          <h4 className="text-[11px] sm:text-xs font-bold text-paper line-clamp-1 group-hover:text-gold transition-colors">
                            {volume.title}
                          </h4>
                          <span className="text-[9px] sm:text-[10px] font-mono text-text-muted block mt-0.5">
                            {isCompleted
                              ? `100% Read • Completed`
                              : percentage > 0
                              ? `${percentage}% • Page ${currentPageNum}`
                              : `Not Started • ${volume.pages} P.`}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openReader(volume);
                          }}
                          className={`w-full py-1.5 sm:py-2 font-bold text-[9px] sm:text-xs font-mono tracking-wider uppercase transition-colors rounded-xs flex items-center justify-center gap-1 sm:gap-1.5 z-10 active:scale-95 ${
                            isCompleted
                              ? "bg-ink border border-ink-border hover:border-gold text-paper hover:text-gold"
                              : percentage > 0
                              ? "bg-gold text-ink hover:bg-paper shadow-md shadow-gold/20"
                              : "bg-paper text-ink hover:bg-gold"
                          }`}
                        >
                          <Eye strokeWidth={1.4} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span>
                            {isCompleted
                              ? "READ AGAIN"
                              : percentage > 0
                              ? `CONTINUE (P. ${currentPageNum})`
                              : "START READING"}
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
                        <AnimeVerseImage
                          src={volume.coverImage}
                          alt={volume.title}
                          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
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
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
            {/* Wishlist Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-ink-border/70 gap-3 sm:gap-4">
              <div>
                <h2 className="text-base sm:text-xl font-bold font-mono uppercase tracking-wider text-paper">
                  {isArabic ? `قائمة الرغبات (${wishlist.length})` : `WISHLIST (${wishlist.length})`}
                </h2>
              </div>

              {wishlist.length > 0 && (
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={clearWishlist}
                    className="flex-1 sm:flex-none text-center px-3 py-2 border border-ink-border hover:border-vermilion hover:text-vermilion text-text-muted text-[10px] sm:text-[11px] font-mono uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                  >
                    CLEAR ALL
                  </button>
                  <button
                    type="button"
                    onClick={moveAllWishlistToCart}
                    className="flex-1 sm:flex-none justify-center px-3.5 sm:px-4 py-2 bg-paper text-ink hover:bg-vermilion hover:text-white text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer"
                  >
                    <ShoppingBag strokeWidth={1.4} className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">MOVE ALL TO CART</span>
                  </button>
                </div>
              )}
            </div>

            {wishlist.length === 0 ? (
              <div className="py-12 sm:py-16 px-4 sm:px-6 border border-ink-border/80 bg-ink-surface/25 rounded-sm text-center relative overflow-hidden">
                <div className="relative z-10 max-w-sm mx-auto space-y-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-ink-surface border border-ink-border flex items-center justify-center mx-auto text-text-muted">
                    <Heart strokeWidth={1.4} className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-mono text-sm sm:text-base font-bold text-paper tracking-wider uppercase">
                    {isArabic ? "قائمة رغباتك فارغة" : "YOUR WISHLIST IS EMPTY"}
                  </h3>
                  <p className="text-xs text-text-muted font-sans">
                    {isArabic
                      ? "احفظ مجلداتك المفضلة أثناء التصفح لتجدها هنا دائماً."
                      : "Save your favorite volumes while browsing to find them here."}
                  </p>
                  <div className="pt-1.5">
                    <Link
                      href="/manga"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-paper text-ink font-bold text-xs font-mono uppercase tracking-wider hover:bg-vermilion hover:text-white transition-all rounded-xs shadow-md active:scale-95"
                    >
                      <span>{isArabic ? "تصفح الكتالوج" : "EXPLORE CATALOG"}</span>
                      <ArrowRight strokeWidth={1.5} className={`w-3.5 h-3.5 ${isRTL ? "rotate-180" : ""}`} />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {wishlist.map((volume) => (
                  <div
                    key={volume.id}
                    className="group bg-ink-surface/40 border border-ink-border/70 rounded-sm overflow-hidden hover:border-gold/60 transition-all duration-300 flex flex-col justify-between hover:shadow-xl hover:shadow-black/50 select-none"
                  >
                    {/* Cover Media Container */}
                    <div className="relative aspect-[3/4] overflow-hidden bg-ink">
                      <Link href={`/manga/${volume.id}`} className="block w-full h-full">
                        <AnimeVerseImage
                          src={volume.coverImage}
                          alt={volume.title}
                          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                        />
                      </Link>

                      {/* Badges Overlay */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none z-10">
                        <span className="px-1.5 sm:px-2 py-0.5 rounded-xs bg-ink/90 backdrop-blur-md text-[8px] sm:text-[9px] font-mono tracking-wider text-gold border border-ink-border">
                          VOL. {volume.volumeNumber < 10 ? `0${volume.volumeNumber}` : volume.volumeNumber}
                        </span>
                        {volume.format === "Deluxe Edition" && (
                          <span className="px-1.5 sm:px-2 py-0.5 rounded-xs bg-gold/90 text-[7px] sm:text-[8px] font-mono tracking-wider text-ink font-bold">
                            DELUXE
                          </span>
                        )}
                        {volume.originalPrice && volume.originalPrice > volume.price && (
                          <span className="px-1.5 sm:px-2 py-0.5 rounded-xs bg-vermilion text-[7px] sm:text-[8px] font-mono font-bold tracking-wider text-white shadow-sm">
                            SALE -{Math.round(((volume.originalPrice - volume.price) / volume.originalPrice) * 100)}%
                          </span>
                        )}
                      </div>

                      {/* Action Buttons Top Right: Remove & Preview */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-10">
                        <button
                          type="button"
                          onClick={() => removeFromWishlist(volume.id)}
                          className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-paper-muted hover:text-vermilion hover:border-vermilion transition-colors flex items-center justify-center active:scale-90 cursor-pointer"
                          title="Remove from wishlist"
                          aria-label="Remove volume"
                        >
                          <Trash2 strokeWidth={1.4} className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openReader(volume)}
                          className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-paper-muted hover:text-gold hover:border-gold transition-colors flex items-center justify-center active:scale-90 cursor-pointer"
                          title="Read Sample (RTL)"
                        >
                          <Eye strokeWidth={1.4} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-3 sm:p-4 flex flex-col justify-between flex-1">
                      <div>
                        <span className="text-[8px] sm:text-[9px] font-mono tracking-widest text-gold uppercase block truncate">
                          {volume.seriesTitle}
                        </span>
                        <Link
                          href={`/manga/${volume.id}`}
                          className="text-xs sm:text-sm font-bold text-paper tracking-wide group-hover:text-gold transition-colors line-clamp-1 mt-0.5 block"
                        >
                          {volume.title}
                        </Link>
                        <p className="text-[9px] sm:text-[10px] text-text-muted mt-0.5 line-clamp-1">
                          By {volume.author}
                        </p>

                        {/* Rating & Stock */}
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-ink-border/40 text-[9px] sm:text-[10px] font-mono">
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
                      <div className="mt-3 pt-2 sm:mt-4 sm:pt-3 border-t border-ink-border/50 flex items-center justify-between font-mono gap-1">
                        <div className="flex flex-col min-w-0 pr-1">
                          <span className="text-xs sm:text-sm font-bold text-paper truncate">
                            {formatPrice(volume.price)}
                          </span>
                          {volume.originalPrice && volume.originalPrice > volume.price && (
                            <span className="text-[9px] sm:text-[10px] text-text-muted/70 line-through truncate">
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
                          className="h-7 sm:h-8 px-2 sm:px-3 bg-paper text-ink hover:bg-vermilion hover:text-white font-bold text-[10px] uppercase transition-colors rounded-xs flex items-center gap-1 z-10 active:scale-95 shrink-0 cursor-pointer shadow-xs"
                        >
                          <span>+</span>
                          <span className="hidden xs:inline">ADD</span>
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
            <form onSubmit={handleSaveSettings} className="p-4 sm:p-7 bg-ink-surface/40 border border-ink-border/80 rounded-sm space-y-4 sm:space-y-5 shadow-sm">
              <div className="border-b border-ink-border/60 pb-3 flex items-center justify-between">
                <h3 className="text-xs font-mono tracking-widest text-gold uppercase font-bold flex items-center gap-2">
                  <Truck strokeWidth={1.5} className="w-4 h-4 text-gold" />
                  <span>{isArabic ? "بيانات الشحن والدفع" : "SHIPPING & PAYMENT"}</span>
                </h3>
              </div>

              <div className="space-y-4 text-xs font-mono">
                {/* 1. Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-text-muted uppercase block mb-1.5 font-medium">
                      {isArabic ? "الاسم" : "Full Name"}
                    </label>
                    <input
                      type="text"
                      value={patronName}
                      onChange={(e) => setPatronName(e.target.value)}
                      placeholder={isArabic ? "الاسم" : "Full Name"}
                      className="w-full bg-ink border border-ink-border px-3.5 py-2.5 text-paper rounded-xs focus:border-gold outline-none cursor-text caret-gold text-xs transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted uppercase block mb-1.5 font-medium">
                      {isArabic ? "رقم الهاتف" : "Phone"}
                    </label>
                    <input
                      type="tel"
                      value={patronPhone}
                      onChange={(e) => setPatronPhone(e.target.value)}
                      placeholder="01012345678"
                      className="w-full bg-ink border border-ink-border px-3.5 py-2.5 text-paper rounded-xs focus:border-gold outline-none cursor-text caret-gold text-xs transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* 2. Governorate & City / District */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-text-muted uppercase block mb-1.5 font-medium">
                      {isArabic ? "المحافظة" : "Governorate"}
                    </label>
                    <CustomSelect
                      options={governorateSelectOptions}
                      value={patronGovernorate}
                      onChange={(val) => setPatronGovernorate(val)}
                      fullWidth
                      buttonClassName="bg-ink py-2.5 text-xs border-ink-border"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text-muted uppercase block mb-1.5 font-medium">
                      {isArabic ? "المدينة / الحي" : "City / District"}
                    </label>
                    <input
                      type="text"
                      value={patronCity}
                      onChange={(e) => setPatronCity(e.target.value)}
                      placeholder={isArabic ? "مثال: 6 أكتوبر، الشيخ زايد، الدقي" : "e.g. 6th of October, Sheikh Zayed, Dokki"}
                      className="w-full bg-ink border border-ink-border px-3.5 py-2.5 text-paper rounded-xs focus:border-gold outline-none cursor-text caret-gold text-xs transition-colors"
                    />
                  </div>
                </div>

                {/* 3. Detailed Street Address */}
                <div>
                  <label className="text-[10px] text-text-muted uppercase block mb-1.5 font-medium">
                    {isArabic ? "العنوان بالتفصيل" : "Delivery Address"}
                  </label>
                  <input
                    type="text"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder={isArabic ? "الشارع، رقم العمارة، رقم الشقة..." : "Street, building, apartment..."}
                    className="w-full bg-ink border border-ink-border px-3.5 py-2.5 text-paper rounded-xs focus:border-gold outline-none cursor-text caret-gold text-xs transition-colors"
                  />
                </div>

                {/* 4. Delivery Notes & Landmark */}
                <div>
                  <label className="text-[10px] text-text-muted uppercase block mb-1.5 font-medium">
                    {isArabic ? "علامة مميزة / ملاحظات (اختياري)" : "Landmark / Notes (Optional)"}
                  </label>
                  <input
                    type="text"
                    value={patronDeliveryNotes}
                    onChange={(e) => setPatronDeliveryNotes(e.target.value)}
                    placeholder={isArabic ? "مثال: بجوار مسجد كذا، الدور 3 شقة 5" : "e.g. Near landmark, Apt 5 3rd floor"}
                    className="w-full bg-ink border border-ink-border px-3.5 py-2.5 text-paper rounded-xs focus:border-gold outline-none cursor-text caret-gold text-xs transition-colors"
                  />
                </div>

                {/* 5. Preferred Payment Method */}
                <div className="pt-3 border-t border-ink-border/40 space-y-2.5">
                  <label className="text-[10px] text-gold uppercase block font-bold tracking-wider">
                    {isArabic ? "طريقة الدفع المفضلة" : "PREFERRED PAYMENT"}
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Cash */}
                    <button
                      type="button"
                      onClick={() => setPreferredPaymentMethod("cash")}
                      className={`p-3 rounded-xs border text-start transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                        preferredPaymentMethod === "cash"
                          ? "bg-gold/10 border-gold shadow-xs"
                          : "bg-ink border-ink-border hover:border-ink-border/90"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Banknote className={`w-4 h-4 ${preferredPaymentMethod === "cash" ? "text-gold" : "text-text-muted"}`} />
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          preferredPaymentMethod === "cash" ? "border-gold bg-gold" : "border-ink-border"
                        }`}>
                          {preferredPaymentMethod === "cash" && <span className="w-1.5 h-1.5 rounded-full bg-ink" />}
                        </span>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-paper">
                          {isArabic ? "الدفع عند الاستلام" : "Cash on Delivery"}
                        </div>
                        <div className="text-[9px] text-text-muted">
                          {isArabic ? "نقداً عند الباب" : "Doorstep cash"}
                        </div>
                      </div>
                    </button>

                    {/* Mobile Wallet - Shows all Egyptian wallets */}
                    <button
                      type="button"
                      onClick={() => setPreferredPaymentMethod("wallet")}
                      className={`p-3 rounded-xs border text-start transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                        preferredPaymentMethod === "wallet"
                          ? "bg-gold/10 border-gold shadow-xs"
                          : "bg-ink border-ink-border hover:border-ink-border/90"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Smartphone className={`w-4 h-4 ${preferredPaymentMethod === "wallet" ? "text-gold" : "text-text-muted"}`} />
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          preferredPaymentMethod === "wallet" ? "border-gold bg-gold" : "border-ink-border"
                        }`}>
                          {preferredPaymentMethod === "wallet" && <span className="w-1.5 h-1.5 rounded-full bg-ink" />}
                        </span>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-paper">
                          {isArabic ? "المحافظ الإلكترونية" : "Mobile Wallet"}
                        </div>
                        <div className="text-[9px] text-text-muted font-sans leading-tight mt-0.5">
                          {isArabic ? "فودافون • أورنج • اتصالات • WE" : "Vodafone • Orange • Etisalat • WE"}
                        </div>
                      </div>
                    </button>

                    {/* InstaPay */}
                    <button
                      type="button"
                      onClick={() => setPreferredPaymentMethod("instapay")}
                      className={`p-3 rounded-xs border text-start transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                        preferredPaymentMethod === "instapay"
                          ? "bg-gold/10 border-gold shadow-xs"
                          : "bg-ink border-ink-border hover:border-ink-border/90"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Zap className={`w-4 h-4 ${preferredPaymentMethod === "instapay" ? "text-gold" : "text-text-muted"}`} />
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          preferredPaymentMethod === "instapay" ? "border-gold bg-gold" : "border-ink-border"
                        }`}>
                          {preferredPaymentMethod === "instapay" && <span className="w-1.5 h-1.5 rounded-full bg-ink" />}
                        </span>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-paper">
                          {isArabic ? "إنستاباي" : "InstaPay"}
                        </div>
                        <div className="text-[9px] text-text-muted">
                          {isArabic ? "تحويل لحظي (IPA)" : "Instant Bank / IPA"}
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Sender Details Input if Wallet or InstaPay */}
                  {preferredPaymentMethod !== "cash" && (
                    <div className="p-3 bg-ink/70 border border-ink-border rounded-xs space-y-1 animate-in fade-in duration-200">
                      <label className="text-[10px] text-text-muted uppercase block font-medium">
                        {preferredPaymentMethod === "wallet"
                          ? (isArabic ? "رقم المحفظة (اختياري)" : "Wallet Number (Optional)")
                          : (isArabic ? "عنوان IPA أو اسم الحساب (اختياري)" : "InstaPay IPA / Account (Optional)")}
                      </label>
                      <input
                        type="text"
                        value={paymentSenderDetail}
                        onChange={(e) => setPaymentSenderDetail(e.target.value)}
                        placeholder={preferredPaymentMethod === "wallet" ? "01012345678" : "yourname@instapay"}
                        className="w-full bg-ink border border-ink-border px-3 py-2 text-paper rounded-xs focus:border-gold outline-none cursor-text caret-gold text-xs transition-colors font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-paper text-ink hover:bg-gold font-mono font-bold text-xs uppercase tracking-wider rounded-xs transition-colors cursor-pointer text-center justify-center flex items-center shadow-xs active:scale-[0.98]"
                >
                  {isArabic ? "حفظ التغييرات" : "Save Changes"}
                </button>
                {settingsErrorMessage && (
                  <span className="text-xs text-vermilion font-mono animate-in fade-in flex items-center gap-1.5">
                    <span>{settingsErrorMessage}</span>
                  </span>
                )}
                {settingsSavedMessage && (
                  <span className="text-xs text-gold font-mono animate-in fade-in flex items-center gap-1.5">
                    <Check strokeWidth={1.8} className="w-3.5 h-3.5" />
                    <span>{settingsSavedMessage}</span>
                  </span>
                )}
              </div>
            </form>

            {/* Account Details & Security Card */}
            <div className="p-4 sm:p-7 bg-ink-surface/40 border border-ink-border/80 rounded-sm space-y-4 shadow-sm">
              <div className="border-b border-ink-border/60 pb-3">
                <h3 className="text-xs font-mono tracking-widest text-gold uppercase font-bold flex items-center gap-2">
                  <ShieldCheck strokeWidth={1.5} className="w-4 h-4 text-gold" />
                  <span>{isArabic ? "الحساب والأمان" : "ACCOUNT & SECURITY"}</span>
                </h3>
              </div>

              <div className="space-y-2.5 text-xs font-mono text-text-muted">
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between py-1.5 border-b border-ink-border/40 gap-1 sm:gap-2">
                  <span>{isArabic ? "البريد الإلكتروني المسجل" : "Registered Email"}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-paper font-semibold break-all">{currentUser.email}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/30 text-[9px] font-mono shrink-0 flex items-center gap-1">
                      <Check strokeWidth={2} className="w-2.5 h-2.5" />
                      <span>{isArabic ? "مُؤكد" : "Verified"}</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-ink-border/40">
                  <span>{isArabic ? "رقم العضوية الأرشيفية" : "Membership ID"}</span>
                  <span className="text-gold font-semibold">#{currentUser.id}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span>{isArabic ? "تاريخ الانضمام" : "Member Since"}</span>
                  <span className="text-paper">{currentUser.joinedDate || "Sep 2026"}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-ink-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                  className="w-full sm:w-auto justify-center px-4 py-2 bg-vermilion/10 border border-vermilion/40 text-vermilion hover:bg-vermilion hover:text-white font-mono text-xs uppercase tracking-wider rounded-xs transition-colors cursor-pointer flex items-center gap-2"
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto print:p-0 print:bg-transparent print:static print:block">
          <div
            id="invoice-print-area"
            className="bg-ink border border-ink-border w-full max-w-xl rounded-sm p-4 sm:p-8 space-y-4 sm:space-y-6 shadow-2xl relative my-auto animate-in zoom-in-95 duration-200 print:shadow-none print:border print:border-black/20 print:bg-white print:text-black print:p-6 print:m-0"
          >
            {/* Close Button - hidden in print */}
            <button
              onClick={() => setSelectedInvoiceOrder(null)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 text-text-muted hover:text-paper print-hidden print:hidden cursor-pointer"
            >
              <X strokeWidth={1.5} className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="border-b border-ink-border/80 print:border-black/20 pb-4 text-center space-y-1">
              <div className="flex flex-col items-center gap-1.5 mb-2">
                <img
                  src="/animeverse-logo.png"
                  alt="AnimeVerse"
                  className="h-9 sm:h-11 w-auto object-contain"
                />
                <span className="font-extrabold tracking-[0.32em] text-[10px] sm:text-[11px] uppercase text-text-muted print:text-neutral-600 font-sans">
                  Publishing Archive
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.25em] sm:tracking-[0.3em] text-gold print:text-neutral-700 uppercase block">
                6TH OF OCTOBER CENTRAL ARCHIVAL HUB — EGYPT
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight uppercase font-sans text-paper print:text-black">
                OFFICIAL ORDER RECEIPT
              </h2>
              <p className="text-[10px] sm:text-[11px] font-mono text-text-muted print:text-neutral-600">
                INVOICE #{selectedInvoiceOrder.id} • DATE: {selectedInvoiceOrder.date}
              </p>
            </div>

            {/* Details Table */}
            <div className="space-y-3 font-mono text-xs">
              <div className="border border-ink-border/60 print:border-black/20 rounded-xs overflow-hidden">
                <div className="grid grid-cols-12 bg-ink-surface/80 print:bg-neutral-100 p-2 sm:p-2.5 text-[9px] sm:text-[10px] text-text-muted print:text-neutral-700 uppercase border-b border-ink-border/60 print:border-black/20 font-bold">
                  <div className="col-span-7">ITEM DESCRIPTION</div>
                  <div className="col-span-2 text-center">QTY</div>
                  <div className="col-span-3 text-right">AMOUNT</div>
                </div>

                <div className="divide-y divide-ink-border/40 print:divide-black/10">
                  {selectedInvoiceOrder.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 p-2 sm:p-2.5 text-[10px] sm:text-[11px] text-paper print:text-black">
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
                <div className="flex justify-between text-text-muted print:text-neutral-700 text-[11px] sm:text-xs">
                  <span>Subtotal</span>
                  <span className="font-bold">{formatPrice(selectedInvoiceOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-text-muted print:text-neutral-700 text-[11px] sm:text-xs">
                  <span>Reinforced Shipping (Bosta Egypt Express)</span>
                  <span className="font-bold">{formatPrice(selectedInvoiceOrder.shippingCost || 4.00)}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base font-bold text-paper print:text-black pt-2 border-t border-ink-border/80 print:border-black/30">
                  <span>Grand Total</span>
                  <span className="text-gold print:text-black font-extrabold">{formatPrice(selectedInvoiceOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Courier Stamp / Seal */}
            <div className="p-2.5 sm:p-3 bg-ink-surface/50 print:bg-neutral-50 border border-ink-border print:border-black/20 rounded-xs flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 text-[9px] sm:text-[10px] font-mono text-text-muted print:text-neutral-700">
              <div>
                <span className="text-gold print:text-black block font-semibold">AUTHENTICITY STAMP:</span>
                <span>AnimeVerse Egypt Seal #AV-OCT-88219</span>
              </div>
              <div className="xs:text-right">
                <span className="block">TRACKING CODE:</span>
                <span className="text-paper print:text-black font-bold">{selectedInvoiceOrder.trackingNumber || "EG-OCT-9842-CAI"}</span>
              </div>
            </div>

            {/* Actions - hidden when printing */}
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 pt-2 print-hidden print:hidden">
              <button
                type="button"
                onClick={() => setSelectedInvoiceOrder(null)}
                className="flex-1 sm:flex-none justify-center px-4 py-2 border border-ink-border text-paper hover:bg-ink-surface text-xs font-mono uppercase rounded-xs transition-colors cursor-pointer text-center"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handlePrintInvoice(selectedInvoiceOrder)}
                className="flex-1 sm:flex-none justify-center px-5 py-2 bg-paper text-ink hover:bg-gold font-mono font-bold text-xs uppercase rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md text-center"
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
