"use client";

import { useState, useEffect, memo, lazy, Suspense, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Bell, MessageCircle, Plus, Minus, Sparkles, Calendar, CalendarRange, CalendarCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Goal } from "@/types";
import { api } from "@/lib/api";
import { useHealthConnect } from "@/hooks/useHealthConnect";
import { useNotes } from "@/hooks/useNotes";
import { GoalChatDialog } from "@/components/goals/goal-chat-dialog";

// Lazy load NotificationDialog - only needed when user clicks bell icon
const NotificationDialog = lazy(() => 
  import("@/components/goals/notification-dialog").then(mod => ({ default: mod.NotificationDialog }))
);

function RadialProgress({ 
  value, 
  size = 60, 
  displayText,
  redThreshold = 40,
  yellowThreshold = 70
}: { 
  value: number; 
  size?: number; 
  displayText?: string;
  redThreshold?: number;
  yellowThreshold?: number;
}) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  // Color coding: red < redThreshold%, yellow redThreshold-yellowThreshold%, green >= yellowThreshold%
  const getColorClass = () => {
    if (value < redThreshold) {
      return "text-red-500 dark:text-red-400";
    } else if (value < yellowThreshold) {
      return "text-yellow-500 dark:text-yellow-400";
    } else {
      return "text-green-500 dark:text-green-400";
    }
  };

  const getBlurColorClass = () => {
    if (value < redThreshold) {
      return "bg-red-50 dark:bg-red-900/20";
    } else if (value < yellowThreshold) {
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
      {displayText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <span className={`${size >= 100 ? 'text-lg' : size >= 70 ? 'text-sm' : 'text-xs'} font-extrabold text-gray-900 dark:text-white leading-tight text-center px-1`}>
            {displayText}
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

interface GoalCardProps {
  goal: Goal;
  onDelete?: (goalId: string) => void;
  showProgress?: boolean; // Whether to show today's progress
  onProgressChange?: (newValue: number) => Promise<void>; // Callback to handle progress update
  onProgressUpdate?: () => void; // Legacy callback when progress is updated (kept for compatibility)
  selectedPeriod?: "today" | "week" | "month" | "year"; // Current period view
  history?: Record<string, number>; // Historical progress: date -> progressValue
}

export const GoalCard = memo(function GoalCard({ goal, onDelete, showProgress = false, onProgressChange, onProgressUpdate, selectedPeriod = "today", history }: GoalCardProps) {
  const router = useRouter();
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<Goal>(goal);
  const [progressValue, setProgressValue] = useState<number>(goal.todayProgress ?? 0);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Completion tracking state (for goals with integer targets)
  const [todayCompletion, setTodayCompletion] = useState<number>(0);
  const [weeklyCompletedDays, setWeeklyCompletedDays] = useState<number>(0);
  const [isLoadingCompletion, setIsLoadingCompletion] = useState(false);
  const [smartTip, setSmartTip] = useState<string | null>(null);

  // Health Connect integration for health goals
  const isHealthGoal = goal.category === "health";
  const isLearnGoal = goal.category === "learn";
  const healthPeriod = selectedPeriod === "today" ? "today" : selectedPeriod === "week" ? "week" : selectedPeriod === "month" ? "month" : "year";
  const { totalMinutes, dailyStats, hasPermission, isNative, requestPermission } = useHealthConnect(isHealthGoal ? healthPeriod : "week");
  
  // Notes for learn goals
  const { notes } = useNotes();
  
  // Calculate completion count for learn goals (media notes with URLs)
  const learnCompletionCount = useMemo(() => {
    if (!isLearnGoal) return { completed: 0, total: 0 };
    const mediaNotes = notes.filter(note => note.url);
    const completed = mediaNotes.filter(note => note.checked).length;
    return { completed, total: mediaNotes.length };
  }, [isLearnGoal, notes]);
  
  // Use either health data or local history
  const stats = isHealthGoal ? dailyStats : (history || {});
  
  // Calculate goal stats
  const minutesPerDay = goal.minutesPerDay || 21; // Default 21 min/day
  const dailyTarget = isHealthGoal ? minutesPerDay : (goal.target || 100);
  const threshold = isHealthGoal ? (0.7 * dailyTarget) : (goal.target ? (0.7 * goal.target) : 70);

  let healthProgress = 0;
  let displayValue = "";
  let displayLabel = "";
  let goalLabel = "";

  // Helper to get normalized start date for period
  const getPeriodStart = (period: string): Date => {
    const now = new Date();
    if (period === "week") {
      // Start from most recent Sunday (getDay() returns 0 for Sunday, 1 for Monday, etc.)
      const dayOfWeek = now.getDay();
      const start = new Date(now);
      // Subtract dayOfWeek to get back to Sunday (if today is Sunday, subtract 0; if Monday, subtract 1, etc.)
      start.setDate(now.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      // Verify we're on Sunday (sanity check - this should always be true after the calculation above)
      if (start.getDay() !== 0) {
        // If somehow we're not on Sunday, adjust to the previous Sunday
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
      }
      return start;
    } else if (period === "month") {
      // Start from 1st of current month
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      return start;
    } else if (period === "year") {
      // Start from January 1st of current year
      const start = new Date(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    return now;
  };

  const getDateStr = (date: Date) => {
    return date.toLocaleDateString('en-CA');
  };

  const dateRange = (start: Date, end: Date): string[] => {
    const dates: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(getDateStr(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  // Calculate normalized progress for period
  let normalizedProgress = 0;
  let progressDisplayText = ""; // For health goals: "15min", "2 days", "3 weeks", "2 months"
  
  if (healthPeriod === "today") {
     const currentVal = isHealthGoal ? totalMinutes : progressValue;
     healthProgress = Math.min(100, Math.round((currentVal / dailyTarget) * 100));
     normalizedProgress = healthProgress;
     if (isHealthGoal) {
       progressDisplayText = formatMinutes(Math.round(totalMinutes));
     }
     displayValue = isHealthGoal ? formatMinutes(totalMinutes) : (goal.target ? `${currentVal}/${goal.target}` : `${currentVal}%`);
     displayLabel = "Today's progress";
     goalLabel = isHealthGoal ? `Goal: ${formatMinutes(dailyTarget)}` : (goal.target ? `Goal: ${goal.target}` : "");
  } else if (healthPeriod === "week") {
     const periodStart = getPeriodStart("week");
     const now = new Date();
     const daysInPeriod = dateRange(periodStart, now);
     
     let daysMet = 0;
     daysInPeriod.forEach(date => {
       if ((stats[date] || 0) >= threshold) daysMet++;
     });
     
     const totalDays = daysInPeriod.length;
     // For health goals, use absolute progress (out of 7 days)
     if (isHealthGoal) {
       normalizedProgress = Math.round((daysMet / 7) * 100);
       healthProgress = normalizedProgress;
       progressDisplayText = `${daysMet} ${daysMet === 1 ? 'day' : 'days'}`;
     } else {
       normalizedProgress = totalDays > 0 ? Math.round((daysMet / totalDays) * 100) : 0;
       healthProgress = normalizedProgress;
     }
     displayValue = `${daysMet}/${totalDays}`;
     displayLabel = "Days >70% of goal";
     goalLabel = `Target: 70% daily (>${isHealthGoal ? Math.round(threshold) + 'm' : Math.round(threshold)})`;
  } else if (healthPeriod === "month") {
     const periodStart = getPeriodStart("month");
     const now = new Date();
     const daysInPeriod = dateRange(periodStart, now);
     
     // Group days into weeks (7-day blocks)
     const weeks: string[][] = [];
     for (let i = 0; i < daysInPeriod.length; i += 7) {
       weeks.push(daysInPeriod.slice(i, i + 7));
     }
     
     let weeksMet = 0;
     weeks.forEach(weekDays => {
       let daysMetInWeek = 0;
       weekDays.forEach(date => {
         if ((stats[date] || 0) >= threshold) daysMetInWeek++;
       });
       // Need at least 5 days in a week to count (or all days if week is incomplete)
       const requiredDays = weekDays.length < 7 ? Math.ceil(weekDays.length * 5 / 7) : 5;
       if (daysMetInWeek >= requiredDays) weeksMet++;
     });
     
     const totalWeeks = weeks.length;
     normalizedProgress = totalWeeks > 0 ? Math.round((weeksMet / totalWeeks) * 100) : 0;
     healthProgress = normalizedProgress;
     if (isHealthGoal) {
       progressDisplayText = `${weeksMet} ${weeksMet === 1 ? 'week' : 'weeks'}`;
     }
     displayValue = `${weeksMet}/${totalWeeks}`;
     displayLabel = "Weeks 5/7 days met";
     goalLabel = `Target: 5/7 days (>${isHealthGoal ? Math.round(threshold) + 'm' : Math.round(threshold)})`;
  } else if (healthPeriod === "year") {
     const periodStart = getPeriodStart("year");
     const now = new Date();
     const daysInPeriod = dateRange(periodStart, now);
     
     // Group days into months (approximately 30-day blocks)
     const months: string[][] = [];
     const currentMonthStart = new Date(periodStart);
     while (currentMonthStart <= now) {
       const monthEnd = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 0);
       const monthEndDate = monthEnd > now ? now : monthEnd;
       const monthDays = dateRange(new Date(currentMonthStart), monthEndDate);
       if (monthDays.length > 0) months.push(monthDays);
       
       currentMonthStart.setMonth(currentMonthStart.getMonth() + 1);
       currentMonthStart.setDate(1);
     }
     
     let monthsMet = 0;
     months.forEach(monthDays => {
       let daysMetInMonth = 0;
       monthDays.forEach(date => {
         if ((stats[date] || 0) >= threshold) daysMetInMonth++;
       });
       // Need at least 20 days in a month (or proportional if month is incomplete)
       const requiredDays = monthDays.length < 30 ? Math.ceil(monthDays.length * 20 / 30) : 20;
       if (daysMetInMonth >= requiredDays) monthsMet++;
     });
     
     const totalMonths = months.length;
     normalizedProgress = totalMonths > 0 ? Math.round((monthsMet / totalMonths) * 100) : 0;
     healthProgress = normalizedProgress;
     if (isHealthGoal) {
       progressDisplayText = `${monthsMet} ${monthsMet === 1 ? 'month' : 'months'}`;
     }
     displayValue = `${monthsMet}/${totalMonths}`;
     displayLabel = "Months 20/30 days met";
     goalLabel = `Target: 20/30 days (>${isHealthGoal ? Math.round(threshold) + 'm' : Math.round(threshold)})`;
  }


  // Sync goal prop with local state when it changes
  useEffect(() => {
    setCurrentGoal(goal);
    setProgressValue(goal.todayProgress ?? 0);
  }, [goal]);

  // Fetch smart tip on load (skip for health goals)
  useEffect(() => {
    if (isHealthGoal) return; // Don't fetch tips for health goals
    
    // For target-based goals, we'll wait for completion stats in the other effect
    // For percentage-based goals (or if no target), we fetch immediately
    if (!goal.target) {
      api.goals.generateSmartTip(goal.text, goal.todayProgress ?? 0)
        .then(setSmartTip)
        .catch(err => console.error("Failed to generate tip:", err));
    }
  }, [goal.text, goal.target, goal.todayProgress, isHealthGoal]);

  // Fetch completion stats if goal has a target (skip for health goals)
  useEffect(() => {
    if (isHealthGoal || !goal.target) return;
    
    setIsLoadingCompletion(true);
    api.goals.completions.get(goal.id)
      .then((stats) => {
        setTodayCompletion(stats.todayCompletion);
        setWeeklyCompletedDays(stats.weeklyCompletedDays);
        
        // Generate tip after getting completion stats
        api.goals.generateSmartTip(goal.text, 0, goal.target, stats.todayCompletion)
          .then(setSmartTip)
          .catch(err => console.error("Failed to generate tip:", err));
      })
      .catch((error) => {
        console.error('Error fetching completion stats:', error);
      })
      .finally(() => {
        setIsLoadingCompletion(false);
      });
  }, [goal.id, goal.target, goal.text, isHealthGoal]);

  const periodIcons = {
    week: Calendar,
    month: CalendarRange,
    year: CalendarCheck,
  };

  const periodColors = {
    week: "from-blue-50 to-indigo-50 text-blue-600/80 dark:from-blue-950/20 dark:to-indigo-950/20 dark:text-blue-400",
    month: "from-purple-50 to-pink-50 text-purple-600/80 dark:from-purple-950/20 dark:to-pink-950/20 dark:text-purple-400",
    year: "from-orange-50 to-amber-50 text-orange-600/80 dark:from-orange-950/20 dark:to-amber-950/20 dark:text-orange-400",
  };

  // Get color hue based on progress (only for weekly, monthly, yearly views)
  const getProgressColor = (period: string, progress: number): string => {
    if (period === "today") return periodColors[goal.period];
    
    if (progress >= 70) {
      // Green: On track (>= 70%)
      return "from-green-50 to-emerald-50 text-green-600/80 dark:from-green-950/20 dark:to-emerald-950/20 dark:text-green-400";
    } else if (progress >= 50) {
      // Yellow: More than 50% but not quite there (50-70%)
      return "from-yellow-50 to-amber-50 text-yellow-600/80 dark:from-yellow-950/20 dark:to-amber-950/20 dark:text-yellow-400";
    } else {
      // Red: Far behind (< 50%)
      return "from-red-50 to-rose-50 text-red-600/80 dark:from-red-950/20 dark:to-rose-950/20 dark:text-red-400";
    }
  };

  const cardColorClass = selectedPeriod !== "today" 
    ? getProgressColor(healthPeriod, normalizedProgress)
    : periodColors[goal.period];

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(goal.id);
    }
  }, [onDelete, goal.id]);

  const handleBellClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setNotificationDialogOpen(true);
  }, []);

  const handleSaveNotification = useCallback(async (time: Goal["notificationTime"] | null, days: Goal["notificationDays"] | null) => {
    const updatedGoal = await api.goals.updateNotifications(
      currentGoal.id,
      time ?? undefined,
      days ?? undefined
    );
    setCurrentGoal(updatedGoal);
  }, [currentGoal.id]);

  const handleDiscussClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/goals/${goal.id}`);
  }, [router, goal.id]);

  const handleChatClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setChatDialogOpen(true);
  }, []);

  const handleCardClick = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    // Handle health goals, learn goals, or if it's not today view (where progress is read-only)
    if (isHealthGoal || isLearnGoal || selectedPeriod !== "today") {
      e.preventDefault();
      e.stopPropagation();
      
      if (isHealthGoal && isNative && !hasPermission) {
        await requestPermission();
        return;
      }
      
      // Navigate to goal detail page
      router.push(`/goals/${goal.id}`);
    }
  }, [isHealthGoal, isLearnGoal, selectedPeriod, isNative, hasPermission, requestPermission, router, goal.id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isHealthGoal || isLearnGoal || selectedPeriod !== "today") {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCardClick(e as any);
      }
    }
  }, [isHealthGoal, isLearnGoal, selectedPeriod, handleCardClick]);

  const handleProgressUpdate = useCallback(async (newValue: number) => {
    if (isUpdating || newValue < 0 || newValue > 100) return;
    
    setIsUpdating(true);
    try {
      if (onProgressChange) {
        await onProgressChange(newValue);
      } else {
        await api.goals.progress.updateToday(goal.id, newValue);
      }
      setProgressValue(newValue);
      setCurrentGoal({ ...currentGoal, todayProgress: newValue });
      onProgressUpdate?.();
    } catch (error) {
      console.error('Error updating progress:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [goal.id, isUpdating, currentGoal, onProgressChange, onProgressUpdate]);

  const handleIncrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = Math.min(100, progressValue + 10);
    handleProgressUpdate(newValue);
  }, [progressValue, handleProgressUpdate]);

  const handleDecrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = Math.max(0, progressValue - 10);
    handleProgressUpdate(newValue);
  }, [progressValue, handleProgressUpdate]);

  // Completion handlers (for integer targets)
  const handleCompletionIncrement = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!goal.target || isUpdating || todayCompletion >= Math.min(3, goal.target)) return;
    
    setIsUpdating(true);
    try {
      const result = await api.goals.completions.increment(goal.id, 1);
      setTodayCompletion(result.completion.completionCount);
      onProgressUpdate?.();
    } catch (error) {
      console.error('Error incrementing completion:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [goal.id, goal.target, todayCompletion, isUpdating, onProgressUpdate]);

  const handleCompletionDecrement = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!goal.target || isUpdating || todayCompletion <= 0) return;
    
    setIsUpdating(true);
    try {
      const result = await api.goals.completions.set(goal.id, todayCompletion - 1);
      setTodayCompletion(result.completion.completionCount);
      onProgressUpdate?.();
    } catch (error) {
      console.error('Error decrementing completion:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [goal.id, goal.target, todayCompletion, isUpdating, onProgressUpdate]);

  return (
    <Card 
      className={`border-none bg-gradient-to-br ${cardColorClass} shadow-lg shadow-blue-900/5 dark:shadow-black/20 rounded-2xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden transition-all duration-300 hover:shadow-blue-900/10 dark:hover:shadow-black/30 relative ${(isHealthGoal || isLearnGoal || selectedPeriod !== "today") ? 'cursor-pointer active:scale-95' : ''}`}
      onClick={(isHealthGoal || isLearnGoal || selectedPeriod !== "today") ? handleCardClick : undefined}
      onKeyDown={(isHealthGoal || isLearnGoal || selectedPeriod !== "today") ? handleKeyDown : undefined}
      role={(isHealthGoal || isLearnGoal || selectedPeriod !== "today") ? "button" : undefined}
      tabIndex={(isHealthGoal || isLearnGoal || selectedPeriod !== "today") ? 0 : undefined}
    >
      <div className="absolute top-1.5 right-1.5 flex gap-0.5 z-10">
        {!isHealthGoal && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full opacity-60 hover:opacity-100 hover:bg-white/50 dark:hover:bg-white/10 dark:text-white"
            onClick={handleBellClick}
          >
            <Bell className={`h-3 w-3 ${currentGoal.notificationTime && currentGoal.notificationDays ? 'fill-current' : ''}`} />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full opacity-60 hover:opacity-100 hover:bg-white/50 dark:hover:bg-white/10 dark:text-white"
            onClick={handleDelete}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      {notificationDialogOpen && (
        <Suspense fallback={null}>
          <NotificationDialog
            open={notificationDialogOpen}
            onOpenChange={setNotificationDialogOpen}
            goalId={currentGoal.id}
            currentTime={currentGoal.notificationTime}
            currentDays={currentGoal.notificationDays}
            onSave={handleSaveNotification}
          />
        </Suspense>
      )}
      {!isHealthGoal && (
        <CardHeader className="pb-1.5 pt-4 px-4">
          <CardTitle className={`${periodColors[goal.period].split(' ')[2]} flex items-center gap-1.5`}>
            <div className={`h-1 w-1 rounded-full ${goal.period === 'week' ? 'bg-blue-500' : goal.period === 'month' ? 'bg-purple-500' : 'bg-orange-500'} animate-pulse`} />
            {(() => {
              const IconComponent = periodIcons[goal.period];
              return <IconComponent className="h-3.5 w-3.5" />;
            })()}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={`${(isHealthGoal || isLearnGoal || selectedPeriod !== "today") ? 'px-4 py-4' : 'space-y-3 px-4 pb-4'}`}>
        {(!isHealthGoal && !isLearnGoal && selectedPeriod === "today") && (
          <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
            {goal.text}
          </h3>
        )}

        {/* Unified progress view for all goals in non-today views, and health/learn goals always */}
        {(isHealthGoal || isLearnGoal || selectedPeriod !== "today") ? (
          <div className="flex flex-col gap-6">
            {isHealthGoal ? (
              <>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight tracking-tight text-center">
                  {goal.text}
                </h3>
                {isNative && !hasPermission ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-400 py-4">
                    <Lock className="h-4 w-4" />
                    <span>Tap to connect Health Data</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <RadialProgress 
                      value={healthProgress} 
                      size={120} 
                      displayText={progressDisplayText}
                      redThreshold={healthPeriod === "week" ? (2 / 7) * 100 : 40}
                      yellowThreshold={healthPeriod === "week" ? (5 / 7) * 100 : 70}
                    />
                  </div>
                )}
              </>
            ) : isLearnGoal ? (
              <>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight tracking-tight text-center">
                  {goal.text}
                </h3>
                <div className="flex items-center justify-center">
                  <RadialProgress 
                    value={learnCompletionCount.total > 0 ? Math.round((learnCompletionCount.completed / learnCompletionCount.total) * 100) : 0} 
                    size={120} 
                    displayText={learnCompletionCount.total > 0 ? `${learnCompletionCount.completed}/${learnCompletionCount.total}` : "0/0"}
                    redThreshold={40}
                    yellowThreshold={70}
                  />
                </div>
                <p className="text-center text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Items completed
                </p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
                  {goal.text}
                </h3>
                <div className="flex items-center gap-4">
                  <RadialProgress value={healthProgress} size={64} />
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        {displayValue}
                      </span>
                      {goalLabel && (
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-white/5 px-2 py-0.5 rounded-full backdrop-blur-sm whitespace-nowrap">
                          {goalLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400">
                      {displayLabel}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : isLearnGoal && selectedPeriod === "today" ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight tracking-tight text-center mb-2">
              {goal.text}
            </h3>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  {learnCompletionCount.completed} / {learnCompletionCount.total}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Items completed
                </p>
              </div>
            </div>
          </div>
        ) : goal.target ? (
          <div className="flex flex-col gap-2">
            {/* Interactive Progress Row */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {Array.from({ length: Math.min(goal.target, 7) }).map((_, index) => {
                const isActive = index < todayCompletion;
                return (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isUpdating) return;
                      // If clicking the current level, decrement (toggle off)
                      // If clicking a higher level, set to that level
                      const newCount = index + 1 === todayCompletion ? index : index + 1;
                      // Handle update logic here - we need a specific setter for arbitrary values
                      // For now, we'll use the increment/set API we have
                      setIsUpdating(true);
                      api.goals.completions.set(goal.id, newCount)
                        .then((res) => {
                          setTodayCompletion(res.completion.completionCount);
                          onProgressUpdate?.();
                        })
                        .finally(() => setIsUpdating(false));
                    }}
                    className={`
                      relative group flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300
                      ${isActive 
                        ? 'bg-white shadow-md shadow-blue-500/20 scale-105 ring-1 ring-blue-500/20 dark:bg-white/10 dark:ring-white/20' 
                        : 'bg-white/40 hover:bg-white/60 dark:bg-white/5 dark:hover:bg-white/10'
                      }
                    `}
                  >
                    <span className={`text-lg transition-all duration-300 ${isActive ? 'scale-110 rotate-0 opacity-100' : 'scale-90 -rotate-12 opacity-40 grayscale'}`}>
                      👍
                    </span>
                  </button>
                );
              })}
            </div>
            
            {/* Count Label */}
            <div className="flex items-center justify-between text-[10px] font-medium text-gray-600 dark:text-gray-400">
              <span>Today: {todayCompletion} / {goal.target}</span>
            </div>
          </div>
        ) : showProgress && !isHealthGoal && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <span>Progress</span>
              <span>{Math.round(progressValue)}%</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                style={{ width: `${progressValue}%` }}
              />
            </div>
            <div className="flex justify-between gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDecrement}
                disabled={isUpdating || progressValue <= 0}
                className="h-7 rounded-full bg-white/40 hover:bg-white/60 dark:bg-white/5 dark:hover:bg-white/10 w-10"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleIncrement}
                disabled={isUpdating || progressValue >= 100}
                className="h-7 rounded-full bg-white/40 hover:bg-white/60 dark:bg-white/5 dark:hover:bg-white/10 w-10"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Don't show tips/insights for health/learn goals or non-today views */}
        {(!isHealthGoal && !isLearnGoal && selectedPeriod === "today") && (smartTip || goal.tips.length > 0) && (
          <div className="pt-1.5 border-t border-black/5 dark:border-white/5">
            {smartTip ? (
              <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed italic animate-in fade-in duration-500">
                {smartTip}
              </p>
            ) : (
              goal.tips.slice(0, 1).map((tip, index) => (
                <p 
                  key={index}
                  className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed italic"
                  dangerouslySetInnerHTML={{ __html: tip }}
                />
              ))
            )}
          </div>
        )}

        {/* Chat CTA button */}
        <Button
          onClick={handleChatClick}
          size="sm"
          className="w-full h-8 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 dark:from-purple-600 dark:to-indigo-700 dark:hover:from-purple-700 dark:hover:to-indigo-800 text-white text-xs font-medium shadow-sm"
        >
          <Sparkles className="h-3 w-3 mr-1.5" />
          Chat with Gemini
        </Button>
      </CardContent>
      <GoalChatDialog
        open={chatDialogOpen}
        onOpenChange={setChatDialogOpen}
        goal={currentGoal}
        additionalContext={{
          progressData: isHealthGoal ? undefined : {
            todayProgress: progressValue,
            completionStats: goal.target ? { todayCompletion, weeklyCompletedDays } : undefined,
          },
          healthData: isHealthGoal ? {
            totalMinutes,
            goalMinutes: healthPeriod === "today" ? dailyTarget :
                         healthPeriod === "week" ? dailyTarget * 7 :
                         healthPeriod === "month" ? dailyTarget * 30 :
                         dailyTarget * 365,
            period: healthPeriod,
            percentage: healthProgress,
            periodLabel: healthPeriod === "today" ? "Today" :
                        healthPeriod === "week" ? "This Week" :
                        healthPeriod === "month" ? "This Month" : "This Year",
          } : undefined,
        }}
      />
    </Card>
  );
});
