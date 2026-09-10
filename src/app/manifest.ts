import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/seo";

/**
 * Web app manifest.
 *
 * Android reads its home-screen icon from here rather than from the
 * `apple-touch-icon` link, so without this the site installs with a generic
 * browser glyph however good the icons in `src/app` are.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Manga & Collector Editions`,
    short_name: SITE_NAME,
    description:
      "Manga, light novels, and collector box sets — official English editions, delivered across Egypt.",
    start_url: "/",
    display: "standalone",
    background_color: "#0D0D0F",
    theme_color: "#0D0D0F",
    orientation: "portrait",
    icons: [
      { src: "/icons/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Launchers crop to their own shape; this copy is inset to survive it.
      { src: "/icons/app-icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
