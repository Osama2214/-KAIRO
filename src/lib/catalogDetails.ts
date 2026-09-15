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

/** The route supplies full text; the index may supply more recent stock/edits. */
export function productWithDetails(initial: MangaVolume, live?: MangaVolume): MangaVolume {
  if (!live || live.id !== initial.id) return initial;
  const product = { ...initial, ...live };
  if (hasOmittedDetails(live)) {
    product.synopsis = initial.synopsis;
    product.synopsisAr = initial.synopsisAr;
    product.previewPages = initial.previewPages;
    delete (product as unknown as Record<string, unknown>)[DETAILS_OMITTED];
  }
  return product;
}

/**
 * Whether a product (still carrying the marker) has a value of its own for a
 * detail field — one a curator typed after the page loaded — rather than the
 * blank the page-wide catalogue came with. Such a value always wins.
 */
function hasOwnValue(record: Record<string, unknown>, field: (typeof DETAIL_FIELDS)[number]): boolean {
  const value = record[field];
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" && value.trim().length > 0;
}

/** Fills a marked product's blank detail fields from `source` and clears the marker. */
function fillDetails(record: Record<string, unknown>, source: Partial<Record<(typeof DETAIL_FIELDS)[number], unknown>>) {
  const filled: Record<string, unknown> = { ...record };
  delete filled[DETAILS_OMITTED];
  for (const field of DETAIL_FIELDS) {
    if (hasOwnValue(record, field)) continue;
    if (source[field] !== undefined) filled[field] = source[field];
  }
  return filled;
}

/**
 * Puts details back onto the products they belong to; others are returned as
 * they were. A field already filled in on the product (an edit made while the
 * details were still loading) is kept rather than overwritten.
 */
export function mergeDetails<T extends MangaVolume>(volumes: T[], details: VolumeDetails[]): T[] {
  if (!details.length) return volumes;
  const byId = new Map(details.map((d) => [d.id, d]));
  let changed = false;
  const next = volumes.map((volume) => {
    const found = byId.get(volume.id);
    if (!found || !hasOmittedDetails(volume)) return volume;
    changed = true;
    return fillDetails(volume as unknown as Record<string, unknown>, found as unknown as Record<string, unknown>) as unknown as T;
  });
  return changed ? next : volumes;
}

/**
 * Server side of a save: a product that still carries the marker gets its
 * stored details back, so a console that never loaded them cannot blank them.
 * Text typed into a field in the meantime is kept.
 */
export function restoreOmittedDetails(incoming: unknown[], stored: unknown[]): unknown[] {
  const storedById = new Map(
    stored
      .filter((v): v is MangaVolume => Boolean(v && typeof v === "object" && typeof (v as MangaVolume).id === "string"))
      .map((v) => [v.id, v])
  );
  return incoming.map((volume) => {
    if (!hasOmittedDetails(volume)) return volume;
    const record = volume as Record<string, unknown>;
    const previous = storedById.get(String(record.id));
    return fillDetails(record, (previous || {}) as unknown as Record<string, unknown>);
  });
}
