"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUsageStats } from "@/hooks/useUsageStats";
import { Lock, Monitor } from "lucide-react";

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function getAppName(pkg: string): string {
  if (pkg.includes("instagram")) return "Instagram";
  if (pkg.includes("tiktok")) return "TikTok";
  if (pkg.includes("youtube")) return "YouTube";
  if (pkg.includes("facebook")) return "Facebook";
  if (pkg.includes("whatsapp")) return "WhatsApp";
  if (pkg.includes("chrome")) return "Chrome";
  if (pkg.includes("twitter") || pkg.includes("com.twitter.android")) return "X";
  if (pkg.includes("gmail")) return "Gmail";
  if (pkg.includes("netflix")) return "Netflix";
  if (pkg.includes("spotify")) return "Spotify";
  return pkg.split('.').pop() || pkg;
}

function getAppInitials(pkg: string): string {
  const name = getAppName(pkg);
  if (name.length <= 2) return name.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function getAppColor(pkg: string): string {
  const name = getAppName(pkg).toLowerCase();
  if (name.includes("instagram")) return "bg-gradient-to-br from-purple-500 to-pink-500";
  if (name.includes("youtube")) return "bg-red-500";
  if (name.includes("whatsapp")) return "bg-green-500";
  if (name.includes("chrome")) return "bg-blue-500";
  if (name.includes("tiktok")) return "bg-black dark:bg-gray-800";
  if (name.includes("facebook")) return "bg-blue-600";
  if (name.includes("x") || name.includes("twitter")) return "bg-black dark:bg-gray-800";
  if (name.includes("gmail")) return "bg-red-500";
  if (name.includes("netflix")) return "bg-red-600";
  if (name.includes("spotify")) return "bg-green-500";
  return "bg-gray-500";
}

interface ScreentimeCardProps {
  period?: "today" | "week" | "month" | "year";
}

export const ScreentimeCard = memo(function ScreentimeCard({ period = "today" }: ScreentimeCardProps) {
  const { isNative, hasPermission, totalTime, apps, requestPermission } = useUsageStats(period);
  
  const topApps = apps.slice(0, 5);
  
  const handleConnect = async () => {
    if (isNative && !hasPermission) {
      await requestPermission();
    }
  };

  return (
    <Card className="border-none bg-white dark:bg-card shadow-xl shadow-blue-900/5 dark:shadow-black/20 rounded-3xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
      <CardHeader className="pb-2 pt-6 px-6">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-blue-600/80 dark:text-blue-400 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          Screentime
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Usage Data
            </span>
          </div>
          {isNative ? (
            hasPermission ? (
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                Connected
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleConnect}
                className="h-7 text-xs gap-1.5 border-blue-200 dark:border-blue-800"
              >
                <Lock className="h-3 w-3" />
                Connect
              </Button>
            )
          ) : (
            <span className="text-xs font-medium text-gray-400 px-2 py-1 rounded-full">
              Not available
            </span>
          )}
        </div>
        
        {isNative && hasPermission && (
          <>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  {formatDuration(totalTime)}
                </span>
              </div>
              
              {topApps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Top Apps
                  </p>
                  <div className="flex items-center gap-2.5">
                    {topApps.map((app) => (
                      <div
                        key={app.packageName}
                        className="flex flex-col items-center gap-1.5 flex-1 min-w-0"
                        title={getAppName(app.packageName)}
                      >
                        <div
                          className={`w-11 h-11 rounded-xl ${getAppColor(app.packageName)} flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0`}
                        >
                          {getAppInitials(app.packageName)}
                        </div>
                        <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate w-full text-center leading-tight">
                          {getAppName(app.packageName)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        
        {isNative && !hasPermission && (
          <p className="text-xs text-gray-500 dark:text-gray-500 pt-2">
            Connect usage data to view your screen time
          </p>
        )}
      </CardContent>
    </Card>
  );
});

