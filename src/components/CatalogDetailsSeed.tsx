"use client";

import { seedCatalogDetails } from "@/store/useStorefrontStore";
import type { VolumeDetails } from "@/lib/catalogDetails";

/** Rendered by a product's layout ahead of its page, so the page has its full text. */
export function CatalogDetailsSeed({ details }: { details: VolumeDetails[] }) {
  seedCatalogDetails(details);
  return null;
}
