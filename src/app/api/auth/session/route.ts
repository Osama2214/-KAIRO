import { NextResponse } from "next/server";

/**
 * Patron sessions are minted only by the flows that actually authenticate a
 * patron: /api/auth/login, /api/auth/register and /api/auth/google. This route
 * exists purely to destroy that cookie on sign-out.
 *
 * The former POST handler issued a session for any email supplied in the body
 * (an account-takeover hole) and used a token shape that /api/auth/me rejects,
 * so any session it created read as signed out on the next page load.
 */
export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: "Patron session destroyed.",
  });

  response.cookies.set("kairo_patron_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
