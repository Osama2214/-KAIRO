"use client";

import React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { TickerBar } from "@/components/TickerBar";
import { Footer } from "@/components/Footer";
import { useStorefrontStore, seedStorefrontFromServer } from "@/store/useStorefrontStore";
import { useUIStore } from "@/store/useUIStore";
import { StorefrontDataSync } from "@/components/StorefrontDataSync";
import { useModalScrollLock } from "@/hooks/useModalScrollLock";
import { useTranslation } from "@/hooks/useTranslation";

function ModalLoading() {
  useModalScrollLock(true);
  const { locale, t } = useTranslation();
  const isArabic = locale === "ar";
  const close = () => {
    const ui = useUIStore.getState();
    ui.closeCart();
    ui.closeSearch();
    ui.closeReader();
    ui.closeIntro();
  };
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div role="dialog" aria-modal="true" aria-label={t.common.loading} dir={isArabic ? "rtl" : "ltr"} className="fixed inset-0 z-[200] bg-ink/95 flex flex-col items-center justify-center gap-6 text-paper">
      <p role="status">{t.common.loading}</p>
      <button autoFocus onClick={close} className="border border-gold px-5 py-3 text-gold">{t.common.close}</button>
    </div>
  );
}

const CartDrawer = dynamic(() => import("@/components/CartDrawer").then((m) => m.CartDrawer), { ssr: false, loading: ModalLoading });
const SearchModal = dynamic(() => import("@/components/SearchModal").then((m) => m.SearchModal), { ssr: false, loading: ModalLoading });
const MangaReaderModal = dynamic(() => import("@/components/MangaReaderModal").then((m) => m.MangaReaderModal), { ssr: false, loading: ModalLoading });
const CinematicIntro = dynamic(() => import("@/components/CinematicIntro").then((m) => m.CinematicIntro), { ssr: false, loading: ModalLoading });
const LiveVisualEditor = dynamic(() => import("@/components/admin/LiveVisualEditor").then((m) => m.LiveVisualEditor), { ssr: false });

export function StorefrontShell({ children, initialCatalog }: {
  children: React.ReactNode;
  initialCatalog?: Record<string, unknown> | null;
}) {
  seedStorefrontFromServer(initialCatalog);
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isAdminAuthenticated = useStorefrontStore((state) => state.isAdminAuthenticated);
  const isIntroActive = useUIStore((state) => state.isIntroActive);
  const isCartOpen = useUIStore((state) => state.isCartOpen);
  const isSearchOpen = useUIStore((state) => state.isSearchOpen);
  const isReaderOpen = useUIStore((state) => state.isReaderOpen);

  if (isAdmin) return <><StorefrontDataSync /><main className="flex-1 w-full overflow-x-clip relative">{children}</main></>;

  return (
    <>
      <StorefrontDataSync />
      <Navbar />
      <main className="flex-1 w-full overflow-x-clip relative">{children}</main>
      <TickerBar slot="above-footer" />
      <Footer />
      {isCartOpen && <CartDrawer />}
      {isSearchOpen && <SearchModal />}
      {isReaderOpen && <MangaReaderModal />}
      {isIntroActive && <CinematicIntro />}
      {isAdminAuthenticated && <LiveVisualEditor />}
    </>
  );
}
