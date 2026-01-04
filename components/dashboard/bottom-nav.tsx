"use client";

import { memo, useCallback } from "react";
import { Target, FileText, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: "goals" | "time" | "notepad";
  onTabChange: (tab: "goals" | "time" | "notepad") => void;
}

export const BottomNav = memo(function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 px-6 pb-safe pointer-events-none">
      <nav className="flex justify-around items-center max-w-[280px] mx-auto bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/40 rounded-full px-2 py-2 pointer-events-auto">
        <button
          onClick={() => onTabChange("goals")}
          className="flex-1 flex flex-col items-center justify-center relative py-2 group"
        >
          <div className={cn(
            "p-2.5 rounded-full transition-all duration-300 relative",
            activeTab === "goals" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
          )}>
            <Target className="h-5 w-5" />
            {activeTab === "goals" && (
              <span className="absolute inset-0 rounded-full bg-white/5 blur-md animate-pulse" />
            )}
          </div>
        </button>
        <button
          onClick={() => onTabChange("time")}
          className="flex-1 flex flex-col items-center justify-center relative py-2 group"
        >
          <div className={cn(
            "p-2.5 rounded-full transition-all duration-300 relative",
            activeTab === "time" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
          )}>
            <Lock className="h-5 w-5" />
            {activeTab === "time" && (
              <span className="absolute inset-0 rounded-full bg-white/5 blur-md animate-pulse" />
            )}
          </div>
        </button>
        <button
          onClick={() => onTabChange("notepad")}
          className="flex-1 flex flex-col items-center justify-center relative py-2 group"
        >
          <div className={cn(
            "p-2.5 rounded-full transition-all duration-300 relative",
            activeTab === "notepad" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
          )}>
            <FileText className="h-5 w-5" />
            {activeTab === "notepad" && (
              <span className="absolute inset-0 rounded-full bg-white/5 blur-md animate-pulse" />
            )}
          </div>
        </button>
      </nav>
    </div>
  );
});
