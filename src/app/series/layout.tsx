import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Series Archive", template: "%s | Manga World" },
  description: "Explore complete manga series in the MANGA WORLD archive, volume by volume, with author notes and collector editions.",
  alternates: { canonical: "/series" },
  openGraph: { title: "Series Archive", description: "Explore complete manga series in the MANGA WORLD archive, volume by volume, with author notes and collector editions.", url: "/series" },
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
