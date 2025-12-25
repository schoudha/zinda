"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Note } from "@/app/page";

interface NotepadCardProps {
  notes: Note[];
  onToggleNote: (noteId: string) => void;
}

export function NotepadCard({ notes, onToggleNote }: NotepadCardProps) {
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
                <span
                  className={`text-sm font-medium text-gray-900 flex-1 ${
                    note.checked ? "line-through text-gray-400" : ""
                  }`}
                >
                  {note.text}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

