import { NextResponse } from "next/server";
import crypto from "crypto";
import { AUTHORIZED_ADMIN_EMAILS } from "@/config/adminConfig";
import { verifyServerPin, updateServerPin, getCurrentPinHash } from "@/lib/adminPinStore";

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  "kairo_master_curator_super_secret_hmac_2026_994827_kairo_archive";

function computeClientFingerprint(request: Request): string {
  const ua = request.headers.get("user-agent") || "unknown";
  return crypto.createHash("sha256").update(ua).digest("hex").slice(0, 16);
}

function verifyCuratorToken(token: string, request: Request): { valid: boolean; email?: string } {
  if (!token || !token.includes(".")) return { valid: false };
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return { valid: false };

  const expectedSignature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return { valid: false };
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now() || payload.role !== "admin") {
      return { valid: false };
    }

    const currentFp = computeClientFingerprint(request);
    if (payload.fp && payload.fp !== currentFp) {
      return { valid: false };
    }

    const isAuthorized = AUTHORIZED_ADMIN_EMAILS.some(
      (e) => e.trim().toLowerCase() === (payload.sub || "").toLowerCase()
    );
    if (!isAuthorized) return { valid: false };

    return { valid: true, email: payload.sub };
  } catch {
    return { valid: false };
  }
}

export async function POST(request: Request) {
  try {
    const cookieToken = request.headers.get("cookie")?.split(";")
      .find((c) => c.trim().startsWith("kairo_curator_session="))
      ?.split("=")[1];
    const authHeader = request.headers.get("authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;

    const token = cookieToken || bearerToken;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Valid curator session required." },
        { status: 401 }
      );
    }

    const verification = verifyCuratorToken(token, request);
    if (!verification.valid) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired curator session." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const currentPin = (body.currentPin || "").toString().trim();
    const newPin = (body.newPin || "").toString().trim();

    if (!currentPin || !newPin) {
      return NextResponse.json(
        { success: false, message: "Both current PIN and new PIN are required." },
        { status: 400 }
      );
    }

    if (newPin.length < 4 || newPin.length > 8) {
      return NextResponse.json(
        { success: false, message: "New PIN must be between 4 and 8 digits." },
        { status: 400 }
      );
    }

    // Verify current PIN
    const isCurrentValid = verifyServerPin(currentPin);
    if (!isCurrentValid) {
      return NextResponse.json(
        { success: false, message: "Current PIN is incorrect." },
        { status: 403 }
      );
    }

    // Update server PIN
    const updated = updateServerPin(newPin);
    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Failed to update Security PIN." },
        { status: 500 }
      );
    }

    const newHash = getCurrentPinHash();
    return NextResponse.json({
      success: true,
      newPinHash: newHash,
      message: "Security PIN updated successfully across server authority.",
    });
  } catch (error) {
    console.error("Change PIN API error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update PIN due to a server error." },
      { status: 500 }
    );
  }
}
