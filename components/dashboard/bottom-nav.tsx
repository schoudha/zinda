"use client";

import { memo, useCallback } from "react";
import { Target, FileText, Book, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: "goals" | "time" | "notepad" | "media";
  onTabChange: (tab: "goals" | "time" | "notepad" | "media") => void;
}

export const BottomNav = memo(function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg shadow-black/5 pb-safe">
      <nav className="flex justify-around items-center max-w-md mx-auto">
        <button
          onClick={() => onTabChange("goals")}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1.5 py-3 transition-colors duration-200",
            activeTab === "goals"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className={cn("p-1 rounded-lg transition-all duration-200", activeTab === "goals" && "bg-muted")}>
            <Target className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide">GOALS</span>
        </button>
        <button
          onClick={() => onTabChange("time")}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1.5 py-3 transition-colors duration-200",
            activeTab === "time"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className={cn("p-1 rounded-lg transition-all duration-200", activeTab === "time" && "bg-muted")}>
            <Clock className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide">TIME</span>
        </button>
        <button
          onClick={() => onTabChange("media")}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1.5 py-3 transition-colors duration-200",
            activeTab === "media"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className={cn("p-1 rounded-lg transition-all duration-200", activeTab === "media" && "bg-muted")}>
            <Book className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide">READ/LISTEN/WATCH</span>
        </button>
        <button
          onClick={() => onTabChange("notepad")}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1.5 py-3 transition-colors duration-200",
            activeTab === "notepad"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className={cn("p-1 rounded-lg transition-all duration-200", activeTab === "notepad" && "bg-muted")}>
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide">NOTEPAD</span>
        </button>
      </nav>
    </div>
  );
});
