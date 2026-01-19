import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export async function isAuthenticated(request?: NextRequest) {
  // Check if request is from Android - skip auth for Android apps
  if (request) {
    const userAgent = request.headers.get("user-agent") || "";
    const userAgentLower = userAgent.toLowerCase();
    
    // Check for custom header that Capacitor might set (if we add it)
    const capacitorPlatform = request.headers.get("x-capacitor-platform");
    
    // Log for debugging
    console.log('[Auth] Checking authentication:', {
      hasRequest: true,
      userAgent,
      userAgentLower,
      capacitorPlatform,
      containsAndroid: userAgentLower.includes("android"),
      containsCapacitor: userAgentLower.includes("capacitor"),
      allHeaders: Object.fromEntries(request.headers.entries())
    });
    
    // Check multiple ways to detect Android/Capacitor:
    // 1. User-Agent contains "android" or "capacitor"
    // 2. Custom header indicates Android platform
    // 3. User-Agent contains the app name or package identifier
    const isAndroidRequest = 
      userAgentLower.includes("android") || 
      userAgentLower.includes("capacitor") ||
      capacitorPlatform?.toLowerCase() === "android" ||
      userAgentLower.includes("com.zinda.app");
    
    if (isAndroidRequest) {
      console.log('[Auth] Android/Capacitor detected - bypassing auth');
      return true;
    }
  } else {
    console.log('[Auth] No request object provided');
  }
  
  const cookieStore = await cookies();
  const cookieAuth = cookieStore.get("zinda_authenticated")?.value === "true";
  
  console.log('[Auth] Cookie-based auth result:', { cookieAuth });
  
  return cookieAuth;
}

