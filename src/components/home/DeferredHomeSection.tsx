"use client";

import dynamic from "next/dynamic";
import { useTranslation } from "@/hooks/useTranslation";

function SectionLoading() {
  const { t } = useTranslation();
  return <div role="status" className="min-h-[640px] flex items-center justify-center text-gold">{t.common.loading}</div>;
}

const sections = {
  boxes: dynamic(() => import("@/components/BoxSets").then((m) => m.BoxSets), { loading: SectionLoading }),
  shop: dynamic(() => import("@/components/ShopShowcase").then((m) => m.ShopShowcase), { loading: SectionLoading }),
  franchises: dynamic(() => import("@/components/home/FranchiseShowcase").then((m) => m.FranchiseShowcase), { loading: SectionLoading }),
  genres: dynamic(() => import("@/components/GenreBento").then((m) => m.GenreBento), { loading: SectionLoading }),
  featured: dynamic(() => import("@/components/FeaturedSeries").then((m) => m.FeaturedSeries), { loading: SectionLoading }),
  discovery: dynamic(() => import("@/components/MangaDiscovery").then((m) => m.MangaDiscovery), { loading: SectionLoading }),
};

/**
 * Keep the complete storefront mounted from the first render.  The images
 * inside the sections still use native lazy loading, so the page keeps its
 * network budget without showing placeholder blocks while the visitor scrolls.
 */
export function DeferredHomeSection({ name }: {
  name: keyof typeof sections;
  /** Kept for call-site compatibility; the concrete section owns its anchor. */
  anchor?: string;
  title?: string;
}) {
  const Section = sections[name];
  return <Section />;
}
