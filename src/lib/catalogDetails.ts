import type { MangaVolume } from "@/data/manga";

/**
 * The long per-product text that only a product's own page shows.
 *
 * Every page used to carry the whole catalogue, and nearly half of it was
 * these fields: two synopses (English and Arabic) and the sample-page list for
 * ~500 products — about 370KB of the ~800KB that was inlined into, and parsed
 * on, every page before it could become interactive. Pages now get the
 * catalogue without them; a product page is sent its own, and anything else
 * that needs them (the sample reader, the curator console) loads them once.
 */
export const DETAIL_FIELDS = ["synopsis", "synopsisAr", "previewPages"] as const;

export interface VolumeDetails {
  id: string;
  synopsis: string;
  synopsisAr?: string;
  previewPages: string[];
}

/**
 * Marks a product whose details were left out. The empty values keep the
 * type honest for code that reads them; the flag tells the server, on a save,
 * to keep the stored text instead of those blanks.
 */
export const DETAILS_OMITTED = "detailsOmitted";

export function hasOmittedDetails(volume: unknown): boolean {
  return Boolean(volume && typeof volume === "object" && (volume as Record<string, unknown>)[DETAILS_OMITTED]);
}

export function slimVolume<T extends MangaVolume>(volume: T): T {
  const rest = { ...volume } as unknown as Record<string, unknown>;
  for (const field of DETAIL_FIELDS) delete rest[field];
  return { ...rest, synopsis: "", previewPages: [], [DETAILS_OMITTED]: true } as unknown as T;
}

export function detailsOf(volume: MangaVolume): VolumeDetails {
  return {
    id: volume.id,
    synopsis: volume.synopsis || "",
    ...(volume.synopsisAr ? { synopsisAr: volume.synopsisAr } : {}),
    previewPages: Array.isArray(volume.previewPages) ? volume.previewPages : [],
  };
}

/** Puts details back onto the products they belong to; others are returned as they were. */
export function mergeDetails<T extends MangaVolume>(volumes: T[], details: VolumeDetails[]): T[] {
  if (!details.length) return volumes;
  const byId = new Map(details.map((d) => [d.id, d]));
  let changed = false;
  const next = volumes.map((volume) => {
    const found = byId.get(volume.id);
    if (!found || !hasOmittedDetails(volume)) return volume;
    changed = true;
    const merged = { ...volume, ...found } as unknown as Record<string, unknown>;
    delete merged[DETAILS_OMITTED];
    return merged as unknown as T;
  });
  return changed ? next : volumes;
}

/**
 * Server side of a save: a product that still carries the marker gets its
 * stored details back, so a console that never loaded them cannot blank them.
 */
export function restoreOmittedDetails(incoming: unknown[], stored: unknown[]): unknown[] {
  const storedById = new Map(
    stored
      .filter((v): v is MangaVolume => Boolean(v && typeof v === "object" && typeof (v as MangaVolume).id === "string"))
      .map((v) => [v.id, v])
  );
  return incoming.map((volume) => {
    if (!hasOmittedDetails(volume)) return volume;
    const record: Record<string, unknown> = { ...(volume as Record<string, unknown>) };
    delete record[DETAILS_OMITTED];
    const previous = storedById.get(String(record.id));
    if (previous) {
      for (const field of DETAIL_FIELDS) {
        if (previous[field] !== undefined) record[field] = previous[field];
        else delete record[field];
      }
    }
    return record;
  });
}
