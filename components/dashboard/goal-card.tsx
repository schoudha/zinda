"use client";

import { useState, useEffect, memo, lazy, Suspense, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Bell, MessageCircle, Plus, Minus, Sparkles, Calendar, CalendarRange, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Goal } from "@/types";
import { api } from "@/lib/api";

// Lazy load NotificationDialog - only needed when user clicks bell icon
const NotificationDialog = lazy(() => 
  import("@/components/goals/notification-dialog").then(mod => ({ default: mod.NotificationDialog }))
);

interface GoalCardProps {
  goal: Goal;
  onDelete?: (goalId: string) => void;
  showProgress?: boolean; // Whether to show today's progress
  onProgressChange?: (newValue: number) => Promise<void>; // Callback to handle progress update
  onProgressUpdate?: () => void; // Legacy callback when progress is updated (kept for compatibility)
  selectedPeriod?: "today" | "week" | "month" | "year"; // Current period view
}

export const GoalCard = memo(function GoalCard({ goal, onDelete, showProgress = false, onProgressChange, onProgressUpdate, selectedPeriod = "today" }: GoalCardProps) {
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

  // Sync goal prop with local state when it changes
  useEffect(() => {
    setCurrentGoal(goal);
    setProgressValue(goal.todayProgress ?? 0);
  }, [goal]);

  // Fetch smart tip on load
  useEffect(() => {
    // For target-based goals, we'll wait for completion stats in the other effect
    // For percentage-based goals (or if no target), we fetch immediately
    if (!goal.target) {
      api.goals.generateSmartTip(goal.text, goal.todayProgress ?? 0)
        .then(setSmartTip)
        .catch(err => console.error("Failed to generate tip:", err));
    }
  }, [goal.text, goal.target, goal.todayProgress]);

  // Fetch completion stats if goal has a target
  useEffect(() => {
    if (goal.target) {
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
    }
  }, [goal.id, goal.target, goal.text]);

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
      className={`border-none bg-gradient-to-br ${periodColors[goal.period]} shadow-lg shadow-blue-900/5 dark:shadow-black/20 rounded-2xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden transition-all duration-300 hover:shadow-blue-900/10 dark:hover:shadow-black/30 relative`}
    >
      <div className="absolute top-1.5 right-1.5 flex gap-0.5 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-full opacity-60 hover:opacity-100 hover:bg-white/50 dark:hover:bg-white/10 dark:text-white"
          onClick={handleBellClick}
        >
          <Bell className={`h-3 w-3 ${currentGoal.notificationTime && currentGoal.notificationDays ? 'fill-current' : ''}`} />
        </Button>
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
      <CardHeader className="pb-1.5 pt-4 px-4">
        <CardTitle className={`${periodColors[goal.period].split(' ')[2]} flex items-center gap-1.5`}>
          <div className={`h-1 w-1 rounded-full ${goal.period === 'week' ? 'bg-blue-500' : goal.period === 'month' ? 'bg-purple-500' : 'bg-orange-500'} animate-pulse`} />
          {(() => {
            const IconComponent = periodIcons[goal.period];
            return <IconComponent className="h-3.5 w-3.5" />;
          })()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
          {goal.text}
        </h3>

        {/* Completion widget for goals with integer targets */}
        {goal.target ? (
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
            
            {/* Count & Weekly Progress Label */}
            <div className="flex items-center justify-between text-[10px] font-medium text-gray-600 dark:text-gray-400">
              <span>Today: {todayCompletion} / {goal.target}</span>
              {selectedPeriod === "week" && (
                <span>{weeklyCompletedDays}/7</span>
              )}
            </div>
          </div>
        ) : showProgress && (
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

        {(smartTip || goal.tips.length > 0) && (
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

        <Button
          onClick={handleDiscussClick}
          size="sm"
          className="w-full h-8 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 dark:from-purple-600 dark:to-indigo-700 dark:hover:from-purple-700 dark:hover:to-indigo-800 text-white text-xs font-medium shadow-sm"
        >
          <Sparkles className="h-3 w-3 mr-1.5" />
          Ask Gemini
        </Button>
      </CardContent>
    </Card>
  );
});
