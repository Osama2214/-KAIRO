import React from "react";
import dynamic from "next/dynamic";
import { Hero } from "@/components/Hero";
import { TickerBar } from "@/components/TickerBar";
import { TrendingCarousel } from "@/components/TrendingCarousel";
import { NewReleases } from "@/components/NewReleases";
import { DealsSection } from "@/components/home/DealsSection";
import { ForYouSection } from "@/components/home/ForYouSection";

const BoxSets = dynamic(() => import("@/components/BoxSets").then((m) => m.BoxSets));
const ShopShowcase = dynamic(() => import("@/components/ShopShowcase").then((m) => m.ShopShowcase));
const FranchiseShowcase = dynamic(() => import("@/components/home/FranchiseShowcase").then((m) => m.FranchiseShowcase));
const GenreBento = dynamic(() => import("@/components/GenreBento").then((m) => m.GenreBento));
const FeaturedSeries = dynamic(() => import("@/components/FeaturedSeries").then((m) => m.FeaturedSeries));
const MangaDiscovery = dynamic(() => import("@/components/MangaDiscovery").then((m) => m.MangaDiscovery));

export default function HomePage() {
  return (
    <>

      {/* 03 — Hero Section */}
      <Hero />

      {/* 04 — Scrolling Announcement Strip */}
      <TickerBar slot="after-hero" />

      {/* 04b — Picked for you (personal; hidden until the visitor has browsed) */}
      <ForYouSection />

      {/* 05 — Trending Now Carousel */}
      <TrendingCarousel />

      {/* 05b — Limited-time deals (hidden when no offer is running) */}
      <DealsSection />

      {/* 06 — New Releases Grid */}
      <NewReleases />

      <TickerBar slot="after-new-releases" />

      {/* 07 — Complete Box Sets Carousel */}
      <BoxSets />

      {/* 07b — Figures & Posters (hidden until the shop has products) */}
      <ShopShowcase />

      {/* 07c — Shop by franchise */}
      <FranchiseShowcase />

      {/* 08 — Browse by Genre Bento */}
      <GenreBento />

      {/* 09 — Featured Series Editorial Spotlight */}
      <FeaturedSeries />

      <TickerBar slot="before-discovery" />

      {/* 10 — Manga Discovery & Live Search */}
      <MangaDiscovery />
    </>
  );
}
