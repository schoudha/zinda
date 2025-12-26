"use client";

import { Target, FileText, Book } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: "goals" | "notepad" | "media";
  onTabChange: (tab: "goals" | "notepad" | "media") => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg shadow-gray-200/50 pb-safe">
      <nav className="flex justify-around items-center max-w-md mx-auto">
        <button
          onClick={() => onTabChange("goals")}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1.5 py-3 transition-colors duration-200",
            activeTab === "goals"
              ? "text-black"
              : "text-gray-400 hover:text-gray-600"
          )}
        >
          <div className={cn("p-1 rounded-lg transition-all duration-200", activeTab === "goals" && "bg-gray-100")}>
            <Target className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide">GOALS</span>
        </button>
        <button
          onClick={() => onTabChange("media")}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1.5 py-3 transition-colors duration-200",
            activeTab === "media"
              ? "text-black"
              : "text-gray-400 hover:text-gray-600"
          )}
        >
          <div className={cn("p-1 rounded-lg transition-all duration-200", activeTab === "media" && "bg-gray-100")}>
            <Book className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide">READ/LISTEN/WATCH</span>
        </button>
        <button
          onClick={() => onTabChange("notepad")}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1.5 py-3 transition-colors duration-200",
            activeTab === "notepad"
              ? "text-black"
              : "text-gray-400 hover:text-gray-600"
          )}
        >
          <div className={cn("p-1 rounded-lg transition-all duration-200", activeTab === "notepad" && "bg-gray-100")}>
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide">NOTEPAD</span>
        </button>
      </nav>
    </div>
  );
}

