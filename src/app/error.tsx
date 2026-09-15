"use client";

import { useTranslation } from "@/hooks/useTranslation";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const { locale } = useTranslation();
  const isArabic = locale === "ar";
  return (
    <section role="alert" dir={isArabic ? "rtl" : "ltr"} className="min-h-[70vh] flex flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="text-2xl font-bold">{isArabic ? "تعذّر تحميل الصفحة" : "We couldn’t load this page"}</h1>
      <p className="text-text-muted">{isArabic ? "تأكد من الاتصال وحاول مرة أخرى." : "Please check your connection and try again."}</p>
      <button onClick={reset} className="border border-gold px-6 py-3 text-gold">{isArabic ? "حاول مرة أخرى" : "Try again"}</button>
    </section>
  );
}
