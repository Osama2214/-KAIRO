import { NextResponse } from "next/server";
import { createUser, getUserByEmail } from "@/lib/userStore";
import { createVerifiedPatronToken } from "@/lib/patronAuth";
import { isTrustedOrigin } from "@/lib/serverAuth";
import { checkRateLimitKey, getClientIp } from "@/lib/rateLimit";

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string): boolean {
  return typeof password === "string" && password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ success: false, message: "Invalid request origin." }, { status: 403 });
    }

    const clientIp = getClientIp(request);
    const rateCheck = await checkRateLimitKey(`register:ip:${clientIp}`, 5, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "Invalid request payload." }, { status: 400 });
    }

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const address = String(body.address || "").trim();
    const governorate = String(body.governorate || "Cairo").trim();
    const city = body.city ? String(body.city).trim() : undefined;
    const deliveryNotes = body.deliveryNotes ? String(body.deliveryNotes).trim() : undefined;

    if (!validateEmail(email)) {
      return NextResponse.json({ success: false, message: "A valid email address is required." }, { status: 400 });
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters long and contain both letters and numbers." },
        { status: 400 }
      );
    }

    if (!name || !phone || !address) {
      return NextResponse.json(
        { success: false, message: "Full name, mobile phone number, and delivery address are required." },
        { status: 400 }
      );
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { success: false, message: "An account with this email address already exists. Please sign in." },
        { status: 409 }
      );
    }

    const newUser = await createUser({
      email,
      password,
      name,
      phone,
      address,
      governorate,
      city,
      deliveryNotes,
    });

    const token = createVerifiedPatronToken(newUser.id, newUser.email);
    if (!token) {
      return NextResponse.json({ success: false, message: "Session secret configuration is missing." }, { status: 503 });
    }

    const response = NextResponse.json({
      success: true,
      user: newUser,
      message: "Account created successfully.",
    });

    response.cookies.set("kairo_patron_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json({ success: false, message: "Failed to register account." }, { status: 500 });
  }
}

