import type { Metadata } from "next";

const description = "Anime figures and posters from the ANIMEVERSE shop — choose your size or edition, with live stock and Egypt-wide delivery.";

export const metadata: Metadata = {
  title: { default: "Shop — Figures & Posters", template: "%s | AnimeVerse" },
  description,
  alternates: { canonical: "/shop" },
  openGraph: { title: "Shop — Figures & Posters", description, url: "/shop" },
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
