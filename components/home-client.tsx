"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import { DateTabs } from "@/components/dashboard/date-tabs";
import { NotepadCard } from "@/components/dashboard/notepad";
import { SimpleHealthCard } from "@/components/dashboard/simple-health-card";
import { ScreentimeCard } from "@/components/dashboard/screentime-card";
import { LocationCard } from "@/components/dashboard/location-card";
import { FinanceCard } from "@/components/dashboard/finance-card";
import { ThoughtInput } from "@/components/dashboard/thought-input";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { GoalCard } from "@/components/dashboard/goal-card";
import { GoalCreationDialog } from "@/components/goals/goal-creation-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PasswordGate } from "@/components/auth/password-gate";
import { useGoals, useGoalProgress } from "@/hooks/useGoals";
import { useNotes } from "@/hooks/useNotes";
import { GoalPeriod, Goal, GoalCategory } from "@/types";
import { DashboardSkeleton, GoalCardSkeleton } from "@/components/ui/skeleton";
// Health icon (heart ❤️)
const HealthIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: 'inherit', lineHeight: 1 }}>❤️</span>
);

// Prayer icon (folded hands 🙏)
const PrayerIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: 'inherit', lineHeight: 1 }}>🙏</span>
);

// Learn icon (book 📚)
const LearnIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: 'inherit', lineHeight: 1 }}>📚</span>
);

// Screentime icon (no phones 📵)
const ScreentimeIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: 'inherit', lineHeight: 1 }}>📵</span>
);

function HomeContent() {
  const { notes, addNote, toggleNote, updateNote, deleteNote } = useNotes();
  const { goals, isLoading: goalsLoading, refreshGoals, deleteGoal } = useGoals();
  const { progress, history: progressHistory, isLoading: progressLoading, updateProgress } = useGoalProgress();
  
  const [activeTab, setActiveTab] = useState<"goals" | "notepad" | "time">("goals");
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | GoalPeriod>("today");
  // Derived state combining goals and progress
  const goalsWithProgress = useMemo(() => {
    return goals.map(goal => ({
      ...goal,
      todayProgress: progress[goal.id] ?? 0
    }));
  }, [goals, progress]);

  const [goalCreationDialogOpen, setGoalCreationDialogOpen] = useState(false);
  const [selectedCategoryForCreation, setSelectedCategoryForCreation] = useState<GoalCategory>("health");
  const [isAutoCreatingLearnGoal, setIsAutoCreatingLearnGoal] = useState(false);
  const [isAutoCreatingScreentimeGoal, setIsAutoCreatingScreentimeGoal] = useState(false);
  const [hasCleanedUpDuplicates, setHasCleanedUpDuplicates] = useState(false);
  const [hasFixedLearnGoalText, setHasFixedLearnGoalText] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Auto-create learn goal if media notes exist but no learn goal
  useEffect(() => {
    const mediaNotes = notes.filter(note => note.url);
    const hasLearnGoal = goals.some(goal => goal.category === "learn");
    
    if (mediaNotes.length > 0 && !hasLearnGoal && !goalsLoading && !isAutoCreatingLearnGoal) {
      setIsAutoCreatingLearnGoal(true);
      const goalId = Date.now().toString();
      const goalData = {
        id: goalId,
        text: "Learn",
        period: "week" as GoalPeriod,
        category: "learn" as GoalCategory,
        tips: [],
        createdAt: new Date(),
      };
      
      api.goals.create(goalData)
        .then(() => {
          refreshGoals();
        })
        .catch((error) => {
          console.error("Error auto-creating learn goal:", error);
        })
        .finally(() => {
          setIsAutoCreatingLearnGoal(false);
        });
    }
  }, [notes, goals, goalsLoading, isAutoCreatingLearnGoal, refreshGoals]);

  // Clean up duplicate screentime goals - keep only the most recent one
  useEffect(() => {
    if (goalsLoading || hasCleanedUpDuplicates) return;
    
    const screentimeGoals = goals.filter(goal => goal.category === "family" || goal.category === "screentime");
    
    if (screentimeGoals.length > 1) {
      // Sort by createdAt (most recent first) - goals are already sorted, but let's be explicit
      const sortedGoals = [...screentimeGoals].sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );
      
      // Keep the most recent one, delete the rest
      const goalsToDelete = sortedGoals.slice(1);
      
      setHasCleanedUpDuplicates(true);
      
      // Delete duplicates in parallel
      Promise.all(goalsToDelete.map(goal => deleteGoal(goal.id)))
        .then(() => {
          console.log(`Cleaned up ${goalsToDelete.length} duplicate screentime goal(s)`);
          refreshGoals();
        })
        .catch((error) => {
          console.error("Error cleaning up duplicate screentime goals:", error);
          setHasCleanedUpDuplicates(false); // Reset on error so it can retry
        });
    } else {
      setHasCleanedUpDuplicates(true);
    }
  }, [goals, goalsLoading, hasCleanedUpDuplicates, deleteGoal, refreshGoals]);

  // Fix learn goal text from "Learn list" to "Learn"
  useEffect(() => {
    if (goalsLoading || hasFixedLearnGoalText) return;
    
    const learnGoalsToFix = goals.filter(
      goal => goal.category === "learn" && goal.text.toLowerCase().includes("learn list")
    );
    
    if (learnGoalsToFix.length > 0) {
      setHasFixedLearnGoalText(true);
      
      // Update all learn goals with "Learn list" text to "Learn"
      Promise.all(learnGoalsToFix.map(goal => 
        api.goals.update(goal.id, { text: "Learn" })
      ))
        .then(() => {
          console.log(`Fixed ${learnGoalsToFix.length} learn goal(s) text`);
          refreshGoals();
        })
        .catch((error) => {
          console.error("Error fixing learn goal text:", error);
          setHasFixedLearnGoalText(false); // Reset on error so it can retry
        });
    } else {
      setHasFixedLearnGoalText(true);
    }
  }, [goals, goalsLoading, hasFixedLearnGoalText, refreshGoals]);

  // Auto-create screentime goal if it doesn't exist
  useEffect(() => {
    const hasScreentimeGoal = goals.some(goal => goal.category === "family" || goal.category === "screentime");
    
    if (!hasScreentimeGoal && !goalsLoading && !isAutoCreatingScreentimeGoal && hasCleanedUpDuplicates) {
      setIsAutoCreatingScreentimeGoal(true);
      const goalId = Date.now().toString();
      const goalData: any = {
        id: goalId,
        text: "Screen Time",
        period: "week" as GoalPeriod,
        category: "family" as GoalCategory,
        tips: [],
        minutesPerDay: 150, // 2.5 hours = 150 minutes
        createdAt: new Date(),
      };
      
      api.goals.create(goalData)
        .then(() => {
          refreshGoals();
        })
        .catch((error) => {
          console.error("Error auto-creating screentime goal:", error);
        })
        .finally(() => {
          setIsAutoCreatingScreentimeGoal(false);
        });
    }
  }, [goals, goalsLoading, isAutoCreatingScreentimeGoal, hasCleanedUpDuplicates, refreshGoals]);

  const categories: { id: GoalCategory; icon: React.ElementType | React.FC<{ className?: string }>; color: string }[] = [
    { id: "health", icon: HealthIcon, color: "text-rose-500" },
    { id: "learn", icon: LearnIcon, color: "text-blue-500" },
    { id: "faith", icon: PrayerIcon, color: "text-violet-500" },
    { id: "family", icon: ScreentimeIcon, color: "text-emerald-500" },
  ];

  // Show all goals in all views
  const filteredGoals = goalsWithProgress;

  // Group goals by category
  const goalsByCategory = useMemo(() => {
    const grouped: Record<string, Goal[]> = {
      health: [],
      faith: [],
      learn: [],
      family: []
    };
    
    // Track if we've already added a screentime/family goal to prevent duplicates
    let screentimeGoalAdded = false;
    
    filteredGoals.forEach(goal => {
      const cat = goal.category || 'health'; // Default to health
      
      // For family/screentime category, only add the first one (most recent, since goals are sorted by created_at DESC)
      if (cat === 'family' || cat === 'screentime') {
        if (screentimeGoalAdded) {
          return; // Skip duplicate screentime goals
        }
        grouped['family'].push(goal);
        screentimeGoalAdded = true;
        return;
      }
      
      // For other categories, add to their respective group
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
  const handleTabChange = useCallback((tab: "goals" | "notepad" | "time") => {
    setActiveTab(tab);
  }, []);

  // Memoize period change handler
  const handlePeriodChange = useCallback((period: string) => {
    setSelectedPeriod(period as "today" | GoalPeriod);
  }, []);

  // Handle progress update callback
  const handleProgressUpdate = useCallback(async (goalId: string, newValue: number) => {
    if (selectedPeriod === "today") {
      try {
        await updateProgress({ goalId, progressValue: newValue });
      } catch (error) {
        console.error('Error refreshing progress:', error);
      }
    }
  }, [selectedPeriod, updateProgress]);

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
        <ScrollArea className="flex-1" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))', paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex flex-col gap-6 pb-6">
            {activeTab === "goals" ? (
              <>
                <Header />
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
                                showProgress={true}
                                onProgressChange={(val) => handleProgressUpdate(goal.id, val)}
                                selectedPeriod={selectedPeriod}
                                history={progressHistory[goal.id]}
                              />
                            ))
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedCategoryForCreation(cat.id);
                                setGoalCreationDialogOpen(true);
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
                
                <div className="px-6">
                  <ThoughtInput />
                </div>

                <GoalCreationDialog
                  open={goalCreationDialogOpen}
                  onOpenChange={setGoalCreationDialogOpen}
                  category={selectedCategoryForCreation}
                  onGoalCreated={() => {
                    refreshGoals();
                  }}
                />
              </>
            ) : activeTab === "time" ? (
              <div className="flex flex-col gap-6 px-6">
                <SimpleHealthCard period="today" />
                <ScreentimeCard period="today" />
                <LocationCard />
                <FinanceCard />
              </div>
            ) : (
              <div className="flex flex-col gap-4 px-4 overflow-hidden">
                <NotepadCard notes={notes} />
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

