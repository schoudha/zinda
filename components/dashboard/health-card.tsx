"use client";

import { memo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHealthConnect } from "@/hooks/useHealthConnect";
import { useGoals } from "@/hooks/useGoals";
import { Lock, MessageCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { ExerciseListDialog } from "./exercise-list-dialog";
import { GoalCreationDialog } from "@/components/goals/goal-creation-dialog";

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

interface HealthCardProps {
  period?: "today" | "week" | "month" | "year";
}

export const HealthCard = memo(function HealthCard({ period = "week" }: HealthCardProps) {
  const router = useRouter();
  const { totalMinutes, hasPermission, isNative, requestPermission } = useHealthConnect(period);
  const { goals, refreshGoals } = useGoals();
  const [showExerciseList, setShowExerciseList] = useState(false);
  const [showGoalCreation, setShowGoalCreation] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  
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

  const handleCardClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If no health goal exists, open goal creation dialog
    if (!healthGoal) {
      setShowGoalCreation(true);
      return;
    }
    
    // If health goal exists, navigate to goal detail page
    router.push(`/goals/${healthGoal.id}`);
  };

  const handlePermissionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    requestPermission();
  };

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (healthGoal) {
      router.push(`/goals/${healthGoal.id}`);
    } else {
      setShowGoalCreation(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isNative) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (hasPermission) {
        setShowExerciseList(true);
      } else if (requestPermission) {
        requestPermission();
      }
    }
  };

  const isClickable = true; // Always clickable to navigate to goal detail or create goal

  // Fetch insight when we have data
  useEffect(() => {
    if (!hasPermission || !isNative) {
      setInsight(null);
      return;
    }

    const fetchInsight = async () => {
      setIsLoadingInsight(true);
      try {
        const response = await fetch('/api/health/insight', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            totalMinutes,
            goalMinutes,
            period,
            minutesPerDay: minutesPerDay || undefined,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setInsight(data.insight);
        }
      } catch (error) {
        console.error('Failed to fetch insight:', error);
      } finally {
        setIsLoadingInsight(false);
      }
    };

    // Debounce insight fetching
    const timeoutId = setTimeout(fetchInsight, 500);
    return () => clearTimeout(timeoutId);
  }, [totalMinutes, goalMinutes, period, minutesPerDay, hasPermission, isNative]);

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
        onClick={isClickable ? handleCardClick : undefined}
      >
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-green-600/80 dark:text-green-400 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Health • Exercise {periodLabel}
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
                  Total exercise time {period === "today" ? "today" : period === "week" ? "this week" : period === "month" ? "this month" : "this year"} from Health Connect
                </p>
                {insight && (
                  <div className="mt-2 p-3 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-green-800 dark:text-green-200 leading-relaxed">
                        {insight}
                      </p>
                    </div>
                  </div>
                )}
                {isLoadingInsight && (
                  <div className="mt-2 p-3 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-green-600/30 border-t-green-600 dark:border-green-400/30 dark:border-t-green-400 rounded-full animate-spin" />
                      <p className="text-xs text-green-800/60 dark:text-green-200/60">
                        Generating insight...
                      </p>
                    </div>
                  </div>
                )}
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
    <ExerciseListDialog 
      open={showExerciseList} 
      onOpenChange={setShowExerciseList}
      period={period}
    />
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

