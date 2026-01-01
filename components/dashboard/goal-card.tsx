"use client";

import { useState, useEffect, memo, lazy, Suspense, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Bell, MessageCircle, Plus, Minus, Calendar, CalendarRange, CalendarCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Goal } from "@/types";
import { api } from "@/lib/api";
import { useHealthConnect } from "@/hooks/useHealthConnect";
import { useGoalProgress } from "@/hooks/useGoals";
import { useUsageStats } from "@/hooks/useUsageStats";

// Lazy load NotificationDialog - only needed when user clicks bell icon
const NotificationDialog = lazy(() => 
  import("@/components/goals/notification-dialog").then(mod => ({ default: mod.NotificationDialog }))
);

function RadialProgress({ 
  value, 
  size = 60, 
  displayText,
  redThreshold = 40,
  yellowThreshold = 70,
  inverted = false
}: { 
  value: number; 
  size?: number; 
  displayText?: string;
  redThreshold?: number;
  yellowThreshold?: number;
  inverted?: boolean;
}) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  // For inverted, we still fill from 0, but the color meaning changes
  // The 'value' should still be 0-100 (or more) for display
  const offset = circumference - (Math.min(100, value) / 100) * circumference;

  // Color coding logic
  const getColorClass = () => {
    if (inverted) {
      if (value < 75) {
        return "text-green-500 dark:text-green-400";
      } else if (value < 100) {
        return "text-yellow-500 dark:text-yellow-400";
      } else {
        return "text-red-500 dark:text-red-400";
      }
    } else {
      if (value < redThreshold) {
        return "text-red-500 dark:text-red-400";
      } else if (value < yellowThreshold) {
        return "text-yellow-500 dark:text-yellow-400";
      } else {
        return "text-green-500 dark:text-green-400";
      }
    }
  };

  const getBlurColorClass = () => {
    if (inverted) {
       if (value < 75) {
        return "bg-green-50 dark:bg-green-900/20";
      } else if (value < 100) {
        return "bg-yellow-50 dark:bg-yellow-900/20";
      } else {
        return "bg-red-50 dark:bg-red-900/20";
      }
    } else {
      if (value < redThreshold) {
        return "bg-red-50 dark:bg-red-900/20";
      } else if (value < yellowThreshold) {
        return "bg-yellow-50 dark:bg-yellow-900/20";
      } else {
        return "bg-green-50 dark:bg-green-900/20";
      }
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
  const isScreentimeGoal = goal.category === "screentime" || goal.category === "family";
  const isFaithGoal = goal.category === "faith";
  const healthPeriod = selectedPeriod === "today" ? "today" : selectedPeriod === "week" ? "week" : selectedPeriod === "month" ? "month" : "year";
  const { totalMinutes, dailyStats, hasPermission: hasHealthPermission, isNative: isHealthNative, requestPermission: requestHealthPermission } = useHealthConnect(isHealthGoal ? healthPeriod : "week");
  
  // Usage Stats for screentime goals
  const { totalTime: screentimeMs, hasPermission: hasUsagePermission, isNative: isUsageNative, requestPermission: requestUsagePermission } = useUsageStats(isScreentimeGoal ? healthPeriod : "today");
  const screentimeMinutes = Math.round(screentimeMs / 60000);

  // Get progress data for learn goals
  const { progress, history: progressHistory } = useGoalProgress();
  
  // Helper to get normalized start date for period
  const getPeriodStart = useCallback((period: string): Date => {
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
  }, []);
  
  // Calculate completion count for learn goals (using manual progress tracking)
  const learnProgress = useMemo(() => {
    if (!isLearnGoal) return { periodPoints: 0, target: 0, percentage: 0 };
    
    // Get targets for each period
    const targets = {
      today: 0, // No target for today
      week: 10,
      month: 40,
      year: 100,
    };
    
    const target = targets[healthPeriod as keyof typeof targets] || 0;
    
    // Calculate total points in the period from goal_progress history
    let periodPoints = 0;
    if (selectedPeriod === "today") {
      // For today, use today's progress
      periodPoints = progress[goal.id] || 0;
    } else {
      // For week/month/year, sum all progress values in the period
      const periodStart = getPeriodStart(healthPeriod);
      const now = new Date();
      const goalHistory = progressHistory[goal.id] || {};
      
      // Sum progress for all days in the period
      Object.keys(goalHistory).forEach(dateStr => {
        const date = new Date(dateStr + 'T00:00:00');
        if (date >= periodStart && date <= now) {
          periodPoints += (goalHistory as Record<string, number>)[dateStr] || 0;
        }
      });
    }
    
    const percentage = target > 0 ? Math.min(100, Math.round((periodPoints / target) * 100)) : 0;
    
    return { periodPoints, target, percentage };
  }, [isLearnGoal, goal.id, selectedPeriod, healthPeriod, progress, progressHistory, getPeriodStart]);

  // Helper function for date ranges (used by faith progress calculation)
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

  // Calculate completion stats for faith goals (using goal_progress history)
  const faithProgress = useMemo(() => {
    if (!isFaithGoal || !goal.target) return { completedDays: 0, totalDays: 7, completedWeeks: 0, totalWeeks: 0, completedMonths: 0, totalMonths: 0, percentage: 0 };
    
    if (selectedPeriod === "today") {
      // For today, use today's completion from state
      return { completedDays: todayCompletion, totalDays: 7, completedWeeks: 0, totalWeeks: 0, completedMonths: 0, totalMonths: 0, percentage: Math.round((todayCompletion / goal.target) * 100) };
    }
    
    const periodStart = getPeriodStart(healthPeriod);
    const now = new Date();
    const goalHistory = progressHistory[goal.id] || {};
    
    const target = goal.target; // Already checked above, but TypeScript needs this
    if (healthPeriod === "week") {
      // For week view: count days where progress_value >= target (out of 7)
      let completedDays = 0;
      const current = new Date(periodStart);
      while (current <= now) {
        const dateStr = current.toLocaleDateString('en-CA');
        const progressValue = goalHistory[dateStr] || 0;
        if (progressValue >= target) {
          completedDays++;
        }
        current.setDate(current.getDate() + 1);
      }
      
      // Always show out of 7 days for weekly view
      const percentage = Math.round((completedDays / 7) * 100);
      return { completedDays, totalDays: 7, completedWeeks: 0, totalWeeks: 0, completedMonths: 0, totalMonths: 0, percentage };
    } else if (healthPeriod === "month") {
      // For month view: count weeks where at least 5 days met the target (like health goals)
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
          const progressValue = goalHistory[date] || 0;
          if (progressValue >= target) {
            daysMetInWeek++;
          }
        });
        // Need at least 5 days in a week to count (or all days if week is incomplete)
        const requiredDays = weekDays.length < 7 ? Math.ceil(weekDays.length * 5 / 7) : 5;
        if (daysMetInWeek >= requiredDays) weeksMet++;
      });
      
      const totalWeeks = weeks.length;
      const percentage = totalWeeks > 0 ? Math.round((weeksMet / totalWeeks) * 100) : 0;
      return { completedDays: 0, totalDays: 7, completedWeeks: weeksMet, totalWeeks, completedMonths: 0, totalMonths: 0, percentage };
    } else if (healthPeriod === "year") {
      // For year view: count months where at least 20 days met the target
      const daysInPeriod = dateRange(periodStart, now);
      
      // Group days into months
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
          const progressValue = goalHistory[date] || 0;
          if (progressValue >= target) {
            daysMetInMonth++;
          }
        });
        // Need at least 20 days in a month (or proportional if month is incomplete)
        const requiredDays = monthDays.length < 30 ? Math.ceil(monthDays.length * 20 / 30) : 20;
        if (daysMetInMonth >= requiredDays) monthsMet++;
      });
      
      const totalMonths = months.length;
      const percentage = totalMonths > 0 ? Math.round((monthsMet / totalMonths) * 100) : 0;
      return { completedDays: 0, totalDays: 7, completedWeeks: 0, totalWeeks: 0, completedMonths: monthsMet, totalMonths, percentage };
    }
    
    return { completedDays: 0, totalDays: 7, completedWeeks: 0, totalWeeks: 0, completedMonths: 0, totalMonths: 0, percentage: 0 };
  }, [isFaithGoal, goal.target, goal.id, selectedPeriod, healthPeriod, progressHistory, getPeriodStart, todayCompletion]);
  
  // Use either health data or local history
  const stats = isHealthGoal ? dailyStats : (history || {});
  
  // Calculate goal stats
  const minutesPerDay = goal.minutesPerDay || (isScreentimeGoal ? 150 : 21); // Default 150 min (2.5h) for screentime, 21 min/day for health
  const dailyTarget = (isHealthGoal || isScreentimeGoal) ? minutesPerDay : (goal.target || 100);
  const threshold = (isHealthGoal || isScreentimeGoal) ? (0.7 * dailyTarget) : (goal.target ? (0.7 * goal.target) : 70);

  let healthProgress = 0;
  let displayValue = "";
  let displayLabel = "";
  let goalLabel = "";

  // Calculate normalized progress for period
  let normalizedProgress = 0;
  let progressDisplayText = ""; // For health goals: "15min", "2 days", "3 weeks", "2 months"
  
  if (healthPeriod === "today") {
     const currentVal = isHealthGoal ? totalMinutes : (isScreentimeGoal ? screentimeMinutes : progressValue);
     healthProgress = Math.min(100, Math.round((currentVal / dailyTarget) * 100));
     
     if (isScreentimeGoal) {
       // For screentime, the progress calculation can go over 100%
       healthProgress = Math.round((currentVal / dailyTarget) * 100);
     }

     normalizedProgress = healthProgress;
     
     if (isHealthGoal) {
       progressDisplayText = formatMinutes(Math.round(totalMinutes));
     } else if (isScreentimeGoal) {
       progressDisplayText = formatMinutes(Math.round(screentimeMinutes));
     }

     displayValue = (isHealthGoal || isScreentimeGoal) ? formatMinutes(currentVal) : (goal.target ? `${currentVal}/${goal.target}` : `${currentVal}%`);
     displayLabel = "Today's progress";
     goalLabel = (isHealthGoal || isScreentimeGoal) ? `Goal: ${formatMinutes(dailyTarget)}` : (goal.target ? `Goal: ${goal.target}` : "");
  } else if (healthPeriod === "week") {
     const periodStart = getPeriodStart("week");
     const now = new Date();
     const daysInPeriod = dateRange(periodStart, now);
     
     let daysMet = 0;
     daysInPeriod.forEach(date => {
       // Note: Screentime goals don't have daily history yet - useUsageStats only returns aggregate for period
       // For screentime, we fall back to manual history if provided, otherwise show 0
       if (isHealthGoal) {
         if ((dailyStats[date] || 0) >= threshold) daysMet++;
       } else {
         // Fallback to manual history or just show 0
         if ((stats[date] || 0) >= threshold) daysMet++;
       }
     });
     
     const totalDays = daysInPeriod.length;
     // For health goals, use absolute progress (out of 7 days)
     if (isHealthGoal) {
       normalizedProgress = Math.round((daysMet / 7) * 100);
       healthProgress = normalizedProgress;
       progressDisplayText = `${daysMet} ${daysMet === 1 ? 'day' : 'days'}`;
     } else if (isScreentimeGoal) {
        // For screentime, since we don't have daily history in this component yet, we'll show a placeholder or basic calculation
        // But wait, the user said "Weekly view of the screentime goal should similar to how the health goal is calculated"
        // Without daily stats, I can't do "days met".
        // I'll stick to rendering what I can.
        // If I can't get history, I'll show 0.
        normalizedProgress = 0; 
        healthProgress = 0;
        progressDisplayText = "-";
     } else {
       normalizedProgress = totalDays > 0 ? Math.round((daysMet / totalDays) * 100) : 0;
       healthProgress = normalizedProgress;
     }
     displayValue = `${daysMet}/${totalDays}`;
     displayLabel = isScreentimeGoal ? "Days < Goal" : "Days >70% of goal";
     goalLabel = `Target: ${isScreentimeGoal ? 'Daily Limit' : '70% daily'} (>${(isHealthGoal || isScreentimeGoal) ? Math.round(threshold) + 'm' : Math.round(threshold)})`;
  } else if (healthPeriod === "month") {
     // ... (Existing month logic uses stats[date])
     // Same issue for screentime history.
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
     goalLabel = `Target: 5/7 days (>${(isHealthGoal || isScreentimeGoal) ? Math.round(threshold) + 'm' : Math.round(threshold)})`;
  } else if (healthPeriod === "year") {
     // ... (Existing year logic)
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
     goalLabel = `Target: 20/30 days (>${(isHealthGoal || isScreentimeGoal) ? Math.round(threshold) + 'm' : Math.round(threshold)})`;
  }


  // Sync goal prop with local state when it changes
  useEffect(() => {
    setCurrentGoal(goal);
    setProgressValue(goal.todayProgress ?? 0);
  }, [goal]);

  // Fetch smart tip on load (skip for health/screentime goals)
  useEffect(() => {
    if (isHealthGoal || isScreentimeGoal) return; // Don't fetch tips for health/screentime goals automatically here
    
    // For target-based goals, we'll wait for completion stats in the other effect
    // For percentage-based goals (or if no target), we fetch immediately
    if (!goal.target) {
      api.goals.generateSmartTip(goal.text, goal.todayProgress ?? 0)
        .then(setSmartTip)
        .catch(err => console.error("Failed to generate tip:", err));
    }
  }, [goal.text, goal.target, goal.todayProgress, isHealthGoal, isScreentimeGoal, isFaithGoal]);

  // Fetch completion stats if goal has a target (skip for health/screentime goals, only needed for today view of faith goals)
  useEffect(() => {
    if (isHealthGoal || isScreentimeGoal || !goal.target || selectedPeriod !== "today") return;
    
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
  }, [goal.id, goal.target, goal.text, isHealthGoal, isScreentimeGoal]);

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
    
    // Screentime logic for history views might be inverted too?
    // "Red when the user has cross 100% of their target goal for the day."
    // For aggregated history (days met), "more days met" is usually green (good).
    // So if I met my screentime goal (kept it low) for 7/7 days, that's 100% progress -> Green.
    // So standard logic applies for history views: Higher % of "days met" is better.
    
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

  const handleCardClick = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    // Handle health goals, learn goals, screentime goals, faith goals or if it's not today view
    if (isHealthGoal || isLearnGoal || isScreentimeGoal || isFaithGoal || selectedPeriod !== "today") {
      e.preventDefault();
      e.stopPropagation();
      
      if (isHealthGoal && isHealthNative && !hasHealthPermission) {
        await requestHealthPermission();
        return;
      }

      if (isScreentimeGoal && isUsageNative && !hasUsagePermission) {
        await requestUsagePermission();
        return;
      }
      
      // Navigate to goal detail page
      router.push(`/goals/${goal.id}`);
    }
  }, [isHealthGoal, isLearnGoal, isScreentimeGoal, isFaithGoal, selectedPeriod, isHealthNative, hasHealthPermission, requestHealthPermission, isUsageNative, hasUsagePermission, requestUsagePermission, router, goal.id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isHealthGoal || isLearnGoal || isScreentimeGoal || isFaithGoal || selectedPeriod !== "today") {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCardClick(e as any);
      }
    }
  }, [isHealthGoal, isLearnGoal, isScreentimeGoal, isFaithGoal, selectedPeriod, handleCardClick]);

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
    <>
    <Card 
      className={`border-none bg-gradient-to-br ${cardColorClass} shadow-lg shadow-blue-900/5 dark:shadow-black/20 rounded-2xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden transition-all duration-300 hover:shadow-blue-900/10 dark:hover:shadow-black/30 relative min-h-[160px] ${(isHealthGoal || isLearnGoal || isScreentimeGoal || selectedPeriod !== "today") ? 'cursor-pointer active:scale-95' : ''}`}
      onClick={(isHealthGoal || isLearnGoal || isScreentimeGoal || isFaithGoal || selectedPeriod !== "today") ? handleCardClick : undefined}
      onKeyDown={(isHealthGoal || isLearnGoal || isScreentimeGoal || isFaithGoal || selectedPeriod !== "today") ? handleKeyDown : undefined}
      role={(isHealthGoal || isLearnGoal || isScreentimeGoal || isFaithGoal || selectedPeriod !== "today") ? "button" : undefined}
      tabIndex={(isHealthGoal || isLearnGoal || isScreentimeGoal || isFaithGoal || selectedPeriod !== "today") ? 0 : undefined}
    >
      <div className="absolute top-1.5 right-1.5 flex gap-0.5 z-10">
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
      <CardContent className={`${(isHealthGoal || isLearnGoal || isScreentimeGoal || isFaithGoal || selectedPeriod !== "today") ? 'px-4 py-4' : 'px-4 py-4 flex flex-col justify-between h-full'}`}>
        {(!isHealthGoal && !isLearnGoal && !isScreentimeGoal && !isFaithGoal && selectedPeriod === "today") && (
          <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight tracking-tight text-center mb-2">
            {goal.text}
          </h3>
        )}

        {/* Unified progress view for all goals in non-today views, and health/learn/screentime/faith goals always */}
        {(isHealthGoal || isLearnGoal || isScreentimeGoal || isFaithGoal || selectedPeriod !== "today") ? (
          <div className="flex flex-col gap-6">
            {isHealthGoal ? (
              <>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight tracking-tight text-center">
                  {goal.text}
                </h3>
                {isHealthNative && !hasHealthPermission ? (
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
            ) : isScreentimeGoal ? (
              <>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight tracking-tight text-center">
                  {goal.text}
                </h3>
                {isUsageNative && !hasUsagePermission ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-400 py-4">
                    <Lock className="h-4 w-4" />
                    <span>Tap to connect Usage Data</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <RadialProgress 
                      value={healthProgress} 
                      size={120} 
                      displayText={progressDisplayText}
                      inverted={true}
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
                    value={learnProgress.percentage} 
                    size={120} 
                    displayText={selectedPeriod === "today" 
                      ? learnProgress.periodPoints.toString()
                      : `${learnProgress.periodPoints}/${learnProgress.target}`
                    }
                    redThreshold={40}
                    yellowThreshold={70}
                  />
                </div>
              </>
            ) : isFaithGoal ? (
              <>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight tracking-tight text-center">
                  {goal.text}
                </h3>
                <div className="flex items-center justify-center">
                  <RadialProgress 
                    value={faithProgress.percentage} 
                    size={120} 
                    displayText={
                      selectedPeriod === "today" 
                        ? `${faithProgress.completedDays}/${goal.target}`
                        : healthPeriod === "week"
                        ? `${faithProgress.completedDays}/7`
                        : healthPeriod === "month"
                        ? `${faithProgress.completedWeeks}/${faithProgress.totalWeeks}`
                        : `${faithProgress.completedMonths}/${faithProgress.totalMonths}`
                    }
                    redThreshold={40}
                    yellowThreshold={70}
                  />
                </div>
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
        ) : goal.target && selectedPeriod === "today" ? (
          <div className="flex flex-col gap-2">
            {/* ... existing target interactive logic ... */}
             <div className="flex flex-wrap items-center justify-center gap-1.5">
              {Array.from({ length: Math.min(goal.target, 7) }).map((_, index) => {
                const isActive = index < todayCompletion;
                return (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isUpdating) return;
                      const newCount = index + 1 === todayCompletion ? index : index + 1;
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
            
            <div className="flex items-center justify-between text-[10px] font-medium text-gray-600 dark:text-gray-400">
              <span>Today: {todayCompletion} / {goal.target}</span>
            </div>
          </div>
        ) : showProgress && !isHealthGoal && !isScreentimeGoal && (
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

        {/* Don't show tips/insights for health/learn/screentime/faith goals or non-today views */}
        {(!isHealthGoal && !isLearnGoal && !isScreentimeGoal && !isFaithGoal && selectedPeriod === "today") && (smartTip || goal.tips.length > 0) && (
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
      </CardContent>
    </Card>
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
    </>
  );
});
