"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Sparkles } from "lucide-react";
import { Goal } from "@/types";
import { ExerciseSession } from "@/lib/capacitor/health-connect";
import { getExerciseTypeName } from "@/lib/exercise-type-map";

import { formatMinutes } from "@/lib/utils";

interface HealthGoalViewProps {
  goal: Goal;
  totalMinutes: number;
  sessions: ExerciseSession[];
  healthPeriod: "today" | "week" | "month" | "year";
  setHealthPeriod: (period: "today" | "week" | "month" | "year") => void;
}

export function HealthGoalView({ 
  goal, 
  totalMinutes, 
  sessions,
  healthPeriod, 
  setHealthPeriod 
}: HealthGoalViewProps) {
  const [healthInsight, setHealthInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  // Load health insight
  useEffect(() => {
    const loadHealthInsight = async () => {
      if (!goal.minutesPerDay) return;
      
      const minutesPerDay = goal.minutesPerDay;
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

    if (totalMinutes !== undefined) {
      loadHealthInsight();
    }
  }, [goal.minutesPerDay, healthPeriod, totalMinutes]);

  return (
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
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No exercise sessions found for {healthPeriod === "today" ? "today" : healthPeriod === "week" ? "this week" : healthPeriod === "month" ? "this month" : "this year"}
                </p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session, index) => (
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
  );
}

