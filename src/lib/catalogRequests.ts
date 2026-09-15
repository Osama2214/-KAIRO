import type { VolumeDetails } from "@/lib/catalogDetails";

let indexRequest: Promise<Record<string, unknown>> | null = null;

export function requestCatalogIndex(): Promise<Record<string, unknown>> {
  if (!indexRequest) {
    indexRequest = requestCatalog("/api/storefront").then((data) => {
      if (!Array.isArray(data.volumes) || !Array.isArray(data.series)) throw new Error("Incomplete catalogue response.");
      return data;
    }).finally(() => { indexRequest = null; });
  }
  return indexRequest;
}

/** Bounded requests; a rejected/invalid response is never a complete catalogue. */
export async function requestCatalog(url: string): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Catalogue request failed (${response.status}).`);
    const payload = await response.json();
    if (!payload?.success || !payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) {
      throw new Error("Catalogue data is unavailable.");
    }
    return payload.data;
  } finally {
    clearTimeout(timer);
  }
}

export async function requestCatalogDetails(id?: string): Promise<VolumeDetails[]> {
  const data = await requestCatalog(`/api/storefront?view=details${id ? `&id=${encodeURIComponent(id)}` : ""}`);
  if (!Array.isArray(data.details) || data.details.some((item) =>
    !item || typeof item.id !== "string" || typeof item.synopsis !== "string" || !Array.isArray(item.previewPages)
  )) throw new Error("Catalogue details are unavailable.");
  if (id && !data.details.some((item) => item.id === id)) throw new Error("Product details are unavailable.");
  return data.details as VolumeDetails[];
}
