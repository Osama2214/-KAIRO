"use client";

import { useTranslation } from "@/hooks/useTranslation";

export default function GlobalError({ reset }: { reset: () => void }) {
  const { locale } = useTranslation();
  const isArabic = locale === "ar";
  return (
    <html lang={locale} dir={isArabic ? "rtl" : "ltr"}><body style={{ margin: 0, background: "#0D0D0F", color: "#f5f1e8", fontFamily: "system-ui" }}>
      <main role="alert" style={{ minHeight: "100vh", display: "grid", placeContent: "center", textAlign: "center", padding: 24 }}>
        <h1>{isArabic ? "المتجر غير متاح مؤقتًا" : "The store is temporarily unavailable"}</h1>
        <p>{isArabic ? "حاول مرة أخرى بعد لحظات." : "Please try again in a moment."}</p>
        <button onClick={reset} style={{ padding: 16, cursor: "pointer" }}>{isArabic ? "حاول مرة أخرى" : "Try again"}</button>
      </main>
    </body></html>
  );
}
