import { NextResponse } from "next/server";
import dns from "dns/promises";
import net from "net";
import path from "path";
import sharp from "sharp";
import { checkRateLimitKey, getClientIp } from "@/lib/rateLimit";
import { curatorSession, isTrustedOrigin } from "@/lib/serverAuth";
import { saveMedia } from "@/lib/mediaStore";
import { keyFromUrl } from "@/lib/r2";

// Allowed MIME types and corresponding extensions
const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

// Maximum accepted upload: 10MB before re-encoding.
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Object storage is cheap, so the cap exists to keep pages fast rather than to
// save space. These dimensions cover a full-bleed cover on a 3x phone.
const MAX_IMAGE_WIDTH = 1800;
const MAX_IMAGE_HEIGHT = 2700;

// Quality first: 92 with effort 6 keeps gradients and screentone clean on the
// dark artwork this shop sells, and still lands far below the source PNG.
const WEBP_QUALITY = 92;

// Remote images are pulled by the server, so a slow or hanging host must not
// hold a function open until the platform kills it.
const REMOTE_FETCH_TIMEOUT_MS = 15_000;

/**
 * Validates actual binary magic bytes of the buffer to prevent polyglot / masked executable attacks
 */
function isValidImageMagicBytes(buffer: Buffer): { valid: boolean; detectedMime?: string } {
  if (buffer.length < 12) return { valid: false };

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: "image/jpeg" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: "image/png" };
  }

  // 3. GIF: GIF87a or GIF89a (47 49 46 38 37/39 61)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return { valid: true, detectedMime: "image/gif" };
  }

  // 4. WebP: RIFF .... WEBP
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { valid: true, detectedMime: "image/webp" };
  }

  // 5. AVIF / HEIF: ....ftypavif or ....ftypavis
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (["avif", "avis", "mif1", "msf1"].includes(brand)) {
      return { valid: true, detectedMime: "image/avif" };
    }
  }

  return { valid: false };
}

/** Loopback, private, link-local and multicast space — never a legitimate cover host. */
function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase().startsWith("::ffff:") ? address.slice(7) : address;

  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    );
  }

  const v6 = ip.toLowerCase();
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

/**
 * Downloads a remote image so a pasted cover URL ends up in our own storage
 * rather than hotlinking a host that can rot, rate-limit us, or swap the art.
 *
 * The address check is a best-effort SSRF guard: a hostile DNS record could
 * still flip between the lookup and the fetch. It matters little here because
 * the route already requires a curator session, but it stops the obvious
 * `http://169.254.169.254/` metadata probe.
 */
async function fetchRemoteImage(rawUrl: string): Promise<{ buffer: Buffer } | { error: string; status: number }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { error: "That does not look like a valid image URL.", status: 400 };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "Only http and https image URLs can be imported.", status: 400 };
  }

  try {
    const addresses = await dns.lookup(parsed.hostname, { all: true });
    if (addresses.some((entry) => isPrivateAddress(entry.address))) {
      return { error: "That host is not reachable for imports.", status: 400 };
    }
  } catch {
    return { error: "The image host could not be resolved.", status: 400 };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsed.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "AnimeVerse/1.0 (cover import)", Accept: "image/*" },
    });

    if (!response.ok) {
      return { error: `The image host responded with ${response.status}.`, status: 400 };
    }

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_FILE_SIZE) {
      return { error: "That image exceeds the maximum allowed limit of 10MB.", status: 400 };
    }

    // Read incrementally: a host that lies about (or omits) content-length must
    // not be able to stream an unbounded body into memory.
    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = response.body?.getReader();
    if (!reader) return { error: "The image host returned an empty response.", status: 400 };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_FILE_SIZE) {
        await reader.cancel();
        return { error: "That image exceeds the maximum allowed limit of 10MB.", status: 400 };
      }
      chunks.push(value);
    }

    return { buffer: Buffer.concat(chunks) };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return { error: aborted ? "The image host timed out." : "The image could not be downloaded.", status: 400 };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verifies, re-encodes and stores an image buffer.
 *
 * The sharp pass strips any metadata (and anything hiding in it), normalises
 * the format, and keeps stored covers to a sane size.
 */
async function verifyEncodeAndStore(buffer: Buffer) {
  const magicCheck = isValidImageMagicBytes(buffer);
  if (!magicCheck.valid) {
    return {
      error: "File signature verification failed. The file is corrupted or not a valid image format.",
      status: 400,
    } as const;
  }

  let optimised: Buffer;
  try {
    optimised = await sharp(buffer)
      .rotate()
      .resize({
        width: MAX_IMAGE_WIDTH,
        height: MAX_IMAGE_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
        kernel: "lanczos3",
      })
      .webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true })
      .toBuffer();
  } catch {
    return { error: "The image could not be processed. Please try a different file.", status: 400 } as const;
  }

  // Persist to object storage (R2 when configured, Neon otherwise). Vercel's
  // function filesystem is read-only, so the original write to public/uploads
  // failed in production on every single upload.
  const stored = await saveMedia(optimised, "image/webp");
  return { stored } as const;
}

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request) || !(await curatorSession(request)).valid) {
      return NextResponse.json({ success: false, message: "Curator authorization required for uploads." }, { status: 401 });
    }
    const clientIp = getClientIp(request);

    // 1. Check Rate Limiting (IP Level: max 15 uploads per 10 minutes to prevent disk exhaustion DoS)
    const rateCheck = await checkRateLimitKey(`upload:ip:${clientIp}`, 15, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Upload rate limit exceeded. Please wait ${Math.ceil(rateCheck.resetSeconds / 60)} minute(s) before uploading more files.`,
          waitSec: rateCheck.resetSeconds,
        },
        { status: 429 }
      );
    }

    // 2. A JSON body means "import this URL into our storage" rather than a
    // browser file upload. Both paths converge on the same encode-and-store.
    if ((request.headers.get("content-type") || "").includes("application/json")) {
      const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
      const sourceUrl = typeof body?.url === "string" ? body.url.trim() : "";

      if (!sourceUrl) {
        return NextResponse.json({ success: false, message: "No image URL provided." }, { status: 400 });
      }

      // Already ours — importing again would just orphan a duplicate object.
      if (keyFromUrl(sourceUrl)) {
        return NextResponse.json({ success: true, url: sourceUrl, alreadyStored: true, message: "Image is already stored." });
      }

      const downloaded = await fetchRemoteImage(sourceUrl);
      if ("error" in downloaded) {
        return NextResponse.json({ success: false, message: downloaded.error }, { status: downloaded.status });
      }

      const result = await verifyEncodeAndStore(downloaded.buffer);
      if ("error" in result) {
        return NextResponse.json({ success: false, message: result.error }, { status: result.status });
      }

      return NextResponse.json({
        success: true,
        url: result.stored.url,
        filename: `${result.stored.id}.webp`,
        size: result.stored.size,
        mimeType: "image/webp",
        imported: true,
        message: "Image imported and stored successfully.",
      });
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { success: false, message: "Invalid multipart form data." },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, message: "No image file provided in upload request." },
        { status: 400 }
      );
    }

    // 3. File size validation (10MB limit)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "Image exceeds the maximum allowed limit of 10MB." },
        { status: 400 }
      );
    }

    // 4. Declared MIME & extension validation
    const declaredMime = file.type.toLowerCase();
    const extension = ALLOWED_MIME_TYPES[declaredMime] || path.extname(file.name).toLowerCase();
    if (!ALLOWED_MIME_TYPES[declaredMime] && ![".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"].includes(extension)) {
      return NextResponse.json(
        {
          success: false,
          message: "Unsupported file format. Please upload JPEG, PNG, WebP, GIF, or AVIF images.",
        },
        { status: 400 }
      );
    }

    // 5. Read buffer, verify magic bytes, re-encode and persist.
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await verifyEncodeAndStore(buffer);
    if ("error" in result) {
      return NextResponse.json({ success: false, message: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      url: result.stored.url,
      filename: `${result.stored.id}.webp`,
      size: result.stored.size,
      mimeType: "image/webp",
      message: "Image verified and stored successfully.",
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server encountered an error while processing the uploaded image.",
      },
      { status: 500 }
    );
  }
}
