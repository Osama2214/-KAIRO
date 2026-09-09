import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Sans_JP, Shippori_Mincho, JetBrains_Mono, Cinzel, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { StorefrontShell } from "@/components/StorefrontShell";
import { MangaReaderModal } from "@/components/MangaReaderModal";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from "@/lib/seo";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0D0D0F",
};

const SITE_DESCRIPTION =
  "Manga, light novels, and stories worth getting lost in. Premium editorial editions, authentic Japanese prints, and collector's boxsets.";

export const metadata: Metadata = {
  // metadataBase makes the relative OG/Twitter image paths below resolve to
  // absolute URLs; without it shared links rendered no preview.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Manga World — Manga, Light Novels & Collector Editions",
    template: "%s | Manga World",
  },
  description: SITE_DESCRIPTION,
  keywords: ["Manga", "Light Novels", "Manga World", "Japanese Books", "Jujutsu Kaisen", "One Piece", "Berserk"],
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Manga World — Manga, Light Novels & Collector Editions",
    description: SITE_DESCRIPTION,
    url: "/",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: "Manga World — Manga, Light Novels & Collector Editions" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Manga World — Manga, Light Novels & Collector Editions",
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: { index: true, follow: true },
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
        {/*
          The locale is persisted client-side, so the server always renders
          lang="en". Applying the stored choice before first paint avoids an
          LTR flash for an Arabic reader; useLanguageStore keeps it in sync
          afterwards.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var s=JSON.parse(localStorage.getItem("kairo_locale")||"{}");' +
              'var l=(s&&s.state&&s.state.locale)==="ar"?"ar":"en";' +
              'document.documentElement.lang=l;' +
              'document.documentElement.dir=l==="ar"?"rtl":"ltr";}catch(e){}',
          }}
        />
        <div id="manga-world-restore-loader" aria-hidden="true">
          <div className="mw-loader-bg-glow" />
          <div className="mw-loader-content">
            <div className="mw-loader-kanji">manga-world</div>
            <div className="mw-loader-brand">K A I R O</div>
            <div className="mw-loader-bar">
              <div className="mw-loader-bar-fill" />
            </div>
            <div className="mw-loader-caption">RESTORING ARCHIVE</div>
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
