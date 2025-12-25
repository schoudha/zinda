"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import { DateTabs } from "@/components/dashboard/date-tabs";
import { NotepadCard } from "@/components/dashboard/notepad";
import { WellbeingCard } from "@/components/dashboard/wellbeing-card";
import { HealthCard } from "@/components/dashboard/health-card";
import { InputBar } from "@/components/dashboard/input-bar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { GoalCard, Goal } from "@/components/dashboard/goal-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordGate } from "@/components/auth/password-gate";
import { getFirstUrl } from "@/lib/url-utils";
import { isYoutubeUrl } from "@/lib/url-utils";

export interface Note {
  id: string;
  text: string;
  checked: boolean;
  checkedAt: Date | null;
  createdAt: Date;
  url?: string;
  urlTitle?: string;
  summary?: string;
}

function HomeContent() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"goals" | "notepad">("goals");
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year">("week");
  const searchParams = useSearchParams();
  const router = useRouter();

  // Load notes and goals from database on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load notes
        const notesResponse = await fetch("/api/notes");
        if (notesResponse.ok) {
          const notesData = await notesResponse.json();
          setNotes(notesData.notes || []);
        }

        // Load goals
        const goalsResponse = await fetch("/api/goals");
        if (goalsResponse.ok) {
          const goalsData = await goalsResponse.json();
          setGoals(goalsData.goals || []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleAddNote = async (noteText: string) => {
    if (noteText.trim()) {
      const url = getFirstUrl(noteText.trim());
      let urlTitle: string | undefined;
      let summary: string | undefined;

      // Fetch URL title and summary if URL is found
      if (url) {
        try {
          // Skip transcript fetching for YouTube URLs (disabled due to blocking issues)
          // For YouTube URLs, we'll skip summary generation
          const isYouTube = isYoutubeUrl(url);

          // Fetch title
          const titleResponse = await fetch("/api/url/title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });

          if (titleResponse.ok) {
            const titleData = await titleResponse.json();
            urlTitle = titleData.title;
          } else {
            const errorData = await titleResponse.json().catch(() => null);
            console.error("Title fetch failed:", titleResponse.status, errorData);
          }

          // Only fetch summary for non-YouTube URLs
          if (!isYouTube) {
            const summaryResponse = await fetch("/api/url/summarize", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url }),
            });

            if (summaryResponse.ok) {
              const summaryData = await summaryResponse.json();
              summary = summaryData.summary;
            } else {
              const errorData = await summaryResponse.json().catch(() => null);
              console.error("Summary fetch failed:", summaryResponse.status, errorData);
            }
          }
        } catch (error) {
          console.error("Error fetching URL data:", error);
        }
      }

      const newNote: Note = {
        id: Date.now().toString(),
        text: noteText.trim(),
        checked: false,
        checkedAt: null,
        createdAt: new Date(),
        url: url || undefined,
        urlTitle,
        summary,
      };

      // Save to database
      try {
        const response = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newNote,
            createdAt: newNote.createdAt.toISOString(),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setNotes((prev) => [data.note, ...prev]);
        } else {
          // If save fails, still add to local state as fallback
          setNotes((prev) => [...prev, newNote]);
        }
      } catch (error) {
        console.error("Error saving note:", error);
        // If save fails, still add to local state as fallback
        setNotes((prev) => [...prev, newNote]);
      }
    }
  };

  const handleToggleNote = useCallback(async (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const updatedNote = {
      ...note,
      checked: !note.checked,
      checkedAt: !note.checked ? new Date() : null,
    };

    // Optimistically update local state
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? updatedNote : n))
    );

    // Update in database
    try {
      const response = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: noteId,
          checked: updatedNote.checked,
          checkedAt: updatedNote.checkedAt?.toISOString() || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update with server response
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? data.note : n))
        );
      }
    } catch (error) {
      console.error("Error updating note:", error);
      // Revert on error
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? note : n))
      );
    }
  }, [notes]);

  const handleUpdateNote = useCallback(async (noteId: string, updates: Partial<Note>) => {
    // Update local state
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, ...updates } : n))
    );

    // Update in database
    try {
      await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: noteId,
          ...updates,
        }),
      });
    } catch (error) {
      console.error("Error updating note:", error);
    }
  }, []);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    // Optimistically remove from local state
    setNotes((prev) => prev.filter((n) => n.id !== noteId));

    // Delete from database
    try {
      await fetch(`/api/notes?id=${noteId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error deleting note:", error);
      // We could revert here if needed, but for deletion it's often better to just fail silently or show a toast
    }
  }, []);

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    // Optimistically remove from local state
    setGoals((prev) => prev.filter((g) => g.id !== goalId));

    // Delete from database
    try {
      await fetch(`/api/goals?id=${goalId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error deleting goal:", error);
      // Revert on error
      const goalsResponse = await fetch("/api/goals");
      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json();
        setGoals(goalsData.goals || []);
      }
    }
  }, []);

  const handleGoalCreated = useCallback(async () => {
    // Reload goals after creation
    try {
      const goalsResponse = await fetch("/api/goals");
      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json();
        setGoals(goalsData.goals || []);
      }
    } catch (error) {
      console.error("Error reloading goals:", error);
    }
  }, []);

  // Filter goals based on selected period
  // Show weekly goals in week view
  // Show monthly goals in month and week views
  // Show yearly goals in all views
  const getGoalsForPeriod = (period: "week" | "month" | "year"): Goal[] => {
    return goals.filter((goal) => {
      if (goal.period === "year") return true; // Yearly goals show in all views
      if (goal.period === "month") return period === "month" || period === "week"; // Monthly goals show in month and week
      return goal.period === period; // Weekly goals only in week view
    });
  };

  // Handle shared content from share target
  useEffect(() => {
    const handleSharedContent = async () => {
      const title = searchParams.get('title');
      const text = searchParams.get('text');
      const url = searchParams.get('url');
      
      // Determine what to save - prioritize URL if present, otherwise use text or title
      const sharedContent = url || text || title || null;
      
      if (sharedContent) {
        // Add it as a note using the existing handler
        await handleAddNote(sharedContent);
        
        // Clean up the URL parameters using router.replace
        router.replace('/', { scroll: false });
      }
    };

    handleSharedContent();
  }, [searchParams, router]); // React to search params changes

  // Clean up notes checked more than 1 day ago
  useEffect(() => {
    const cleanup = async () => {
      // Use functional update to avoid dependency on notes
      setNotes((currentNotes) => {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        // Find notes to delete
        const notesToDelete = currentNotes.filter(
          (note) =>
            note.checked &&
            note.checkedAt &&
            new Date(note.checkedAt) <= oneDayAgo
        );

        if (notesToDelete.length > 0) {
          const idsToDelete = notesToDelete.map((n) => n.id).join(",");
          
          // Fire and forget API call - don't await inside the state update
          fetch(`/api/notes?ids=${encodeURIComponent(idsToDelete)}`, {
            method: "DELETE",
          }).catch(err => console.error("Error cleaning up notes:", err));
          
          // Return filtered notes
          return currentNotes.filter(
            (note) =>
              !note.checked ||
              !note.checkedAt ||
              new Date(note.checkedAt) > oneDayAgo
          );
        }
        
        // No changes needed
        return currentNotes;
      });
    };

    // Run cleanup on mount and then every hour
    const interval = setInterval(cleanup, 60 * 60 * 1000);
    
    // Initial cleanup after a short delay to allow initial load
    const timeout = setTimeout(cleanup, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <main className="flex min-h-screen justify-center bg-gray-50">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl overflow-hidden min-h-screen relative">
        <ScrollArea className="flex-1 pb-16">
          <div className="flex flex-col gap-6 pb-6">
            <Header />
            {activeTab === "goals" ? (
              <>
                <div className="px-6">
                  <InputBar onGoalCreated={handleGoalCreated} />
                </div>
                <div className="px-6">
                  <DateTabs value={selectedPeriod} onValueChange={setSelectedPeriod} />
                </div>
                <div className="flex flex-col gap-4 px-6">
                  {/* Display goals for the selected period */}
                  {getGoalsForPeriod(selectedPeriod).map((goal) => (
                    <GoalCard key={goal.id} goal={goal} onDelete={handleDeleteGoal} />
                  ))}
                  
                  {/* Show other cards based on period */}
                  {selectedPeriod === "week" && (
                    <>
                      <WellbeingCard />
                      <HealthCard />
                    </>
                  )}
                  {selectedPeriod === "month" && (
                    <>
                      <WellbeingCard />
                      <HealthCard />
                    </>
                  )}
                  {selectedPeriod === "year" && (
                    <>
                      <WellbeingCard />
                      <HealthCard />
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4 px-4 overflow-hidden">
                <NotepadCard 
                  notes={notes} 
                  onToggleNote={handleToggleNote} 
                  onAddNote={handleAddNote}
                  onUpdateNote={handleUpdateNote}
                  onDeleteNote={handleDeleteNote}
                />
              </div>
            )}
          </div>
        </ScrollArea>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <PasswordGate>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50">Loading...</div>}>
        <HomeContent />
      </Suspense>
    </PasswordGate>
  );
}
