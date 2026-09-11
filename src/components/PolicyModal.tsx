"use client";

import React, { useEffect } from "react";
import {
  X,
  Truck,
  ShieldCheck,
  Lock,
  FileText,
  MapPin,
  CheckCircle2,
  PackageCheck,
  Award,
  Clock,
  RefreshCcw,
} from "lucide-react";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { useTranslation } from "@/hooks/useTranslation";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { LiveEditButton } from "@/components/admin/LiveEditButton";

export type PolicyTab = "shipping" | "authenticity" | "privacy" | "terms";

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: PolicyTab;
  onTabChange: (tab: PolicyTab) => void;
}

export function PolicyModal({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
}: PolicyModalProps) {
  useModalScrollLock(isOpen);
  const { locale, isRTL } = useTranslation();
  const isArabic = locale === "ar";
  const editorialConfig = useStorefrontStore((state) => state.editorialConfig);
  const editorialArabicConfig = useStorefrontStore((state) => state.editorialArabicConfig);
  const shippingConfig = useStorefrontStore((state) => state.shippingConfig);
  const policyContentEn = useStorefrontStore((state) => state.policyContent);
  const policyContentAr = useStorefrontStore((state) => state.policyContentArabic);
  // Every heading, titled point, delivery card and tick below is curator copy.
  const policy = isArabic ? policyContentAr : policyContentEn;
  const contactEmail = editorialConfig?.contactEmail || "";
  const contactPhone = editorialConfig?.contactPhone || "";
  const freeShippingEnabled = shippingConfig?.freeShippingEnabled ?? true;
  const freeShippingThreshold = shippingConfig?.freeShippingThreshold ?? 500;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain p-2.5 sm:p-6 md:p-12 flex items-center justify-center animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-ink/85 backdrop-blur-md transition-opacity cursor-pointer"
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        data-lenis-prevent
        className="relative w-full max-w-3xl bg-ink border border-ink-border rounded-xs shadow-[0_25px_60px_rgba(0,0,0,0.95)] z-10 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] text-paper animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with Japanese Watermark */}
        <div className="relative p-4 sm:p-6 border-b border-ink-border bg-ink-surface/70 flex items-center sm:items-start justify-between gap-3 sm:gap-4">
          <div className="hidden sm:block absolute right-8 top-2 font-serif text-6xl text-white/[0.03] select-none pointer-events-none">
            公式認証
          </div>

          <div className="relative z-10 min-w-0">
            <div className="hidden sm:flex items-center gap-2 text-gold font-mono text-[10px] tracking-widest uppercase mb-1">
              <span>{isArabic ? "أرشيف أنيمي فيرس الرسمي" : "ANIMEVERSE ARCHIVE CODEX"}</span>
              <span>/</span>
              <span>{isArabic ? "سياسات الخدمة والضمان" : "CUSTOMER CARE & POLICIES"}</span>
            </div>
            <h3 className="text-base sm:text-xl font-extrabold uppercase tracking-tight font-sans">
              {isArabic ? "السياسات والضمان" : "POLICIES & CERTIFICATIONS"}
            </h3>
            <p className="hidden sm:block text-xs text-text-muted mt-0.5">
              {isArabic
                ? (editorialArabicConfig?.hubCities ? `مركز الشحن الرئيسي: ${editorialArabicConfig.hubCities}` : "مركز الشحن الرئيسي: الحي المتميز، 6 أكتوبر، الجيزة • شحن وتوصيل مباشر لكافة محافظات مصر")
                : (editorialConfig?.hubCities ? `Operating out of ${editorialConfig.hubCities}` : "Operating out of 6th of October Hub, Giza • Direct delivery to all Egypt")}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 z-10">
            {/* Admin-only control, kept a clear step away from the close
                button so the two are never mistaken for a matched pair. */}
            <LiveEditButton
              target={{ type: "editorial", tab: activeTab }}
              label={
                activeTab === "shipping"
                  ? (isArabic ? "تعديل الشحن" : "Edit Shipping")
                  : activeTab === "authenticity"
                  ? (isArabic ? "تعديل الأصالة" : "Edit Authenticity")
                  : activeTab === "privacy"
                  ? (isArabic ? "تعديل الخصوصية" : "Edit Privacy")
                  : (isArabic ? "تعديل الشروط" : "Edit Terms")
              }
              variant="floating"
              size="xs"
              className="me-1"
            />
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-paper hover:bg-ink border border-ink-border/60 rounded-xs transition-colors cursor-pointer shrink-0"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5 text-gold" />
            </button>
          </div>
        </div>

        {/* Tab Navigation - Clean responsive grid with zero horizontal scrollbar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-ink-border bg-ink">
          <button
            type="button"
            onClick={() => onTabChange("shipping")}
            className={`flex items-center justify-center gap-2 py-3.5 px-3 text-xs font-mono tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
              activeTab === "shipping"
                ? "border-gold text-gold font-bold bg-gold/5"
                : "border-transparent text-text-muted hover:text-paper hover:bg-ink-surface/50"
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-gold shrink-0" />
            <span className="truncate">{isArabic ? "الشحن والتوصيل" : "Shipping"}</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("authenticity")}
            className={`flex items-center justify-center gap-2 py-3.5 px-3 text-xs font-mono tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
              activeTab === "authenticity"
                ? "border-gold text-gold font-bold bg-gold/5"
                : "border-transparent text-text-muted hover:text-paper hover:bg-ink-surface/50"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-gold shrink-0" />
            <span className="truncate">{isArabic ? "شهادة الأصالة" : "Authenticity"}</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("privacy")}
            className={`flex items-center justify-center gap-2 py-3.5 px-3 text-xs font-mono tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
              activeTab === "privacy"
                ? "border-gold text-gold font-bold bg-gold/5"
                : "border-transparent text-text-muted hover:text-paper hover:bg-ink-surface/50"
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-gold shrink-0" />
            <span className="truncate">{isArabic ? "الخصوصية والأمان" : "Privacy"}</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("terms")}
            className={`flex items-center justify-center gap-2 py-3.5 px-3 text-xs font-mono tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
              activeTab === "terms"
                ? "border-gold text-gold font-bold bg-gold/5"
                : "border-transparent text-text-muted hover:text-paper hover:bg-ink-surface/50"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-gold shrink-0" />
            <span className="truncate">{isArabic ? "شروط الاستبدال" : "Terms"}</span>
          </button>
        </div>

        {/* Content Body */}
        <div
          data-lenis-prevent
          className="p-6 overflow-y-auto overscroll-contain space-y-6 text-xs leading-relaxed text-text-muted"
        >
          {/* TAB 1: SHIPPING POLICIES */}
          {activeTab === "shipping" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 bg-ink-surface border border-ink-border rounded-xs">
                <div className="flex items-center gap-2 text-gold font-mono text-[11px] font-bold uppercase mb-2">
                  <MapPin className="w-4 h-4 text-gold" />
                  <span>{policy.shipping.leadTitle}</span>
                </div>
                <p className="text-paper">
                  {isArabic
                    ? (editorialArabicConfig?.shippingPolicyText || "تخرج جميع طلبات المانجا المطبوعة مباشرة من مركز التجهيز المتطور المخصص للأرشيف في الحي المتميز، مدينة 6 أكتوبر، الجيزة. نغطي كافة محافظات جمهورية مصر العربية الـ 27 بتوصيل سريع ومباشر حتى باب المنزل.")
                    : (editorialConfig?.shippingPolicyText || "All physical manga orders are handled and dispatched directly from our specialized climate-controlled fulfillment hub in the Al Motamayez District, 6th of October City, Giza. We deliver to all 27 governorates across Egypt.")}
                </p>
              </div>

              <div>
                <h4 className="font-mono text-paper font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gold" />
                  <span>{policy.shipping.windowsTitle}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                  {policy.shipping.windows.map((window, index) => (
                    <div key={index} className="p-3 bg-ink-surface/50 border border-ink-border rounded-xs">
                      <span className="text-gold block font-bold text-[11px]">{window.region}</span>
                      <span className="text-paper font-extrabold text-sm block mt-1">{window.duration}</span>
                      <span className="text-[10px] text-text-muted mt-1 block">{window.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {policy.shipping.points.map((point, index) => (
                <div key={index}>
                  <h4 className="font-mono text-paper font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                    <PackageCheck className="w-3.5 h-3.5 text-gold" />
                    <span>{point.title}</span>
                  </h4>
                  <p>{point.body}</p>
                </div>
              ))}

              <div className="pt-2 border-t border-ink-border/50 flex items-center justify-between text-[11px] font-mono text-text-muted">
                <span>{policy.shipping.couriers}</span>
                {freeShippingEnabled ? (
                  <span className="text-gold font-semibold">
                    {isArabic
                      ? `شحن مجاني للطلبات فوق ${freeShippingThreshold} ج.م`
                      : `FREE DISPATCH OVER EGP ${freeShippingThreshold}`}
                  </span>
                ) : (
                  <span className="text-gold font-semibold">
                    {isArabic ? "تغطية شحن لكافة المحافظات" : "ALL-EGYPT TRANSIT"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AUTHENTICITY CERTIFICATE */}
          {activeTab === "authenticity" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-5 bg-ink-surface border-2 border-gold/30 rounded-xs relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink-border pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-gold shrink-0" />
                    <div>
                      <span className="font-mono text-[10px] text-gold tracking-widest uppercase block">
                        {policy.authenticity.leadTitle}
                      </span>
                      <span className="text-paper font-extrabold text-sm uppercase tracking-tight">
                        {policy.authenticity.certificateTitle}
                      </span>
                    </div>
                  </div>

                  {/* Official ANIMEVERSE Japanese Collector Hanko Seal */}
                  <div className="flex items-center gap-2.5 px-3 py-1.5 bg-ink/90 border border-gold/30 rounded-xs self-start sm:self-auto shadow-sm">
                    <div className="w-8 h-8 shrink-0 bg-vermilion rounded-xs flex items-center justify-center text-paper font-serif font-extrabold text-[11px] leading-none shadow-sm ring-1 ring-vermilion/50">
                      漫画
                    </div>
                    <div className="flex flex-col text-left leading-tight">
                      <span className="text-gold font-mono text-[9px] font-bold tracking-widest uppercase">
                        ANIMEVERSE ARCHIVE
                      </span>
                      <span className="text-paper font-serif text-[11px] font-bold tracking-wider">
                        公式認証・正規品
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-paper mb-3">
                  {isArabic
                    ? (editorialArabicConfig?.authenticityGuaranteeText || "تضمن هذه الوثيقة أن جميع مجلدات المانجا والكتب الفنية المعروضة في منصة كايرو مستوردة بشكل قانوني ورسمي من أصحاب الحقوق المعتمدين، بما في ذلك Shueisha و Kodansha و Hakusensha و Shogakukan و Square Enix، إضافةً إلى الدور العالمية المرخصة (Dark Horse, Viz Media).")
                    : (editorialConfig?.authenticityGuaranteeText || "This document certifies that every volume distributed through ANIMEVERSE Publishing Archive is imported directly from official licensed rights holders, including Shueisha, Kodansha, Hakusensha, Shogakukan, Square Enix, and authorized Western imprints (Dark Horse, Viz Media).")}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono pt-2">
                  {policy.authenticity.checks.map((check, index) => (
                    <div key={index} className="flex items-center gap-2 text-paper">
                      <CheckCircle2 className="w-3.5 h-3.5 text-gold shrink-0" />
                      <span>{check}</span>
                    </div>
                  ))}
                </div>
              </div>

              {policy.authenticity.points.map((point, index) => (
                <div key={index}>
                  <h4 className="font-mono text-paper font-bold text-xs uppercase tracking-wider mb-2">{point.title}</h4>
                  <p>{point.body}</p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: PRIVACY PROTOCOL */}
          {activeTab === "privacy" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 bg-ink-surface border border-ink-border rounded-xs">
                <div className="flex items-center gap-2 text-gold font-mono text-[11px] font-bold uppercase mb-2">
                  <Lock className="w-4 h-4 text-gold" />
                  <span>{policy.privacy.leadTitle}</span>
                </div>
                <p className="text-paper">
                  {isArabic
                    ? (editorialArabicConfig?.privacyPolicyText || "خصوصيتك أولويتنا المطلقة. تلتزم كايرو بأعلى معايير حماية البيانات وبقانون حماية البيانات الشخصية المصري (قانون رقم 151 لسنة 2020).")
                    : (editorialConfig?.privacyPolicyText || "Your privacy is paramount. ANIMEVERSE adheres to strict data minimization standards and the Egyptian Data Protection Law (Law No. 151 of 2020).")}
                </p>
              </div>

              <div className="space-y-3">
                {policy.privacy.points.map((point, index) => (
                  <div
                    key={index}
                    className={`${isRTL ? "border-r-2 pr-3.5" : "border-l-2 pl-3.5"} border-gold`}
                  >
                    <h5 className="font-mono text-paper font-bold text-xs uppercase">{point.title}</h5>
                    <p className="mt-1">{point.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: TERMS OF SALE */}
          {activeTab === "terms" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 bg-ink-surface border border-ink-border rounded-xs">
                <div className="flex items-center gap-2 text-gold font-mono text-[11px] font-bold uppercase mb-2">
                  <FileText className="w-4 h-4 text-gold" />
                  <span>{policy.terms.leadTitle}</span>
                </div>
                <p className="text-paper">
                  {isArabic
                    ? (editorialArabicConfig?.returnPolicyText || "عند تأكيد طلبك في كايرو، فإنك توافق على الشروط والضوابط التالية المصممة لضمان تجربة اقتناء مريحة وموثوقة.")
                    : (editorialConfig?.returnPolicyText || "By placing an order on ANIMEVERSE, you agree to the following terms designed to ensure collector satisfaction across Egypt.")}
                </p>
              </div>

              <div className="space-y-3 font-sans">
                {policy.terms.points.map((point, index) => {
                  // The first three keep the icons they have always had; any
                  // point a curator adds past them falls back to the tick.
                  const Icon = [RefreshCcw, CheckCircle2, Truck][index] || CheckCircle2;
                  return (
                    <div key={index} className="flex items-start gap-2">
                      <Icon className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-paper font-mono uppercase text-[11px]">{point.title}</strong>
                        <p className="mt-0.5">{point.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-3 sm:p-4 border-t border-ink-border bg-ink-surface/80 flex items-center justify-end sm:justify-between gap-3 text-[11px] font-mono">
          <div className="hidden sm:flex items-center gap-3 min-w-0 text-text-muted">
            {contactPhone && (
              <a href={`tel:${contactPhone.replace(/\s/g, "")}`} className="hover:text-gold transition-colors whitespace-nowrap" dir="ltr">
                {contactPhone}
              </a>
            )}
            {contactPhone && contactEmail && <span className="text-ink-border">•</span>}
            {contactEmail && (
              <a href={`mailto:${contactEmail}`} className="hover:text-gold transition-colors truncate" dir="ltr">
                {contactEmail}
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-ink border border-ink-border hover:border-gold/60 text-paper rounded-xs transition-colors cursor-pointer uppercase tracking-wider whitespace-nowrap"
          >
            {isArabic ? "إغلاق النافذة" : "Close Window"}
          </button>
        </div>
      </div>
    </div>
  );
}
