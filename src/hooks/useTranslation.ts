"use client";

import { useLanguageStore } from "@/store/useLanguageStore";
import { translations, TranslationDictionary } from "@/data/translations";

export function useTranslation() {
  const { locale, setLocale, toggleLanguage } = useLanguageStore();
  const t: TranslationDictionary = (translations[locale] || translations.en) as TranslationDictionary;
  const isRTL = locale === "ar";

  return {
    locale,
    setLocale,
    toggleLanguage,
    t,
    isRTL,
  };
}
