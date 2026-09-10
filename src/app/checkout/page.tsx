"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, LogIn, Tag, Sparkles, X, Banknote, Smartphone, Zap, Clock, AlertCircle } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore, SavedOrder } from "@/store/useAuthStore";
import { useStorefrontStore, getActiveGovernorates } from "@/store/useStorefrontStore";
import { useMounted } from "@/store/useWishlistStore";
import { formatPrice } from "@/lib/utils";
import { CustomSelect } from "@/components/CustomSelect";
import { useWelcomeOffer } from "@/hooks/useWelcomeOffer";
import { EGYPT_GOVERNORATES, DEFAULT_GOVERNORATE_RATES } from "@/data/governorates";
import { rememberGuestOrder } from "@/lib/guestOrders";
import { sanitizeInput, validateEgyptianPhone } from "@/lib/security";
import { useTranslation } from "@/hooks/useTranslation";
import { AnimeVerseImage } from "@/components/AnimeVerseImage";

export default function CheckoutPage() {
  const router = useRouter();
  const mounted = useMounted();
  const { t, locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const {
    items: cartItems,
    getSubtotal,
    clearCart,
    appliedCoupon,
    discountPercent,
    freeShippingGranted,
    applyCoupon,
    removeCoupon,
    getDiscountAmount,
  } = useCartStore();
  const currentUser = useAuthStore((state) => state.currentUser);
  const addOrderToUser = useAuthStore((state) => state.addOrderToUser);
  const shippingConfig = useStorefrontStore((state) => state.shippingConfig);
  const { hasOffer: hasWelcomeOffer, voucherCode: welcomeCode } = useWelcomeOffer();

  const [checkoutPromoInput, setCheckoutPromoInput] = useState("");
  const [checkoutPromoError, setCheckoutPromoError] = useState("");
  const [checkoutPromoSuccess, setCheckoutPromoSuccess] = useState("");
  const [orderError, setOrderError] = useState("");

  // Form Fields State (clean defaults for guests, populated from profile if authenticated)
  const [formData, setFormData] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    governorate: currentUser?.governorate
      ? EGYPT_GOVERNORATES.find((g) => g.value.toLowerCase().includes((currentUser.governorate || "").toLowerCase()))?.value || "Cairo"
      : "Cairo",
    city: currentUser?.city || "",
    address: currentUser?.address || "",
    deliveryNotes: currentUser?.deliveryNotes || "",
    postal: "",
    country: "Egypt",
    cardNumber: "•••• •••• •••• 4242",
    cardExp: "12/28",
    cardCvc: "888",
  });

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "wallet" | "instapay">(
    currentUser?.preferredPaymentMethod || "cash"
  );
  const [senderIdentifier, setSenderIdentifier] = useState(currentUser?.paymentSenderDetail || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const isSubmittingRef = React.useRef(false);

  const activeGovernorates = useMemo(() => {
    return getActiveGovernorates(shippingConfig);
  }, [shippingConfig]);

  useEffect(() => {
    if (currentUser) {
      const matchedGov = activeGovernorates.find((g) =>
        g.value.toLowerCase().includes((currentUser.governorate || "").toLowerCase()) ||
        (currentUser.governorate || "").toLowerCase().includes(g.value.toLowerCase())
      );
      const raf = requestAnimationFrame(() => {
        setFormData((prev) => ({
          ...prev,
          name: currentUser.name || prev.name,
          email: currentUser.email || prev.email,
          phone: currentUser.phone || prev.phone,
          address: currentUser.address || prev.address,
          city: currentUser.city || prev.city,
          deliveryNotes: currentUser.deliveryNotes || prev.deliveryNotes,
          governorate: matchedGov ? matchedGov.value : prev.governorate,
        }));
        if (currentUser.preferredPaymentMethod) {
          setPaymentMethod(currentUser.preferredPaymentMethod);
        }
        if (currentUser.paymentSenderDetail) {
          setSenderIdentifier(currentUser.paymentSenderDetail);
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [currentUser, activeGovernorates]);

  const items = mounted ? cartItems : [];
  const subtotal = mounted ? getSubtotal() : 0;
  const discountAmount = mounted ? getDiscountAmount() : 0;

  // Dynamic Governorate Shipping Rate configured by Admin in CMS
  const selectedGov = formData.governorate || "Giza / 6th of October";
  const govRates = shippingConfig?.governorateRates || DEFAULT_GOVERNORATE_RATES;
  const govShippingRate =
    govRates[selectedGov] ??
    Object.entries(govRates).find(([k]) => selectedGov.toLowerCase().includes(k.toLowerCase()))?.[1] ??
    shippingConfig?.standardShippingCost ??
    65;

  const freeShippingEnabled = shippingConfig?.freeShippingEnabled ?? true;
  const freeShippingThreshold = shippingConfig?.freeShippingThreshold ?? 500;
  const netMerchandise = Math.max(0, subtotal - discountAmount);
  const isFreeShipping = freeShippingGranted || (freeShippingEnabled && netMerchandise >= freeShippingThreshold);
  const shippingCost = isFreeShipping ? 0 : govShippingRate;
  const total = Math.max(0, netMerchandise + shippingCost);

  const governorateOptions = useMemo(() => {
    return activeGovernorates.map((g) => {
      const rate = govRates[g.value] ?? g.defaultRate;
      return {
        value: g.value,
        label: isArabic ? (g.labelAr || g.label) : g.label,
        badge: isFreeShipping
          ? (isArabic ? "شحن مجاني" : "FREE")
          : isArabic
          ? `${rate} ج.م`
          : `${rate} EGP`,
      };
    });
  }, [activeGovernorates, govRates, isFreeShipping, isArabic]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError("");
    if (items.length === 0 || isSubmittingRef.current || isProcessing) return;

    // Validate Egyptian Mobile Number strictly (11 digits, valid prefix 010/011/012/015)
    const phoneValidation = validateEgyptianPhone(formData.phone);
    if (!phoneValidation.isValid) {
      setOrderError(
        isArabic
          ? "يرجى إدخال رقم هاتف مصري صحيح مكون من 11 رقماً (مثال: 01012345678)"
          : (phoneValidation.message || "Please enter a valid 11-digit Egyptian mobile number (e.g. 01012345678).")
      );
      return;
    }
    const validatedPhone = phoneValidation.normalized || formData.phone;

    isSubmittingRef.current = true;
    setIsProcessing(true);

    const isPendingPayment = paymentMethod === "wallet" || paymentMethod === "instapay";

    // No `id` and no tracking number here: the server mints the order
    // reference and the curator fills in courier details when it ships.
    const newOrder: Omit<SavedOrder, "id"> = {
      date: new Date().toISOString().split("T")[0],
      items: items.map((item) => ({
        id: item.id,
        volumeId: item.volumeId,
        title: sanitizeInput(item.title),
        seriesTitle: sanitizeInput(item.seriesTitle),
        coverImage: item.coverImage,
        price: Math.max(0, item.price),
        quantity: Math.max(1, Math.floor(item.quantity)),
        volumeNumber: item.volumeNumber,
        format: item.format,
      })),
      subtotal,
      shippingCost,
      total,
      status: isPendingPayment ? "Pending Payment" : "Confirmed",
      paymentMethod,
      paymentStatus: isPendingPayment ? "Pending Verification" : "Pending Collection",
      paymentSenderDetail: sanitizeInput(senderIdentifier.trim()) || undefined,
      customerName: sanitizeInput(formData.name),
      customerEmail: sanitizeInput(formData.email).toLowerCase(),
      customerPhone: sanitizeInput(validatedPhone),
      customerAddress: sanitizeInput(
        formData.deliveryNotes?.trim()
          ? `${formData.address.trim()} (علامة مميزة / ملاحظات: ${formData.deliveryNotes.trim()})`
          : formData.address
      ),
      customerGovernorate: sanitizeInput(formData.governorate),
      customerCity: sanitizeInput(formData.city),
      deliveryNotes: sanitizeInput(formData.deliveryNotes),
      timeline: isPendingPayment
        ? ["Order Placed", "Pending Payment Verification"]
        : ["Order Placed", "Confirmed", "Preparing Dispatch"],
      estimatedDelivery: `${shippingConfig?.deliveryEstimate || "24-48h"} (${formData.governorate})`,
    };

    try {
      const serverResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      });
      const serverData = await serverResponse.json().catch(() => null);

      if (!serverResponse.ok || !serverData?.success) {
        let msg = serverData?.message || "Unable to place your order. Please try again.";
        if (isArabic && msg.includes("unavailable or no longer have enough stock")) {
          msg = "عذراً، أحد المجلدات في سلتك قد نفد مخزونه للتو من الأرشيف. يرجى مراجعة الكميات المتبقية.";
        }
        setOrderError(msg);
        return;
      }

      const finalizedOrder: SavedOrder = serverData.order;

      // Save order to current active user profile if authenticated
      if (currentUser) {
        addOrderToUser(finalizedOrder);
      } else {
        // Guest checkout keeps only the order reference on this device. The
        // details — including the delivery address — stay on the server.
        rememberGuestOrder(finalizedOrder.id, finalizedOrder.date);
      }

      clearCart();
      removeCoupon();
      router.push(`/account?newOrder=${finalizedOrder.id}`);
    } catch {
      setOrderError(
        isArabic
          ? "تعذر الاتصال بمركز الأرشيف المركزي. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً."
          : "Network connection lost. Please check your internet connection and try again."
      );
    } finally {
      isSubmittingRef.current = false;
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-paper pt-24 sm:pt-28 pb-20 px-4 sm:px-6 md:px-12 relative z-10">
      <div className="max-w-6xl mx-auto">
        {/* Back Link */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/manga"
            className="inline-flex items-center gap-2 text-xs font-mono tracking-widest text-text-muted hover:text-paper transition-colors"
          >
            <ArrowLeft strokeWidth={1.4} className={`w-3.5 h-3.5 ${isRTL ? "rotate-180" : ""}`} />
            <span>{isArabic ? "العودة لتصفح الأرشيف" : "CONTINUE BROWSING ARCHIVE"}</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Main Checkout Form Column */}
          <div className="lg:col-span-7 space-y-8">
            <div className="border-b border-ink-border/80 pb-4">
              <span className="text-[10px] font-mono tracking-[0.25em] text-gold uppercase block mb-1">
                {isArabic ? "بروتوكول المعاملة الأرشيفية" : "TRANSACTION PROTOCOL"}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight font-sans">
                {t.checkout.pageTitle}
              </h1>
            </div>

            {/* Patron Authentication Status Banner */}
            {mounted && (
              currentUser ? (
                <div className="p-3.5 bg-ink-surface/70 border border-gold/40 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                    <span className="text-gold font-bold">{isArabic ? "ملف المقتني الأرشيفي:" : "PATRON ARCHIVE:"}</span>
                    <span className="text-paper">{currentUser.name} ({currentUser.email})</span>
                  </div>
                  <span className="text-[10px] text-text-muted">ID: {currentUser.id} • {isArabic ? "حفظ تلقائي للطلب" : "AUTO-SAVING ORDER"}</span>
                </div>
              ) : (
                <div className="p-3.5 bg-ink-surface/50 border border-ink-border rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2 text-text-muted">
                    <LogIn strokeWidth={1.4} className="w-4 h-4 text-gold shrink-0" />
                    <span>{isArabic ? "طلب بصفتك زائر. هل ترغب في تسجيل وحفظ الطلب في حسابك؟" : "Checking out as Guest. Want this order saved to your patron archive?"}</span>
                  </div>
                  <Link
                    href="/account"
                    className="text-gold hover:underline font-bold text-[11px] uppercase tracking-wider shrink-0"
                  >
                    {isArabic ? "تسجيل الدخول / إنشاء حساب ←" : "Sign In / Register →"}
                  </Link>
                </div>
              )
            )}

            {items.length === 0 ? (
              <div className="p-12 border border-ink-border/80 bg-ink-surface/40 rounded-sm text-center space-y-4">
                <p className="font-mono text-sm text-paper">{isArabic ? "سلة المقتنيات فارغة حالياً" : "YOUR CART IS CURRENTLY EMPTY"}</p>
                <Link
                  href="/manga"
                  className="inline-block px-6 py-3 bg-paper text-ink font-bold text-xs font-mono uppercase tracking-widest hover:bg-vermilion hover:text-white transition-colors"
                >
                  {isArabic ? "تصفح الأرشيف الكامل" : "RETURN TO ARCHIVE"}
                </Link>
              </div>
            ) : (
              <form onSubmit={handlePlaceOrder} className="space-y-8">
                {/* Order Validation Error Banner */}
                {orderError && (
                  <div className="p-4 bg-vermilion/15 border border-vermilion/60 rounded-xs flex items-center gap-3 text-xs font-mono text-vermilion animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{orderError}</span>
                  </div>
                )}

                {/* 1. Contact Information */}
                <div className="space-y-4 bg-ink-surface/30 border border-ink-border/70 p-6 rounded-sm">
                  <h3 className="text-xs font-mono tracking-widest text-gold uppercase flex items-center gap-2">
                    <span>01</span>
                    <span>{isArabic ? "بيانات التواصل والبريد" : "CONTACT INFORMATION"}</span>
                  </h3>
                  <div>
                    <label className="block text-[11px] font-mono text-text-muted mb-1.5 uppercase">
                      {t.checkout.email}
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder={t.checkout.emailPlaceholder}
                      className="w-full bg-ink border border-ink-border rounded-xs px-3.5 py-2.5 text-xs text-paper focus:outline-none focus:border-gold font-sans"
                    />
                  </div>
                </div>

                {/* 2. Shipping Address */}
                <div className="space-y-4 bg-ink-surface/30 border border-ink-border/70 p-6 rounded-sm">
                  <h3 className="text-xs font-mono tracking-widest text-gold uppercase flex items-center gap-2">
                    <span>02</span>
                    <span>{isArabic ? "عنوان التوصيل (كافة محافظات مصر)" : "SHIPPING DESTINATION"}</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono text-text-muted mb-1.5 uppercase">
                        {t.checkout.fullName}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t.checkout.fullNamePlaceholder}
                        className="w-full bg-ink border border-ink-border rounded-xs px-3.5 py-2.5 text-xs text-paper focus:outline-none focus:border-gold font-sans"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-text-muted mb-1.5 uppercase">
                        {t.checkout.phone}
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder={t.checkout.phonePlaceholder}
                        className="w-full bg-ink border border-ink-border rounded-xs px-3.5 py-2.5 text-xs text-paper focus:outline-none focus:border-gold font-mono"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[11px] font-mono text-text-muted uppercase">
                          {t.checkout.governorate}
                        </label>
                        <span className="text-[10px] font-mono text-gold">
                          {isArabic ? "الشحن:" : "Shipping:"} {isFreeShipping ? (isArabic ? "مجاناً" : "FREE") : formatPrice(shippingCost)}
                        </span>
                      </div>
                      <CustomSelect
                        options={governorateOptions}
                        value={formData.governorate}
                        onChange={(val) => setFormData({ ...formData, governorate: val })}
                        fullWidth
                        buttonClassName="py-2.5 bg-ink border-ink-border"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-text-muted mb-1.5 uppercase">
                        {isArabic ? "المدينة / الحي / المنطقة" : "City / District"}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder={isArabic ? "مثال: 6 أكتوبر، الشيخ زايد، الدقي، المعادي" : "e.g. 6th of October, Sheikh Zayed, Dokki, Nasr City"}
                        className="w-full bg-ink border border-ink-border rounded-xs px-3.5 py-2.5 text-xs text-paper focus:outline-none focus:border-gold font-sans"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-mono text-text-muted mb-1.5 uppercase">
                        {t.checkout.address}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder={t.checkout.addressPlaceholder}
                        className="w-full bg-ink border border-ink-border rounded-xs px-3.5 py-2.5 text-xs text-paper focus:outline-none focus:border-gold font-sans"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-mono text-text-muted mb-1.5 uppercase">
                        {isArabic ? "ملاحظات التوصيل / علامة مميزة (اختياري)" : "Delivery Landmark & Notes (Optional)"}
                      </label>
                      <input
                        type="text"
                        value={formData.deliveryNotes}
                        onChange={(e) => setFormData({ ...formData, deliveryNotes: e.target.value })}
                        placeholder={isArabic ? "مثال: بجوار مسجد كذا، الدور الثالث شقة 4، الاتصال قبل التوصيل" : "e.g. Near landmark, Apt 4 3rd floor, call before delivery"}
                        className="w-full bg-ink border border-ink-border rounded-xs px-3.5 py-2.5 text-xs text-paper focus:outline-none focus:border-gold font-sans"
                      />
                    </div>
                    <div className="sm:col-span-2 pt-2 flex items-center justify-between text-[10px] font-mono text-text-muted border-t border-ink-border/40">
                      <span>{isArabic ? "مركز التجهيز والشحن: مدينة 6 أكتوبر • مصر" : `Dispatch Hub: ${shippingConfig?.hubName || "6th of October • Egypt"}`}</span>
                      <span>{isArabic ? `المدة المتوقعة: ${shippingConfig?.deliveryEstimate || "24-48 ساعة"}` : `Delivery Estimate: ${shippingConfig?.deliveryEstimate || "24-48h"}`}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Payment Method */}
                <div className="space-y-4 bg-ink-surface/30 border border-ink-border/70 p-6 rounded-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono tracking-widest text-gold uppercase flex items-center gap-2">
                      <span>03</span>
                      <span>{isArabic ? "طريقة الدفع والتأكيد" : "PAYMENT METHOD"}</span>
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
                      <Lock strokeWidth={1.2} className="w-3 h-3 text-gold" />
                      <span>{isArabic ? "معاملة مشفرة وآمنة" : "Encrypted Transaction"}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Option 1: Cash on Delivery */}
                    <label
                      onClick={() => setPaymentMethod("cash")}
                      className={`flex items-start justify-between p-4 border rounded-sm cursor-pointer transition-all ${
                        paymentMethod === "cash"
                          ? "bg-ink-elevated/70 border-gold shadow-md shadow-gold/5"
                          : "bg-ink border-ink-border/80 hover:border-ink-border"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === "cash"}
                            onChange={() => setPaymentMethod("cash")}
                            className="accent-gold w-4 h-4 cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Banknote className="w-4 h-4 text-gold" />
                            <span className="text-xs font-bold text-paper">
                              {isArabic ? "الدفع نقدياً عند الاستلام (مع مندوب الشحن)" : "Cash on Delivery (Cash with Courier)"}
                            </span>
                            <span className="text-[9px] font-mono px-2 py-0.5 bg-gold/10 text-gold border border-gold/20 rounded-xs uppercase">
                              {isArabic ? "تحصيل عند الباب" : "Doorstep Collection"}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted">
                            {isArabic
                              ? "سدد قيمة الطلب نقداً مباشرة لمندوب شركة الشحن فور استلام وفحص الطرد الأرشيفي عند باب منزلك."
                              : "Pay in cash directly to the delivery courier upon receiving your archival parcel at your doorstep."}
                          </p>
                        </div>
                      </div>
                    </label>

                    {/* Option 2: Mobile Wallet */}
                    <label
                      onClick={() => setPaymentMethod("wallet")}
                      className={`flex items-start justify-between p-4 border rounded-sm cursor-pointer transition-all ${
                        paymentMethod === "wallet"
                          ? "bg-ink-elevated/70 border-gold shadow-md shadow-gold/5"
                          : "bg-ink border-ink-border/80 hover:border-ink-border"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === "wallet"}
                            onChange={() => setPaymentMethod("wallet")}
                            className="accent-gold w-4 h-4 cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-gold" />
                            <span className="text-xs font-bold text-paper">
                              {isArabic ? "المحافظ الإلكترونية (فودافون كاش / أورنج / اتصالات / WE)" : "Mobile Wallet (Vodafone / Orange / Etisalat / WE)"}
                            </span>
                            <span className="text-[9px] font-mono px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xs uppercase">
                              {isArabic ? "يتطلب التأكيد" : "Verification Required"}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted">
                            {isArabic
                              ? "حوّل مباشرة من محفظتك الإلكترونية إلى رقم المتجر، وسيتم تأكيد الطلب فور مطابقة رقم التحويل."
                              : "Transfer directly from your Vodafone Cash, Orange Cash, Etisalat Cash, or WE Pay mobile wallet."}
                          </p>
                        </div>
                      </div>
                    </label>

                    {/* Option 3: InstaPay */}
                    <label
                      onClick={() => setPaymentMethod("instapay")}
                      className={`flex items-start justify-between p-4 border rounded-sm cursor-pointer transition-all ${
                        paymentMethod === "instapay"
                          ? "bg-ink-elevated/70 border-gold shadow-md shadow-gold/5"
                          : "bg-ink border-ink-border/80 hover:border-ink-border"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === "instapay"}
                            onChange={() => setPaymentMethod("instapay")}
                            className="accent-gold w-4 h-4 cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-gold" />
                            <span className="text-xs font-bold text-paper">
                              {isArabic ? "تحويل إنستاباي InstaPay (تحويل بنكي لحظي)" : "InstaPay Transfer (Instant Bank / IPA)"}
                            </span>
                            <span className="text-[9px] font-mono px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xs uppercase">
                              {isArabic ? "يتطلب التأكيد" : "Verification Required"}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted">
                            {isArabic
                              ? "تحويل لحظي عبر شبكة المدفوعات اللحظية المصرية الرسمية إنستاباي إلى عنوان IPA الخاص بالمتجر."
                              : "Instant transfer via the official InstaPay Egypt electronic payment network (IPA address or account)."}
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Pending Notice Box for Wallet & InstaPay */}
                  {(paymentMethod === "wallet" || paymentMethod === "instapay") && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-sm space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider">
                            {isArabic ? "تأكيد الدفع الإلكتروني ومهلة حجز المخزون (36 ساعة)" : "Electronic Payment Verification & 36-Hour Hold Protocol"}
                          </h4>
                          <p className="text-xs text-text-muted mt-1 leading-relaxed">
                            {isArabic
                              ? <>بمجرد تسجيل هذا الطلب، سيقوم فريق خدمة العملاء بالتواصل معك لمطابقة التحويل وتأكيده. تظل حالة الطلب <strong className="text-amber-300">«قيد تأكيد الدفع»</strong>. الطلبات التي لا يتم تأكيد سدادها خلال <strong className="text-amber-300">36 ساعة (يوم ونصف)</strong> تُحذف تلقائياً لإتاحة المجلدات المحجوزة للمقتنين الآخرين.</>
                              : <>Once you place this order, our concierge team will contact you to confirm transfer details. The order status remains <strong className="text-amber-300">Pending Verification</strong>. Orders with unverified payment after <strong className="text-amber-300">36 hours (1.5 days)</strong> will be automatically cancelled to release reserved stock.</>}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-text-muted mb-1 uppercase">
                          {paymentMethod === "wallet"
                            ? (isArabic ? "رقم المحفظة الإلكترونية المحول منها (اختياري)" : "Sender Mobile Wallet Number (Optional)")
                            : (isArabic ? "عنوان إنستاباي IPA أو اسم الحساب المحول منه (اختياري)" : "Sender InstaPay IPA / Account Name (Optional)")}
                        </label>
                        <input
                          type="text"
                          value={senderIdentifier}
                          onChange={(e) => setSenderIdentifier(e.target.value)}
                          placeholder={paymentMethod === "wallet" ? (isArabic ? "مثال: 01012345678" : "e.g. +20 10X XXXX XXXX") : (isArabic ? "مثال: yourname@instapay" : "e.g. yourname@instapay")}
                          className="w-full bg-ink border border-ink-border rounded-xs px-3.5 py-2 text-xs text-paper focus:outline-none focus:border-gold font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 px-6 bg-paper text-ink font-extrabold text-xs tracking-[0.2em] uppercase rounded-sm hover:bg-vermilion hover:text-white transition-all duration-300 shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock strokeWidth={1.4} className="w-4 h-4" />
                  <span>
                    {isProcessing
                      ? (isArabic ? "جاري التجهيز والإرسال من مركز أكتوبر..." : "DISPATCHING FROM OCTOBER HUB...")
                      : (isArabic ? `تأكيد وإتمام الطلب — ${formatPrice(total)}` : `PLACE ORDER — ${formatPrice(total)}`)}
                  </span>
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Order Summary */}
          <aside className="lg:col-span-5 bg-ink-surface/40 border border-ink-border/80 p-6 rounded-sm space-y-6">
            <h2 className="text-xs font-mono tracking-widest text-gold uppercase pb-3 border-b border-ink-border/70">
              {isArabic ? `ملخص الطلب (${items.length} عناصر)` : `ORDER SUMMARY (${items.length} ITEMS)`}
            </h2>

            {/* Items list */}
            <div data-lenis-prevent className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 text-xs">
                  <div className="relative w-12 h-16 bg-ink rounded-xs overflow-hidden shrink-0 border border-ink-border">
                    <AnimeVerseImage src={item.coverImage} alt={item.title} sizes="48px" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-paper line-clamp-1">
                        {item.seriesTitle} — Vol. {item.volumeNumber}
                      </p>
                      <p className="text-[10px] font-mono text-text-muted">
                        {isArabic ? `الكمية: ${item.quantity} • ${item.format}` : `Qty: ${item.quantity} • ${item.format}`}
                      </p>
                    </div>
                    <span className="font-mono text-paper font-semibold">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Voucher & Patron Privilege Section */}
            <div className="pt-2 border-t border-ink-border/60 space-y-2 font-mono text-xs">
              {/* Quick-Apply Welcome Offer */}
              {hasWelcomeOffer && appliedCoupon !== welcomeCode && (
                <div className="p-2.5 bg-gold/10 border border-gold/40 rounded-xs flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-gold text-[11px] min-w-0">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{isArabic ? "منحة المقتنين الترحيبية:" : "Inaugural Grant:"} <strong className="text-paper">{welcomeCode}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyCoupon(welcomeCode, 20, true)}
                    className="px-2.5 py-1 bg-gold text-ink font-bold text-[10px] rounded-xs uppercase tracking-wider hover:bg-paper transition-colors shrink-0 cursor-pointer shadow-xs"
                  >
                    {isArabic ? "تطبيق 20%" : "APPLY 20%"}
                  </button>
                </div>
              )}

              {appliedCoupon ? (
                <div className="p-2.5 bg-ink border border-gold/40 rounded-xs flex items-center justify-between text-gold">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-gold" />
                    <span className="font-bold tracking-wider">{appliedCoupon}</span>
                    <span className="text-[10px] text-text-muted">
                      {isArabic ? `(خصم ${discountPercent}% وشحن سريع مجاني)` : `(-${discountPercent}% & Free Express Delivery)`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-text-muted hover:text-vermilion transition-colors p-0.5 cursor-pointer"
                    title="Remove coupon"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-stretch gap-1.5">
                    <input
                      type="text"
                      placeholder={isArabic ? "كود الخصم أو القسيمة" : "VOUCHER / PROMO CODE"}
                      value={checkoutPromoInput}
                      onChange={(e) => {
                        setCheckoutPromoInput(e.target.value);
                        if (checkoutPromoError) setCheckoutPromoError("");
                      }}
                      className="flex-1 bg-ink border border-ink-border px-3 py-2 text-xs text-paper uppercase placeholder:text-text-muted/40 focus:border-gold outline-none rounded-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!checkoutPromoInput.trim()) return;
                        const res = applyCoupon(checkoutPromoInput, 20, true);
                        if (res.success) {
                          setCheckoutPromoSuccess(res.message);
                          setCheckoutPromoInput("");
                          setTimeout(() => setCheckoutPromoSuccess(""), 3000);
                        } else {
                          setCheckoutPromoError(res.message);
                        }
                      }}
                      className="px-3.5 py-2 bg-ink hover:bg-gold hover:text-ink text-gold border border-gold/40 font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                    >
                      {isArabic ? "تطبيق" : "APPLY"}
                    </button>
                  </div>
                  {checkoutPromoError && (
                    <p className="text-[10px] text-vermilion">{checkoutPromoError}</p>
                  )}
                  {checkoutPromoSuccess && (
                    <p className="text-[10px] text-gold">{checkoutPromoSuccess}</p>
                  )}
                </div>
              )}
            </div>

            {/* Calculations */}
            <div className="space-y-2 pt-4 border-t border-ink-border/60 text-xs font-mono">
              <div className="flex justify-between text-text-muted">
                <span>{isArabic ? "المجموع الفرعي" : "SUBTOTAL"}</span>
                <span className="text-paper">{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-gold">
                  <span>{isArabic ? `خصم المقتنين (${discountPercent}-%)` : `PATRON PRIVILEGE (-${discountPercent}%)`}</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-text-muted">
                <span>
                  {isArabic
                    ? `الشحن (${formData.governorate ? (governorateOptions.find((o) => o.value === formData.governorate)?.label || formData.governorate) : "القياسي"})`
                    : `SHIPPING (${formData.governorate ? formData.governorate.split("/")[0].trim() : "Standard"})`}
                </span>
                <span className="text-paper">
                  {freeShippingGranted ? (
                    <span className="text-gold font-semibold">{isArabic ? "مجاناً (ميزة ترحيبية)" : "FREE (PATRON PRIVILEGE)"}</span>
                  ) : isFreeShipping ? (
                    <span className="text-emerald-400 font-semibold">{isArabic ? "مجاناً" : "FREE"}</span>
                  ) : (
                    formatPrice(shippingCost)
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-paper pt-3 border-t border-ink-border/60">
                <span>{isArabic ? "الإجمالي المستحق" : "TOTAL DUE"}</span>
                <span className="text-gold text-base">{formatPrice(total)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
