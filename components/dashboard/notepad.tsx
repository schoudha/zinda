"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Note } from "@/app/page";
import { ExternalLink, Sparkles, Loader2 } from "lucide-react";

interface NotepadCardProps {
  notes: Note[];
  onToggleNote: (noteId: string) => void;
}

export function NotepadCard({ notes, onToggleNote }: NotepadCardProps) {
  const [loadingSummaries, setLoadingSummaries] = useState<Set<string>>(new Set());
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  const handleGetSummary = async (noteId: string, url: string) => {
    if (summaries[noteId]) return; // Already have summary

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
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setLoadingSummaries((prev) => {
        const next = new Set(prev);
        next.delete(noteId);
        return next;
      });
    }
  };

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
                          onClick={() => handleGetSummary(note.id, note.url!)}
                          disabled={loadingSummaries.has(note.id)}
                          className="h-6 w-6 p-0"
                        >
                          {loadingSummaries.has(note.id) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                          )}
                        </Button>
                      </div>
                      {summaries[note.id] && (
                        <div className="ml-5 p-2 bg-purple-50 rounded border border-purple-100">
                          <p className="text-xs text-gray-700 whitespace-pre-wrap">
                            {summaries[note.id]}
                          </p>
                        </div>
                      )}
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
    </Card>
  );
}

