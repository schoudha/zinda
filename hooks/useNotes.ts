import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Note, Goal } from "@/types";
import { api } from "@/lib/api";
import { getFirstUrl, isYoutubeUrl } from "@/lib/url-utils";
import { useEffect, useCallback } from "react";
import { generateId } from "@/lib/id-utils";

export function useNotes() {
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: api.notes.list,
  });

  const addMutation = useMutation({
    mutationFn: async (noteText: string) => {
      const text = noteText.trim();
      if (!text) throw new Error("Empty note");

      const url = getFirstUrl(text);
      let urlTitle: string | undefined;
      let summary: string | undefined;

      if (url) {
        try {
          const isYouTube = isYoutubeUrl(url);
          
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
        id: generateId(),
        text: text,
        checked: false,
        checkedAt: null,
        createdAt: new Date(),
        url: url || undefined,
        urlTitle,
        summary,
      };

      return api.notes.create(newNote);
    },
    onMutate: async (noteText) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const previousNotes = queryClient.getQueryData<Note[]>(["notes"]);

      const text = noteText.trim();
      const url = getFirstUrl(text);

      const optimisticNote: Note = {
        id: generateId(),
        text,
        checked: false,
        checkedAt: null,
        createdAt: new Date(),
        url: url || undefined,
        urlTitle: undefined,
        summary: undefined,
      };

      queryClient.setQueryData<Note[]>(["notes"], (old) => [optimisticNote, ...(old || [])]);
      return { previousNotes };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["notes"], context?.previousNotes);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Note> }) => 
      api.notes.update(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const previousNotes = queryClient.getQueryData<Note[]>(["notes"]);

      queryClient.setQueryData<Note[]>(["notes"], (old) =>
        (old || []).map((n) => (n.id === id ? { ...n, ...updates } : n))
      );
      return { previousNotes };
    },
    onSuccess: async (updatedNote, variables) => {
      // If a note was checked and has a URL (read/watch item), increment learn goal progress
      // api.notes.update returns Note directly
      if (updatedNote.checked && updatedNote.url && variables.updates.checked === true) {
        try {
          // Get goals from query cache
          const goals = queryClient.getQueryData<Goal[]>(["goals"]) || [];
          const learnGoal = goals.find((g) => g.category === "learn");
          
          if (learnGoal) {
            // Get current progress
            const progress = queryClient.getQueryData<Record<string, number>>(["goal-progress", "today"]) || {};
            const currentProgress = progress[learnGoal.id] || 0;
            
            // Increment progress by 1
            await api.goals.progress.updateToday(learnGoal.id, currentProgress + 1);
            
            // Invalidate queries to refresh UI
            queryClient.invalidateQueries({ queryKey: ["goal-progress"] });
          }
        } catch (error) {
          // Silently fail - progress update is secondary to note update
          console.error("Error updating learn goal progress:", error);
        }
      }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["notes"], context?.previousNotes);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.notes.delete,
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const previousNotes = queryClient.getQueryData<Note[]>(["notes"]);
      
      queryClient.setQueryData<Note[]>(["notes"], (old) =>
        (old || []).filter((n) => n.id !== noteId)
      );
      return { previousNotes };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["notes"], context?.previousNotes);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  const toggleNote = useCallback((noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const checked = !note.checked;
    const checkedAt = checked ? new Date() : null;

    updateMutation.mutate({ 
      id: noteId, 
      updates: { checked, checkedAt } 
    });
  }, [notes, updateMutation]);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    updateMutation.mutate({ id, updates });
  }, [updateMutation]);

  // Cleanup logic - runs once on mount and then hourly
  useEffect(() => {
    const cleanup = async () => {
      const currentNotes = queryClient.getQueryData<Note[]>(["notes"]) || [];
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
        try {
            await api.notes.cleanup(idsToDelete);
            queryClient.invalidateQueries({ queryKey: ["notes"] });
        } catch (err) {
            console.error("Error cleaning up notes:", err);
        }
      }
    };

    // Run cleanup once after initial data load (small delay to ensure data is hydrated)
    const timeout = setTimeout(cleanup, 1000);
    
    // Also run on interval (every hour)
    const interval = setInterval(cleanup, 60 * 60 * 1000);
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [queryClient]);

  return {
    notes,
    isLoading,
    addNote: addMutation.mutateAsync,
    toggleNote,
    updateNote,
    deleteNote: deleteMutation.mutateAsync
  };
}
