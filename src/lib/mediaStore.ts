import "server-only";

import crypto from "crypto";
import { neon } from "@neondatabase/serverless";

/**
 * Curator image storage.
 *
 * Uploads used to be written to `public/uploads` with `fs.writeFile`. Vercel's
 * function filesystem is read-only outside /tmp, so every upload failed with
 * EROFS in production — and even where a write succeeded the file vanished on
 * the next deployment. Images now live in Neon alongside the rest of the
 * storefront data and are served through /api/media/[id].
 */

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;
let schemaReady: Promise<void> | null = null;

export interface StoredMedia {
  id: string;
  mime: string;
  data: Buffer;
  size: number;
}

async function ensureSchema(): Promise<void> {
  if (!sql) throw new Error("DATABASE_URL is required for media storage.");
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS kairo_media (
          id TEXT PRIMARY KEY,
          mime TEXT NOT NULL,
          payload TEXT NOT NULL,
          size INTEGER NOT NULL,
          created_at BIGINT NOT NULL
        )
      `;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

/**
 * Persists an already-validated image and returns the URL to reference it by.
 */
export async function saveMedia(data: Buffer, mime: string): Promise<{ id: string; url: string; size: number }> {
  await ensureSchema();
  const id = crypto.randomBytes(16).toString("hex");
  await sql!`
    INSERT INTO kairo_media (id, mime, payload, size, created_at)
    VALUES (${id}, ${mime}, ${data.toString("base64")}, ${data.length}, ${Date.now()})
  `;
  return { id, url: `/api/media/${id}`, size: data.length };
}

export async function getMedia(id: string): Promise<StoredMedia | null> {
  if (!sql || !/^[0-9a-f]{32}$/.test(id)) return null;
  await ensureSchema();
  const rows = await sql`SELECT id, mime, payload, size FROM kairo_media WHERE id = ${id}`;
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    mime: String(row.mime),
    data: Buffer.from(String(row.payload), "base64"),
    size: Number(row.size),
  };
}
