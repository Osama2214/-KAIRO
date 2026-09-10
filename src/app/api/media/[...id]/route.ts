import { getMedia } from "@/lib/mediaStore";

/**
 * Serves a curator-uploaded image. Content is immutable — the id is derived
 * from random bytes at upload time — so it can be cached indefinitely.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string[] | string }> }) {
  const raw = (await params).id;
  const id = Array.isArray(raw) ? raw.join("/") : raw;
  const media = await getMedia(id);
  if (!media) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(media.data), {
    headers: {
      "Content-Type": media.mime,
      "Content-Length": String(media.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
