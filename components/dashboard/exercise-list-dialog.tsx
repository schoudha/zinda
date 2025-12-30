"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogClose } from "@/components/ui/dialog";
import { HealthConnect, ExerciseSession } from "@/lib/capacitor/health-connect";
import { Capacitor } from "@capacitor/core";
import { Loader2 } from "lucide-react";
import { getExerciseTypeName } from "@/lib/exercise-type-map";

interface ExerciseListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: "today" | "week" | "month" | "year";
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnly.getTime() === today.getTime()) {
    return "Today";
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatExerciseType(exerciseType: string, exerciseTypeValue?: number): string {
  return getExerciseTypeName(exerciseType, exerciseTypeValue);
}

export function ExerciseListDialog({ open, onOpenChange, period }: ExerciseListDialogProps) {
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const periodLabel = period === "today" ? "Today" :
                      period === "week" ? "This Week" :
                      period === "month" ? "This Month" :
                      "This Year";

  useEffect(() => {
    if (open && Capacitor.isNativePlatform()) {
      loadSessions();
    } else if (!Capacitor.isNativePlatform()) {
      setSessions([]);
    }
  }, [open, period]);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { sessions: exerciseSessions } = await HealthConnect.getExerciseSessions({ period });
      // Log exercise type values for debugging
      exerciseSessions.forEach((session) => {
        console.log(`Exercise Session - Type: ${session.exerciseType}, Value: ${session.exerciseTypeValue}, Title: ${session.title}`);
      });
      // Sort by start time, most recent first
      const sorted = exerciseSessions.sort((a, b) => b.startTime - a.startTime);
      setSessions(sorted);
    } catch (e) {
      console.error("Failed to load exercise sessions", e);
      setError("Failed to load exercise sessions");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Group sessions by date
  const groupedSessions = sessions.reduce((acc, session) => {
    const dateKey = formatDate(session.startTime);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(session);
    return acc;
  }, {} as Record<string, ExerciseSession[]>);

  const totalMinutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] bg-white dark:bg-card text-gray-900 dark:text-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Exercise Sessions - {periodLabel}
          </DialogTitle>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>
        <DialogBody className="overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-green-600 dark:text-green-400" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No exercise sessions found for {periodLabel.toLowerCase()}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                  Total Exercise Time
                </div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {formatMinutes(totalMinutes)}
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(groupedSessions).map(([date, dateSessions]) => (
                  <div key={date} className="space-y-2">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">
                      {date}
                    </div>
                    <div className="space-y-2">
                      {dateSessions.map((session, index) => (
                        <div
                          key={`${session.startTime}-${index}`}
                          className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 dark:text-white mb-1">
                                {session.title || formatExerciseType(session.exerciseType, session.exerciseTypeValue)}
                              </div>
                              {session.exerciseTypeValue !== undefined && (
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                  Type: {session.exerciseType} (Value: {session.exerciseTypeValue})
                                </div>
                              )}
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {formatTime(session.startTime)} - {formatTime(session.endTime)}
                              </div>
                              {session.notes && (
                                <div className="text-sm text-gray-500 dark:text-gray-500 mt-1 italic">
                                  {session.notes}
                                </div>
                              )}
                            </div>
                            <div className="ml-4 text-right">
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                {formatMinutes(session.durationMinutes)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

