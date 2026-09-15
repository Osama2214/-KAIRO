import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCatalog } from "@/lib/seo";
import SeriesDetail from "./SeriesDetail";

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { series } = await getCatalog();
  const entry = series.find((item) => item.slug === slug);
  if (!entry) notFound();
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink" />}>
      <SeriesDetail key={entry.slug} series={{ ...entry, volumes: [] }} />
    </Suspense>
  );
}
