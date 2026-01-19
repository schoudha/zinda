"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Monitor, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Goal } from "@/types";
import { AppUsage } from "@/hooks/useUsageStats";

interface ScreentimeGoalViewProps {
  goal: Goal;
  totalTime: number; // in milliseconds
  apps: AppUsage[];
  isNative: boolean;
  hasPermission: boolean;
  requestPermission: () => Promise<void>;
  period: "today" | "week" | "month" | "year";
  setPeriod: (period: "today" | "week" | "month" | "year") => void;
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
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

export function ScreentimeGoalView({ 
  goal, 
  totalTime, 
  apps,
  isNative,
  hasPermission,
  requestPermission,
  period, 
  setPeriod 
}: ScreentimeGoalViewProps) {
  
  // Get time window from goal (defaults to 6pm-8pm)
  const startHour = goal.screentimeStartHour ?? 18;
  const endHour = goal.screentimeEndHour ?? 20;
  
  // Format time window for display
  const formatHour = (hour: number): string => {
    const period = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}${period}`;
  };
  const timeWindowText = `${formatHour(startHour)} - ${formatHour(endHour)}`;
  
  // Default target is 10 minutes (in ms) for time-windowed screentime goals
  const targetMinutes = goal.minutesPerDay || 10; // 10 minutes default
  const targetMs = targetMinutes * 60 * 1000;
  
  // For time-windowed goals, we only track "today" since the window is daily
  // But we keep period support for backward compatibility
  const periodTargetMs = period === "today" ? targetMs :
                         period === "week" ? targetMs * 7 :
                         period === "month" ? targetMs * 30 :
                         targetMs * 365;

  const percentage = Math.min(100, Math.round((totalTime / periodTargetMs) * 100));
  
  const isOverLimit = totalTime > periodTargetMs;
  const isNearLimit = !isOverLimit && percentage >= 75;

  return (
    <div className="space-y-4">
      <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
        <TabsList className="w-full">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="year">Year</TabsTrigger>
        </TabsList>
        
        <TabsContent value={period} className="space-y-4 mt-4">
          {/* Time Window Info */}
          <Card className="border-none shadow-sm bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Time Window
                </span>
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {timeWindowText}
                </span>
              </div>
              <div className="text-xs text-blue-700/70 dark:text-blue-300/70">
                Only usage during this time is tracked
              </div>
            </CardContent>
          </Card>
          
          {/* Progress Summary */}
          <Card className={`border-none shadow-sm ${
            isOverLimit ? 'bg-red-50 dark:bg-red-950/30' : 
            isNearLimit ? 'bg-yellow-50 dark:bg-yellow-950/30' : 
            'bg-green-50 dark:bg-green-950/30'
          }`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${
                  isOverLimit ? 'text-red-900 dark:text-red-100' : 
                  isNearLimit ? 'text-yellow-900 dark:text-yellow-100' : 
                  'text-green-900 dark:text-green-100'
                }`}>
                  Screen Time ({timeWindowText})
                </span>
                <span className={`text-lg font-bold ${
                  isOverLimit ? 'text-red-700 dark:text-red-300' : 
                  isNearLimit ? 'text-yellow-700 dark:text-yellow-300' : 
                  'text-green-700 dark:text-green-300'
                }`}>
                  {formatDuration(totalTime)}
                </span>
              </div>
              <div className={`text-xs ${
                isOverLimit ? 'text-red-700/70 dark:text-red-300/70' : 
                isNearLimit ? 'text-yellow-700/70 dark:text-yellow-300/70' : 
                'text-green-700/70 dark:text-green-300/70'
              }`}>
                Goal: Under {formatDuration(periodTargetMs)}
              </div>
            </CardContent>
          </Card>
          
          {/* Permissions / Connect */}
          {isNative && !hasPermission && (
             <Card className="border-dashed border-2 border-gray-200 dark:border-gray-800 bg-transparent">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
                <Lock className="h-8 w-8 text-gray-400" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Connect Usage Data</p>
                  <p className="text-xs text-muted-foreground">Allow access to view your screen time stats</p>
                </div>
                <Button size="sm" onClick={requestPermission}>
                  Connect
                </Button>
              </CardContent>
             </Card>
          )}
          
          {/* App Usage List */}
          {isNative && hasPermission && (
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Top Apps</h3>
                {apps.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No usage data available for {period === "today" ? "today" : period === "week" ? "this week" : period === "month" ? "this month" : "this year"}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {apps.slice(0, 10).map((app) => (
                      <div
                        key={app.packageName}
                        className="bg-muted rounded-lg p-3 flex items-center gap-3"
                      >
                         <div
                          className={`w-10 h-10 rounded-lg ${getAppColor(app.packageName)} flex items-center justify-center text-white text-[10px] font-bold shadow-sm shrink-0`}
                        >
                          {getAppInitials(app.packageName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-foreground truncate">
                              {getAppName(app.packageName)}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              {formatDuration(app.timeInForeground)}
                            </span>
                          </div>
                          {/* Mini progress bar relative to total time */}
                          <div className="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isOverLimit ? 'bg-red-500' : 'bg-blue-500'}`} 
                              style={{ width: `${Math.min(100, (app.timeInForeground / totalTime) * 100)}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {!isNative && (
            <div className="text-center p-4 text-sm text-muted-foreground">
              Usage stats are only available on Android devices.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

