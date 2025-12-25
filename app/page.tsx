"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/dashboard/header";
import { DateTabs } from "@/components/dashboard/date-tabs";
import { NotepadCard } from "@/components/dashboard/notepad";
import { WellbeingCard } from "@/components/dashboard/wellbeing-card";
import { HealthCard } from "@/components/dashboard/health-card";
import { InputBar } from "@/components/dashboard/input-bar";
import { ScrollArea } from "@/components/ui/scroll-area";
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
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

      // Fetch URL title if URL is found
      if (url) {
        try {
          const response = await fetch("/api/url/title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
          if (response.ok) {
            const data = await response.json();
            urlTitle = data.title;
          }
        } catch (error) {
          console.error("Error fetching URL title:", error);
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
      const urlParams = new URLSearchParams(window.location.search);
      const title = urlParams.get('title');
      const text = urlParams.get('text');
      const url = urlParams.get('url');
      
      // Determine what to save - prioritize URL if present, otherwise use text or title
      const sharedContent = url || text || title || null;
      
      if (sharedContent) {
        // Add it as a note using the existing handler
        await handleAddNote(sharedContent);
        
        // Clean up the URL parameters
        window.history.replaceState({}, '', window.location.pathname);
      }
    };

    handleSharedContent();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up notes checked more than 1 week ago
  useEffect(() => {
    const cleanup = async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Find notes to delete
      const notesToDelete = notes.filter(
        (note) =>
          note.checked &&
          note.checkedAt &&
          new Date(note.checkedAt) <= oneWeekAgo
      );

      if (notesToDelete.length > 0) {
        const idsToDelete = notesToDelete.map((n) => n.id).join(",");

        try {
          const response = await fetch(`/api/notes?ids=${encodeURIComponent(idsToDelete)}`, {
            method: "DELETE",
          });

          if (response.ok) {
            // Remove from local state
            setNotes((prev) =>
              prev.filter(
                (note) =>
                  !note.checked ||
                  !note.checkedAt ||
                  new Date(note.checkedAt) > oneWeekAgo
              )
            );
          }
        } catch (error) {
          console.error("Error cleaning up notes:", error);
        }
      } else {
        // Just update local state if no API calls needed
        setNotes((prev) =>
          prev.filter(
            (note) =>
              !note.checked ||
              !note.checkedAt ||
              new Date(note.checkedAt) > oneWeekAgo
          )
        );
      }
    };

    // Run cleanup on mount and then every hour (only if we have notes)
    if (notes.length > 0) {
      cleanup();
      const interval = setInterval(cleanup, 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [notes]);

  return (
    <PasswordGate>
      <main className="flex min-h-screen justify-center bg-gray-50">
        <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl overflow-hidden min-h-screen relative">
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-6 pb-6">
              <Header />
              <div className="px-6">
                <InputBar onAddNote={handleAddNote} />
              </div>
              <div className="px-6">
                <DateTabs />
              </div>
              
              <div className="flex flex-col gap-4 px-6">
                <NotepadCard notes={notes} onToggleNote={handleToggleNote} />
                <WellbeingCard />
                <HealthCard />
              </div>
            </div>
          </ScrollArea>
        </div>
      </main>
    </PasswordGate>
  );
}
