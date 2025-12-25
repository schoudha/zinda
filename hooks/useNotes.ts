import { useState, useCallback, useEffect } from "react";
import { Note } from "@/types";
import { api } from "@/lib/api";
import { getFirstUrl, isYoutubeUrl } from "@/lib/url-utils";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshNotes = useCallback(async () => {
    try {
      const data = await api.notes.list();
      setNotes(data || []);
    } catch (error) {
      console.error("Error loading notes:", error);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await refreshNotes();
      setIsLoading(false);
    };
    load();
  }, [refreshNotes]);

  const addNote = useCallback(async (noteText: string) => {
    if (!noteText.trim()) return;

    const url = getFirstUrl(noteText.trim());
    let urlTitle: string | undefined;
    let summary: string | undefined;

    if (url) {
      try {
        const isYouTube = isYoutubeUrl(url);
        
        // Parallel fetching for title and summary if possible
        const titlePromise = api.url.title(url).catch(err => {
          console.error("Title fetch failed:", err);
          return undefined;
        });
        
        let summaryPromise = Promise.resolve(undefined as string | undefined);
        if (!isYouTube) {
          summaryPromise = api.url.summarize(url).catch(err => {
            console.error("Summary fetch failed:", err);
            return undefined;
          });
        }

        [urlTitle, summary] = await Promise.all([titlePromise, summaryPromise]);
      } catch (error) {
        console.error("Error fetching URL data:", error);
      }
    }

    const newNote: Partial<Note> = {
      id: Date.now().toString(),
      text: noteText.trim(),
      checked: false,
      checkedAt: null,
      createdAt: new Date(),
      url: url || undefined,
      urlTitle,
      summary,
    };

    // Optimistic update
    setNotes((prev) => [newNote as Note, ...prev]);

    try {
      const createdNote = await api.notes.create(newNote);
      setNotes((prev) => [createdNote, ...prev.filter(n => n.id !== newNote.id)]);
    } catch (error) {
      console.error("Error saving note:", error);
      // Keep optimistic note but maybe show error? 
      // For now we leave it as per original logic which kept it in local state
    }
  }, []);

  const toggleNote = useCallback(async (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const updatedNote = {
      ...note,
      checked: !note.checked,
      checkedAt: !note.checked ? new Date() : null,
    };

    // Optimistic update
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? updatedNote : n))
    );

    try {
      const savedNote = await api.notes.update(noteId, {
        checked: updatedNote.checked,
        checkedAt: updatedNote.checkedAt,
      });
      
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? savedNote : n))
      );
    } catch (error) {
      console.error("Error updating note:", error);
      // Revert
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? note : n))
      );
    }
  }, [notes]);

  const updateNote = useCallback(async (noteId: string, updates: Partial<Note>) => {
    // Optimistic
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, ...updates } : n))
    );

    try {
      await api.notes.update(noteId, updates);
    } catch (error) {
      console.error("Error updating note:", error);
    }
  }, []);

  const deleteNote = useCallback(async (noteId: string) => {
    // Optimistic
    setNotes((prev) => prev.filter((n) => n.id !== noteId));

    try {
      await api.notes.delete(noteId);
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  }, []);

  // Cleanup logic
  useEffect(() => {
    const cleanup = async () => {
      setNotes((currentNotes) => {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const notesToDelete = currentNotes.filter(
          (note) =>
            note.checked &&
            note.checkedAt &&
            new Date(note.checkedAt) <= oneDayAgo
        );

        if (notesToDelete.length > 0) {
          const idsToDelete = notesToDelete.map((n) => n.id).join(",");
          api.notes.cleanup(idsToDelete).catch(err => console.error("Error cleaning up notes:", err));
          
          return currentNotes.filter(
            (note) =>
              !note.checked ||
              !note.checkedAt ||
              new Date(note.checkedAt) > oneDayAgo
          );
        }
        return currentNotes;
      });
    };

    const interval = setInterval(cleanup, 60 * 60 * 1000);
    const timeout = setTimeout(cleanup, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return {
    notes,
    isLoading,
    addNote,
    toggleNote,
    updateNote,
    deleteNote
  };
}

