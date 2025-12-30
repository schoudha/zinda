import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Note } from "@/types";

export function useAutoSaveNote(noteId: string) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: note, isLoading } = useQuery({
    queryKey: ["note", noteId],
    queryFn: () => api.notes.get(noteId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sync initial data from server if we're not currently typing
  useEffect(() => {
    if (note && !isTyping) {
      setText(note.text || "");
    } else if (!note && !isLoading && !isTyping) {
      // If loaded and no note exists, ensure text is empty (unless we initialized it)
      // keeping current text is safer to avoid wiping user input if fetch fails/returns null late
    }
  }, [note, isTyping, isLoading]);

  const saveMutation = useMutation({
    mutationFn: async (newText: string) => {
      // We check the cache directly or the note object from closure.
      // To be safe, we check if we have a note object in the data.
      // However, data might be stale.
      // Best approach for "known ID" items: try update, if fail (404), create?
      // Or: if we have 'note' loaded, update. If not, create.
      
      // Since we just loaded 'note', we trust it.
      if (note) {
        return api.notes.update(noteId, { text: newText });
      } else {
        return api.notes.create({
          id: noteId,
          text: newText,
          checked: false,
          createdAt: new Date(),
        });
      }
    },
    onSuccess: (savedNote) => {
      // Update cache immediately so next save knows it exists
      queryClient.setQueryData(["note", noteId], savedNote);
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (error) => {
      console.error(`Error saving note ${noteId}:`, error);
    }
  });

  const handleChange = (newText: string) => {
    setText(newText);
    setIsTyping(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveMutation.mutate(newText);
      setIsTyping(false);
    }, 1000);
  };

  return {
    text,
    handleChange,
    isLoading: isLoading && !text,
    isSaving: saveMutation.isPending,
  };
}

