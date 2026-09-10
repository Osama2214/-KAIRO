import { NextResponse } from "next/server";
import {
  addAuthorizedAdminEmail,
  authorizedAdminEmails,
  removeAuthorizedAdminEmail,
} from "@/config/adminConfig";
import { curatorSession, isTrustedOrigin } from "@/lib/serverAuth";
import { checkRateLimitKey, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Curator allow-list management.
 *
 * The console has always shown "add / remove administrator" controls, but they
 * only edited a client-side array: the address never gained access, and the
 * server's own list replaced it on the next session check. These endpoints make
 * those controls do what they say.
 */
async function requireCurator(request: Request): Promise<{ denied: NextResponse } | { email: string }> {
  const session = isTrustedOrigin(request) ? await curatorSession(request) : { valid: false as const };
  if (!session.valid || !session.email) {
    return {
      denied: NextResponse.json(
        { success: false, message: "Curator authorization required." },
        { status: 401 }
      ),
    };
  }
  return { email: session.email };
}

export async function GET(request: Request) {
  const auth = await requireCurator(request);
  if ("denied" in auth) return auth.denied;

  return NextResponse.json(
    { success: true, adminEmails: await authorizedAdminEmails() },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const auth = await requireCurator(request);
  if ("denied" in auth) return auth.denied;

  // Granting console access is worth a limit of its own, separate from the
  // PIN endpoint's.
  if (!(await checkRateLimitKey(`admin_emails:${getClientIp(request)}`, 20, 15 * 60 * 1000)).allowed) {
    return NextResponse.json(
      { success: false, message: "Too many changes to the administrator list. Please wait." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const result = await addAuthorizedAdminEmail(body?.email);
  return NextResponse.json(
    { success: result.ok, message: result.message, adminEmails: await authorizedAdminEmails() },
    { status: result.ok ? 200 : 400 }
  );
}

export async function DELETE(request: Request) {
  const auth = await requireCurator(request);
  if ("denied" in auth) return auth.denied;

  if (!(await checkRateLimitKey(`admin_emails:${getClientIp(request)}`, 20, 15 * 60 * 1000)).allowed) {
    return NextResponse.json(
      { success: false, message: "Too many changes to the administrator list. Please wait." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));

  // Removing yourself invalidates your own session on the very next request,
  // which reads as the console spontaneously logging you out. Another curator
  // has to do it.
  if (String(body?.email || "").trim().toLowerCase() === auth.email.toLowerCase()) {
    return NextResponse.json(
      {
        success: false,
        message: "You cannot remove your own access. Ask another administrator to do it.",
        adminEmails: await authorizedAdminEmails(),
      },
      { status: 400 }
    );
  }

  const result = await removeAuthorizedAdminEmail(body?.email);
  return NextResponse.json(
    { success: result.ok, message: result.message, adminEmails: await authorizedAdminEmails() },
    { status: result.ok ? 200 : 400 }
  );
}
