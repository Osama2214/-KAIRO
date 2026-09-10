import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Manga Catalog", template: "%s | AnimeVerse" },
  description: "Browse every volume in the ANIMEVERSE archive — deluxe editions, box sets, and light novels, with live stock and Egypt-wide delivery.",
  alternates: { canonical: "/manga" },
  openGraph: { title: "Manga Catalog", description: "Browse every volume in the ANIMEVERSE archive — deluxe editions, box sets, and light novels, with live stock and Egypt-wide delivery.", url: "/manga" },
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
