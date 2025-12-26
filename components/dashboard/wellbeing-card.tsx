"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUsageStats } from "@/hooks/useUsageStats";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

// Helper to map package names to readable names (simplified)
function getAppName(pkg: string): string {
  if (pkg.includes("instagram")) return "Instagram";
  if (pkg.includes("tiktok")) return "TikTok";
  if (pkg.includes("youtube")) return "YouTube";
  if (pkg.includes("facebook")) return "Facebook";
  if (pkg.includes("whatsapp")) return "WhatsApp";
  if (pkg.includes("chrome")) return "Chrome";
  return pkg.split('.').pop() || pkg;
}

export function WellbeingCard() {
  const { isNative, hasPermission, totalTime, apps, requestPermission } = useUsageStats();

  // Mock data for web / fallback
  const displayTime = isNative ? totalTime : 3 * 60 * 60 * 1000 + 12 * 60 * 1000; // 3h 12m
  const limitTime = 4 * 60 * 60 * 1000; // 4h 00m
  const percentage = Math.min(100, (displayTime / limitTime) * 100);

  const topApps = isNative ? apps.slice(0, 3) : [
    { packageName: "com.instagram.android", timeInForeground: 45 * 60 * 1000 },
    { packageName: "com.zhiliaoapp.musically", timeInForeground: 32 * 60 * 1000 }
  ];

  return (
    <Card className="border-none bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 shadow-xl shadow-blue-900/5 dark:shadow-black/20 rounded-3xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden transition-all duration-300 hover:shadow-blue-900/10 dark:hover:shadow-black/30 hover:scale-[1.02]">
      <CardHeader className="pb-2 pt-6 px-6">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-blue-600/80 dark:text-blue-400 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          Wellbeing • Screen Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6">
        <div className="flex items-baseline justify-between">
          <span className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {formatDuration(displayTime)}
          </span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-white/5 px-2 py-1 rounded-full backdrop-blur-sm">
            Limit: {formatDuration(limitTime)}
          </span>
        </div>
        
        {isNative && !hasPermission ? (
          <div className="py-2">
             <Button 
               size="sm" 
               variant="outline" 
               onClick={requestPermission}
               className="w-full gap-2 bg-white/50 dark:bg-black/20 border-blue-200 dark:border-blue-800"
             >
               <Lock className="h-3 w-3" />
               Grant Usage Access
             </Button>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute inset-0 bg-blue-200/30 dark:bg-blue-900/30 rounded-full h-3" />
            <Progress value={percentage} className="h-3 bg-transparent [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-indigo-500 [&>div]:rounded-full" />
          </div>
        )}

        <div className="flex items-center gap-3 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white/60 dark:bg-white/5 p-3 rounded-xl backdrop-blur-sm">
          <div className="h-8 w-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 shrink-0">
            {getAppName(topApps[0]?.packageName || "").substring(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-gray-900 dark:text-white font-bold truncate">
              {percentage > 75 ? "High usage" : "Doing well"}
            </span>
            <span className="truncate">
              {topApps.map(app => `${getAppName(app.packageName)} (${Math.round(app.timeInForeground/60000)}m)`).join(", ")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
