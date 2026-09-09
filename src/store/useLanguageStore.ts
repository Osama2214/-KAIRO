import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Locale = "en" | "ar";

interface LanguageState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLanguage: () => void;
}

/** Keeps the document element in step with the active locale. */
function applyLocaleToDocument(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}

/**
 * Arabic is always available. The switch used to be gated behind an
 * `arabicLanguageEnabled` flag that lived in the CMS payload but had no admin
 * control wired to it, so the stored `false` hid the button permanently.
 */
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      locale: "en",
      setLocale: (locale: Locale) => {
        set({ locale });
        applyLocaleToDocument(locale);
      },
      toggleLanguage: () => {
        const nextLocale: Locale = get().locale === "en" ? "ar" : "en";
        set({ locale: nextLocale });
        applyLocaleToDocument(nextLocale);
      },
    }),
    {
      name: "kairo_locale",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) applyLocaleToDocument(state.locale);
      },
    }
  )
);
