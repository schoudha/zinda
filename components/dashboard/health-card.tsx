"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHealthConnect } from "@/hooks/useHealthConnect";
import { Lock, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

function RadialProgress({ value, size = 60 }: { value: number; size?: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 60 60">
        {/* Background circle */}
        <circle
          className="text-gray-100 dark:text-gray-800"
          strokeWidth="6"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="30"
          cy="30"
        />
        {/* Progress circle */}
        <circle
          className="text-green-500 transition-all duration-1000 ease-out"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="30"
          cy="30"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-extrabold text-gray-900 dark:text-white">{value}%</span>
      </div>
    </div>
  );
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export const HealthCard = memo(function HealthCard() {
  const router = useRouter();
  const { totalMinutes, hasPermission, isNative, requestPermission } = useHealthConnect('week');
  
  // Calculate percentage (assuming 150 minutes/week as goal, roughly 21 min/day)
  const goalMinutes = 150;
  const percentage = Math.min(100, Math.round((totalMinutes / goalMinutes) * 100));

  const handleCardClick = (e: React.MouseEvent | React.TouchEvent) => {
    // Only handle clicks when we need permission and are on native
    if (isNative && !hasPermission && requestPermission) {
      e.preventDefault();
      e.stopPropagation();
      requestPermission();
    }
  };

  const handlePermissionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    requestPermission();
  };

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push('/health/chat');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isNative && !hasPermission && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      requestPermission();
    }
  };

  const isClickable = isNative && !hasPermission;

  return (
    <Card 
      className={`border-none bg-white dark:bg-card shadow-xl shadow-green-900/5 dark:shadow-black/20 rounded-3xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden transition-all duration-300 hover:shadow-green-900/10 dark:hover:shadow-black/30 hover:scale-[1.02] ${isClickable ? 'cursor-pointer active:scale-95' : ''}`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <CardHeader 
        className="pb-2 pt-6 px-6"
        onClick={isClickable ? handleCardClick : undefined}
      >
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-green-600/80 dark:text-green-400 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Health • Exercise This Week
        </CardTitle>
      </CardHeader>
      <CardContent 
        className="flex flex-col gap-4 px-6 pb-6"
        onClick={isClickable ? handleCardClick : undefined}
      >
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-green-50 dark:bg-green-900/20 rounded-full blur-xl scale-110" />
            <RadialProgress value={percentage} size={72} />
          </div>
          <div className="space-y-3 flex-1">
            {isNative && !hasPermission ? (
              <div className="py-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handlePermissionClick}
                  className="w-full gap-2 bg-white/50 dark:bg-black/20 border-green-200 dark:border-green-800"
                >
                  <Lock className="h-3 w-3" />
                  Connect Health Data
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                    {formatMinutes(totalMinutes)}
                  </span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-white/5 px-2 py-1 rounded-full backdrop-blur-sm">
                    Goal: {formatMinutes(goalMinutes)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total exercise time this week from Health Connect
                </p>
              </>
            )}
          </div>
        </div>
        {!isNative || hasPermission ? (
          <div className="pt-2">
            <Button
              onClick={handleChatClick}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold shadow-md dark:bg-green-600 dark:hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat about this
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
});

