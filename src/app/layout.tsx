import type { Metadata } from "next";
import { Manrope, Noto_Sans_JP, Shippori_Mincho, JetBrains_Mono, Cinzel, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { StorefrontShell } from "@/components/StorefrontShell";
import { MangaReaderModal } from "@/components/MangaReaderModal";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  weight: ["500", "600", "700", "800", "900"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-jp",
  weight: ["400", "500", "700"],
  display: "swap",
});

const shippori = Shippori_Mincho({
  subsets: ["latin"],
  variable: "--font-shippori",
  weight: ["400", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KAIRO (回路) — High-End Japanese Manga & Editorial Storefront",
  description: "Manga, light novels, and stories worth getting lost in. Premium editorial editions, authentic Japanese prints, and collector's boxsets.",
  keywords: ["Manga", "Light Novels", "KAIRO", "Japanese Books", "Jujutsu Kaisen", "One Piece", "Berserk"],
};

import { AtmosphericBackground } from "@/components/AtmosphericBackground";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${cinzel.variable} ${cormorant.variable} ${notoSansJP.variable} ${shippori.variable} ${jetbrains.variable} antialiased selection:bg-vermilion selection:text-white`}
    >
      <body suppressHydrationWarning className="min-h-screen bg-ink text-paper font-sans flex flex-col relative">
        <div id="kairo-restore-loader" aria-hidden="true">
          <div className="kairo-loader-bg-glow" />
          <div className="kairo-loader-content">
            <div className="kairo-loader-kanji">回路</div>
            <div className="kairo-loader-brand">K A I R O</div>
            <div className="kairo-loader-bar">
              <div className="kairo-loader-bar-fill" />
            </div>
            <div className="kairo-loader-caption">RESTORING ARCHIVE</div>
          </div>
        </div>
        <SmoothScrollProvider>
          <AtmosphericBackground />
          <StorefrontShell>{children}</StorefrontShell>
          <MangaReaderModal />
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
