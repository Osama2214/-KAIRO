import type { MetadataRoute } from "next";
import { getCatalog, SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/manga`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/series`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];

  try {
    const { volumes, series } = await getCatalog();
    return [
      ...staticRoutes,
      ...series.map((entry) => ({
        url: `${SITE_URL}/series/${entry.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...volumes.map((volume) => ({
        url: `${SITE_URL}/manga/${volume.id}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
