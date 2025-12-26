"use client";

import { memo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUsageStats } from "@/hooks/useUsageStats";
import { useGoals } from "@/hooks/useGoals";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";

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

export const WellbeingCard = memo(function WellbeingCard({ period = "today" }: { period?: string }) {
  const router = useRouter();
  const { isNative, hasPermission, totalTime, apps, requestPermission } = useUsageStats(period);
  const { goals } = useGoals();
  
  const [interpretation, setInterpretation] = useState<string>("");
  const [loadingInterpretation, setLoadingInterpretation] = useState(false);

  // Mock data for web / fallback
  const multiplier = period === "week" ? 7 : period === "month" ? 30 : period === "year" ? 365 : 1;
  const mockTime = (3 * 60 * 60 * 1000 + 12 * 60 * 1000) * multiplier; // 3h 12m * multiplier
  const displayTime = isNative ? totalTime : mockTime;
  const limitTime = (4 * 60 * 60 * 1000) * multiplier; // 4h 00m * multiplier
  const percentage = Math.min(100, (displayTime / limitTime) * 100);

  const topApps = isNative ? apps.slice(0, 3) : [
    { packageName: "com.instagram.android", timeInForeground: 45 * 60 * 1000 * multiplier },
    { packageName: "com.zhiliaoapp.musically", timeInForeground: 32 * 60 * 1000 * multiplier }
  ];

  // Fetch AI interpretation
  useEffect(() => {
    // Debounce to prevent multiple calls
    const timer = setTimeout(async () => {
      // Only fetch if we have some data and it's not already loading
      if (displayTime > 0 && !loadingInterpretation) {
        setLoadingInterpretation(true);
        try {
          // For web mock, we'll use the mock data. For native, use real data.
          const payload = {
            usage: {
              totalTime: displayTime,
              apps: topApps // Send top apps for context
            },
            goals: goals,
            period: period
          };

          const res = await fetch('/api/wellbeing/interpret', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.interpretation) {
              setInterpretation(data.interpretation);
            }
          }
        } catch (e) {
          console.error("Failed to fetch interpretation", e);
        } finally {
          setLoadingInterpretation(false);
        }
      }
    }, 1000); // 1 second delay to let data settle

    return () => clearTimeout(timer);
  }, [displayTime, period, goals.length]); // Re-run when time, period or goals count changes

  const handleCardClick = () => {
    router.push(`/wellbeing?period=${period}`);
  };

  const handlePermissionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    requestPermission();
  };

  return (
    <Card 
      onClick={handleCardClick}
      className="border-none bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 shadow-xl shadow-blue-900/5 dark:shadow-black/20 rounded-3xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden transition-all duration-300 hover:shadow-blue-900/10 dark:hover:shadow-black/30 cursor-pointer active:scale-95"
    >
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
               onClick={handlePermissionClick}
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

        <div className="flex items-start gap-3 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white/60 dark:bg-white/5 p-3 rounded-xl backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
             {loadingInterpretation ? (
                <Sparkles className="h-4 w-4 animate-spin-slow" />
             ) : (
                <Sparkles className="h-4 w-4" />
             )}
          </div>
          <div className="flex flex-col overflow-hidden flex-1 min-w-0 z-10">
            <span className="text-gray-900 dark:text-white font-bold truncate block mb-1">
              AI Insight
            </span>
            <p className="leading-relaxed opacity-90 line-clamp-3">
              {loadingInterpretation && !interpretation ? "Analyzing usage patterns..." : interpretation || "Focus on your goals to reduce screen time."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
