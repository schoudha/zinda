"use client";

import { Target, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: "goals" | "notepad";
  onTabChange: (tab: "goals" | "notepad") => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-md">
        <button
          onClick={() => onTabChange("goals")}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors",
            activeTab === "goals"
              ? "text-black"
              : "text-gray-400"
          )}
        >
          <Target className="h-5 w-5" />
          <span className="text-xs font-medium">Goals</span>
        </button>
        <button
          onClick={() => onTabChange("notepad")}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors",
            activeTab === "notepad"
              ? "text-black"
              : "text-gray-400"
          )}
        >
          <FileText className="h-5 w-5" />
          <span className="text-xs font-medium">Notepad</span>
        </button>
      </div>
    </nav>
  );
}

