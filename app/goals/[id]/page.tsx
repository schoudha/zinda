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
import { useUsageStats } from "@/hooks/useUsageStats";
import { useNotes } from "@/hooks/useNotes";
import { useGoalProgress } from "@/hooks/useGoals";
import { isYoutubeUrl } from "@/lib/url-utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HealthGoalView } from "@/components/goals/health-goal-view";
import { LearnGoalView } from "@/components/goals/learn-goal-view";
import { FaithGoalView } from "@/components/goals/faith-goal-view";
import { ScreentimeGoalView } from "@/components/goals/screentime-goal-view";
import { FamilyGoalView } from "@/components/goals/family-goal-view";

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [quote, setQuote] = useState<QuranQuote | null>(null);
  const [healthPeriod, setHealthPeriod] = useState<"today" | "week" | "month" | "year">("today");
  const [faithPeriod, setFaithPeriod] = useState<"today" | "week" | "month" | "year">("today");
  const [learnPeriod, setLearnPeriod] = useState<"today" | "week" | "month" | "year">("today");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editText, setEditText] = useState("");
  const [editMinutesPerDay, setEditMinutesPerDay] = useState<string>("");
  const [editTarget, setEditTarget] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [learnProgress, setLearnProgress] = useState<number>(0);
  const [isUpdatingLearnProgress, setIsUpdatingLearnProgress] = useState(false);
  const [isUpdatingFaith, setIsUpdatingFaith] = useState(false);
  
  // React Query for Goal Data
  const { data: goal, isLoading: isGoalLoading, error: goalError } = useQuery({
    queryKey: ['goal', id],
    queryFn: () => api.goals.get(id),
    enabled: !!id,
    retry: false, // Don't retry if it fails (e.g. 404)
  });

  // Faith goal completions
  const { data: completionStats, refetch: refetchCompletions } = useQuery({
    queryKey: ['goal-completions', id],
    queryFn: () => api.goals.completions.get(id),
    enabled: !!goal && goal.category === 'faith',
  });

  // Initialize edit state when goal loads
  useEffect(() => {
    if (goal) {
      setEditText(goal.text);
      setEditMinutesPerDay(goal.minutesPerDay?.toString() || (goal.category === 'screentime' ? "10" : goal.category === 'family' ? "150" : "30"));
      setEditTarget(goal.target?.toString() || (goal.category === 'faith' ? "3" : ""));
      if (goal.category === 'faith' && !quote) {
        setQuote(getRandomQuranQuote());
      }
    }
  }, [goal, quote]);

  // Health data
  const { totalMinutes, hasPermission, sessions } = useHealthConnect(healthPeriod);
  
  // Usage Stats data - for screentime goals only, use time window if specified
  const screentimeStartHour = goal?.category === 'screentime'
    ? (goal.screentimeStartHour ?? 18) 
    : undefined;
  const screentimeEndHour = goal?.category === 'screentime'
    ? (goal.screentimeEndHour ?? 20)
    : undefined;
  const { totalTime: screentimeMs, apps: screentimeApps, isNative: isUsageNative, hasPermission: hasUsagePermission, requestPermission: requestUsagePermission } = useUsageStats(
    healthPeriod,
    screentimeStartHour,
    screentimeEndHour
  );

  // Notes for learn goals
  const { notes, toggleNote, updateNote, deleteNote } = useNotes();
  
  // Get progress for learn goals
  const { progress, refreshProgress } = useGoalProgress();

  const handleSaveEdit = async () => {
    if (!goal || isSavingEdit) return;
    
    setIsSavingEdit(true);
    try {
      const updates: Partial<Goal> = { text: editText };
      if (goal.category === 'health' || goal.category === 'screentime' || goal.category === 'family') {
        const minutes = parseInt(editMinutesPerDay, 10);
        if (!isNaN(minutes) && minutes > 0) {
          updates.minutesPerDay = minutes;
        }
      }
      
      if (goal.category === 'faith') {
        const target = parseInt(editTarget, 10);
        if (!isNaN(target) && target > 0) {
          updates.target = target;
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

  // Handle manual increment for faith goals
  const handleIncrementFaithProgress = async (increment: number) => {
    if (!goal || goal.category !== 'faith' || isUpdatingFaith) return;
    
    setIsUpdatingFaith(true);
    try {
      await api.goals.completions.increment(goal.id, increment);
      await refetchCompletions();
    } catch (error) {
      console.error("Error updating faith progress:", error);
    } finally {
      setIsUpdatingFaith(false);
    }
  };

  if (isGoalLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (goalError || (!isGoalLoading && !goal)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 flex-col gap-4">
        <p className="text-gray-500">Goal not found</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 flex-col gap-4">
        <p className="text-gray-500">Loading goal...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto shadow-2xl relative pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <div className="bg-background border-b border-border p-4 flex items-center gap-4 z-10 shadow-sm shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>
        <h1 className="text-lg font-bold text-foreground truncate flex-1">
          {goal?.text || "Goal Details"}
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

        {/* Faith-specific content */}
        {goal.category === 'faith' && (
          <FaithGoalView
            goal={goal}
            todayCompletion={completionStats?.todayCompletion || 0}
            handleIncrementCompletion={handleIncrementFaithProgress}
            isUpdating={isUpdatingFaith}
            target={goal.target || 3}
            period={faithPeriod}
            setPeriod={setFaithPeriod}
          />
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
            period={learnPeriod}
            setPeriod={setLearnPeriod}
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

        {/* Screentime-specific content */}
        {goal.category === 'screentime' && (
           <ScreentimeGoalView
            goal={goal}
            totalTime={screentimeMs}
            apps={screentimeApps}
            isNative={isUsageNative}
            hasPermission={hasUsagePermission}
            requestPermission={requestUsagePermission}
            period={healthPeriod}
            setPeriod={setHealthPeriod}
          />
        )}

        {/* Family-specific content */}
        {goal.category === 'family' && (
          <FamilyGoalView
            goal={goal}
            period={healthPeriod}
            setPeriod={setHealthPeriod}
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
            
            {(goal?.category === 'health' || goal?.category === 'screentime' || goal?.category === 'family') && (
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

            {goal?.category === 'faith' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Target: Prayers per day
                </label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={editTarget}
                  onChange={(e) => setEditTarget(e.target.value)}
                  className="w-full"
                  placeholder="3"
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
            todayProgress: goal.category === 'faith' ? (completionStats?.todayCompletion || 0) : (goal.todayProgress || 0),
            completionStats: goal.category === 'faith' && completionStats ? {
              todayCompletion: completionStats.todayCompletion,
              weeklyCompletedDays: completionStats.weeklyCompletedDays
            } : undefined,
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
          healthSessions: goal.category === 'health' && hasPermission ? sessions.map(session => ({
            title: session.title,
            exerciseType: session.exerciseType,
            exerciseTypeValue: session.exerciseTypeValue,
            startTime: session.startTime,
            endTime: session.endTime,
            durationMinutes: session.durationMinutes,
            notes: session.notes,
          })) : undefined,
          learnNotes: goal.category === 'learn' ? notes
            .filter(note => note.url)
            .map(note => ({
              id: note.id,
              text: note.text,
              url: note.url,
              urlTitle: note.urlTitle,
              summary: note.summary,
              checked: note.checked,
            })) : undefined,
          quote: goal.category === 'faith' && quote ? {
            english: quote.english,
            reference: quote.reference
          } : undefined,
          usageStats: (goal.category === 'screentime' || goal.category === 'family') && hasUsagePermission ? {
            totalTime: screentimeMs,
            apps: screentimeApps,
            goalMinutes: healthPeriod === "today" ? (goal.minutesPerDay || (goal.category === 'screentime' ? 10 : 150)) :
                         healthPeriod === "week" ? (goal.minutesPerDay || (goal.category === 'screentime' ? 10 : 150)) * 7 :
                         healthPeriod === "month" ? (goal.minutesPerDay || (goal.category === 'screentime' ? 10 : 150)) * 30 :
                         (goal.minutesPerDay || (goal.category === 'screentime' ? 10 : 150)) * 365,
            period: healthPeriod,
            percentage: goal.minutesPerDay ? Math.round((screentimeMs / 60000) / ((healthPeriod === "today" ? goal.minutesPerDay :
                         healthPeriod === "week" ? goal.minutesPerDay * 7 :
                         healthPeriod === "month" ? goal.minutesPerDay * 30 :
                         goal.minutesPerDay * 365)) * 100) : 0,
            periodLabel: healthPeriod === "today" ? "Today" :
                        healthPeriod === "week" ? "This Week" :
                        healthPeriod === "month" ? "This Month" : "This Year",
          } : undefined,
        }}
      />
    </div>
  );
}
