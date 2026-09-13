import React from "react";
import { Hero } from "@/components/Hero";
import { TickerBar } from "@/components/TickerBar";
import { TrendingCarousel } from "@/components/TrendingCarousel";
import { NewReleases } from "@/components/NewReleases";
import { BoxSets } from "@/components/BoxSets";
import { ShopShowcase } from "@/components/ShopShowcase";
import { GenreBento } from "@/components/GenreBento";
import { FeaturedSeries } from "@/components/FeaturedSeries";
import { MangaDiscovery } from "@/components/MangaDiscovery";
import { DealsSection } from "@/components/home/DealsSection";
import { FranchiseShowcase } from "@/components/home/FranchiseShowcase";
import { ForYouSection } from "@/components/home/ForYouSection";

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
