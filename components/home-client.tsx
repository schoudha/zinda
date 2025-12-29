"use client";

import { useState, useEffect, Suspense, useMemo, useCallback, useRef } from "react";
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
import { GoalPeriod, Goal, GoalCategory } from "@/types";
import { DashboardSkeleton, GoalCardSkeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { Heart, BookOpen, Users } from "lucide-react";

// Custom Islamic crescent icon
const CrescentIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

function HomeContent() {
  const { notes, addNote, toggleNote, updateNote, deleteNote } = useNotes();
  const { goals, isLoading: goalsLoading, refreshGoals, deleteGoal } = useGoals();
  
  const [activeTab, setActiveTab] = useState<"goals" | "notepad" | "media" | "time">("goals");
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | GoalPeriod>("today");
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<"today" | "week" | "month" | "year">("today");
  const [goalsWithProgress, setGoalsWithProgress] = useState<Goal[]>(goals);
  const [preselectedCategory, setPreselectedCategory] = useState<GoalCategory | null>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();

  const categories: { id: GoalCategory; icon: React.ElementType | React.FC<{ className?: string }>; color: string }[] = [
    { id: "health", icon: Heart, color: "text-rose-500" },
    { id: "faith", icon: CrescentIcon, color: "text-violet-500" },
    { id: "learn", icon: BookOpen, color: "text-blue-500" },
    { id: "family", icon: Users, color: "text-emerald-500" },
  ];

  // Fetch today's progress when in "today" view
  useEffect(() => {
    if (selectedPeriod === "today") {
      const fetchProgress = async () => {
        try {
          const progress = await api.goals.progress.getToday();
          const updatedGoals = goals.map(goal => ({
            ...goal,
            todayProgress: progress[goal.id] ?? 0
          }));
          setGoalsWithProgress(updatedGoals);
        } catch (error) {
          console.error('Error fetching progress:', error);
          setGoalsWithProgress(goals);
        }
      };
      fetchProgress();
    } else {
      setGoalsWithProgress(goals);
    }
  }, [selectedPeriod, goals]);

  // Memoize goals filtering to prevent recalculation on every render
  const filteredGoals = useMemo(() => {
    if (selectedPeriod === "today") {
      return goalsWithProgress; // Show all goals in today view
    }
    return goalsWithProgress.filter((goal) => {
      if (goal.period === "year") return true;
      if (goal.period === "month") return selectedPeriod === "month" || selectedPeriod === "week";
      return goal.period === selectedPeriod;
    });
  }, [goalsWithProgress, selectedPeriod]);

  // Group goals by category
  const goalsByCategory = useMemo(() => {
    const grouped: Record<string, Goal[]> = {
      health: [],
      faith: [],
      learn: [],
      family: []
    };
    
    filteredGoals.forEach(goal => {
      const cat = goal.category || 'health'; // Default to health
      if (grouped[cat]) {
        grouped[cat].push(goal);
      } else {
        // Handle unexpected categories or if category is null/undefined
        if (grouped.health) grouped.health.push(goal);
      }
    });
    return grouped;
  }, [filteredGoals]);

  // Memoize tab change handler
  const handleTabChange = useCallback((tab: "goals" | "notepad" | "media" | "time") => {
    setActiveTab(tab);
  }, []);

  // Memoize period change handler
  const handlePeriodChange = useCallback((period: string) => {
    setSelectedPeriod(period as "today" | GoalPeriod);
  }, []);

  // Handle progress update callback
  const handleProgressUpdate = useCallback(async () => {
    if (selectedPeriod === "today") {
      try {
        const progress = await api.goals.progress.getToday();
        const updatedGoals = goalsWithProgress.map(goal => ({
          ...goal,
          todayProgress: progress[goal.id] ?? goal.todayProgress ?? 0
        }));
        setGoalsWithProgress(updatedGoals);
      } catch (error) {
        console.error('Error refreshing progress:', error);
      }
    }
  }, [selectedPeriod, goalsWithProgress]);

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
                  <DateTabs value={selectedPeriod} onValueChange={handlePeriodChange} />
                </div>
                
                {goalsLoading ? (
                  <div className="flex flex-col gap-4 px-6">
                    <GoalCardSkeleton />
                    <GoalCardSkeleton />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 px-6">
                    {categories.map((cat) => {
                      const IconComponent = cat.icon as React.ElementType<{ className?: string }>;
                      return (
                      <div key={cat.id} className="flex flex-col gap-2 min-w-0">
                        <div className={`${cat.color} mb-1 pl-1 flex items-center`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col gap-3">
                          {goalsByCategory[cat.id].length > 0 ? (
                            goalsByCategory[cat.id].map(goal => (
                              <GoalCard 
                                key={goal.id} 
                                goal={goal} 
                                onDelete={deleteGoal}
                                showProgress={selectedPeriod === "today"}
                                onProgressUpdate={handleProgressUpdate}
                                selectedPeriod={selectedPeriod}
                              />
                            ))
                          ) : (
                            <button
                              onClick={() => {
                                setPreselectedCategory(cat.id);
                                // Scroll to input bar after a brief delay to ensure it's rendered
                                setTimeout(() => {
                                  inputBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 100);
                              }}
                              className="h-24 rounded-2xl border-2 border-dashed border-gray-100 dark:border-white/5 flex items-center justify-center hover:border-gray-200 dark:hover:border-white/10 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer active:scale-95"
                            >
                              <span className="text-xs text-gray-300 dark:text-gray-600">Tap to add goal</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
                
                <div className="px-6" ref={inputBarRef}>
                  <InputBar 
                    onGoalCreated={() => {
                      refreshGoals();
                      setPreselectedCategory(null); // Reset after creation
                    }}
                    initialCategory={preselectedCategory}
                  />
                </div>
              </>
            ) : activeTab === "time" ? (
              <div className="flex flex-col gap-6 px-6">
                <TimeTabs value={selectedTimePeriod} onValueChange={setSelectedTimePeriod} />
                <HealthCard period={selectedTimePeriod} />
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

