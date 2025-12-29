"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

const NOTEPAD_THIS_WEEK_ID = "notepad_this_week";
const NOTEPAD_FUTURE_ID = "notepad_future";

interface NotepadCardProps {
  notes: any[]; // Keep for compatibility but we won't use it directly
}

export function NotepadCard({ notes }: NotepadCardProps) {
  const queryClient = useQueryClient();
  const [thisWeekText, setThisWeekText] = useState("");
  const [futureText, setFutureText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const thisWeekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const futureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load notepad content on mount
  useEffect(() => {
    const loadNotepad = async () => {
      try {
        // Try to load both sections
        const allNotes = await api.notes.list();
        
        const thisWeekNote = allNotes.find(n => n.id === NOTEPAD_THIS_WEEK_ID);
        const futureNote = allNotes.find(n => n.id === NOTEPAD_FUTURE_ID);
        
        if (thisWeekNote) {
          setThisWeekText(thisWeekNote.text || "");
        }
        if (futureNote) {
          setFutureText(futureNote.text || "");
        }
      } catch (error) {
        console.error("Error loading notepad:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotepad();
  }, []);

  // Save "This week" with debounce
  const saveThisWeek = async (text: string) => {
    try {
      // Check if note exists
      const allNotes = await api.notes.list();
      const existingNote = allNotes.find(n => n.id === NOTEPAD_THIS_WEEK_ID);
      
      if (existingNote) {
        // Update existing note
        await api.notes.update(NOTEPAD_THIS_WEEK_ID, { text });
      } else {
        // Create new note
        await api.notes.create({
          id: NOTEPAD_THIS_WEEK_ID,
          text: text,
          checked: false,
          createdAt: new Date(),
        });
      }
      // Invalidate notes query to refresh the cache
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    } catch (error) {
      console.error("Error saving notepad (this week):", error);
    }
  };

  // Save "Future" with debounce
  const saveFuture = async (text: string) => {
    try {
      // Check if note exists
      const allNotes = await api.notes.list();
      const existingNote = allNotes.find(n => n.id === NOTEPAD_FUTURE_ID);
      
      if (existingNote) {
        // Update existing note
        await api.notes.update(NOTEPAD_FUTURE_ID, { text });
      } else {
        // Create new note
        await api.notes.create({
          id: NOTEPAD_FUTURE_ID,
          text: text,
          checked: false,
          createdAt: new Date(),
        });
      }
      // Invalidate notes query to refresh the cache
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    } catch (error) {
      console.error("Error saving notepad (future):", error);
    }
  };

  const handleThisWeekChange = (value: string) => {
    setThisWeekText(value);
    
    // Clear existing timeout
    if (thisWeekTimeoutRef.current) {
      clearTimeout(thisWeekTimeoutRef.current);
    }
    
    // Set new timeout to save after 1 second of no typing
    thisWeekTimeoutRef.current = setTimeout(() => {
      saveThisWeek(value);
    }, 1000);
  };

  const handleFutureChange = (value: string) => {
    setFutureText(value);
    
    // Clear existing timeout
    if (futureTimeoutRef.current) {
      clearTimeout(futureTimeoutRef.current);
    }
    
    // Set new timeout to save after 1 second of no typing
    futureTimeoutRef.current = setTimeout(() => {
      saveFuture(value);
    }, 1000);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (thisWeekTimeoutRef.current) {
        clearTimeout(thisWeekTimeoutRef.current);
      }
      if (futureTimeoutRef.current) {
        clearTimeout(futureTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <Card className="border-none bg-card shadow-xl shadow-black/5 rounded-3xl overflow-hidden ring-1 ring-border w-full max-w-full">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none bg-card shadow-xl shadow-black/5 rounded-3xl overflow-hidden ring-1 ring-border w-full max-w-full">
      <CardHeader className="pb-4 pt-6 px-4 bg-gradient-to-b from-card to-muted/50">
        <CardTitle className="text-lg font-bold text-foreground tracking-tight">
          Notepad
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-6 space-y-6">
        {/* This Week Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            This week
          </h3>
          <Textarea
            value={thisWeekText}
            onChange={(e) => handleThisWeekChange(e.target.value)}
            placeholder="What are you focusing on this week?"
            className="min-h-[120px] resize-none text-sm leading-relaxed bg-muted/50 border-transparent focus:border-primary/20 focus:bg-card focus:ring-4 focus:ring-primary/10 rounded-xl transition-all duration-300 placeholder:text-muted-foreground"
          />
        </div>

        {/* Future Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            Future
          </h3>
          <Textarea
            value={futureText}
            onChange={(e) => handleFutureChange(e.target.value)}
            placeholder="What are your long-term plans and ideas?"
            className="min-h-[120px] resize-none text-sm leading-relaxed bg-muted/50 border-transparent focus:border-primary/20 focus:bg-card focus:ring-4 focus:ring-primary/10 rounded-xl transition-all duration-300 placeholder:text-muted-foreground"
          />
        </div>
      </CardContent>
    </Card>
  );
}
