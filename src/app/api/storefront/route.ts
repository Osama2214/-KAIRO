import { NextResponse } from "next/server";
import { curatorSession, isTrustedOrigin } from "@/lib/serverAuth";
import { getStorefrontData, saveStorefrontData } from "@/lib/storefrontDataStore";

export const dynamic = "force-dynamic";

const ALLOWED_KEYS = new Set([
  "volumes", "series", "genres", "formats", "heroContent", "announcement", "shippingConfig",
  "editorialConfig", "featuredSeriesConfig", "collectionConfig", "genreBentoConfig", "trendingConfig",
  "newReleasesConfig", "mangaDiscoveryConfig", "heroArabicContent", "announcementArabic",
  "shippingArabicConfig", "editorialArabicConfig", "newReleasesArabicConfig", "mangaDiscoveryArabicConfig",
  "trendingArabicConfig", "genreBentoArabicConfig", "arabicLanguageEnabled",
]);

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await getStorefrontData() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/storefront error:", error);
    return NextResponse.json({ success: false, message: "Storefront data is unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!isTrustedOrigin(request) || !(await curatorSession(request)).valid) {
    return NextResponse.json({ success: false, message: "Curator authorization required." }, { status: 403 });
  }
  try {
    const body = await request.json().catch(() => null);
    const source = body?.data;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      return NextResponse.json({ success: false, message: "Invalid storefront data." }, { status: 400 });
    }
    const data = Object.fromEntries(Object.entries(source).filter(([key]) => ALLOWED_KEYS.has(key)));
    if (JSON.stringify(data).length > 1_500_000) {
      return NextResponse.json({ success: false, message: "Storefront update is too large." }, { status: 413 });
    }
    await saveStorefrontData(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/storefront error:", error);
    return NextResponse.json({ success: false, message: "Failed to save storefront data." }, { status: 500 });
  }
}
