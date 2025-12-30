"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bell, Edit2, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogClose } from "@/components/ui/dialog";
import { Goal } from "@/types";
import { api } from "@/lib/api";
import { NotificationDialog } from "@/components/goals/notification-dialog";
import { GoalChatDialog } from "@/components/goals/goal-chat-dialog";
import { getRandomQuranQuote, type QuranQuote } from "@/lib/quran-quotes";
import { useHealthConnect } from "@/hooks/useHealthConnect";
import { useNotes } from "@/hooks/useNotes";
import { useGoalProgress } from "@/hooks/useGoals";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HealthGoalView } from "@/components/goals/health-goal-view";
import { LearnGoalView } from "@/components/goals/learn-goal-view";

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [quote, setQuote] = useState<QuranQuote | null>(null);
  const [healthPeriod, setHealthPeriod] = useState<"today" | "week" | "month" | "year">("today");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editText, setEditText] = useState("");
  const [editMinutesPerDay, setEditMinutesPerDay] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [learnProgress, setLearnProgress] = useState<number>(0);
  const [isUpdatingLearnProgress, setIsUpdatingLearnProgress] = useState(false);
  
  // React Query for Goal Data
  const { data: goal, isLoading: isGoalLoading } = useQuery({
    queryKey: ['goal', id],
    queryFn: () => api.goals.get(id),
    enabled: !!id,
  });

  // Initialize edit state when goal loads
  useEffect(() => {
    if (goal) {
      setEditText(goal.text);
      setEditMinutesPerDay(goal.minutesPerDay?.toString() || "30");
      if (goal.category === 'faith' && !quote) {
        setQuote(getRandomQuranQuote());
      }
    }
  }, [goal, quote]);

  // Health data
  const { totalMinutes, hasPermission, sessions } = useHealthConnect(healthPeriod);
  
  // Notes for learn goals
  const { notes, toggleNote, updateNote, deleteNote } = useNotes();
  
  // Get progress for learn goals
  const { progress, refreshProgress } = useGoalProgress();

  const handleSaveEdit = async () => {
    if (!goal || isSavingEdit) return;
    
    setIsSavingEdit(true);
    try {
      const updates: Partial<Goal> = { text: editText };
      if (goal.category === 'health') {
        const minutes = parseInt(editMinutesPerDay, 10);
        if (!isNaN(minutes) && minutes > 0) {
          updates.minutesPerDay = minutes;
        }
      }
      
      await api.goals.update(goal.id, updates);
      queryClient.invalidateQueries({ queryKey: ['goal', id] });
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating goal:", error);
      alert("Failed to update goal. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveNotification = async (time: Goal["notificationTime"] | null, days: Goal["notificationDays"] | null) => {
    if (!goal) return;
    await api.goals.updateNotifications(goal.id, time ?? undefined, days ?? undefined);
    queryClient.invalidateQueries({ queryKey: ['goal', id] });
  };
  
  // Update learn progress when progress data changes
  useEffect(() => {
    if (goal?.category === 'learn') {
      setLearnProgress(progress[id] || 0);
    }
  }, [goal?.category, id, progress]);
  
  // Handle manual increment for learn goals
  const handleIncrementLearnProgress = useCallback(async (points: number) => {
    if (!goal || goal.category !== 'learn' || isUpdatingLearnProgress) return;
    
    setIsUpdatingLearnProgress(true);
    try {
      const currentProgress = progress[goal.id] || 0;
      const newProgress = currentProgress + points;
      await api.goals.progress.updateToday(goal.id, newProgress);
      await refreshProgress();
    } catch (error) {
      console.error("Error updating learn progress:", error);
    } finally {
      setIsUpdatingLearnProgress(false);
    }
  }, [goal, progress, isUpdatingLearnProgress, refreshProgress]);

  if (isGoalLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 flex-col gap-4">
        <p className="text-gray-500">Goal not found</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const periodColors = {
    week: "bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100",
    month: "bg-purple-50 text-purple-900 dark:bg-purple-950/50 dark:text-purple-100",
    year: "bg-orange-50 text-orange-900 dark:bg-orange-950/50 dark:text-orange-100",
  };

  const periodDotColors = {
    week: "bg-blue-500 dark:bg-blue-400",
    month: "bg-purple-500 dark:bg-purple-400",
    year: "bg-orange-500 dark:bg-orange-400",
  };

  return (
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto shadow-2xl relative pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <div className="bg-background border-b border-border p-4 flex items-center gap-4 z-10 shadow-sm shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>
        <h1 className="text-lg font-bold text-foreground truncate flex-1">
          Goal Details
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditDialogOpen(true)}
          className="hover:bg-muted"
        >
          <Edit2 className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setNotificationDialogOpen(true)}
          className="-mr-2 hover:bg-muted"
        >
          <Bell className={`h-5 w-5 ${goal.notificationTime && goal.notificationDays ? 'fill-current text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
        </Button>
      </div>

      <NotificationDialog
        open={notificationDialogOpen}
        onOpenChange={setNotificationDialogOpen}
        goalId={goal.id}
        currentTime={goal.notificationTime}
        currentDays={goal.notificationDays}
        onSave={handleSaveNotification}
      />

      {/* Goal Context Card - Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-background space-y-4 pb-6">
        <Card className={`border-none shadow-sm ${periodColors[goal.period]} transition-all`}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <div className={`h-2 w-2 rounded-full ${periodDotColors[goal.period]}`} />
              <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                {goal.period === 'week' ? 'Weekly' : goal.period === 'month' ? 'Monthly' : 'Yearly'} Goal
              </span>
            </div>
            <p className="font-bold text-lg leading-tight">{goal.text}</p>
          </CardContent>
        </Card>

        {/* Quran Quote for Faith Goals */}
        {goal.category === 'faith' && quote && (
          <Card className="border-none shadow-sm bg-violet-50 dark:bg-violet-950/30 text-violet-900 dark:text-violet-100 transition-all">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-medium leading-relaxed italic">
                "{quote.english}"
              </p>
              <p className="text-[10px] uppercase tracking-widest opacity-70">
                {quote.reference}
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Learn-specific content */}
        {goal.category === 'learn' && (
          <LearnGoalView
            goal={goal}
            learnProgress={learnProgress}
            handleIncrementLearnProgress={handleIncrementLearnProgress}
            isUpdatingLearnProgress={isUpdatingLearnProgress}
            notes={notes}
            toggleNote={toggleNote}
            updateNote={updateNote}
            deleteNote={deleteNote}
          />
        )}
        
        {/* Health-specific content */}
        {goal.category === 'health' && hasPermission && (
          <HealthGoalView
            goal={goal}
            totalMinutes={totalMinutes}
            sessions={sessions}
            healthPeriod={healthPeriod}
            setHealthPeriod={setHealthPeriod}
          />
        )}
      </div>

      {/* Gemini Chat CTA - Large bottom button */}
      <div className="bg-background border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shrink-0">
        <Button
          onClick={() => setChatDialogOpen(true)}
          className="w-full h-14 text-base font-semibold gap-3"
          size="lg"
        >
          <Sparkles className="h-5 w-5" />
          Chat with Gemini AI
        </Button>
      </div>
      
      {/* Edit Goal Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
            <DialogClose onClose={() => setEditDialogOpen(false)} />
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Goal Text
              </label>
              <Input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full"
                placeholder="What's your main goal?"
                disabled={isSavingEdit}
              />
            </div>
            
            {goal?.category === 'health' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Target: Minutes per day
                </label>
                <Input
                  type="number"
                  min="1"
                  max="1440"
                  value={editMinutesPerDay}
                  onChange={(e) => setEditMinutesPerDay(e.target.value)}
                  className="w-full"
                  placeholder="30"
                  disabled={isSavingEdit}
                />
              </div>
            )}
            
            <Button
              onClick={handleSaveEdit}
              disabled={isSavingEdit || !editText.trim()}
              className="w-full"
            >
              {isSavingEdit ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogBody>
        </DialogContent>
      </Dialog>
      
      <GoalChatDialog
        open={chatDialogOpen}
        onOpenChange={setChatDialogOpen}
        goal={goal}
        additionalContext={{
          progressData: goal.category === 'health' ? undefined : {
            todayProgress: goal.todayProgress,
          },
          healthData: goal.category === 'health' ? {
            totalMinutes,
            goalMinutes: healthPeriod === "today" ? (goal.minutesPerDay || 30) :
                         healthPeriod === "week" ? (goal.minutesPerDay || 30) * 7 :
                         healthPeriod === "month" ? (goal.minutesPerDay || 30) * 30 :
                         (goal.minutesPerDay || 30) * 365,
            period: healthPeriod,
            percentage: goal.minutesPerDay ? Math.min(100, Math.round((totalMinutes / ((healthPeriod === "today" ? goal.minutesPerDay :
                         healthPeriod === "week" ? goal.minutesPerDay * 7 :
                         healthPeriod === "month" ? goal.minutesPerDay * 30 :
                         goal.minutesPerDay * 365)) * 100))) : 0,
            periodLabel: healthPeriod === "today" ? "Today" :
                        healthPeriod === "week" ? "This Week" :
                        healthPeriod === "month" ? "This Month" : "This Year",
          } : undefined,
        }}
      />
    </div>
  );
}
