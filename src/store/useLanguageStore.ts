import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useStorefrontStore } from "./useStorefrontStore";

export type Locale = "en" | "ar";

interface LanguageState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      locale: "en",
      setLocale: (targetLocale: Locale) => {
        const arabicAllowed = useStorefrontStore.getState().arabicLanguageEnabled ?? false;
        const finalLocale: Locale = !arabicAllowed && targetLocale === "ar" ? "en" : targetLocale;
        set({ locale: finalLocale });
        if (typeof document !== "undefined") {
          document.documentElement.lang = finalLocale;
          document.documentElement.dir = finalLocale === "ar" ? "rtl" : "ltr";
        }
      },
      toggleLanguage: () => {
        const arabicAllowed = useStorefrontStore.getState().arabicLanguageEnabled ?? false;
        if (!arabicAllowed) {
          // Arabic disabled by admin; remain on English
          set({ locale: "en" });
          if (typeof document !== "undefined") {
            document.documentElement.lang = "en";
            document.documentElement.dir = "ltr";
          }
          return;
        }
        const nextLocale: Locale = get().locale === "en" ? "ar" : "en";
        set({ locale: nextLocale });
        if (typeof document !== "undefined") {
          document.documentElement.lang = nextLocale;
          document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
        }
      },
    }),
    {
      name: "kairo_locale",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state && typeof document !== "undefined") {
          const arabicAllowed = useStorefrontStore.getState().arabicLanguageEnabled ?? false;
          const initialLocale = !arabicAllowed && state.locale === "ar" ? "en" : state.locale;
          if (initialLocale !== state.locale) {
            state.locale = initialLocale;
          }
          document.documentElement.lang = initialLocale;
          document.documentElement.dir = initialLocale === "ar" ? "rtl" : "ltr";
        }
      },
    }
  )
);

// Subscribe to admin updates: if Arabic is disabled, revert immediately to English
if (typeof window !== "undefined") {
  useStorefrontStore.subscribe((state) => {
    if (state.arabicLanguageEnabled === false && useLanguageStore.getState().locale === "ar") {
      useLanguageStore.getState().setLocale("en");
    }
  });
}
