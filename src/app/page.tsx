import React from "react";
import { DeferredHomeSection } from "@/components/home/DeferredHomeSection";
import { Hero } from "@/components/Hero";
import { TickerBar } from "@/components/TickerBar";
import { TrendingCarousel } from "@/components/TrendingCarousel";
import { NewReleases } from "@/components/NewReleases";
import { DealsSection } from "@/components/home/DealsSection";


export default function HomePage() {
  return (
    <>

      {/* 03 — Hero Section */}
      <Hero />

      {/* 04 — Scrolling Announcement Strip */}
      <TickerBar slot="after-hero" />

      {/* 05 — Trending Now Carousel */}
      <TrendingCarousel />

      {/* 05b — Limited-time deals (hidden when no offer is running) */}
      <DealsSection />

      {/* 06 — New Releases Grid */}
      <NewReleases />

      <TickerBar slot="after-new-releases" />

      {/* 07 — Complete Box Sets Carousel */}
      <DeferredHomeSection name="boxes" anchor="box-sets" title="Complete box sets" />

      {/* 07b — Figures & Posters (hidden until the shop has products) */}
      <DeferredHomeSection name="shop" anchor="shop" title="Figures & posters" />

      {/* 07c — Shop by franchise */}
      <DeferredHomeSection name="franchises" anchor="franchises" title="Shop by franchise" />

      {/* 08 — Browse by Genre Bento */}
      <DeferredHomeSection name="genres" anchor="genres" title="Browse by genre" />

      {/* 09 — Featured Series Editorial Spotlight */}
      <DeferredHomeSection name="featured" anchor="featured-series" title="Featured series" />

      <TickerBar slot="before-discovery" />

      {/* 10 — Manga Discovery & Live Search */}
      <DeferredHomeSection name="discovery" anchor="manga-discovery" title="Discover the archive" />
    </>
  );
}
