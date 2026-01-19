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
import { ShareArticleDialog } from "@/components/goals/share-article-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PasswordGate } from "@/components/auth/password-gate";
import { useGoals, useGoalProgress } from "@/hooks/useGoals";
import { useNotes } from "@/hooks/useNotes";
import { GoalPeriod, Goal, GoalCategory } from "@/types";
import { DashboardSkeleton, GoalCardSkeleton } from "@/components/ui/skeleton";
import { generateId } from "@/lib/id-utils";
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
  
  // Share article dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharedContent, setSharedContent] = useState<{
    title?: string;
    url?: string;
    text?: string;
  } | null>(null);
  const [processedShareKey, setProcessedShareKey] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Auto-create default goals (handled by server) and fix learn goal text if needed
  useEffect(() => {
    const ensureDefaults = async () => {
      try {
        const { created } = await api.goals.ensureDefaults();
        if (created.faith || created.screentime || created.learn) {
          refreshGoals();
        }
        
        // Fix learn goal text if it's incorrect (e.g., "x.com" instead of "Learn")
        const learnGoal = goals.find(g => g.category === "learn");
        if (learnGoal && learnGoal.text !== "Learn") {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'home-client.tsx:85',message:'Fixing learn goal text on load',data:{currentText:learnGoal.text,goalId:learnGoal.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
          // #endregion
          
          try {
            await api.goals.update(learnGoal.id, { text: "Learn" });
            refreshGoals();
          } catch (error) {
            console.error("Error fixing learn goal text:", error);
          }
        }
      } catch (error) {
        console.error("Error ensuring default goals:", error);
      }
    };

    ensureDefaults();
  }, [refreshGoals, goals]);

  const categories: { id: GoalCategory; icon: React.ElementType | React.FC<{ className?: string }>; color: string }[] = [
    { id: "health", icon: HealthIcon, color: "text-rose-500" },
    { id: "learn", icon: LearnIcon, color: "text-blue-500" },
    { id: "faith", icon: PrayerIcon, color: "text-violet-500" },
    { id: "family", icon: ScreentimeIcon, color: "text-emerald-500" },
  ];

  // Filter goals based on period - hide family goals in today view
  const filteredGoals = useMemo(() => {
    if (selectedPeriod === "today") {
      return goalsWithProgress.filter(goal => goal.category !== "family");
    }
    return goalsWithProgress;
  }, [goalsWithProgress, selectedPeriod]);

  // Group goals by category - ensure each bucket shows only the most recent goal
  const goalsByCategory = useMemo(() => {
    const grouped: Record<string, Goal[]> = {
      health: [],
      faith: [],
      learn: [],
      family: [] // This bucket is for screentime/family goals (displayed as "Screen Time")
    };

    // Track which categories we've already added a goal to (only show most recent per category)
    const categoryAdded: Record<string, boolean> = {
      health: false,
      faith: false,
      learn: false,
      family: false,
      screentime: false
    };

    // Goals are already sorted by created_at DESC from the API
    filteredGoals.forEach(goal => {
      const cat = goal.category || 'health'; // Default to health

      // Map screentime to family bucket (they're the same for display purposes - "Screen Time")
      const displayCategory = (cat === 'screentime' || cat === 'family') ? 'family' : cat;

      // Only add the first (most recent) goal for each category
      if (!categoryAdded[displayCategory] && grouped[displayCategory]) {
        grouped[displayCategory].push(goal);
        categoryAdded[displayCategory] = true;
        // Also mark screentime as added if it's a screentime goal
        if (cat === 'screentime') {
          categoryAdded['screentime'] = true;
        }
      }
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'home-client.tsx:140',message:'Goals grouped by category',data:{grouped:Object.keys(grouped).map(k => ({category:k,count:grouped[k].length,goals:grouped[k].map(g => ({id:g.id,text:g.text,category:g.category}))})),totalGoals:filteredGoals.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    
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
    const handleSharedContent = () => {
      const title = searchParams.get('title');
      const text = searchParams.get('text');
      const url = searchParams.get('url');

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'home-client.tsx:165',message:'handleSharedContent called',data:{title,text,url,windowLocation:window.location.href},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      const hasSharedContent = url || text || title;
      
      // Create a unique key for this share to prevent duplicate processing
      const shareKey = hasSharedContent ? `${title || ''}|${url || ''}|${text || ''}` : null;

      // Only show dialog if content exists and we haven't processed this share yet
      if (hasSharedContent && shareKey && shareKey !== processedShareKey) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'home-client.tsx:177',message:'Setting shared content and opening dialog',data:{shareKey,processedShareKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        
        setSharedContent({
          title: title || undefined,
          url: url || undefined,
          text: text || undefined,
        });
        setShareDialogOpen(true);
        setProcessedShareKey(shareKey);
      }
    };

    handleSharedContent();

    // Listen for popstate events from Android share intent handling
    // This ensures we catch URL changes that happen via window.history.replaceState
    const handlePopState = (e: PopStateEvent) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'home-client.tsx:191',message:'PopState event received',data:{windowLocation:window.location.href,state:e.state},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      // Small delay to ensure URL has been updated
      setTimeout(() => {
        // Force a re-check of search params after popstate
        const currentTitle = new URLSearchParams(window.location.search).get('title');
        const currentText = new URLSearchParams(window.location.search).get('text');
        const currentUrl = new URLSearchParams(window.location.search).get('url');
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'home-client.tsx:195',message:'PopState handler checking URL params',data:{currentTitle,currentText,currentUrl,windowLocation:window.location.href},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        
        const hasContent = currentTitle || currentText || currentUrl;
        const shareKey = hasContent ? `${currentTitle || ''}|${currentUrl || ''}|${currentText || ''}` : null;
        
        // Only show dialog if content exists and we haven't processed this share yet
        if (hasContent && shareKey && shareKey !== processedShareKey) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'home-client.tsx:203',message:'PopState handler setting shared content',data:{shareKey,processedShareKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          
          setSharedContent({
            title: currentTitle || undefined,
            url: currentUrl || undefined,
            text: currentText || undefined,
          });
          setShareDialogOpen(true);
          setProcessedShareKey(shareKey);
        }
      }, 100);
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [searchParams, processedShareKey]);

  // Handle confirming article share to learn goals
  const handleShareConfirm = async (goalTitle: string, goalUrl?: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'home-client.tsx:243',message:'handleShareConfirm called',data:{goalTitle,goalUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    
    try {
      // Find existing learn goal or ensure one exists
      let learnGoal = goals.find(g => g.category === "learn");
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'home-client.tsx:257',message:'Looking for existing learn goal',data:{learnGoalFound:!!learnGoal,learnGoalId:learnGoal?.id,learnGoalText:learnGoal?.text},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
      // #endregion
      
      // If learn goal exists but has wrong text, update it
      if (learnGoal && learnGoal.text !== "Learn") {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'home-client.tsx:263',message:'Learn goal has wrong text, updating',data:{currentText:learnGoal.text,goalId:learnGoal.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
        // #endregion
        
        await api.goals.update(learnGoal.id, { text: "Learn" });
        // Refresh goals to get updated text
        refreshGoals();
      }
      
      // If no learn goal exists, create one
      if (!learnGoal) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'home-client.tsx:255',message:'No learn goal found, creating one',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
        // #endregion
        
        const goalId = generateId();
        const goalData: Partial<Goal> = {
          id: goalId,
          text: "Learn",
          period: "week",
          category: "learn",
          tips: [],
          createdAt: new Date(),
        };

        learnGoal = await api.goals.create(goalData);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'home-client.tsx:267',message:'Learn goal created',data:{learnGoalId:learnGoal.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
        // #endregion
        
        // Refresh goals list to include the new goal
        refreshGoals();
      }
      
      // Add the article as a note (with URL and title)
      // Prefer URL if available, otherwise use title
      // If both exist, combine them so the title is preserved
      const noteText = goalUrl 
        ? (goalTitle && goalTitle !== goalUrl ? `${goalTitle} ${goalUrl}` : goalUrl)
        : goalTitle;
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'home-client.tsx:283',message:'Adding article as note',data:{noteText,goalUrl,goalTitle},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      
      await addNote(noteText);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'home-client.tsx:279',message:'Note added successfully',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion

      // Clear URL params
      router.replace('/', { scroll: false });
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ad9ef1e8-7ae3-460a-9763-0841686de40c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'home-client.tsx:285',message:'Error adding article to learn goals',data:{error:error instanceof Error ? error.message : String(error),stack:error instanceof Error ? error.stack : undefined,errorType:error?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      console.error("Error adding article to learn goals:", error);
      throw error; // Re-throw to let dialog handle error display
    }
  };

  // Handle closing share dialog without confirming
  const handleShareDialogClose = (open: boolean) => {
    setShareDialogOpen(open);
    if (!open) {
      // Clear URL params when dialog is closed
      router.replace('/', { scroll: false });
      setSharedContent(null);
      setProcessedShareKey(null);
    }
  };

  return (
    <main className="flex min-h-screen justify-center bg-background overflow-x-hidden">
      <div className="flex h-full w-full max-w-md flex-col bg-background shadow-2xl shadow-black/20 overflow-hidden min-h-screen relative border-x border-border">
        <ScrollArea className="flex-1" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))', paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex flex-col gap-6 pb-6">
            {activeTab === "goals" ? (
              <>
                <Header selectedPeriod={selectedPeriod} />
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
                
                <ShareArticleDialog
                  open={shareDialogOpen}
                  onOpenChange={handleShareDialogClose}
                  title={sharedContent?.title}
                  url={sharedContent?.url}
                  text={sharedContent?.text}
                  onConfirm={handleShareConfirm}
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
                <NotepadCard />
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

