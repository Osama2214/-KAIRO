"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { SearchModal } from "@/components/SearchModal";
import { CinematicIntro } from "@/components/CinematicIntro";
import { LiveVisualEditor } from "@/components/admin/LiveVisualEditor";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { useLanguageStore } from "@/store/useLanguageStore";

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  const arabicLanguageEnabled = useStorefrontStore((state) => state.arabicLanguageEnabled ?? true);
  const { locale, setLocale } = useLanguageStore();

  useEffect(() => {
    if (!arabicLanguageEnabled && locale === "ar") {
      setLocale("en");
    }
  }, [arabicLanguageEnabled, locale, setLocale]);

  if (isAdmin) {
    return <main className="flex-1 w-full overflow-x-clip relative z-10">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full overflow-x-clip relative z-10">{children}</main>
      <Footer />
      <CartDrawer />
      <SearchModal />
      <CinematicIntro />
      <LiveVisualEditor />
    </>
  );
}

