"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import storeLogo from "../../public/animeverse-logo.png";
import { usePathname } from "next/navigation";
import { Copyright, Phone, Mail, MessageCircle } from "lucide-react";
import { PolicyModal, PolicyTab } from "./PolicyModal";

import { useAuthStore } from "@/store/useAuthStore";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { ALL_SERIES } from "@/data/manga";
import { useMounted } from "@/store/useWishlistStore";
import { LiveEditButton } from "@/components/admin/LiveEditButton";
import { useTranslation } from "@/hooks/useTranslation";

export function Footer() {
  const pathname = usePathname();
  const [policyOpen, setPolicyOpen] = useState(false);
  const [activePolicyTab, setActivePolicyTab] = useState<PolicyTab>("shipping");
  const currentUser = useAuthStore((state) => state.currentUser);
  const { t, locale } = useTranslation();
  const editorialConfig = useStorefrontStore((state) => state.editorialConfig);
  const contactEmail = editorialConfig?.contactEmail || "";
  const contactPhone = editorialConfig?.contactPhone || "";
  // WhatsApp wants the number without spaces or a leading +.
  const whatsappNumber = contactPhone.replace(/[^0-9]/g, "");
  const editorialArabicConfig = useStorefrontStore((state) => state.editorialArabicConfig);
  const mounted = useMounted();

  const isAr = locale === "ar";

  // The column used to be four hardcoded titles that drifted from the catalogue.
  // Show the first three series the store actually carries, then a link to all.
  const allSeries = useStorefrontStore((state) => state.series);
  const footerSeries = (mounted ? allSeries : ALL_SERIES).slice(0, 3);

  const footerDescription = mounted
    ? (isAr ? (editorialArabicConfig?.footerDescription || t.footer.description) : (editorialConfig?.footerDescription || t.footer.description))
    : t.footer.description;
  const hubCities = mounted
    ? (isAr ? (editorialArabicConfig?.hubCities || t.footer.hubCities) : (editorialConfig?.hubCities || t.footer.hubCities))
    : t.footer.hubCities;

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
    <footer className="bg-ink border-t border-ink-border/80 pt-12 sm:pt-16 pb-5 sm:pb-12 text-text-muted relative overflow-hidden">
      {/* Background Japanese Watermark */}
      <div className="absolute -bottom-20 sm:-bottom-24 -right-8 sm:right-0 font-serif text-[240px] sm:text-[320px] font-bold text-white/[0.014] pointer-events-none select-none whitespace-nowrap leading-none">
        漫画
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">

        {/* Main Footer Links */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 sm:gap-10 py-12 sm:py-16">
          {/* Brand Info */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Image
                  src={storeLogo}
                  alt="AnimeVerse — Your Universe of Manga & Collector Editions"
                  sizes="164px"
                  quality={90}
                  className="h-11 w-auto brightness-[0.80]"
                />
              </div>
              <LiveEditButton
                target={{ type: "footer" }}
                label={locale === "ar" ? "تعديل الفوتر" : "Edit Footer"}
                variant="floating"
                size="xs"
              />
            </div>
            <p className="text-xs text-text-muted leading-relaxed max-w-sm">
              {footerDescription}
            </p>
            <div className="pt-2 flex items-center gap-3 font-mono text-[11px] text-paper-muted">
              <span>{hubCities}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h5 className="text-[11px] font-mono tracking-[0.2em] uppercase text-paper font-semibold mb-4 font-sans">
              {locale === "ar" ? "الأرشيف" : "ARCHIVE"}
            </h5>
            <ul className="space-y-2.5 text-xs font-sans">
              <li>
                <Link href="/manga" className="hover:text-paper transition-colors">
                  {locale === "ar" ? "كافة المجلدات" : "All Volumes"}
                </Link>
              </li>
              <li>
                <Link href="/manga?format=Deluxe+Edition" className="hover:text-paper transition-colors">
                  {locale === "ar" ? "طبعات فاخرة Deluxe" : "Deluxe Hardcovers"}
                </Link>
              </li>
              <li>
                <Link href="/manga?format=Box+Set" className="hover:text-paper transition-colors">
                  {locale === "ar" ? "صناديق المجلدات Box Sets" : "Collector Box Sets"}
                </Link>
              </li>
              <li>
                <Link href="/#genres" className="hover:text-paper transition-colors">
                  {locale === "ar" ? "تصفح حسب التصنيف" : "Explore by Genre"}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-[11px] font-mono tracking-[0.2em] uppercase text-paper font-semibold mb-4 font-sans">
              {locale === "ar" ? "السلاسل" : "SERIES"}
            </h5>
            <ul className="space-y-2.5 text-xs">
              {footerSeries.map((series) => (
                <li key={series.slug}>
                  <Link href={`/series/${series.slug}`} className="hover:text-paper transition-colors">
                    {series.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/series" className="text-gold/90 hover:text-gold transition-colors">
                  {locale === "ar" ? "كل السلاسل" : "View All Series"}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-[11px] font-mono tracking-[0.2em] uppercase text-paper font-semibold mb-4 font-sans">
              {locale === "ar" ? "خدمة المقتنين" : "CUSTOMER CARE"}
            </h5>
            <ul className="space-y-2.5 text-xs font-sans">
              <li>
                <Link href="/account?tab=ORDERS" className="hover:text-gold transition-colors block">
                  {locale === "ar" ? "تتبع الشحنات والطلبات" : "Order Tracking"}
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openPolicy("shipping")}
                  className="hover:text-gold transition-colors text-left rtl:text-right text-text-muted cursor-pointer block"
                >
                  {locale === "ar" ? "سياسات الشحن والتوصيل" : "Shipping Policies"}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openPolicy("authenticity")}
                  className="hover:text-gold transition-colors text-left rtl:text-right text-text-muted cursor-pointer block"
                >
                  {locale === "ar" ? "ضمان وشهادة الأصالة" : "Authenticity Certificate"}
                </button>
              </li>
            </ul>
          </div>

          {/* Contact — a storefront taking cash on delivery has to be reachable. */}
          {(contactEmail || contactPhone) && (
            <div>
              <h5 className="text-[11px] font-mono tracking-[0.2em] uppercase text-paper font-semibold mb-4 font-sans">
                {locale === "ar" ? "تواصل معنا" : "GET IN TOUCH"}
              </h5>
              <ul className="space-y-2.5 text-xs font-sans">
                {contactPhone && (
                  <li>
                    <a
                      href={`tel:${contactPhone.replace(/\s/g, "")}`}
                      className="hover:text-gold transition-colors flex items-center gap-2"
                      dir="ltr"
                    >
                      <Phone strokeWidth={1.6} className="w-3.5 h-3.5 text-gold shrink-0" />
                      <span>{contactPhone}</span>
                    </a>
                  </li>
                )}
                {whatsappNumber && (
                  <li>
                    <a
                      href={`https://wa.me/${whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gold transition-colors flex items-center gap-2"
                    >
                      <MessageCircle strokeWidth={1.6} className="w-3.5 h-3.5 text-gold shrink-0" />
                      <span>{locale === "ar" ? "واتساب" : "WhatsApp"}</span>
                    </a>
                  </li>
                )}
                {/* `break-all` used to split the address wherever it ran out of
                    room, leaving a lone "m" on the next line. It stays on one
                    line now and steps down a size on the narrow column instead. */}
                {contactEmail && (
                  <li className="min-w-0">
                    <a
                      href={`mailto:${contactEmail}`}
                      className="hover:text-gold transition-colors flex items-center gap-2 min-w-0"
                      dir="ltr"
                      title={contactEmail}
                    >
                      <Mail strokeWidth={1.6} className="w-3.5 h-3.5 text-gold shrink-0" />
                      <span className="whitespace-nowrap text-[10px] sm:text-[11px] tracking-tight">
                        {contactEmail}
                      </span>
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom Sub-bar */}
        <div className="pt-8 border-t border-ink-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[11px] font-mono tracking-wider text-text-muted font-sans text-center sm:text-left">
            <Copyright strokeWidth={1.6} className="w-3.5 h-3.5 text-gold shrink-0" />
            <span>{new Date().getFullYear()}</span>
            <span className="text-paper font-semibold">ANIMEVERSE PUBLISHING ARCHIVE.</span>
            <span className="text-text-muted/75">{locale === "ar" ? "جميع الحقوق محفوظة." : "ALL RIGHTS RESERVED."}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4 sm:gap-6 font-sans text-xs">
            <span className="text-gold font-serif">物語と記憶のかたち</span>
            <button
              type="button"
              onClick={() => openPolicy("privacy")}
              className="text-text-muted hover:text-gold transition-colors cursor-pointer uppercase tracking-wider text-[11px]"
            >
              {locale === "ar" ? "سياسة الخصوصية" : "PRIVACY PROTOCOL"}
            </button>
            <button
              type="button"
              onClick={() => openPolicy("terms")}
              className="text-text-muted hover:text-gold transition-colors cursor-pointer uppercase tracking-wider text-[11px]"
            >
              {locale === "ar" ? "شروط الشراء والاستبدال" : "TERMS OF SALE"}
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
