import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { checkRateLimitKey, getClientIp } from "@/lib/rateLimit";
import { curatorSession, isTrustedOrigin } from "@/lib/serverAuth";

// Allowed MIME types and corresponding extensions
const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request) || !curatorSession(request).valid) {
      return NextResponse.json({ success: false, message: "Curator authorization required for uploads." }, { status: 401 });
    }
    const clientIp = getClientIp(request);

    // 1. Check Rate Limiting (IP Level: max 15 uploads per 10 minutes to prevent disk exhaustion DoS)
    const rateCheck = checkRateLimitKey(`upload:ip:${clientIp}`, 15, 10 * 60 * 1000);
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

    // 5. Read buffer & verify cryptographic / binary magic bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const magicCheck = isValidImageMagicBytes(buffer);
    if (!magicCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          message: "File signature verification failed. The file is corrupted or not a valid image format.",
        },
        { status: 400 }
      );
    }

    // 6. Generate cryptographically random, safe filename (avoids path traversal / overwrites)
    const hash = crypto.randomBytes(12).toString("hex");
    const safeBaseName = (path.basename(file.name, path.extname(file.name)) || "image")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .slice(0, 20);
    const finalFilename = `${safeBaseName}-${Date.now()}-${hash}${extension || ".jpg"}`;

    // 7. Ensure directory exists and write to public/uploads
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const targetFilePath = path.join(uploadsDir, finalFilename);

    await writeFile(targetFilePath, buffer);

    const publicUrl = `/uploads/${finalFilename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: finalFilename,
      size: file.size,
      mimeType: magicCheck.detectedMime || declaredMime,
      message: "Image verified and uploaded successfully to server.",
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
