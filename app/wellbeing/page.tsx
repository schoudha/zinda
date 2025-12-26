"use client";

import { useUsageStats } from "@/hooks/useUsageStats";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Suspense } from "react";

// Helper function (same as in card)
function getAppName(pkg: string): string {
  if (pkg.includes("instagram")) return "Instagram";
  if (pkg.includes("tiktok")) return "TikTok";
  if (pkg.includes("youtube")) return "YouTube";
  if (pkg.includes("facebook")) return "Facebook";
  if (pkg.includes("whatsapp")) return "WhatsApp";
  if (pkg.includes("chrome")) return "Chrome";
  if (pkg.includes("twitter") || pkg.includes("com.twitter.android")) return "X";
  return pkg.split('.').pop() || pkg;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function WellbeingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = searchParams.get("period") || "today";
  
  const { totalTime, apps, isNative, hasPermission, requestPermission } = useUsageStats(period);

  const maxTime = apps.length > 0 ? apps[0].timeInForeground : 1;
  
  const periodLabel = period === "today" ? "Today" : 
                     period === "week" ? "This Week" :
                     period === "month" ? "This Month" : "This Year";

  return (
    <main className="flex min-h-screen flex-col bg-background pt-safe pb-safe">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10 pt-safe">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold">Screen Time ({periodLabel})</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8 pb-20">
          {/* Total Time */}
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-5xl font-extrabold text-primary mb-2">
              {formatDuration(totalTime)}
            </div>
            <div className="text-muted-foreground font-medium">Total Usage {periodLabel}</div>
          </div>

          {/* Bar Chart Section */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              App Breakdown
            </h2>
            
            <div className="space-y-4">
              {apps.map((app) => (
                <div key={app.packageName} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-foreground">
                      {getAppName(app.packageName)}
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {formatDuration(app.timeInForeground)}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(app.timeInForeground / maxTime) * 100}%` }}
                    />
                  </div>
                </div>
              ))}

              {apps.length === 0 && (
                 <div className="text-center text-muted-foreground py-10">
                   {isNative && !hasPermission ? (
                     <div className="flex flex-col items-center gap-4">
                       <p>Usage access permission required</p>
                       <Button onClick={requestPermission}>Grant Permission</Button>
                     </div>
                   ) : (
                     <p>No usage data available for {periodLabel.toLowerCase()}</p>
                   )}
                 </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </main>
  );
}

export default function WellbeingPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <WellbeingContent />
    </Suspense>
  );
}
