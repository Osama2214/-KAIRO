import React from "react";
import { Hero } from "@/components/Hero";
import { TrendingCarousel } from "@/components/TrendingCarousel";
import { NewReleases } from "@/components/NewReleases";
import { GenreBento } from "@/components/GenreBento";
import { FeaturedSeries } from "@/components/FeaturedSeries";
import { TheCollection } from "@/components/TheCollection";
import { MangaDiscovery } from "@/components/MangaDiscovery";

export default function HomePage() {
  return (
    <>

      {/* 03 — Hero Section */}
      <Hero />

      {/* 04 — Trending Now Carousel */}
      <TrendingCarousel />

      {/* 05 — New Releases Grid */}
      <NewReleases />

      {/* 06 — Browse by Genre Bento */}
      <GenreBento />

      {/* 07 — Featured Series Editorial Spotlight */}
      <FeaturedSeries />

      {/* 08 — The Collection WOW Moment (GSAP ScrollTrigger) */}
      <TheCollection />

      {/* 09 — Manga Discovery & Live Search */}
      <MangaDiscovery />
    </>
  );
}
