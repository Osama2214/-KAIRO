import { NextResponse } from "next/server";
import { createVerifiedPatronToken } from "@/lib/patronAuth";
import { isTrustedOrigin } from "@/lib/serverAuth";

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) return NextResponse.json({ success: false }, { status: 403 });
    const { accessToken, uid } = await request.json().catch(() => ({}));
    if (!accessToken || !uid) return NextResponse.json({ success: false }, { status: 400 });
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${String(accessToken)}` }, cache: "no-store",
    });
    const profile = await profileResponse.json().catch(() => null);
    if (!profileResponse.ok || !profile?.email || profile.email_verified === false) return NextResponse.json({ success: false }, { status: 401 });
    const token = createVerifiedPatronToken(String(uid).slice(0, 80), String(profile.email));
    if (!token) return NextResponse.json({ success: false }, { status: 503 });
    const response = NextResponse.json({ success: true, profile: { email: profile.email, name: profile.name, picture: profile.picture } });
    response.cookies.set("kairo_patron_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 7 * 24 * 60 * 60 });
    return response;
  } catch (error) {
    console.error("Google sign-in verification error:", error);
    return NextResponse.json({ success: false }, { status: 503 });
  }
}
