import "server-only";

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 object storage for curator-uploaded imagery.
 *
 * R2 speaks the S3 API, so the standard client works against an
 * account-scoped endpoint. Everything here is a no-op unless the credentials
 * are configured, which lets `mediaStore` fall back to the database in
 * development without any branching at the call sites.
 */

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim();
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim();
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim();
const BUCKET = process.env.R2_BUCKET?.trim();

/** Public base URL (r2.dev subdomain or a custom domain). */
const PUBLIC_URL = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, "");

export function isR2Configured(): boolean {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET);
}

let client: S3Client | null = null;
function r2(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: ACCESS_KEY_ID!, secretAccessKey: SECRET_ACCESS_KEY! },
    });
  }
  return client;
}

/**
 * The URL the storefront should use for an object.
 *
 * With a public bucket the browser fetches straight from Cloudflare's edge.
 * Without one, requests are proxied through /api/media/[id] so a private
 * bucket still works — slower, but never broken.
 */
export function publicUrlFor(key: string): string {
  return PUBLIC_URL ? `${PUBLIC_URL}/${key}` : `/api/media/${key}`;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await r2().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Content is immutable: the key carries random bytes chosen at upload.
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
}

export async function deleteObject(key: string): Promise<void> {
  await r2().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** Removes up to 1000 objects in one request. */
export async function deleteObjects(keys: string[]): Promise<number> {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return 0;
  let removed = 0;
  for (let i = 0; i < unique.length; i += 1000) {
    const batch = unique.slice(i, i + 1000);
    const res = await r2().send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      })
    );
    removed += batch.length - (res.Errors?.length || 0);
    if (res.Errors?.length) {
      console.error("R2 delete errors:", res.Errors.map((e) => `${e.Key}: ${e.Message}`).join("; "));
    }
  }
  return removed;
}

/** Reads an object back, for the proxy route when the bucket is private. */
export async function getObject(key: string): Promise<{ body: Buffer; contentType: string } | null> {
  try {
    const res = await r2().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    if (!res.Body) return null;
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
    return {
      body: Buffer.concat(chunks),
      contentType: res.ContentType || "application/octet-stream",
    };
  } catch {
    return null;
  }
}

/**
 * Extracts the object key from a stored image URL, or null when the URL does
 * not point at our own storage (a MangaDex cover, say).
 */
export function keyFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const value = String(url).trim();
  const proxied = /^\/api\/media\/([A-Za-z0-9._/-]+)$/.exec(value);
  if (proxied) return proxied[1];
  if (PUBLIC_URL && value.startsWith(`${PUBLIC_URL}/`)) {
    return value.slice(PUBLIC_URL.length + 1).split("?")[0] || null;
  }
  return null;
}
