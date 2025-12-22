import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const PASSCODE = process.env.ZINDA_PASSCODE || "zaara";

export async function POST(request: NextRequest) {
  try {
    const { passcode } = await request.json();

    if (!passcode) {
      return NextResponse.json(
        { error: "Passcode is required" },
        { status: 400 }
      );
    }

    if (passcode === PASSCODE) {
      // Set a secure cookie for authentication
      const cookieStore = await cookies();
      cookieStore.set("zinda_authenticated", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Incorrect passcode" },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}

