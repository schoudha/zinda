"use client";

import { useState, useEffect, useRef, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Bell, Edit2, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogClose } from "@/components/ui/dialog";
import { Goal, Message } from "@/types";
import { markdownToHtml } from "@/lib/utils";
import { api } from "@/lib/api";
import { NotificationDialog } from "@/components/goals/notification-dialog";
import { getRandomQuranQuote, type QuranQuote } from "@/lib/quran-quotes";
import { useHealthConnect } from "@/hooks/useHealthConnect";
import { HealthConnect, ExerciseSession } from "@/lib/capacitor/health-connect";
import { Capacitor } from "@capacitor/core";
import { getExerciseTypeName } from "@/lib/exercise-type-map";

export default function GoalDetailPage() {
  const paramsRaw = useParams();
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  
  const [goal, setGoal] = useState<Goal | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [quote, setQuote] = useState<QuranQuote | null>(null);
  const [healthPeriod, setHealthPeriod] = useState<"today" | "week" | "month" | "year">("today");
  const [exerciseSessions, setExerciseSessions] = useState<ExerciseSession[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [healthInsight, setHealthInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editText, setEditText] = useState("");
  const [editMinutesPerDay, setEditMinutesPerDay] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Health data
  const { totalMinutes, hasPermission, isNative } = useHealthConnect(healthPeriod);

  // Resolve params (handle both Promise and direct object cases)
  useEffect(() => {
    const resolveParams = async () => {
      if (paramsRaw instanceof Promise || (paramsRaw && typeof (paramsRaw as any).then === 'function')) {
        const resolved = await (paramsRaw as unknown as Promise<{ id: string }>);
        setId(resolved.id);
      } else {
        setId((paramsRaw as { id: string }).id);
      }
    };
    resolveParams();
  }, [paramsRaw]);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const [goalData, messagesData] = await Promise.all([
          api.goals.get(id),
          api.goals.chat.history(id)
        ]);
        
        setGoal(goalData);
        setEditText(goalData.text);
        setEditMinutesPerDay(goalData.minutesPerDay?.toString() || "30");
        setMessages(messagesData.map((m) => ({
          ...m,
          createdAt: new Date(m.createdAt)
        })));
        
        // Load Quran quote if this is a faith goal
        if (goalData.category === 'faith') {
          setQuote(getRandomQuranQuote());
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);
  
  // Load exercise sessions for health goals
  useEffect(() => {
    if (goal?.category === 'health' && isNative && hasPermission) {
      loadExerciseSessions();
    }
  }, [goal?.category, healthPeriod, isNative, hasPermission]);
  
  // Load health insight
  useEffect(() => {
    if (goal?.category === 'health' && isNative && hasPermission && totalMinutes !== undefined) {
      loadHealthInsight();
    }
  }, [goal?.category, healthPeriod, totalMinutes, goal?.minutesPerDay, isNative, hasPermission]);
  
  const loadExerciseSessions = async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    setIsLoadingExercises(true);
    try {
      const { sessions } = await HealthConnect.getExerciseSessions({ period: healthPeriod });
      const sorted = sessions.sort((a, b) => b.startTime - a.startTime);
      setExerciseSessions(sorted);
    } catch (error) {
      console.error("Failed to load exercise sessions", error);
      setExerciseSessions([]);
    } finally {
      setIsLoadingExercises(false);
    }
  };
  
  const loadHealthInsight = async () => {
    if (!goal) return;
    
    const minutesPerDay = goal.minutesPerDay || 30;
    const goalMinutes = healthPeriod === "today" ? minutesPerDay :
                       healthPeriod === "week" ? minutesPerDay * 7 :
                       healthPeriod === "month" ? minutesPerDay * 30 :
                       minutesPerDay * 365;
    
    setIsLoadingInsight(true);
    try {
      const response = await fetch('/api/health/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalMinutes,
          goalMinutes,
          period: healthPeriod,
          minutesPerDay: goal.minutesPerDay,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setHealthInsight(data.insight);
      }
    } catch (error) {
      console.error('Failed to fetch insight:', error);
    } finally {
      setIsLoadingInsight(false);
    }
  };
  
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
      
      const updatedGoal = await api.goals.update(goal.id, updates);
      setGoal(updatedGoal);
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating goal:", error);
      alert("Failed to update goal. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending || !id) return;

    const userMsgText = inputValue.trim();
    setInputValue("");
    setIsSending(true);

    // Optimistically add user message
    const tempId = Date.now().toString();
    const tempUserMsg: Message = {
      id: tempId,
      role: "user",
      content: userMsgText,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const { userMessage, aiMessage } = await api.goals.chat.send(id, userMsgText);

      // Replace temp message with real one and add AI response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempId);
        return [
          ...filtered,
          { ...userMessage, createdAt: new Date(userMessage.createdAt) },
          { ...aiMessage, createdAt: new Date(aiMessage.createdAt) }
        ];
      });
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove temp message or show error
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSaveNotification = async (time: Goal["notificationTime"] | null, days: Goal["notificationDays"] | null) => {
    if (!goal) return;
    const updatedGoal = await api.goals.updateNotifications(goal.id, time ?? undefined, days ?? undefined);
    setGoal(updatedGoal);
  };

  if (isLoading) {
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
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto shadow-2xl overflow-hidden relative pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <div className="bg-background border-b border-border p-4 flex items-center gap-4 z-10 shadow-sm shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>
        <h1 className="text-lg font-bold text-foreground truncate flex-1">
          Goal Discussion
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
      {goal && (
        <NotificationDialog
          open={notificationDialogOpen}
          onOpenChange={setNotificationDialogOpen}
          goalId={goal.id}
          currentTime={goal.notificationTime}
          currentDays={goal.notificationDays}
          onSave={handleSaveNotification}
        />
      )}

      {/* Goal Context Card */}
      <div className="p-4 bg-background z-10 shrink-0 space-y-4">
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
        
        {/* Health-specific content */}
        {goal.category === 'health' && isNative && hasPermission && (
          <div className="space-y-4">
            <Tabs value={healthPeriod} onValueChange={(v) => setHealthPeriod(v as typeof healthPeriod)}>
              <TabsList className="w-full">
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
              </TabsList>
              
              <TabsContent value={healthPeriod} className="space-y-4 mt-4">
                {/* Progress Summary */}
                <Card className="border-none shadow-sm bg-green-50 dark:bg-green-950/30">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-900 dark:text-green-100">
                        Exercise Time
                      </span>
                      <span className="text-lg font-bold text-green-700 dark:text-green-300">
                        {formatMinutes(totalMinutes)}
                      </span>
                    </div>
                    {goal.minutesPerDay && (
                      <div className="text-xs text-green-700/70 dark:text-green-300/70">
                        Goal: {formatMinutes(
                          healthPeriod === "today" ? goal.minutesPerDay :
                          healthPeriod === "week" ? goal.minutesPerDay * 7 :
                          healthPeriod === "month" ? goal.minutesPerDay * 30 :
                          goal.minutesPerDay * 365
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Insight */}
                {healthInsight && (
                  <Card className="border-none shadow-sm bg-green-50/50 dark:bg-green-950/20">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
                          {healthInsight}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {isLoadingInsight && (
                  <Card className="border-none shadow-sm bg-green-50/50 dark:bg-green-950/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 text-green-600 dark:text-green-400 animate-spin" />
                        <p className="text-sm text-green-800/60 dark:text-green-200/60">
                          Generating insight...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Exercise Log */}
                <Card className="border-none shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Exercise Log</h3>
                    {isLoadingExercises ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-green-600 dark:text-green-400" />
                      </div>
                    ) : exerciseSessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No exercise sessions found for {healthPeriod === "today" ? "today" : healthPeriod === "week" ? "this week" : healthPeriod === "month" ? "this month" : "this year"}
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {exerciseSessions.map((session, index) => (
                          <div
                            key={`${session.startTime}-${index}`}
                            className="bg-muted rounded-lg p-3 space-y-1"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-foreground">
                                  {session.title || getExerciseTypeName(session.exerciseType, session.exerciseTypeValue)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(session.startTime).toLocaleDateString()} • {new Date(session.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </p>
                              </div>
                              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                {formatMinutes(session.durationMinutes)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden relative bg-card rounded-t-3xl shadow-inner -mt-2 pt-4 border-t border-border/50">
        <div 
          ref={scrollRef} 
          className="h-full overflow-y-auto px-4 pb-20 pt-2 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50 space-y-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full bg-blue-500" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Start a conversation with your AI coach about this goal.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-muted text-foreground rounded-bl-none"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }} 
                    />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))
          )}
          
          {isSending && (
            <div className="flex w-full justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow-sm">
                <div className="flex gap-1 h-5 items-center">
                  <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-background border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex gap-2 items-center">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for advice..."
            className="flex-1 rounded-full border-input bg-muted focus-visible:ring-blue-500 focus-visible:ring-offset-0"
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isSending}
            size="icon"
            className="rounded-full h-10 w-10 shrink-0 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 dark:shadow-none"
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </div>
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
