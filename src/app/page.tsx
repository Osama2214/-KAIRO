import React from "react";
import { Hero } from "@/components/Hero";
import { TickerBar } from "@/components/TickerBar";
import { TrendingCarousel } from "@/components/TrendingCarousel";
import { NewReleases } from "@/components/NewReleases";
import { BoxSets } from "@/components/BoxSets";
import { GenreBento } from "@/components/GenreBento";
import { FeaturedSeries } from "@/components/FeaturedSeries";
import { MangaDiscovery } from "@/components/MangaDiscovery";

export default function HomePage() {
  return (
    <>

      {/* 03 — Hero Section */}
      <Hero />

      {/* 04 — Scrolling Announcement Strip */}
      <TickerBar slot="after-hero" />

      {/* 05 — Trending Now Carousel */}
      <TrendingCarousel />

      {/* 06 — New Releases Grid */}
      <NewReleases />

      <TickerBar slot="after-new-releases" />

      {/* 07 — Complete Box Sets Carousel */}
      <BoxSets />

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
