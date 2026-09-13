import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { curatorSession, isTrustedOrigin } from "@/lib/serverAuth";
import { getStorefrontData, saveStorefrontData } from "@/lib/storefrontDataStore";
import { STOREFRONT_CACHE_TAG } from "@/lib/storefrontSnapshot";
import { STOREFRONT_DATA_KEYS } from "@/lib/storefrontKeys";
import { validateCatalogue } from "@/lib/variants";
import type { MangaVolume } from "@/data/manga";
import { hasOmittedDetails, restoreOmittedDetails } from "@/lib/catalogDetails";

export const dynamic = "force-dynamic";

/** The same list the client sends, so neither side can drift from the other. */
const ALLOWED_KEYS = new Set<string>(STOREFRONT_DATA_KEYS);

export async function GET() {
  try {
    // Every page load fetches this ~70KB payload, and each request previously
    // ran three Neon queries with no-store. A short shared cache absorbs the
    // repeat traffic; stock shown here is advisory anyway, since checkout
    // reserves against the authoritative catalogue rows.
    return NextResponse.json(
      { success: true, data: await getStorefrontData() },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300" } }
    );
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

    // A save is a whole-payload replace, so a console whose store went empty
    // (a failed hydration, a bug) would blank the shop in one request. The
    // client guards against it; the server refuses it outright.
    if ("volumes" in data) {
      if (!Array.isArray(data.volumes)) {
        return NextResponse.json({ success: false, message: "Catalogue payload is malformed." }, { status: 400 });
      }
      let incoming: unknown[] = data.volumes;
      // Pages load products without their long text (lib/catalogDetails.ts).
      // A product saved in that state keeps the text already stored, so a
      // console that had not loaded it can never write blanks over it.
      if (incoming.some(hasOmittedDetails)) {
        const current = await getStorefrontData();
        const stored = Array.isArray(current?.volumes) ? (current!.volumes as unknown[]) : [];
        incoming = restoreOmittedDetails(incoming, stored);
        data.volumes = incoming;
      }
      // Figures and posters are sold per variant, so a malformed variant list
      // (duplicate codes, no price, fractional stock) would write broken
      // catalogue rows. Refuse the save before any of it reaches the table.
      const problems = validateCatalogue(incoming as MangaVolume[]);
      if (problems.length > 0) {
        return NextResponse.json(
          { success: false, message: problems.slice(0, 5).join(" "), problems: problems.slice(0, 20) },
          { status: 400 }
        );
      }
      if (incoming.length === 0) {
        const current = await getStorefrontData().catch(() => null);
        const stored = Array.isArray(current?.volumes) ? (current!.volumes as unknown[]).length : 0;
        if (stored > 0) {
          return NextResponse.json(
            {
              success: false,
              message: "Refused: this would erase every volume in the catalogue. Reload the console and try again.",
            },
            { status: 409 }
          );
        }
      }
    }
    if (JSON.stringify(data).length > 1_500_000) {
      return NextResponse.json({ success: false, message: "Storefront update is too large." }, { status: 413 });
    }
    await saveStorefrontData(data);
    // Pages are rendered from a cached read of this table, so a save has to
    // drop that cache or the curator's change would sit behind a timer.
    // `expire: 0` because a curator who just pressed save should see the shop
    // change on the next load, not be served the old copy while it refreshes.
    revalidateTag(STOREFRONT_CACHE_TAG, { expire: 0 });
    // The GET above is held at the CDN for up to 30s, so a curator's save
    // reaches other visitors within that window. The console itself updates
    // its own store optimistically, so the curator sees it immediately.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/storefront error:", error);
    return NextResponse.json({ success: false, message: "Failed to save storefront data." }, { status: 500 });
  }
}
