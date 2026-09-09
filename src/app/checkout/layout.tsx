import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your YUJI order with cash on delivery, wallet, or InstaPay.",
  alternates: { canonical: "/checkout" },
  openGraph: { title: "Checkout", description: "Complete your YUJI order with cash on delivery, wallet, or InstaPay.", url: "/checkout" },
  // Transactional pages carry no search value and should never be indexed.
  robots: { index: false, follow: false },
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
