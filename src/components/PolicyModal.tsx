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
                ? "مركز الشحن الرئيسي: الحي المتميز، 6 أكتوبر، الجيزة • شحن وتوصيل مباشر لكافة محافظات مصر"
                : "Operating out of 6th of October Hub, Giza • Direct delivery to all Egypt"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-paper hover:bg-ink border border-transparent hover:border-ink-border rounded-xs transition-colors cursor-pointer shrink-0 z-10"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-gold" />
          </button>
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
                  <span>
                    {isArabic
                      ? "مركز الشحن الرئيسي: مدينة 6 أكتوبر • الجيزة، مصر"
                      : "Central Dispatch: 6th of October City Hub • Giza, Egypt"}
                  </span>
                </div>
                <p className="text-paper">
                  {isArabic
                    ? "تخرج جميع طلبات المانجا المطبوعة مباشرة من مركز التجهيز المتطور المخصص للأرشيف في الحي المتميز، مدينة 6 أكتوبر، الجيزة. نغطي كافة محافظات جمهورية مصر العربية الـ 27 بتوصيل سريع ومباشر حتى باب المنزل."
                    : "All physical manga orders are handled and dispatched directly from our specialized climate-controlled fulfillment hub in the Al Motamayez District, 6th of October City, Giza. We deliver to all 27 governorates across Egypt."}
                </p>
              </div>

              <div>
                <h4 className="font-mono text-paper font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gold" />
                  <span>{isArabic ? "مواعيد وفترات التوصيل حسب المحافظة" : "Delivery Windows & Estimates"}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                  <div className="p-3 bg-ink-surface/50 border border-ink-border rounded-xs">
                    <span className="text-gold block font-bold text-[11px]">{isArabic ? "القاهرة والجيزة" : "CAIRO & GIZA"}</span>
                    <span className="text-paper font-extrabold text-sm block mt-1">{isArabic ? "خلال 24 – 48 ساعة" : "24 – 48 Hours"}</span>
                    <span className="text-[10px] text-text-muted mt-1 block">{isArabic ? "شحن يومي مباشر وسريع" : "Daily express dispatch"}</span>
                  </div>
                  <div className="p-3 bg-ink-surface/50 border border-ink-border rounded-xs">
                    <span className="text-gold block font-bold text-[11px]">{isArabic ? "الإسكندرية ومحافظات الدلتا" : "ALEX & DELTA"}</span>
                    <span className="text-paper font-extrabold text-sm block mt-1">{isArabic ? "خلال 2 – 3 أيام عمل" : "2 – 3 Days"}</span>
                    <span className="text-[10px] text-text-muted mt-1 block">{isArabic ? "يشمل مدن القناة" : "Canal Cities included"}</span>
                  </div>
                  <div className="p-3 bg-ink-surface/50 border border-ink-border rounded-xs">
                    <span className="text-gold block font-bold text-[11px]">{isArabic ? "الصعيد والبحر الأحمر ومطروح" : "UPPER EGYPT & RED SEA"}</span>
                    <span className="text-paper font-extrabold text-sm block mt-1">{isArabic ? "خلال 3 – 4 أيام عمل" : "3 – 4 Days"}</span>
                    <span className="text-[10px] text-text-muted mt-1 block">{isArabic ? "توصيل آمن حتى باب المنزل" : "Full door-to-door transit"}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-mono text-paper font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                  <PackageCheck className="w-3.5 h-3.5 text-gold" />
                  <span>{isArabic ? "ميثاق التغليف المصفح للمقتنين" : "Collector Armor Packaging Guarantee"}</span>
                </h4>
                <p>
                  {isArabic
                    ? "نعتمد كراتين مقوّاة مزدوجة الجدران مع دعامات زوايا متينة وأكياس أرشيفية عازلة لحماية المجلد من أي التواء أو احتكاك أثناء الشحن. نرفض تماماً استخدام الأكياس البلاستيكية الخفيفة حرصاً على سلامة الحواف."
                    : "Every volume is packed using dual-wall reinforced corrugated cartons, high-density edge guards, and archival slip-sleeves. We strictly forbid thin plastic mailers to preserve crisp, unbent book corners during transit."}
                </p>
              </div>

              <div className="pt-2 border-t border-ink-border/50 flex items-center justify-between text-[11px] font-mono text-text-muted">
                <span>{isArabic ? "شركاء الشحن: بوسطة إكسبريس وأرامكس مصر" : "COURIERS: BOSTA EXPRESS & ARAMEX EGYPT"}</span>
                <span className="text-gold">{isArabic ? "شحن مجاني للطلبات فوق 750 ج.م" : "FREE DISPATCH OVER EGP 750"}</span>
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
                        {isArabic ? "شهادة الاعتماد والأصالة الأرشيفية" : "CERTIFICATE OF AUTHENTICITY"}
                      </span>
                      <span className="text-paper font-extrabold text-sm uppercase tracking-tight">
                        {isArabic ? "طبعات رسمية مرخصة 100% من كبرى دور النشر اليابانية" : "100% GENUINE JAPANESE LICENSED EDITIONS"}
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
                    ? "تضمن هذه الوثيقة أن جميع مجلدات المانجا والكتب الفنية المعروضة في منصة كايرو مستوردة بشكل قانوني ورسمي من أصحاب الحقوق المعتمدين، بما في ذلك Shueisha و Kodansha و Hakusensha و Shogakukan و Square Enix، إضافةً إلى الدور العالمية المرخصة (Dark Horse, Viz Media)."
                    : "This document certifies that every volume distributed through ANIMEVERSE Publishing Archive is imported directly from official licensed rights holders, including Shueisha, Kodansha, Hakusensha, Shogakukan, Square Enix, and authorized Western imprints (Dark Horse, Viz Media)."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono pt-2">
                  <div className="flex items-center gap-2 text-paper">
                    <CheckCircle2 className="w-3.5 h-3.5 text-gold shrink-0" />
                    <span>{isArabic ? "رقم إيداع دولي ISBN وباركود رسمي ياباني" : "Official ISBN & Tokyo registry barcoded"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-paper">
                    <CheckCircle2 className="w-3.5 h-3.5 text-gold shrink-0" />
                    <span>{isArabic ? "ورق أرشيفي ممتاز خالٍ من الأحماض" : "Archival acid-free paper stock"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-paper">
                    <CheckCircle2 className="w-3.5 h-3.5 text-gold shrink-0" />
                    <span>{isArabic ? "خالٍ تماماً من النسخ المقلدة أو غير المصرح بها" : "Zero counterfeit or bootleg prints"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-paper">
                    <CheckCircle2 className="w-3.5 h-3.5 text-gold shrink-0" />
                    <span>{isArabic ? "استبدال فوري مجاني لأي عيب مصنعي أو تلف شحن" : "Free replacement for transit corner damage"}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-mono text-paper font-bold text-xs uppercase tracking-wider mb-2">
                  {isArabic ? "ضمان الاستبدال الفوري للمقتنين" : "Collector Replacement Guarantee"}
                </h4>
                <p>
                  {isArabic
                    ? "بصفتنا مقتنين للمانجا قبل كل شيء، نقوم بفحص أغلفة المجلدات ولمعان الحروف وزوايا الكعب بدقة بالغة قبل التغليف. وإذا وصلك أي مجلد به انثناء أو عيب في الطباعة أو التجليد، يحق لك استبداله مجاناً خلال 14 يوماً."
                    : "As collectors ourselves, we inspect book jackets, spot-varnishes, and spine corners before packing. If your volume arrives with any physical dent or printing defect, notify us within 14 days for an immediate no-hassle exchange."}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PRIVACY PROTOCOL */}
          {activeTab === "privacy" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 bg-ink-surface border border-ink-border rounded-xs">
                <div className="flex items-center gap-2 text-gold font-mono text-[11px] font-bold uppercase mb-2">
                  <Lock className="w-4 h-4 text-gold" />
                  <span>{isArabic ? "تشفير بيانات المقتنين وحماية الخصوصية" : "Patron Data Encryption & Sovereignty"}</span>
                </div>
                <p className="text-paper">
                  {isArabic
                    ? "خصوصيتك أولويتنا المطلقة. تلتزم كايرو بأعلى معايير حماية البيانات وبقانون حماية البيانات الشخصية المصري (قانون رقم 151 لسنة 2020)."
                    : "Your privacy is paramount. ANIMEVERSE adheres to strict data minimization standards and the Egyptian Data Protection Law (Law No. 151 of 2020)."}
                </p>
              </div>

              <div className="space-y-3">
                <div className={`${isRTL ? "border-r-2 pr-3.5" : "border-l-2 pl-3.5"} border-gold`}>
                  <h5 className="font-mono text-paper font-bold text-xs uppercase">
                    {isArabic ? "حظر مشاركة أو بيع البيانات تماماً" : "No Third-Party Data Selling"}
                  </h5>
                  <p className="mt-1">
                    {isArabic
                      ? "لا نقوم إطلاقاً ببيع أو تأجير أرقام هواتف العملاء أو عناوين الشحن أو تفضيلات القراءة لأي شركات تسويق خارجية أو شبكات إعلانية."
                      : "We never sell, rent, or trade your phone number, delivery address, or manga reading preferences to marketing agencies or ad trackers."}
                  </p>
                </div>

                <div className={`${isRTL ? "border-r-2 pr-3.5" : "border-l-2 pl-3.5"} border-gold`}>
                  <h5 className="font-mono text-paper font-bold text-xs uppercase">
                    {isArabic ? "دفع آمن ومعالجة مشفرة" : "End-to-End Encrypted Checkout"}
                  </h5>
                  <p className="mt-1">
                    {isArabic
                      ? "تتم كافة عمليات الدفع والتحويل عبر قنوات مشفرة وفق بروتوكولات الأمان القياسية PCI-DSS. لا نحتفظ بأي بيانات مصرفية حساسة على خوادمنا."
                      : "All payment processing via Credit Card or Instapay is handled through PCI-DSS Level 1 compliant gateways. Card numbers are never stored in plain text or saved on our servers."}
                  </p>
                </div>

                <div className={`${isRTL ? "border-r-2 pr-3.5" : "border-l-2 pl-3.5"} border-gold`}>
                  <h5 className="font-mono text-paper font-bold text-xs uppercase">
                    {isArabic ? "تحكم كامل في جلسة التصفح" : "Local Storage & Session Control"}
                  </h5>
                  <p className="mt-1">
                    {isArabic
                      ? "يتم حفظ محتويات السلة وقائمة الرغبات محلياً في متصفحك، ويمكنك حذفها أو تفريغها بضغطة زر واحدة في أي وقت عبر إعدادات حسابك."
                      : "Cart contents, wishlist volumes, and reading progress are stored locally in your browser and can be purged at any moment via your Account Settings."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TERMS OF SALE */}
          {activeTab === "terms" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 bg-ink-surface border border-ink-border rounded-xs">
                <div className="flex items-center gap-2 text-gold font-mono text-[11px] font-bold uppercase mb-2">
                  <FileText className="w-4 h-4 text-gold" />
                  <span>{isArabic ? "شروط الشراء وحق المعاينة عند الاستلام" : "Purchasing Terms & Patron Inspection"}</span>
                </div>
                <p className="text-paper">
                  {isArabic
                    ? "عند تأكيد طلبك في كايرو، فإنك توافق على الشروط والضوابط التالية المصممة لضمان تجربة اقتناء مريحة وموثوقة."
                    : "By placing an order on ANIMEVERSE, you agree to the following terms designed to ensure collector satisfaction across Egypt."}
                </p>
              </div>

              <div className="space-y-3 font-sans">
                <div className="flex items-start gap-2">
                  <RefreshCcw className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-paper font-mono uppercase text-[11px]">
                      {isArabic ? "حق الاستبدال خلال 14 يوماً:" : "14-Day Return & Replacement:"}
                    </strong>
                    <p className="mt-0.5">
                      {isArabic
                        ? "إذا استلمت مجلداً به أي تلف أو خطأ في التجليد، يحق لك استبداله خلال 14 يوماً من تاريخ الاستلام، بشرط بقاء الكتاب في حالته الأصلية وغلافه الحافظ."
                        : "Items that are damaged upon delivery or have binding defects are eligible for replacement within 14 days of receipt. Volumes must be in original condition with publisher sleeves."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-paper font-mono uppercase text-[11px]">
                      {isArabic ? "حق المعاينة قبل الاستلام:" : "Package Inspection:"}
                    </strong>
                    <p className="mt-0.5">
                      {isArabic
                        ? "يحق للعميل معاينة الطرد والتأكد من سلامة التغليف الخارجي في وجود مندوب التوصيل قبل الاستلام والتوقيع النهائي."
                        : "Patrons in Egypt have the full right to inspect the external shipping container in the presence of the courier before final signature."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Truck className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-paper font-mono uppercase text-[11px]">
                      {isArabic ? "شروط الدفع عند الاستلام (COD):" : "Cash on Delivery (COD) Terms:"}
                    </strong>
                    <p className="mt-0.5">
                      {isArabic
                        ? "الدفع عند الاستلام متاح في كافة أنحاء مصر. في حالة تكرار رفض الاستلام بدون مبرر، قد يتم حصر الطلبات المستقبلية على الدفع المسبق."
                        : "Cash on Delivery is supported across all Egyptian governorates. Repeated uncollected orders may require prepaid verification for future orders."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-3 sm:p-4 border-t border-ink-border bg-ink-surface/80 flex items-center justify-end sm:justify-between gap-3 text-[11px] font-mono">
          <span className="hidden sm:block text-gold font-serif truncate">物語と記憶のかたち • ANIMEVERSE OFFICIAL ARCHIVE</span>
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
