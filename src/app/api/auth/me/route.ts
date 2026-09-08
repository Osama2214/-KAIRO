import { NextResponse } from "next/server";
import { patronSession } from "@/lib/patronAuth";
import { getUserByEmail, toSanitizedUser } from "@/lib/userStore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = patronSession(request);
    if (!session.valid || !session.email) {
      return NextResponse.json({ authenticated: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const user = await getUserByEmail(session.email);
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({
      authenticated: true,
      user: toSanitizedUser(user),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
