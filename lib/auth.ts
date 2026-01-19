import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export async function isAuthenticated(request?: NextRequest) {
  // Check if request is from Android - skip auth for Android apps
  if (request) {
    const userAgent = request.headers.get("user-agent") || "";
    // Capacitor Android apps typically have "Android" in the User-Agent
    if (userAgent.toLowerCase().includes("android")) {
      // #region agent log
      try {
        await fetch('http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'lib/auth.ts:10',
            message: 'Android detected via User-Agent',
            data: { userAgent },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'post-fix',
            hypothesisId: 'F'
          })
        }).catch(() => {});
      } catch {}
      // #endregion
      return true;
    }
  }
  
  const cookieStore = await cookies();
  const cookieAuth = cookieStore.get("zinda_authenticated")?.value === "true";
  
  // #region agent log
  try {
    await fetch('http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'lib/auth.ts:16',
        message: 'Cookie-based auth check',
        data: { 
          hasRequest: !!request,
          userAgent: request?.headers.get("user-agent") || "none",
          cookieAuth 
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'post-fix',
        hypothesisId: 'F'
      })
    }).catch(() => {});
  } catch {}
  // #endregion
  
  return cookieAuth;
}

