"use client";

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { SearchModal } from "@/components/SearchModal";
import { CinematicIntro } from "@/components/CinematicIntro";
import { useStorefrontStore } from "@/store/useStorefrontStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { StorefrontDataSync } from "@/components/StorefrontDataSync";

// Curator-only UI: kept out of the storefront bundle so shoppers never
// download the visual editor. It renders null for everyone else anyway.
const LiveVisualEditor = dynamic(
  () => import("@/components/admin/LiveVisualEditor").then((m) => m.LiveVisualEditor),
  { ssr: false }
);

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  const arabicLanguageEnabled = useStorefrontStore((state) => state.arabicLanguageEnabled ?? true);
  const isAdminAuthenticated = useStorefrontStore((state) => state.isAdminAuthenticated);
  const { locale, setLocale } = useLanguageStore();

  useEffect(() => {
    if (!arabicLanguageEnabled && locale === "ar") {
      setLocale("en");
    }
  }, [arabicLanguageEnabled, locale, setLocale]);

  if (isAdmin) {
    return <><StorefrontDataSync /><main className="flex-1 w-full overflow-x-clip relative">{children}</main></>;
  }

  return (
    <>
      <StorefrontDataSync />
      <Navbar />
      <main className="flex-1 w-full overflow-x-clip relative">{children}</main>
      <Footer />
      <CartDrawer />
      <SearchModal />
      <CinematicIntro />
      {isAdminAuthenticated && <LiveVisualEditor />}
    </>
  );
}
