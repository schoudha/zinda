"use client";

import { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Minus, Check } from "lucide-react";
import { Goal } from "@/types";
import { useGoalProgress } from "@/hooks/useGoals";

interface FaithGoalViewProps {
  goal: Goal;
  todayCompletion: number;
  handleIncrementCompletion: (increment: number) => void;
  isUpdating: boolean;
  target?: number;
  period?: "today" | "week" | "month" | "year";
  setPeriod?: (period: "today" | "week" | "month" | "year") => void;
}

export function FaithGoalView({
  goal,
  todayCompletion,
  handleIncrementCompletion,
  isUpdating,
  target = 3, // Default to 3 for prayer goals as requested
  period = "today",
  setPeriod,
}: FaithGoalViewProps) {
  const { history: progressHistory } = useGoalProgress();

  // Helper function to get normalized start date for period
  const getPeriodStart = useCallback((period: string): Date => {
    const now = new Date();
    if (period === "week") {
      const dayOfWeek = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      if (start.getDay() !== 0) {
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
      }
      return start;
    } else if (period === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      return start;
    } else if (period === "year") {
      const start = new Date(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    return now;
  }, []);

  // Helper function for date ranges
  const getDateStr = useCallback((date: Date) => {
    return date.toLocaleDateString('en-CA');
  }, []);

  const dateRange = useCallback((start: Date, end: Date): string[] => {
    const dates: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(getDateStr(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [getDateStr]);

  // Helper function to calculate expected months completed for year view
  const getExpectedMonthsCompleted = useCallback((currentDate: Date): number => {
    const monthIndex = currentDate.getMonth(); // 0-11
    const dayOfMonth = currentDate.getDate();
    const monthsCompleted = monthIndex + (dayOfMonth >= 20 ? 1 : 0);
    return Math.ceil((monthsCompleted / 12) * 10);
  }, []);

  // Helper function to determine completion status color
  const getCompletionStatusColor = useCallback((
    period: 'week' | 'month' | 'year',
    completed: number,
    total: number,
    expected?: number
  ): 'green' | 'yellow' | 'red' => {
    if (period === 'week') {
      if (completed >= 5) return 'green';
      if (completed >= 3) return 'yellow';
      return 'red';
    } else if (period === 'month') {
      if (completed >= 4) return 'green';
      if (completed >= 2) return 'yellow';
      return 'red';
    } else { // year
      const target = expected || 10;
      if (completed >= target) return 'green';
      if (completed >= Math.ceil(target * 0.7)) return 'yellow';
      return 'red';
    }
  }, []);

  // Calculate completion stats for faith goals
  const completionStats = useMemo(() => {
    if (!goal.target) return { completedDays: 0, totalDays: 7, completedWeeks: 0, totalWeeks: 4, completedMonths: 0, totalMonths: 12, expectedMonths: 0, statusColor: 'red' as const, percentage: 0 };
    
    if (period === "today") {
      const percentage = Math.round((todayCompletion / goal.target) * 100);
      return { completedDays: todayCompletion, totalDays: goal.target, completedWeeks: 0, totalWeeks: 4, completedMonths: 0, totalMonths: 12, expectedMonths: 0, statusColor: 'red' as const, percentage };
    }
    
    const periodStart = getPeriodStart(period);
    const now = new Date();
    const goalHistory = progressHistory[goal.id] || {};
    const target = goal.target;
    
    if (period === "week") {
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
      const percentage = Math.round((completedDays / 7) * 100);
      const statusColor = getCompletionStatusColor('week', completedDays, 7);
      return { completedDays, totalDays: 7, completedWeeks: 0, totalWeeks: 4, completedMonths: 0, totalMonths: 12, expectedMonths: 0, statusColor, percentage };
    } else if (period === "month") {
      const daysInPeriod = dateRange(periodStart, now);
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
        const requiredDays = weekDays.length < 7 ? Math.ceil(weekDays.length * 5 / 7) : 5;
        if (daysMetInWeek >= requiredDays) weeksMet++;
      });
      
      const totalWeeks = 4;
      const percentage = Math.round((weeksMet / totalWeeks) * 100);
      const statusColor = getCompletionStatusColor('month', weeksMet, totalWeeks);
      return { completedDays: 0, totalDays: 7, completedWeeks: weeksMet, totalWeeks, completedMonths: 0, totalMonths: 12, expectedMonths: 0, statusColor, percentage };
    } else if (period === "year") {
      const daysInPeriod = dateRange(periodStart, now);
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
        const requiredDays = monthDays.length < 30 ? Math.ceil(monthDays.length * 20 / 30) : 20;
        if (daysMetInMonth >= requiredDays) monthsMet++;
      });
      
      const expectedMonths = getExpectedMonthsCompleted(now);
      const totalMonths = 12;
      const percentage = Math.round((monthsMet / totalMonths) * 100);
      const statusColor = getCompletionStatusColor('year', monthsMet, totalMonths, expectedMonths);
      return { completedDays: 0, totalDays: 7, completedWeeks: 0, totalWeeks: 4, completedMonths: monthsMet, totalMonths, expectedMonths, statusColor, percentage };
    }
    
    return { completedDays: 0, totalDays: 7, completedWeeks: 0, totalWeeks: 4, completedMonths: 0, totalMonths: 12, expectedMonths: 0, statusColor: 'red' as const, percentage: 0 };
  }, [goal.id, goal.target, period, progressHistory, todayCompletion, getPeriodStart, getCompletionStatusColor, getExpectedMonthsCompleted, dateRange]);

  // Calculate percentage for progress bar or visual indicator
  const percentage = period === "today" 
    ? Math.min(100, Math.round((todayCompletion / target) * 100))
    : completionStats.percentage;

  // Get status color class
  const getStatusColorClass = (statusColor: 'green' | 'yellow' | 'red') => {
    if (statusColor === 'green') {
      return "bg-green-50 dark:bg-green-950/30 text-green-900 dark:text-green-100 border-green-200 dark:border-green-800";
    } else if (statusColor === 'yellow') {
      return "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-900 dark:text-yellow-100 border-yellow-200 dark:border-yellow-800";
    } else {
      return "bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-100 border-red-200 dark:border-red-800";
    }
  };

  const cardColorClass = period === "today" 
    ? "bg-violet-50 dark:bg-violet-950/30"
    : getStatusColorClass(completionStats.statusColor);

  const displayText = period === "today"
    ? `${todayCompletion} / ${target}`
    : period === "week"
    ? `${completionStats.completedDays} / 7 days`
    : period === "month"
    ? `${completionStats.completedWeeks} / ${completionStats.totalWeeks} weeks`
    : `${completionStats.completedMonths} / ${completionStats.expectedMonths || completionStats.totalMonths} months`;

  return (
    <div className="space-y-4">
      {setPeriod ? (
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList className="w-full">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
          
          <TabsContent value={period} className="space-y-4 mt-4">
            {/* Progress Summary */}
            <Card className={`border-none shadow-sm ${cardColorClass}`}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${period === "today" ? "text-violet-900 dark:text-violet-100" : ""}`}>
                    {period === "today" ? "Today's Prayers" : period === "week" ? "Days Completed" : period === "month" ? "Weeks Completed" : "Months Completed"}
                  </span>
                  <span className={`text-lg font-bold ${period === "today" ? "text-violet-700 dark:text-violet-300" : ""}`}>
                    {displayText}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className={`w-full rounded-full h-2.5 mb-4 ${period === "today" ? "bg-violet-200 dark:bg-violet-900" : completionStats.statusColor === 'green' ? "bg-green-200 dark:bg-green-900" : completionStats.statusColor === 'yellow' ? "bg-yellow-200 dark:bg-yellow-900" : "bg-red-200 dark:bg-red-900"}`}>
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-500 ease-in-out ${period === "today" ? "bg-violet-600" : completionStats.statusColor === 'green' ? "bg-green-600" : completionStats.statusColor === 'yellow' ? "bg-yellow-600" : "bg-red-600"}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>

                {period === "today" && (
                  <>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleIncrementCompletion(-1)}
                        disabled={isUpdating || todayCompletion <= 0}
                        variant="outline"
                        className="h-12 w-12 border-violet-200 hover:bg-violet-100 hover:text-violet-700 dark:border-violet-800 dark:hover:bg-violet-900"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        onClick={() => handleIncrementCompletion(1)}
                        disabled={isUpdating || todayCompletion >= target}
                        className="flex-1 h-12 bg-violet-600 hover:bg-violet-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Prayer
                      </Button>
                    </div>
                    
                    {todayCompletion >= target && (
                      <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium pt-2 animate-in fade-in slide-in-from-bottom-2">
                        <Check className="h-4 w-4" />
                        <span>Daily goal completed! MashaAllah!</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        // Fallback for when period/setPeriod not provided (backwards compatibility)
        <Card className="border-none shadow-sm bg-violet-50 dark:bg-violet-950/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-violet-900 dark:text-violet-100">
                Today's Prayers
              </span>
              <span className="text-lg font-bold text-violet-700 dark:text-violet-300">
                {todayCompletion} / {target}
              </span>
            </div>
            
            <div className="w-full bg-violet-200 dark:bg-violet-900 rounded-full h-2.5 mb-4">
              <div 
                className="bg-violet-600 h-2.5 rounded-full transition-all duration-500 ease-in-out" 
                style={{ width: `${percentage}%` }}
              ></div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => handleIncrementCompletion(-1)}
                disabled={isUpdating || todayCompletion <= 0}
                variant="outline"
                className="h-12 w-12 border-violet-200 hover:bg-violet-100 hover:text-violet-700 dark:border-violet-800 dark:hover:bg-violet-900"
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <Button
                onClick={() => handleIncrementCompletion(1)}
                disabled={isUpdating || todayCompletion >= target}
                className="flex-1 h-12 bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Prayer
              </Button>
            </div>
            
            {todayCompletion >= target && (
              <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium pt-2 animate-in fade-in slide-in-from-bottom-2">
                <Check className="h-4 w-4" />
                <span>Daily goal completed! MashaAllah!</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

