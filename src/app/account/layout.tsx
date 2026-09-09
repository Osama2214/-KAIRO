import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patron Account",
  description: "Your YUJI patron archive — orders, wishlist, and delivery details.",
  alternates: { canonical: "/account" },
  openGraph: { title: "Patron Account", description: "Your YUJI patron archive — orders, wishlist, and delivery details.", url: "/account" },
  robots: { index: false, follow: false },
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
