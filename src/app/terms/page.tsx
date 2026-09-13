import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = {
  title: "Terms of Sale",
  description: "The terms that apply to orders, returns and exchanges at AnimeVerse.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <PolicyPage kind="terms" />;
}
