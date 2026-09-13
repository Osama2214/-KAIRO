import type { Metadata } from "next";

const description = "Anime figures and posters from the ANIMEVERSE collectibles — choose your size or edition, with live stock and Egypt-wide delivery.";

export const metadata: Metadata = {
  title: { default: "Collectibles — Figures & Posters", template: "%s | AnimeVerse" },
  description,
  alternates: { canonical: "/shop" },
  openGraph: { title: "Collectibles — Figures & Posters", description, url: "/shop" },
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
