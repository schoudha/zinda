"use client";

import { useState, useEffect, memo, lazy, Suspense, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Bell, MessageCircle, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  onProgressUpdate?: () => void; // Callback when progress is updated
}

export const GoalCard = memo(function GoalCard({ goal, onDelete, showProgress = false, onProgressUpdate }: GoalCardProps) {
  const router = useRouter();
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<Goal>(goal);
  const [progressValue, setProgressValue] = useState<number>(goal.todayProgress ?? 0);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync goal prop with local state when it changes
  useEffect(() => {
    setCurrentGoal(goal);
    setProgressValue(goal.todayProgress ?? 0);
  }, [goal]);

  const periodLabels = {
    week: "Weekly",
    month: "Monthly",
    year: "Yearly",
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
      await api.goals.progress.updateToday(goal.id, newValue);
      setProgressValue(newValue);
      setCurrentGoal({ ...currentGoal, todayProgress: newValue });
      onProgressUpdate?.();
    } catch (error) {
      console.error('Error updating progress:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [goal.id, isUpdating, currentGoal, onProgressUpdate]);

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

  return (
    <Card 
      className={`border-none bg-gradient-to-br ${periodColors[goal.period]} shadow-xl shadow-blue-900/5 dark:shadow-black/20 rounded-3xl ring-1 ring-black/5 dark:ring-white/5 overflow-hidden transition-all duration-300 hover:shadow-blue-900/10 dark:hover:shadow-black/30 relative`}
    >
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full opacity-60 hover:opacity-100 hover:bg-white/50 dark:hover:bg-white/10 dark:text-white"
          onClick={handleBellClick}
        >
          <Bell className={`h-4 w-4 ${currentGoal.notificationTime && currentGoal.notificationDays ? 'fill-current' : ''}`} />
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full opacity-60 hover:opacity-100 hover:bg-white/50 dark:hover:bg-white/10 dark:text-white"
            onClick={handleDelete}
          >
            <X className="h-4 w-4" />
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
      <CardHeader className="pb-2 pt-6 px-6">
        <CardTitle className={`text-[10px] font-bold uppercase tracking-widest ${periodColors[goal.period].split(' ')[2]} flex items-center gap-2`}>
          <div className={`h-1.5 w-1.5 rounded-full ${goal.period === 'week' ? 'bg-blue-500' : goal.period === 'month' ? 'bg-purple-500' : 'bg-orange-500'} animate-pulse`} />
          {periodLabels[goal.period]} Goal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-snug tracking-tight">
            {goal.text}
          </h3>
        </div>
        {showProgress && (
          <div className="space-y-3 pt-1 border-t border-white/40 dark:border-white/10">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Today's Progress
              </p>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {Math.round(progressValue)}%
              </span>
            </div>
            <Progress value={progressValue} className="h-2" />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDecrement}
                disabled={isUpdating || progressValue <= 0}
                className="flex-1 gap-2 bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-800"
              >
                <Minus className="h-3 w-3" />
                -10%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleIncrement}
                disabled={isUpdating || progressValue >= 100}
                className="flex-1 gap-2 bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-800"
              >
                <Plus className="h-3 w-3" />
                +10%
              </Button>
            </div>
          </div>
        )}
        {goal.tips.length > 0 && (
          <div className="space-y-4 pt-1 border-t border-white/40 dark:border-white/10">
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Tips to achieve this goal
            </p>
            <ul className="space-y-3.5">
              {goal.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3.5">
                  <div className={`h-2 w-2 rounded-full ${goal.period === 'week' ? 'bg-blue-500' : goal.period === 'month' ? 'bg-purple-500' : 'bg-orange-500'} mt-1.5 shrink-0`} />
                  <p 
                    className="flex-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium"
                    dangerouslySetInnerHTML={{ __html: tip }}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="pt-4">
          <Button
            onClick={handleDiscussClick}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold shadow-md dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Chat about this
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
