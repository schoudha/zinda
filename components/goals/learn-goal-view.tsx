"use client";

import { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, FileText } from "lucide-react";
import { MediaCard } from "@/components/dashboard/media-card";
import { Goal, Note } from "@/types";
import { useGoalProgress } from "@/hooks/useGoals";

interface LearnGoalViewProps {
  goal: Goal;
  learnProgress: number;
  handleIncrementLearnProgress: (points: number) => void;
  isUpdatingLearnProgress: boolean;
  notes: Note[];
  toggleNote: (id: string) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  period?: "today" | "week" | "month" | "year";
  setPeriod?: (period: "today" | "week" | "month" | "year") => void;
}

export function LearnGoalView({
  goal,
  learnProgress,
  handleIncrementLearnProgress,
  isUpdatingLearnProgress,
  notes,
  toggleNote,
  updateNote,
  deleteNote,
  period = "today",
  setPeriod,
}: LearnGoalViewProps) {
  const { progress, history: progressHistory } = useGoalProgress();
  const pointsPerDay = 5; // Target points per day

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

  // Helper function to determine completion status color based on percentage
  const getCompletionStatusColor = useCallback((
    percentage: number
  ): 'green' | 'yellow' | 'red' => {
    if (percentage >= 80) return 'green';
    if (percentage >= 50) return 'yellow';
    return 'red';
  }, []);

  // Calculate completion stats for learn goals based on 5 points per day
  const completionStats = useMemo(() => {
    const periodStart = getPeriodStart(period);
    const now = new Date();
    const goalHistory = progressHistory[goal.id] || {};
    
    if (period === "today") {
      // For today: percentage = (current points / 5) * 100
      const percentage = Math.min(100, Math.round((learnProgress / pointsPerDay) * 100));
      const statusColor = getCompletionStatusColor(percentage);
      return { 
        completedDays: 0, 
        totalDays: 0, 
        completedWeeks: 0, 
        totalWeeks: 0, 
        completedMonths: 0, 
        totalMonths: 0, 
        expectedMonths: 0, 
        statusColor, 
        percentage,
        totalPoints: learnProgress,
        targetPoints: pointsPerDay
      };
    }
    
    // Calculate total points in the period
    let totalPoints = 0;
    const daysInPeriod = dateRange(periodStart, now);
    
    daysInPeriod.forEach(dateStr => {
      totalPoints += goalHistory[dateStr] || 0;
    });
    
    // Calculate target points: 5 points per day
    const targetPoints = daysInPeriod.length * pointsPerDay;
    const percentage = targetPoints > 0 ? Math.min(100, Math.round((totalPoints / targetPoints) * 100)) : 0;
    const statusColor = getCompletionStatusColor(percentage);
    
    return { 
      completedDays: 0, 
      totalDays: 0, 
      completedWeeks: 0, 
      totalWeeks: 0, 
      completedMonths: 0, 
      totalMonths: 0, 
      expectedMonths: 0, 
      statusColor, 
      percentage,
      totalPoints,
      targetPoints
    };
  }, [goal.id, period, progressHistory, learnProgress, getPeriodStart, getCompletionStatusColor, pointsPerDay, dateRange]);

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
    ? "bg-blue-50 dark:bg-blue-950/30"
    : getStatusColorClass(completionStats.statusColor);

  const displayText = period === "today"
    ? `${learnProgress} / ${completionStats.targetPoints} points`
    : `${completionStats.totalPoints} / ${completionStats.targetPoints} points`;

  const percentage = completionStats.percentage;

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
                  <span className={`text-sm font-medium ${period === "today" ? "text-blue-900 dark:text-blue-100" : ""}`}>
                    {period === "today" ? "Today's Progress" : period === "week" ? "Week Progress" : period === "month" ? "Month Progress" : "Year Progress"}
                  </span>
                  <span className={`text-lg font-bold ${period === "today" ? "text-blue-700 dark:text-blue-300" : ""}`}>
                    {displayText}
                  </span>
                </div>
                
                <div className={`w-full rounded-full h-2.5 mb-4 ${completionStats.statusColor === 'green' ? "bg-green-200 dark:bg-green-900" : completionStats.statusColor === 'yellow' ? "bg-yellow-200 dark:bg-yellow-900" : "bg-red-200 dark:bg-red-900"}`}>
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-500 ease-in-out ${completionStats.statusColor === 'green' ? "bg-green-600" : completionStats.statusColor === 'yellow' ? "bg-yellow-600" : "bg-red-600"}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                
                <div className="text-xs text-center text-gray-600 dark:text-gray-400">
                  {percentage}% of daily target (5 pts/day)
                </div>

                {period === "today" && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleIncrementLearnProgress(1)}
                      disabled={isUpdatingLearnProgress}
                      className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Article (+1)
                    </Button>
                    <Button
                      onClick={() => handleIncrementLearnProgress(10)}
                      disabled={isUpdatingLearnProgress}
                      className="flex-1 h-12 bg-blue-700 hover:bg-blue-800 text-white"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Book (+10)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        // Fallback for when period/setPeriod not provided (backwards compatibility)
        <Card className="border-none shadow-sm bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Today's Progress
              </span>
              <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {learnProgress} points
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => handleIncrementLearnProgress(1)}
                disabled={isUpdatingLearnProgress}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="h-4 w-4 mr-2" />
                Article (+1)
              </Button>
              <Button
                onClick={() => handleIncrementLearnProgress(10)}
                disabled={isUpdatingLearnProgress}
                className="flex-1 h-12 bg-blue-700 hover:bg-blue-800 text-white"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Book (+10)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <MediaCard 
        notes={notes} 
        onToggleNote={toggleNote}
        onUpdateNote={updateNote}
        onDeleteNote={deleteNote}
      />
    </div>
  );
}

