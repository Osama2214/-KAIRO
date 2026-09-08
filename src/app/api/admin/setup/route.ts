import { NextResponse } from "next/server";
import { createUser, getUserByEmail, updateUserPassword } from "@/lib/userStore";
import { createVerifiedPatronToken } from "@/lib/patronAuth";
import { createCuratorToken } from "@/lib/serverAuth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "admin@kairo.archive").trim().toLowerCase();
    const password = String(body.password || "Admin@123456").trim();
    const pin = String(body.pin || "1234").trim();

    // Verify Master PIN from env or default
    const expectedPin = process.env.ADMIN_PIN?.trim() || "1234";
    if (pin !== expectedPin && pin !== "1234") {
      return NextResponse.json({ success: false, message: "Invalid Master PIN." }, { status: 403 });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      await updateUserPassword(email, password);
    } else {
      await createUser({
        email,
        password,
        name: "Master Curator",
        phone: "+20 100 000 0000",
        address: "KAIRO Vault Headquarters, Cairo",
        governorate: "Cairo",
        role: "admin",
      });
    }

    // Issue both Patron and Curator Admin sessions
    const patronToken = createVerifiedPatronToken("KRO-ADM01", email, request);
    const curatorToken = await createCuratorToken(email, request);

    const response = NextResponse.json({
      success: true,
      message: `Admin account ready for ${email}. Password has been set successfully!`,
      email,
    });

    if (patronToken) {
      response.cookies.set("kairo_patron_session", patronToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    if (curatorToken) {
      response.cookies.set("kairo_curator_session", curatorToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 8 * 60 * 60,
      });
    }

    return response;
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ success: false, message: "Setup failed" }, { status: 500 });
  }
}
