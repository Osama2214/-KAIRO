import type { Metadata, Viewport } from "next";
import { Manrope, JetBrains_Mono, Cinzel } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { StorefrontShell } from "@/components/StorefrontShell";
import { getStorefrontSnapshot } from "@/lib/storefrontSnapshot";
import { MangaReaderModal } from "@/components/MangaReaderModal";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, getStoreProfile, jsonLdHtml } from "@/lib/seo";

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
  "Buy original English manga, complete box sets, anime figures and posters in Egypt — One Piece, Naruto, Bleach, Jujutsu Kaisen and more, with cash on delivery across Egypt.";

export const metadata: Metadata = {
  // metadataBase makes the relative OG/Twitter image paths below resolve to
  // absolute URLs; without it shared links rendered no preview.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AnimeVerse — Your Universe of Manga & Collector Editions",
    template: "%s | AnimeVerse",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "manga Egypt", "buy manga Egypt", "English manga", "manga box set", "anime figures Egypt", "anime posters",
    "One Piece manga", "Naruto manga", "Bleach manga", "Jujutsu Kaisen manga", "Berserk manga", "Demon Slayer manga",
    "مانجا", "مانجا مصر", "شراء مانجا", "فيجرز انمي", "بوسترات انمي", "AnimeVerse",
  ],
  category: "shopping",
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
  const profile = await getStoreProfile();

  // Who the store is, for search engines and AI assistants: the business, its
  // contact details and social profiles, and the site it runs.
  const storeJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      "@id": `${SITE_URL}/#store`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/animeverse-logo.png`,
      image: `${SITE_URL}${DEFAULT_OG_IMAGE}`,
      description: SITE_DESCRIPTION,
      areaServed: { "@type": "Country", name: "Egypt" },
      currenciesAccepted: "EGP",
      paymentAccepted: "Cash on delivery",
      ...(profile.email || profile.phone
        ? {
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer service",
              availableLanguage: ["English", "Arabic"],
              ...(profile.email ? { email: profile.email } : {}),
              ...(profile.phone ? { telephone: profile.phone.replace(/\s+/g, "") } : {}),
            },
          }
        : {}),
      ...(profile.sameAs.length ? { sameAs: profile.sameAs } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: ["en", "ar"],
      publisher: { "@id": `${SITE_URL}/#store` },
    },
  ];

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${cinzel.variable} ${shippori.variable} ${jetbrains.variable} antialiased selection:bg-vermilion selection:text-white`}
    >
      <body suppressHydrationWarning className="min-h-screen bg-ink text-paper font-sans flex flex-col relative">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(storeJsonLd) }} />
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
        {/*
          Arm the intro cover before the first paint. The React intro cannot
          run until the bundle hydrates, and until this existed the homepage
          was visible for that whole gap. Same session rule the overlay uses,
          read here from sessionStorage directly.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var p=location.pathname;' +
              'if((p==="/"||p==="")&&sessionStorage.getItem("kairo_intro_seen")!=="true"){' +
              'document.documentElement.classList.add("intro-pending");' +
              'setTimeout(function(){document.documentElement.classList.remove("intro-pending");},6000);' +
              '}}catch(e){}',
          }}
        />
        <div id="av-intro-cover" aria-hidden="true" />
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
