"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NotepadCardProps {
  notes?: string[];
}

export function NotepadCard({ notes = [] }: NotepadCardProps) {
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
            {notes.map((note, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-black" />
                <span className="text-sm font-medium text-gray-900">{note}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

