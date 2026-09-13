"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, FileText, Lock } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useStorefrontStore } from "@/store/useStorefrontStore";

/**
 * Stand-alone privacy policy and terms of sale, at their own URLs.
 *
 * The footer shows the same text in a dialog, but Google's OAuth consent
 * screen (and anyone linking to the policy) needs a real page. Both read the
 * curator's copy from the store, so editing it in the Live Editor updates the
 * dialog and these pages together.
 */
export function PolicyPage({ kind }: { kind: "privacy" | "terms" }) {
  const { locale } = useTranslation();
  const isArabic = locale === "ar";
  const editorialConfig = useStorefrontStore((state) => state.editorialConfig);
  const editorialArabicConfig = useStorefrontStore((state) => state.editorialArabicConfig);
  const policy = useStorefrontStore((state) => (isArabic ? state.policyContentArabic : state.policyContent));
  const contactEmail = editorialConfig?.contactEmail || "";

  const section = kind === "privacy" ? policy.privacy : policy.terms;
  const lead =
    kind === "privacy"
      ? isArabic
        ? editorialArabicConfig?.privacyPolicyText || "خصوصيتك أولويتنا. نلتزم بقانون حماية البيانات الشخصية المصري (قانون رقم 151 لسنة 2020)."
        : editorialConfig?.privacyPolicyText || "Your privacy is paramount. ANIMEVERSE follows the Egyptian Data Protection Law (Law No. 151 of 2020)."
      : isArabic
        ? editorialArabicConfig?.returnPolicyText || "عند تأكيد طلبك فإنك توافق على الشروط التالية."
        : editorialConfig?.returnPolicyText || "By placing an order on ANIMEVERSE, you agree to the following terms.";
  const title =
    kind === "privacy" ? (isArabic ? "سياسة الخصوصية" : "Privacy Policy") : isArabic ? "شروط البيع والاستبدال" : "Terms of Sale";
  const Icon = kind === "privacy" ? Lock : FileText;

  return (
    <main className="min-h-screen bg-ink text-paper pt-28 sm:pt-32 pb-20 px-4 sm:px-6">
      <article className="max-w-3xl mx-auto">
        <span className="text-[11px] font-mono tracking-[0.25em] text-gold uppercase block mb-2">ANIMEVERSE</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight uppercase font-sans">{title}</h1>

        <div className="mt-8 p-5 bg-ink-surface border border-ink-border rounded-xs">
          <div className="flex items-center gap-2 text-gold font-mono text-[11px] font-bold uppercase mb-2">
            <Icon className="w-4 h-4" />
            <span>{section.leadTitle}</span>
          </div>
          <p className="text-sm leading-relaxed">{lead}</p>
        </div>

        <div className="mt-8 space-y-6">
          {section.points.map((point, index) => (
            <section key={index} className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-gold shrink-0 mt-1" />
              <div>
                <h2 className="font-mono text-paper font-bold text-xs uppercase tracking-wider">{point.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{point.body}</p>
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 pt-6 border-t border-ink-border/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-text-muted">
          {contactEmail ? (
            <span>
              {isArabic ? "للاستفسارات: " : "Questions: "}
              <a href={`mailto:${contactEmail}`} className="text-gold hover:underline" dir="ltr">
                {contactEmail}
              </a>
            </span>
          ) : (
            <span />
          )}
          <Link href={kind === "privacy" ? "/terms" : "/privacy"} className="uppercase tracking-wider hover:text-paper">
            {kind === "privacy" ? (isArabic ? "شروط البيع" : "Terms of Sale") : isArabic ? "سياسة الخصوصية" : "Privacy Policy"}
          </Link>
        </footer>
      </article>
    </main>
  );
}
