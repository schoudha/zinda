"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Note } from "@/types";
import { Plus, FileText, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface NotepadCardProps {
  notes: Note[];
  onToggleNote: (noteId: string) => void;
  onAddNote: (text: string) => void;
  onUpdateNote?: (noteId: string, updates: Partial<Note>) => void;
  onDeleteNote?: (noteId: string) => void;
}

export function NotepadCard({ notes, onToggleNote, onAddNote, onUpdateNote, onDeleteNote }: NotepadCardProps) {
  const [newNoteText, setNewNoteText] = useState("");

  // Filter notes to only show text notes (no URLs)
  const textNotes = notes.filter(note => !note.url);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNoteText.trim()) {
      onAddNote(newNoteText);
      setNewNoteText("");
    }
  };


  return (
    <Card className="border-none bg-white shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden ring-1 ring-black/5 w-full max-w-full">
      <CardHeader className="pb-4 pt-6 px-4 bg-gradient-to-b from-white to-gray-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-900 tracking-tight">
            Notes
          </CardTitle>
          <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
            {textNotes.length} {textNotes.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-6">
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

        {textNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-50">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-400">
              Your notepad is empty
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {textNotes.map((note) => (
              <li key={note.id} className="group flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors duration-200 overflow-hidden">
                <Checkbox
                  checked={note.checked}
                  onCheckedChange={() => onToggleNote(note.id)}
                  className="mt-0.5 border-2 border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded-md h-5 w-5 transition-all duration-200 shrink-0"
                />
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-start gap-2 w-full">
                    <span
                      className={`text-sm font-medium transition-all duration-200 leading-relaxed flex-1 min-w-0 ${
                        note.checked ? "line-through text-gray-400 decoration-gray-300" : "text-gray-700"
                      }`}
                      style={{ wordBreak: 'break-word' }}
                    >
                      {note.text}
                    </span>
                    {onDeleteNote && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteNote(note.id)}
                        className="h-8 w-8 p-0 rounded-full hover:bg-red-50 text-red-500 transition-all duration-200 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
