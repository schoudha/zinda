"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAutoSaveNote } from "@/hooks/useAutoSaveNote";

const NOTEPAD_THIS_WEEK_ID = "notepad_this_week";
const NOTEPAD_FUTURE_ID = "notepad_future";

interface NotepadCardProps {
  notes?: any[]; // Deprecated, not used
}

export function NotepadCard({ notes }: NotepadCardProps) {
  const thisWeek = useAutoSaveNote(NOTEPAD_THIS_WEEK_ID);
  const future = useAutoSaveNote(NOTEPAD_FUTURE_ID);

  // Show loading only if both are loading initially
  const isLoading = thisWeek.isLoading && future.isLoading;

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
          <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
            This week
            {thisWeek.isSaving && <span className="text-xs text-muted-foreground font-normal animate-pulse">(Saving...)</span>}
          </h3>
          <Textarea
            value={thisWeek.text}
            onChange={(e) => thisWeek.handleChange(e.target.value)}
            placeholder="What are you focusing on this week?"
            className="min-h-[120px] resize-none text-sm leading-relaxed bg-muted/50 border-transparent focus:border-primary/20 focus:bg-card focus:ring-4 focus:ring-primary/10 rounded-xl transition-all duration-300 placeholder:text-muted-foreground"
          />
        </div>

        {/* Future Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
            Future
            {future.isSaving && <span className="text-xs text-muted-foreground font-normal animate-pulse">(Saving...)</span>}
          </h3>
          <Textarea
            value={future.text}
            onChange={(e) => future.handleChange(e.target.value)}
            placeholder="What are your long-term plans and ideas?"
            className="min-h-[120px] resize-none text-sm leading-relaxed bg-muted/50 border-transparent focus:border-primary/20 focus:bg-card focus:ring-4 focus:ring-primary/10 rounded-xl transition-all duration-300 placeholder:text-muted-foreground"
          />
        </div>
      </CardContent>
    </Card>
  );
}
