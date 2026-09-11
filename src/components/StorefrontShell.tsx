"use client";

import React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { TickerBar } from "@/components/TickerBar";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { SearchModal } from "@/components/SearchModal";
import { CinematicIntro } from "@/components/CinematicIntro";
import { useStorefrontStore, seedStorefrontFromServer } from "@/store/useStorefrontStore";
import { StorefrontDataSync } from "@/components/StorefrontDataSync";

// Curator-only UI: kept out of the storefront bundle so shoppers never
// download the visual editor. It renders null for everyone else anyway.
const LiveVisualEditor = dynamic(
  () => import("@/components/admin/LiveVisualEditor").then((m) => m.LiveVisualEditor),
  { ssr: false }
);

export function StorefrontShell({
  children,
  initialCatalog,
}: {
  children: React.ReactNode;
  initialCatalog?: Record<string, unknown> | null;
}) {
  // Seeded here, in the outermost client component, so it lands before anything
  // below has read the store — on the server render and on hydration alike,
  // which is what keeps the two in agreement.
  seedStorefrontFromServer(initialCatalog);

  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  const isAdminAuthenticated = useStorefrontStore((state) => state.isAdminAuthenticated);
  if (isAdmin) {
    return <><StorefrontDataSync /><main className="flex-1 w-full overflow-x-clip relative">{children}</main></>;
  }

  return (
    <>
      <StorefrontDataSync />
      <Navbar />
      <main className="flex-1 w-full overflow-x-clip relative">{children}</main>
      <TickerBar slot="above-footer" />
      <Footer />
      <CartDrawer />
      <SearchModal />
      <CinematicIntro />
      {isAdminAuthenticated && <LiveVisualEditor />}
    </>
  );
}
