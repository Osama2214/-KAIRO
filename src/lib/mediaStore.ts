import "server-only";

import crypto from "crypto";
import { neon } from "@neondatabase/serverless";
import { isR2Configured, putObject, getObject, publicUrlFor, keyFromUrl } from "@/lib/r2";

/**
 * Curator image storage.
 *
 * Objects go to Cloudflare R2 when it is configured, and to Neon otherwise so
 * local development works without cloud credentials.
 *
 * Uploads originally went to `public/uploads` via `fs.writeFile`. Vercel's
 * function filesystem is read-only outside /tmp, so every upload failed with
 * EROFS in production, and anything that did land vanished on the next deploy.
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
  const id = crypto.randomBytes(16).toString("hex");

  if (isR2Configured()) {
    const extension = mime === "image/webp" ? "webp" : mime.split("/")[1] || "bin";
    const key = `media/${id}.${extension}`;
    await putObject(key, data, mime);
    return { id: key, url: publicUrlFor(key), size: data.length };
  }

  await ensureSchema();
  await sql!`
    INSERT INTO kairo_media (id, mime, payload, size, created_at)
    VALUES (${id}, ${mime}, ${data.toString("base64")}, ${data.length}, ${Date.now()})
  `;
  return { id, url: `/api/media/${id}`, size: data.length };
}

export async function getMedia(id: string): Promise<StoredMedia | null> {
  if (isR2Configured()) {
    const object = await getObject(id);
    if (!object) return null;
    return { id, mime: object.contentType, data: object.body, size: object.body.length };
  }

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

/**
 * Removes stored objects for images that are no longer referenced.
 *
 * Only URLs that point at our own storage are touched — an external cover URL
 * is left alone. Returns how many objects were actually deleted.
 */
export async function deleteMediaByUrls(urls: Array<string | undefined | null>): Promise<number> {
  const keys = urls.map((url) => keyFromUrl(url)).filter((key): key is string => Boolean(key));
  if (keys.length === 0) return 0;

  if (isR2Configured()) {
    const { deleteObjects } = await import("@/lib/r2");
    return deleteObjects(keys);
  }

  if (!sql) return 0;
  await ensureSchema();
  const ids = keys.filter((key) => /^[0-9a-f]{32}$/.test(key));
  if (ids.length === 0) return 0;
  const rows = await sql`
    DELETE FROM kairo_media
    WHERE id IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))
    RETURNING id
  `;
  return rows.length;
}
