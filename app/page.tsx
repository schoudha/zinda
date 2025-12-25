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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordGate } from "@/components/auth/password-gate";
import { getFirstUrl } from "@/lib/url-utils";

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
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"goals" | "notepad">("goals");
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year">("week");
  const searchParams = useSearchParams();
  const router = useRouter();

  // Load notes from database on mount
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const response = await fetch("/api/notes");
        if (response.ok) {
          const data = await response.json();
          setNotes(data.notes || []);
        }
      } catch (error) {
        console.error("Error loading notes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotes();
  }, []);

  const handleAddNote = async (noteText: string) => {
    if (noteText.trim()) {
      const url = getFirstUrl(noteText.trim());
      let urlTitle: string | undefined;
      let summary: string | undefined;

      // Fetch URL title and summary in parallel if URL is found
      if (url) {
        try {
          const [titleResponse, summaryResponse] = await Promise.all([
            fetch("/api/url/title", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url }),
            }),
            fetch("/api/url/summarize", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url }),
            }),
          ]);

          if (titleResponse.ok) {
            const titleData = await titleResponse.json();
            urlTitle = titleData.title;
          }

          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            summary = summaryData.summary;
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
                  <InputBar />
                </div>
                <div className="px-6">
                  <DateTabs value={selectedPeriod} onValueChange={setSelectedPeriod} />
                </div>
                {selectedPeriod === "week" && (
                  <div className="flex flex-col gap-4 px-6">
                    <WellbeingCard />
                    <HealthCard />
                  </div>
                )}
                {selectedPeriod === "month" && (
                  <div className="flex flex-col gap-4 px-6">
                    <Card className="border-none bg-white shadow-sm">
                      <CardHeader className="pb-2 pt-6">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
                          Monthly Overview
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600">
                          View your monthly progress and goals here.
                        </p>
                      </CardContent>
                    </Card>
                    <WellbeingCard />
                    <HealthCard />
                  </div>
                )}
                {selectedPeriod === "year" && (
                  <div className="flex flex-col gap-4 px-6">
                    <Card className="border-none bg-white shadow-sm">
                      <CardHeader className="pb-2 pt-6">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
                          Yearly Goals
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600">
                          Track your long-term goals and annual progress.
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-none bg-white shadow-sm">
                      <CardHeader className="pb-2 pt-6">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
                          Annual Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600">
                          Your yearly achievements and milestones.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-4 px-6">
                <NotepadCard 
                  notes={notes} 
                  onToggleNote={handleToggleNote} 
                  onAddNote={handleAddNote}
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
