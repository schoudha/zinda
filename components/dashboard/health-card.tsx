"use client";

import { memo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHealthConnect } from "@/hooks/useHealthConnect";
import { useGoals } from "@/hooks/useGoals";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { GoalCreationDialog } from "@/components/goals/goal-creation-dialog";

function RadialProgress({ value, size = 60, remainingMinutes }: { value: number; size?: number; remainingMinutes?: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  // Color coding: red <40%, yellow 40-70%, green >70%
  const getColorClass = () => {
    if (value < 40) {
      return "text-red-500 dark:text-red-400";
    } else if (value < 70) {
      return "text-yellow-500 dark:text-yellow-400";
    } else {
      return "text-green-500 dark:text-green-400";
    }
  };

  const getBlurColorClass = () => {
    if (value < 40) {
      return "bg-red-50 dark:bg-red-900/20";
    } else if (value < 70) {
      return "bg-yellow-50 dark:bg-yellow-900/20";
    } else {
      return "bg-green-50 dark:bg-green-900/20";
    }
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div className={`absolute inset-0 ${getBlurColorClass()} rounded-full blur-xl scale-110`} />
      <svg className="h-full w-full -rotate-90 transform relative z-10" viewBox="0 0 60 60">
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
          className={`${getColorClass()} transition-all duration-1000 ease-out`}
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
      {remainingMinutes !== undefined && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <span className="text-xs font-extrabold text-gray-900 dark:text-white leading-tight">
            {formatMinutes(Math.max(0, remainingMinutes))}
          </span>
        </div>
      )}
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

interface HealthCardProps {
  period?: "today" | "week" | "month" | "year";
}

export const HealthCard = memo(function HealthCard({ period = "week" }: HealthCardProps) {
  const router = useRouter();
  const { totalMinutes, hasPermission, isNative, requestPermission } = useHealthConnect(period);
  const { goals, refreshGoals } = useGoals();
  const [showGoalCreation, setShowGoalCreation] = useState(false);
  
  // Find health goal
  const healthGoal = goals.find(g => g.category === "health");
  const minutesPerDay = healthGoal?.minutesPerDay;
  
  // Calculate goal minutes based on period
  // If user has set minutesPerDay, use that; otherwise use defaults
  const goalMinutes = minutesPerDay 
    ? (period === "today" ? minutesPerDay :
       period === "week" ? minutesPerDay * 7 :
       period === "month" ? minutesPerDay * 30 :
       minutesPerDay * 365)
    : (period === "today" ? 21 : // ~21 min/day (150/7)
       period === "week" ? 150 :
       period === "month" ? 600 : // ~150 * 4 weeks
       7800); // ~150 * 52 weeks
  
  const percentage = Math.min(100, Math.round((totalMinutes / goalMinutes) * 100));
  
  // Get period label for display
  const periodLabel = period === "today" ? "Today" :
                      period === "week" ? "This Week" :
                      period === "month" ? "This Month" :
                      "This Year";

  const handleCardClick = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If no health goal exists, open goal creation dialog
    if (!healthGoal) {
      setShowGoalCreation(true);
      return;
    }
    
    // If native and no permission, request permission first
    if (isNative && !hasPermission) {
      await requestPermission();
      return;
    }
    
    // If health goal exists, navigate to goal detail page
    router.push(`/goals/${healthGoal.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(e as any);
    }
  };

  const isClickable = true; // Always clickable to navigate to goal detail or create goal

  return (
    <>
      <Card 
        className={`border-none bg-white dark:bg-card shadow-xl shadow-green-900/5 dark:shadow-black/20 rounded-3xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden transition-all duration-300 hover:shadow-green-900/10 dark:hover:shadow-black/30 hover:scale-[1.02] ${isClickable ? 'cursor-pointer active:scale-95' : ''}`}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
      >
      <CardHeader 
        className="pb-2 pt-6 px-6"
      >
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-green-600/80 dark:text-green-400 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Health • Exercise {periodLabel}
        </CardTitle>
      </CardHeader>
      <CardContent 
        className="flex flex-col gap-4 px-6 pb-6"
      >
        <div className="flex items-center gap-6">
          <RadialProgress value={percentage} size={72} remainingMinutes={goalMinutes - totalMinutes} />
          <div className="space-y-3 flex-1">
            {isNative && !hasPermission ? (
              <div className="py-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Lock className="h-4 w-4" />
                  <span>Tap to connect Health Data</span>
                </div>
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
                  Total exercise time {period === "today" ? "today" : period === "week" ? "this week" : period === "month" ? "this month" : "this year"} from Health Connect
                </p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    <GoalCreationDialog
      open={showGoalCreation}
      onOpenChange={setShowGoalCreation}
      category="health"
      onGoalCreated={() => {
        refreshGoals();
        setShowGoalCreation(false);
      }}
    />
    </>
  );
});

