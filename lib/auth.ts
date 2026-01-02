import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export async function isAuthenticated(request?: NextRequest) {
  // Check if request is from Android - skip auth for Android apps
  if (request) {
    const userAgent = request.headers.get("user-agent") || "";
    // Capacitor Android apps typically have "Android" in the User-Agent
    if (userAgent.toLowerCase().includes("android")) {
      return true;
    }
  }
  
  const cookieStore = await cookies();
  return cookieStore.get("zinda_authenticated")?.value === "true";
}

