import type { MetadataRoute } from "next";
import { absoluteImage, getCatalog, SITE_URL } from "@/lib/seo";
import { productHref } from "@/lib/utils";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/manga`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/series`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
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
        images: [absoluteImage(entry.bannerImage || entry.featuredImage)],
      })),
      // Cover and product photos are listed with each page so they can show
      // up in image search, which is where many people look for a figure.
      ...volumes.map((volume) => ({
        url: `${SITE_URL}${productHref(volume)}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
        images: [volume.coverImage, ...(volume.gallery || [])].filter(Boolean).map((src) => absoluteImage(src)),
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
