import type { Metadata, Viewport } from "next";
import { Manrope, JetBrains_Mono, Cinzel } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { StorefrontShell } from "@/components/StorefrontShell";
import { getStorefrontSnapshot } from "@/lib/storefrontSnapshot";
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

// Self-hosted and cut down to the characters this storefront actually renders.
// Served from Google, the full Japanese face arrives as ~122 unicode ranges per
// weight, and a page with kanji scattered through it pulled 131 files totalling
// 3.9MB — more than every image combined. The subset is two files, ~185KB.
// Rebuild it with `node scripts/build-japanese-font.mjs --apply` after adding
// Japanese text that the catalogue has not carried before.
const shippori = localFont({
  src: [
    { path: "./fonts/shippori-mincho-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/shippori-mincho-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-shippori",
  display: "swap",
  // Any character outside the subset lands here rather than on a blank box.
  fallback: ["Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", "serif"],
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
    default: "AnimeVerse — Your Universe of Manga & Collector Editions",
    template: "%s | AnimeVerse",
  },
  description: SITE_DESCRIPTION,
  keywords: ["Manga", "Light Novels", "AnimeVerse", "Japanese Books", "Jujutsu Kaisen", "One Piece", "Berserk"],
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "AnimeVerse — Your Universe of Manga & Collector Editions",
    description: SITE_DESCRIPTION,
    url: "/",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: "AnimeVerse — Your Universe of Manga & Collector Editions" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AnimeVerse — Your Universe of Manga & Collector Editions",
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

import { AtmosphericBackground } from "@/components/AtmosphericBackground";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the catalogue here so the markup that leaves the server already shows
  // what the shop sells, instead of the copy compiled into the bundle at build
  // time and corrected a fetch later.
  const catalog = await getStorefrontSnapshot();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${cinzel.variable} ${shippori.variable} ${jetbrains.variable} antialiased selection:bg-vermilion selection:text-white`}
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
        <div id="animeverse-restore-loader" aria-hidden="true">
          <div className="av-loader-bg-glow" />
          <div className="av-loader-content">
            <div className="av-loader-kanji">アニメ</div>
            <div className="av-loader-brand">A N I M E V E R S E</div>
            <div className="av-loader-bar">
              <div className="av-loader-bar-fill" />
            </div>
            <div className="av-loader-caption">RESTORING ARCHIVE</div>
          </div>
        </div>
        <SmoothScrollProvider>
          <AtmosphericBackground />
          <StorefrontShell initialCatalog={catalog}>{children}</StorefrontShell>
          <MangaReaderModal />
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
