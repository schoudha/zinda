"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody,
} from "@/components/ui/dialog";
import { Note } from "@/app/page";
import { ExternalLink, Sparkles, Loader2 } from "lucide-react";

interface NotepadCardProps {
  notes: Note[];
  onToggleNote: (noteId: string) => void;
}

export function NotepadCard({ notes, onToggleNote }: NotepadCardProps) {
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  const [loadingSummaries, setLoadingSummaries] = useState<Set<string>>(new Set());
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  const handleGetSummary = async (noteId: string, url: string, title: string) => {
    setOpenDialogId(noteId);

    // If we already have the summary, just open the dialog
    if (summaries[noteId]) return;

    setLoadingSummaries((prev) => new Set(prev).add(noteId));

    try {
      const response = await fetch("/api/url/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        const data = await response.json();
        setSummaries((prev) => ({ ...prev, [noteId]: data.summary }));
      } else {
        setSummaries((prev) => ({ ...prev, [noteId]: "Unable to generate summary. Please try again later." }));
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
      setSummaries((prev) => ({ ...prev, [noteId]: "Error loading summary. Please try again." }));
    } finally {
      setLoadingSummaries((prev) => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
    }
  };

  const currentNote = notes.find((note) => note.id === openDialogId);

  return (
    <Card className="border-none bg-white shadow-sm">
      <CardHeader className="pb-2 pt-6">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-4">
            No notes yet. Add a note using the input above.
          </p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="flex items-start gap-3">
                <Checkbox
                  checked={note.checked}
                  onCheckedChange={() => onToggleNote(note.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  {note.url && note.urlTitle ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={note.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm font-medium flex items-center gap-1.5 hover:underline ${
                            note.checked
                              ? "line-through text-gray-400"
                              : "text-blue-600"
                          }`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {note.urlTitle}
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGetSummary(note.id, note.url!, note.urlTitle!)}
                          disabled={loadingSummaries.has(note.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <span
                      className={`text-sm font-medium text-gray-900 ${
                        note.checked ? "line-through text-gray-400" : ""
                      }`}
                    >
                      {note.text}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {currentNote && (
        <Dialog open={openDialogId === currentNote.id} onOpenChange={(open) => !open && setOpenDialogId(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <DialogTitle>{currentNote.urlTitle || "Article Summary"}</DialogTitle>
              </div>
              <DialogClose onClose={() => setOpenDialogId(null)} />
            </DialogHeader>
            <DialogBody>
              {loadingSummaries.has(currentNote.id) ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : summaries[currentNote.id] ? (
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {summaries[currentNote.id]}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Loading summary...</p>
              )}
            </DialogBody>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

