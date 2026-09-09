import "server-only";

import { neon } from "@neondatabase/serverless";
import { ALL_VOLUMES, MangaVolume } from "@/data/manga";

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;
let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (!sql) throw new Error("DATABASE_URL is required for storefront data.");
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS kairo_storefront_data (
          id SMALLINT PRIMARY KEY CHECK (id = 1),
          payload JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS kairo_catalog_items (
          id TEXT PRIMARY KEY,
          payload JSONB NOT NULL,
          price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
          stock INTEGER NOT NULL CHECK (stock >= 0),
          active BOOLEAN NOT NULL DEFAULT TRUE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS kairo_catalog_items_active_idx ON kairo_catalog_items (active)`;
    })().catch((error) => { schemaReady = null; throw error; });
  }
  await schemaReady;
}

function validVolumes(payload: Record<string, unknown> | null): MangaVolume[] {
  const source = payload?.volumes;
  if (!Array.isArray(source)) return ALL_VOLUMES;
  return source.filter((item): item is MangaVolume =>
    Boolean(item && typeof item === "object" && typeof (item as MangaVolume).id === "string" &&
      typeof (item as MangaVolume).price === "number" && typeof (item as MangaVolume).stock === "number")
  );
}

async function syncCatalogItems(payload: Record<string, unknown> | null): Promise<void> {
  await ensureSchema();
  const volumes = validVolumes(payload);
  if (volumes.length === 0) return;

  const rows = volumes.map((volume) => ({
    id: volume.id,
    payload: volume,
    price: volume.price,
    stock: Math.max(0, Math.floor(volume.stock)),
  }));

  // A CMS save is the single source of truth for product data: products absent
  // from it become inactive rather than remaining purchasable from a stale
  // client. The upsert and the deactivation happen in ONE statement — as two
  // statements there was a window where every item was inactive, and any
  // checkout landing in it failed with "no longer have enough stock".
  await sql!`
    WITH incoming AS (
      SELECT id, payload, price, stock
      FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
        AS item(id TEXT, payload JSONB, price NUMERIC, stock INTEGER)
    ), upserted AS (
      INSERT INTO kairo_catalog_items (id, payload, price, stock, active, updated_at)
      SELECT id, payload, price, stock, TRUE, NOW() FROM incoming
      ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        price = EXCLUDED.price,
        stock = EXCLUDED.stock,
        active = TRUE,
        updated_at = NOW()
      RETURNING id
    )
    UPDATE kairo_catalog_items
    SET active = FALSE, updated_at = NOW()
    WHERE active = TRUE AND id NOT IN (SELECT id FROM incoming)
  `;
}

export async function getStorefrontData(): Promise<Record<string, unknown> | null> {
  await ensureSchema();
  const rows = await sql!`SELECT payload FROM kairo_storefront_data WHERE id = 1`;
  const payload = rows[0]?.payload;
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : null;
  // Bootstrap the server catalogue for projects created before this table.
  const stockRows = await sql!`SELECT id, stock FROM kairo_catalog_items WHERE active = TRUE`;
  if (stockRows.length === 0) await syncCatalogItems(data);
  const currentStocks = stockRows.length > 0 ? stockRows : await sql!`SELECT id, stock FROM kairo_catalog_items WHERE active = TRUE`;
  if (!data) return null;
  const stockById = new Map(currentStocks.map((row) => [String(row.id), Number(row.stock)]));
  const volumes = Array.isArray(data.volumes)
    ? data.volumes.map((volume) => ({ ...(volume as Record<string, unknown>), stock: stockById.get(String((volume as Record<string, unknown>).id)) ?? (volume as Record<string, unknown>).stock }))
    : data.volumes;
  const series = Array.isArray(data.series)
    ? data.series.map((entry) => {
        const record = entry as Record<string, unknown>;
        return {
          ...record,
          volumes: Array.isArray(record.volumes)
            ? record.volumes.map((volume) => ({ ...(volume as Record<string, unknown>), stock: stockById.get(String((volume as Record<string, unknown>).id)) ?? (volume as Record<string, unknown>).stock }))
            : record.volumes,
        };
      })
    : data.series;
  return { ...data, volumes, series };
}

export async function saveStorefrontData(payload: Record<string, unknown>): Promise<void> {
  await ensureSchema();
  await sql!`
    INSERT INTO kairo_storefront_data (id, payload, updated_at)
    VALUES (1, ${JSON.stringify(payload)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
  `;
  await syncCatalogItems(payload);
}

export class CatalogReservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogReservationError";
  }
}

/**
 * Atomically validates product existence, price, and available stock, then
 * reserves all requested quantities. Browser product values are ignored.
 */
export async function reserveCatalogItems(rawItems: Array<{ id: string; quantity: number }>): Promise<MangaVolume[]> {
  await ensureSchema();
  const existing = await sql!`SELECT COUNT(*)::int AS count FROM kairo_catalog_items WHERE active = TRUE`;
  if (Number(existing[0]?.count || 0) === 0) {
    const rows = await sql!`SELECT payload FROM kairo_storefront_data WHERE id = 1`;
    const payload = rows[0]?.payload && typeof rows[0].payload === "object" ? rows[0].payload as Record<string, unknown> : null;
    await syncCatalogItems(payload);
  }

  const requestedMap = new Map<string, number>();
  for (const raw of rawItems) {
    const id = String(raw.id || "").trim().slice(0, 64);
    const quantity = Math.min(10, Math.max(1, Math.floor(Number(raw.quantity) || 1)));
    if (!id) throw new CatalogReservationError("A valid catalogue item is required.");
    requestedMap.set(id, (requestedMap.get(id) || 0) + quantity);
  }
  if (requestedMap.size === 0 || [...requestedMap.values()].some((quantity) => quantity > 10)) {
    throw new CatalogReservationError("Invalid item quantities.");
  }
  const requested = [...requestedMap].map(([id, quantity]) => ({ id, quantity }));
  const rows = await sql!`
    WITH requested AS (
      SELECT id, quantity
      FROM jsonb_to_recordset(${JSON.stringify(requested)}::jsonb) AS item(id TEXT, quantity INTEGER)
    ), eligible AS (
      SELECT catalog.id
      FROM kairo_catalog_items AS catalog
      JOIN requested ON requested.id = catalog.id
      WHERE catalog.active = TRUE AND catalog.stock >= requested.quantity
    ), updated AS (
      UPDATE kairo_catalog_items AS catalog
      SET stock = catalog.stock - requested.quantity, updated_at = NOW()
      FROM requested
      WHERE catalog.id = requested.id
        AND (SELECT COUNT(*) FROM eligible) = (SELECT COUNT(*) FROM requested)
      RETURNING catalog.payload
    )
    SELECT payload FROM updated
  `;
  if (rows.length !== requested.length) {
    throw new CatalogReservationError("One or more items are unavailable or no longer have enough stock.");
  }
  return rows.map((row) => ({ ...(row.payload as MangaVolume), stock: Math.max(0, Number((row.payload as MangaVolume).stock) - (requestedMap.get((row.payload as MangaVolume).id) || 0)) }));
}

/**
 * Atomically restores reserved stock back to the catalogue when an order is cancelled
 */
export async function restoreCatalogItems(items: Array<{ volumeId?: string; id?: string; quantity?: number }>): Promise<void> {
  if (!sql || !Array.isArray(items) || items.length === 0) return;
  await ensureSchema();

  const restoreMap = new Map<string, number>();
  for (const it of items) {
    const id = String(it.volumeId || it.id || "").trim();
    const qty = Math.max(1, Math.floor(Number(it.quantity) || 1));
    if (id) restoreMap.set(id, (restoreMap.get(id) || 0) + qty);
  }

  const restored = [...restoreMap].map(([id, quantity]) => ({ id, quantity }));
  if (restored.length === 0) return;

  await sql`
    UPDATE kairo_catalog_items AS catalog
    SET stock = catalog.stock + item.quantity, updated_at = NOW()
    FROM jsonb_to_recordset(${JSON.stringify(restored)}::jsonb) AS item(id TEXT, quantity INTEGER)
    WHERE catalog.id = item.id
  `;
}
