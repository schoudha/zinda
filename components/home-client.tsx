"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import { DateTabs } from "@/components/dashboard/date-tabs";
import { TimeTabs } from "@/components/dashboard/time-tabs";
import { NotepadCard } from "@/components/dashboard/notepad";
import { MediaCard } from "@/components/dashboard/media-card";
import { WellbeingCard } from "@/components/dashboard/wellbeing-card";
import { HealthCard } from "@/components/dashboard/health-card";
import { TimeDistributionCard } from "@/components/dashboard/time-distribution-card";
import { InputBar } from "@/components/dashboard/input-bar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { GoalCard } from "@/components/dashboard/goal-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PasswordGate } from "@/components/auth/password-gate";
import { useGoals } from "@/hooks/useGoals";
import { useNotes } from "@/hooks/useNotes";
import { GoalPeriod } from "@/types";
import { DashboardSkeleton, GoalCardSkeleton } from "@/components/ui/skeleton";

function HomeContent() {
  const { notes, addNote, toggleNote, updateNote, deleteNote } = useNotes();
  const { goals, isLoading: goalsLoading, refreshGoals, deleteGoal } = useGoals();
  
  const [activeTab, setActiveTab] = useState<"goals" | "notepad" | "media" | "time">("goals");
  const [selectedPeriod, setSelectedPeriod] = useState<GoalPeriod>("week");
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<"today" | "week" | "month" | "year">("today");
  
  const searchParams = useSearchParams();
  const router = useRouter();

  // Memoize goals filtering to prevent recalculation on every render
  const filteredGoals = useMemo(() => {
    return goals.filter((goal) => {
      if (goal.period === "year") return true;
      if (goal.period === "month") return selectedPeriod === "month" || selectedPeriod === "week";
      return goal.period === selectedPeriod;
    });
  }, [goals, selectedPeriod]);

  // Memoize tab change handler
  const handleTabChange = useCallback((tab: "goals" | "notepad" | "media" | "time") => {
    setActiveTab(tab);
  }, []);

  // Memoize period change handler
  const handlePeriodChange = useCallback((period: string) => {
    setSelectedPeriod(period as GoalPeriod);
  }, []);

  // Handle shared content from share target
  useEffect(() => {
    const handleSharedContent = async () => {
      const title = searchParams.get('title');
      const text = searchParams.get('text');
      const url = searchParams.get('url');
      
      const sharedContent = url || text || title || null;
      
      if (sharedContent) {
        await addNote(sharedContent);
        router.replace('/', { scroll: false });
      }
    };

    handleSharedContent();
  }, [searchParams, router, addNote]);

  return (
    <main className="flex min-h-screen justify-center bg-background overflow-x-hidden">
      <div className="flex h-full w-full max-w-md flex-col bg-background shadow-2xl shadow-black/20 overflow-hidden min-h-screen relative border-x border-border">
        <ScrollArea className="flex-1 pb-16">
          <div className="flex flex-col gap-6 pb-6">
            <Header />
            {activeTab === "goals" ? (
              <>
                <div className="px-6">
                  <InputBar onGoalCreated={refreshGoals} />
                </div>
                <div className="px-6">
                  <DateTabs value={selectedPeriod} onValueChange={handlePeriodChange} />
                </div>
                <div className="flex flex-col gap-4 px-6">
                  {/* Display goals for the selected period */}
                  {goalsLoading ? (
                    <>
                      <GoalCardSkeleton />
                      <GoalCardSkeleton />
                    </>
                  ) : (
                    filteredGoals.map((goal) => (
                      <GoalCard key={goal.id} goal={goal} onDelete={deleteGoal} />
                    ))
                  )}
                  
                  {/* Show other cards - rendered once, not duplicated */}
                  <HealthCard />
                </div>
              </>
            ) : activeTab === "time" ? (
              <div className="flex flex-col gap-6 px-6">
                <TimeTabs value={selectedTimePeriod} onValueChange={setSelectedTimePeriod} />
                <WellbeingCard period={selectedTimePeriod} />
                <TimeDistributionCard />
              </div>
            ) : activeTab === "media" ? (
              <div className="flex flex-col gap-4 px-4 overflow-hidden">
                <MediaCard 
                  notes={notes} 
                  onToggleNote={toggleNote}
                  onUpdateNote={updateNote}
                  onDeleteNote={deleteNote}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-4 px-4 overflow-hidden">
                <NotepadCard 
                  notes={notes} 
                  onToggleNote={toggleNote} 
                  onAddNote={addNote}
                  onUpdateNote={updateNote}
                  onDeleteNote={deleteNote}
                />
              </div>
            )}
          </div>
        </ScrollArea>
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </main>
  );
}

export default function HomeClient() {
  return (
    <PasswordGate>
      <Suspense fallback={<DashboardSkeleton />}>
        <HomeContent />
      </Suspense>
    </PasswordGate>
  );
}

