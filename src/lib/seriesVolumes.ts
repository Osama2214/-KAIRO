/**
 * Keeps a series' volume list derived from the catalogue rather than stored.
 *
 * A series used to carry its own copy of every volume alongside the flat
 * `volumes` list, which meant the same 145 products travelled with every page
 * twice — 209KB of the 498KB payload — and, worse, the two copies drifted:
 * 31 volumes ended up with different ratings and review counts depending on
 * which list you read, and the Jujutsu Kaisen box set was missing from the
 * nested one entirely, so the console counted 31 volumes where the catalogue
 * held 32.
 *
 * The bundled defaults in `data/manga.ts` always built the list this way
 * (`ALL_VOLUMES.filter(...)`); only the stored payload had diverged from it.
 * So the flat list is the single source of truth: it is what `syncCatalogItems`
 * writes to `kairo_catalog_items`, what checkout reserves against, and what the
 * series and catalogue pages already filter. Everything nested is rebuilt from
 * it on arrival, which costs one pass over the catalogue and cannot go stale.
 */

type VolumeRecord = { id?: unknown; seriesSlug?: unknown };
type SeriesRecord = { slug?: unknown; volumes?: unknown };

/**
 * Drops the nested copies before a payload is stored or sent. Anything reading
 * the result is expected to call `withDerivedSeriesVolumes` on the way back in.
 */
export function withoutSeriesVolumes<T>(series: T): T {
  if (!Array.isArray(series)) return series;
  return series.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const { volumes: _nested, ...rest } = entry as SeriesRecord & Record<string, unknown>;
    void _nested;
    return rest;
  }) as unknown as T;
}

/**
 * Rebuilds each series' volume list by grouping the catalogue on `seriesSlug`,
 * preserving the order the catalogue itself is in. A series with no volumes
 * gets an empty array rather than an absent key, so callers can read
 * `series.volumes.length` without guarding.
 */
export function withDerivedSeriesVolumes<S, V>(series: S, volumes: V): S {
  if (!Array.isArray(series)) return series;
  if (!Array.isArray(volumes)) {
    return series.map((entry) =>
      entry && typeof entry === "object" ? { ...(entry as object), volumes: [] } : entry
    ) as unknown as S;
  }

  const bySlug = new Map<string, unknown[]>();
  for (const volume of volumes as VolumeRecord[]) {
    if (!volume || typeof volume !== "object") continue;
    const slug = typeof volume.seriesSlug === "string" ? volume.seriesSlug : null;
    if (!slug) continue;
    const bucket = bySlug.get(slug);
    if (bucket) bucket.push(volume);
    else bySlug.set(slug, [volume]);
  }

  return series.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const slug = (entry as SeriesRecord).slug;
    return {
      ...(entry as object),
      volumes: (typeof slug === "string" ? bySlug.get(slug) : undefined) ?? [],
    };
  }) as unknown as S;
}
