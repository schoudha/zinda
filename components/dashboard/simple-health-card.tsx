"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHealthConnect } from "@/hooks/useHealthConnect";
import { Lock, Activity, Stethoscope } from "lucide-react";

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

interface SimpleHealthCardProps {
  period?: "today" | "week" | "month" | "year";
}

export const SimpleHealthCard = memo(function SimpleHealthCard({ period = "today" }: SimpleHealthCardProps) {
  const { totalMinutes, hasPermission, isNative, isAvailable, sessions, requestPermission } = useHealthConnect(period);
  
  const getLatestData = () => {
    if (sessions.length === 0) return "No data yet";
    const latestSession = sessions[sessions.length - 1];
    const date = new Date(latestSession.startTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleConnect = async () => {
    if (isNative && !hasPermission) {
      await requestPermission();
    }
  };

  return (
    <Card className="border-none bg-white dark:bg-card shadow-xl shadow-green-900/5 dark:shadow-black/20 rounded-3xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
      <CardHeader className="pb-2 pt-6 px-6">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-green-600/80 dark:text-green-400 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Health
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Health Connect
            </span>
          </div>
          {isNative ? (
            hasPermission ? (
              <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                Connected
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleConnect}
                className="h-7 text-xs gap-1.5 border-green-200 dark:border-green-800"
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
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Medical Records
            </span>
          </div>
          <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
            Linked
          </span>
        </div>
        
        {isNative && hasPermission && (
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {formatMinutes(totalMinutes)}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Latest data: {getLatestData()}
            </p>
          </div>
        )}
        
        {isNative && !hasPermission && (
          <p className="text-xs text-gray-500 dark:text-gray-500 pt-2">
            Connect Health Connect to view your exercise data
          </p>
        )}
      </CardContent>
    </Card>
  );
});

