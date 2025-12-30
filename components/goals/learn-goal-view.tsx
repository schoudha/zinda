"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, FileText } from "lucide-react";
import { MediaCard } from "@/components/dashboard/media-card";
import { Goal, Note } from "@/types";

interface LearnGoalViewProps {
  goal: Goal;
  learnProgress: number;
  handleIncrementLearnProgress: (points: number) => void;
  isUpdatingLearnProgress: boolean;
  notes: Note[];
  toggleNote: (id: string) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
}

export function LearnGoalView({
  learnProgress,
  handleIncrementLearnProgress,
  isUpdatingLearnProgress,
  notes,
  toggleNote,
  updateNote,
  deleteNote,
}: LearnGoalViewProps) {
  return (
    <div className="space-y-4">
      {/* Manual Progress Tracking */}
      <Card className="border-none shadow-sm bg-blue-50 dark:bg-blue-950/30">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Today's Progress
            </span>
            <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {learnProgress} points
            </span>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => handleIncrementLearnProgress(1)}
              disabled={isUpdatingLearnProgress}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileText className="h-4 w-4 mr-2" />
              Article (+1)
            </Button>
            <Button
              onClick={() => handleIncrementLearnProgress(10)}
              disabled={isUpdatingLearnProgress}
              className="flex-1 h-12 bg-blue-700 hover:bg-blue-800 text-white"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Book (+10)
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <MediaCard 
        notes={notes} 
        onToggleNote={toggleNote}
        onUpdateNote={updateNote}
        onDeleteNote={deleteNote}
      />
    </div>
  );
}

