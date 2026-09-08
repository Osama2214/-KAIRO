import "server-only";

import { neon } from "@neondatabase/serverless";

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
    })().catch((error) => { schemaReady = null; throw error; });
  }
  await schemaReady;
}

export async function getStorefrontData(): Promise<Record<string, unknown> | null> {
  await ensureSchema();
  const rows = await sql!`SELECT payload FROM kairo_storefront_data WHERE id = 1`;
  const payload = rows[0]?.payload;
  return payload && typeof payload === "object" ? payload as Record<string, unknown> : null;
}

export async function saveStorefrontData(payload: Record<string, unknown>): Promise<void> {
  await ensureSchema();
  await sql!`
    INSERT INTO kairo_storefront_data (id, payload, updated_at)
    VALUES (1, ${JSON.stringify(payload)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
  `;
}
