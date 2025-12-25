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
import { ExternalLink, Sparkles, Loader2, Youtube, Plus, FileText } from "lucide-react";
import { isYoutubeUrl } from "@/lib/url-utils";
import { Input } from "@/components/ui/input";

interface NotepadCardProps {
  notes: Note[];
  onToggleNote: (noteId: string) => void;
  onAddNote: (text: string) => void;
}

export function NotepadCard({ notes, onToggleNote, onAddNote }: NotepadCardProps) {
  const [newNoteText, setNewNoteText] = useState("");
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  const [loadingSummaries, setLoadingSummaries] = useState<Set<string>>(new Set());
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNoteText.trim()) {
      onAddNote(newNoteText);
      setNewNoteText("");
    }
  };

  const handleGetSummary = (noteId: string, url: string, title: string) => {
    setOpenDialogId(noteId);

    // Check if note already has a summary
    const note = notes.find((n) => n.id === noteId);
    if (note?.summary) {
      // Summary already exists, just open dialog
      return;
    }

    // If we have it in local state, use that
    if (summaries[noteId]) return;

    // Otherwise, fetch it (fallback for old notes without summaries)
    // Skip summary fetching for YouTube URLs (disabled due to blocking issues)
    if (isYoutubeUrl(url)) {
      setSummaries((prev) => ({ 
        ...prev, 
        [noteId]: "Summary generation is not available for YouTube videos at this time." 
      }));
      return;
    }

    setLoadingSummaries((prev) => new Set(prev).add(noteId));

    fetch("/api/url/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          return data;
        }
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to fetch summary: ${response.status}`);
      })
      .then((data) => {
        if (data.summary) {
          setSummaries((prev) => ({ ...prev, [noteId]: data.summary }));
        } else {
          setSummaries((prev) => ({ ...prev, [noteId]: "No summary available." }));
        }
      })
      .catch((error) => {
        console.error("Error fetching summary:", error);
        const errorMessage = error.message || "Error loading summary. Please try again.";
        setSummaries((prev) => ({ ...prev, [noteId]: errorMessage }));
      })
      .finally(() => {
        setLoadingSummaries((prev) => {
          const next = new Set(prev);
          next.delete(noteId);
          return next;
        });
      });
  };

  const currentNote = notes.find((note) => note.id === openDialogId);

  return (
    <Card className="border-none bg-white shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden ring-1 ring-black/5">
      <CardHeader className="pb-4 pt-8 px-8 bg-gradient-to-b from-white to-gray-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-900 tracking-tight">
            Notes
          </CardTitle>
          <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
            {notes.length} {notes.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-8">
        <form onSubmit={handleAddSubmit} className="flex gap-2 mb-6 relative group">
          <Input
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Add a new note..."
            className="flex-1 h-12 pl-4 pr-12 text-sm bg-gray-50 border-transparent focus:border-blue-500/20 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all duration-300"
          />
          <Button 
            type="submit" 
            size="sm" 
            className="absolute right-1.5 top-1.5 h-9 w-9 p-0 rounded-lg bg-black text-white hover:bg-gray-800 hover:scale-105 transition-all duration-200 shadow-md"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </form>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-50">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-400">
              Your notepad is empty
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="group flex items-start gap-3 p-3 -mx-3 rounded-xl hover:bg-gray-50 transition-colors duration-200">
                <Checkbox
                  checked={note.checked}
                  onCheckedChange={() => onToggleNote(note.id)}
                  className="mt-1 border-2 border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded-md h-5 w-5 transition-all duration-200"
                />
                <div className="flex-1 min-w-0 pt-0.5">
                  {note.url && note.urlTitle ? (
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-4">
                        <a
                          href={note.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm font-medium flex items-start gap-2 hover:underline transition-colors ${
                            note.checked
                              ? "line-through text-gray-400 decoration-gray-300"
                              : "text-blue-600 hover:text-blue-700"
                          }`}
                        >
                          {isYoutubeUrl(note.url) ? (
                            <div className="flex items-center justify-center h-5 w-5 rounded bg-red-50 text-red-600 shrink-0 mt-0.5">
                              <Youtube className="h-3.5 w-3.5" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-5 w-5 rounded bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <span className="flex-1 min-w-0 break-words whitespace-normal">{note.urlTitle}</span>
                        </a>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGetSummary(note.id, note.url!, note.urlTitle!)}
                          disabled={loadingSummaries.has(note.id)}
                          className="h-7 w-7 p-0 rounded-full hover:bg-purple-50 text-purple-600 opacity-0 group-hover:opacity-100 transition-all duration-200"
                        >
                          {loadingSummaries.has(note.id) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <span
                      className={`text-sm font-medium transition-all duration-200 block leading-relaxed break-words whitespace-pre-wrap ${
                        note.checked ? "line-through text-gray-400 decoration-gray-300" : "text-gray-700"
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
              ) : (currentNote.summary || summaries[currentNote.id]) ? (
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {currentNote.summary || summaries[currentNote.id]}
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

