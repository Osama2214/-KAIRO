import { NextResponse } from "next/server";
import { createVerifiedPatronToken } from "@/lib/patronAuth";
import { isTrustedOrigin } from "@/lib/serverAuth";
import { upsertOAuthUser } from "@/lib/userStore";

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ success: false, reason: "origin", message: "Request origin is not trusted." }, { status: 403 });
    }
    const { accessToken } = await request.json().catch(() => ({}));
    if (!accessToken) {
      return NextResponse.json({ success: false, reason: "token", message: "Google access token missing." }, { status: 400 });
    }
    // An access token only proves "someone at Google", not "someone who signed
    // in to this store": a token issued to any other app would read the same
    // profile. Google's tokeninfo says which client the token was issued to, and
    // only tokens minted for our own client ID may start a session.
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
      return NextResponse.json(
        { success: false, reason: "config", message: "Google sign-in is not configured on this server." },
        { status: 503 }
      );
    }
    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(String(accessToken))}`,
      { cache: "no-store" }
    );
    const tokenInfo = await tokenInfoResponse.json().catch(() => null);
    const issuedTo = tokenInfo?.azp || tokenInfo?.aud;
    if (!tokenInfoResponse.ok || issuedTo !== clientId || !(Number(tokenInfo?.expires_in) > 0)) {
      return NextResponse.json(
        { success: false, reason: "token", message: "This Google sign-in was not issued for AnimeVerse." },
        { status: 401 }
      );
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${String(accessToken)}` }, cache: "no-store",
    });
    const profile = await profileResponse.json().catch(() => null);
    // The profile must belong to the same Google account the token was checked for.
    const sameAccount = !tokenInfo?.sub || !profile?.sub || String(tokenInfo.sub) === String(profile.sub);
    if (!profileResponse.ok || !profile?.email || profile.email_verified === false || !sameAccount) {
      return NextResponse.json({ success: false, reason: "google", message: "Google did not return a verified email." }, { status: 401 });
    }

    // Persist the patron before issuing a session: /api/auth/me resolves the
    // cookie against this row on every page load, so a session without a row
    // reads as signed out after the first refresh.
    const user = await upsertOAuthUser({ email: String(profile.email), name: profile.name });

    const token = createVerifiedPatronToken(user.id, user.email);
    if (!token) {
      // PATRON_SESSION_SECRET is unset or too short, so no session can be minted.
      return NextResponse.json(
        { success: false, reason: "config", message: "Sign-in is not configured on this server (PATRON_SESSION_SECRET)." },
        { status: 503 }
      );
    }
    const response = NextResponse.json({
      success: true,
      user,
      profile: { email: user.email, name: user.name, picture: profile.picture },
    });
    response.cookies.set("kairo_patron_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60 });
    return response;
  } catch (error) {
    console.error("Google sign-in verification error:", error);
    return NextResponse.json(
      { success: false, reason: "server", message: "Could not complete Google sign-in." },
      { status: 503 }
    );
  }
}
