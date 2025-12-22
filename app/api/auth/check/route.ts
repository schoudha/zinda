import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get("zinda_authenticated")?.value === "true";

  return NextResponse.json({ authenticated: isAuthenticated });
}

