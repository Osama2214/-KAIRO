"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { SearchModal } from "@/components/SearchModal";
import { CinematicIntro } from "@/components/CinematicIntro";

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

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
    </>
  );
}
