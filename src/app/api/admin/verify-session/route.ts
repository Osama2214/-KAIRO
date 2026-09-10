import { NextResponse } from "next/server";
import { curatorSession } from "@/lib/serverAuth";
import { authorizedAdminEmails } from "@/config/adminConfig";

export async function POST(request: Request) {
  try {
    const verification = await curatorSession(request);
    if (!verification.valid) {
      return NextResponse.json(
        { valid: false, message: "Invalid, tampered, or expired curator session." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: verification.email,
      // Delivered here rather than bundled into the client, so the curator
      // allow-list is never readable by an anonymous visitor.
      adminEmails: await authorizedAdminEmails(),
      message: "Valid curator session.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { valid: false, message: "Session check failed." },
      { status: 500 }
    );
  }
}

/**
 * Log out curator and purge cookie
 */
export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: "Curator session terminated.",
  });

  response.cookies.set("kairo_curator_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
