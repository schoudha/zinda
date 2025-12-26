"use client";

import { useState, useEffect, useRef } from "react";
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
import { Note } from "@/types";
import { ExternalLink, Sparkles, Loader2, Youtube, Trash2, BookOpen } from "lucide-react";
import { isYoutubeUrl } from "@/lib/url-utils";
import { api } from "@/lib/api";

interface MediaCardProps {
  notes: Note[];
  onToggleNote: (noteId: string) => void;
  onUpdateNote?: (noteId: string, updates: Partial<Note>) => void;
  onDeleteNote?: (noteId: string) => void;
}

export function MediaCard({ notes, onToggleNote, onUpdateNote, onDeleteNote }: MediaCardProps) {
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  const [loadingSummaries, setLoadingSummaries] = useState<Set<string>>(new Set());
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  
  // Track attempted fetches to prevent infinite loops (ref persists across renders without triggering them)
  const attemptedTitles = useRef<Set<string>>(new Set());

  // Filter notes to only show those with URLs
  const mediaNotes = notes.filter(note => note.url);

  // Effect to fetch missing titles for URLs
  useEffect(() => {
    mediaNotes.forEach(note => {
      // Only fetch if:
      // 1. Has URL
      // 2. No title yet
      // 3. Haven't tried fetching this session
      // 4. onUpdateNote handler is available
      if (note.url && !note.urlTitle && !attemptedTitles.current.has(note.id) && onUpdateNote) {
        attemptedTitles.current.add(note.id);
        
        api.url.title(note.url)
          .then(title => {
            if (title) {
              onUpdateNote(note.id, { urlTitle: title });
            }
          })
          .catch(() => {
            // Silently fail - we'll just show the URL/text
          });
      }
    });
  }, [mediaNotes, onUpdateNote]);

  const handleGetSummary = (noteId: string, url: string, title: string) => {
    setOpenDialogId(noteId);

    // Check if note already has a summary
    const note = mediaNotes.find((n) => n.id === noteId);
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

    api.url.summarize(url)
      .then((summary) => {
        if (summary) {
          setSummaries((prev) => ({ ...prev, [noteId]: summary }));
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

  const currentNote = mediaNotes.find((note) => note.id === openDialogId);

  return (
    <Card className="border-none bg-white shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden ring-1 ring-black/5 w-full max-w-full">
      <CardHeader className="pb-4 pt-6 px-4 bg-gradient-to-b from-white to-gray-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-900 tracking-tight">
            Read/Listen/Watch
          </CardTitle>
          <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
            {mediaNotes.length} {mediaNotes.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-6">
        {mediaNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-50">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-400">
              No URLs, videos, or podcasts yet
            </p>
            <p className="text-xs text-gray-400">
              Share a link to get started
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {mediaNotes.map((note) => (
              <li key={note.id} className="group flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200 overflow-hidden">
                <Checkbox
                  checked={note.checked}
                  onCheckedChange={() => onToggleNote(note.id)}
                  className="mt-0.5 border-2 border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded-md h-5 w-5 transition-all duration-200 shrink-0"
                />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-start gap-2 w-full">
                    <div className="flex-1 min-w-0 overflow-hidden">
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
                        {isYoutubeUrl(note.url!) ? (
                          <div className="flex items-center justify-center h-5 w-5 rounded bg-red-50 text-red-600 shrink-0">
                            <Youtube className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-5 w-5 rounded bg-blue-50 text-blue-600 shrink-0">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <span className="break-words" style={{ wordBreak: 'break-word' }}>
                          {note.urlTitle || note.text}
                        </span>
                      </a>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGetSummary(note.id, note.url!, note.urlTitle || note.text)}
                        disabled={loadingSummaries.has(note.id)}
                        className="h-8 w-8 p-0 rounded-full hover:bg-purple-50 text-purple-600 transition-all duration-200"
                      >
                        {loadingSummaries.has(note.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                      {onDeleteNote && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteNote(note.id)}
                          className="h-8 w-8 p-0 rounded-full hover:bg-red-50 text-red-500 transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
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

