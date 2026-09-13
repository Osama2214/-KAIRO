"use client";

import React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { TickerBar } from "@/components/TickerBar";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { SearchModal } from "@/components/SearchModal";
import { useStorefrontStore, seedStorefrontFromServer } from "@/store/useStorefrontStore";
import { useUIStore } from "@/store/useUIStore";
import { StorefrontDataSync } from "@/components/StorefrontDataSync";

// Curator-only UI: kept out of the storefront bundle so shoppers never
// download the visual editor. It renders null for everyone else anyway.
const LiveVisualEditor = dynamic(
  () => import("@/components/admin/LiveVisualEditor").then((m) => m.LiveVisualEditor),
  { ssr: false }
);

// The intro is the only thing in the storefront that pulls in GSAP — the
// largest chunk in the build. Mounting it unconditionally made every visitor
// download that animation engine, including the returning ones who never see
// the sequence. It is now fetched only when it is actually going to run.
const loadIntro = () => import("@/components/CinematicIntro").then((m) => m.CinematicIntro);
const CinematicIntro = dynamic(loadIntro, { ssr: false });

// When the page opened with the intro armed (the inline script in the layout
// sets `intro-pending`), start downloading it as soon as this module runs,
// alongside the rest of the app, instead of after the app has finished
// starting up. Returning visitors are not armed and fetch nothing.
if (typeof document !== "undefined" && document.documentElement.classList.contains("intro-pending")) {
  void loadIntro().catch(() => {});
}

/** Client-only flag source: nothing ever changes, so it never notifies. */
const subscribeNever = () => () => {};

/** The same session rule the intro itself applies, read before mounting it. */
function introCouldPlay(pathname: string | null): boolean {
  if (typeof window === "undefined") return false;
  if (pathname !== "/" && pathname !== "") return false;
  try {
    if ((window as unknown as { __kairo_intro_seen?: boolean }).__kairo_intro_seen) return false;
    return sessionStorage.getItem("kairo_intro_seen") !== "true";
  } catch {
    return true;
  }
}

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
  // Replaying from the account page flips this, so the chunk loads on demand.
  const isIntroActive = useUIStore((state) => state.isIntroActive);
  // useSyncExternalStore rather than a setState-in-effect: the first client
  // render already knows we are on the client, with no extra render pass.
  const mounted = React.useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
  const wantsIntro = isIntroActive || (mounted && introCouldPlay(pathname));
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
      {wantsIntro && <CinematicIntro />}
      {isAdminAuthenticated && <LiveVisualEditor />}
    </>
  );
}
