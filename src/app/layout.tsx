import type { Metadata, Viewport } from "next";
import { Manrope, JetBrains_Mono, Cinzel } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { StorefrontShell } from "@/components/StorefrontShell";
import { getStorefrontSnapshot } from "@/lib/storefrontSnapshot";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, jsonLdHtml, storeProfileFromSnapshot } from "@/lib/seo";
import { slimVolume } from "@/lib/catalogDetails";
import { ALL_VOLUMES, ALL_SERIES, type MangaVolume } from "@/data/manga";
import { withoutSeriesVolumes } from "@/lib/seriesVolumes";

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
  // Not preloaded: ~170KB that is only ever decoration (kanji accents and the
  // background watermarks), and on a slow connection it competed with the
  // intro artwork and the page's own text for the first second. The
  // watermarks are positioned with `translate` (see .atmo-layer in
  // globals.css), so this face arriving a moment later moves nothing.
  preload: false,
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
  const snapshot = await getStorefrontSnapshot();
  const snapshotIsUsable = Boolean(
    snapshot && Array.isArray(snapshot.volumes) && Array.isArray(snapshot.series)
  );
  const liveSnapshot = snapshotIsUsable ? snapshot : null;
  // A complete lightweight index makes direct links, search and restored carts
  // correct on the first render. Long text and sample pages load on demand.
  const volumes =
    liveSnapshot
      ? (liveSnapshot.volumes as MangaVolume[]).map(slimVolume)
      : [];
  const catalog = liveSnapshot
    ? { ...liveSnapshot, volumes }
    : { volumes: ALL_VOLUMES.map(slimVolume), series: withoutSeriesVolumes(ALL_SERIES) };
  // The profile is inside the snapshot already used to seed the storefront.
  // Derive it locally so a cold request never needs a second catalogue lookup.
  const profile = storeProfileFromSnapshot(snapshot);

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
        <div id="animeverse-restore-loader" aria-hidden="true">
          <div className="av-loader-bg-glow" />
          <div className="av-loader-content">
            <div className="av-loader-kanji">アニメ</div>
            <div className="av-loader-brand">A N I M E V E R S E</div>
            <div className="av-loader-bar">
              <div className="av-loader-bar-fill" />
            </div>
            <div className="av-loader-caption">
              <span className="av-loader-caption-en">RESTORING ARCHIVE</span>
              <span className="av-loader-caption-ar">جاري استعادة الأرشيف</span>
            </div>
          </div>
        </div>
        <SmoothScrollProvider>
          <AtmosphericBackground />
          <StorefrontShell initialCatalog={catalog} initialCatalogIsLive={snapshotIsUsable}>{children}</StorefrontShell>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
