"use client";

import { memo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface DateTabsProps {
  value: "today" | "week" | "month" | "year";
  onValueChange: (value: string) => void;
}

export const DateTabs = memo(function DateTabs({ value, onValueChange }: DateTabsProps) {
  return (
    <div className="p-1 bg-muted/50 rounded-full border border-border backdrop-blur-sm">
      <Tabs value={value} onValueChange={(val) => onValueChange(val as "today" | "week" | "month" | "year")} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-transparent p-0 gap-1 h-auto">
          <TabsTrigger
            value="today"
            className={cn(
              "rounded-full text-sm font-medium transition-all duration-300 py-2",
              value === "today"
                ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-105"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            Today
          </TabsTrigger>
          <TabsTrigger
            value="week"
            className={cn(
              "rounded-full text-sm font-medium transition-all duration-300 py-2",
              value === "week"
                ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-105"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            Week
          </TabsTrigger>
          <TabsTrigger
            value="month"
            className={cn(
              "rounded-full text-sm font-medium transition-all duration-300 py-2",
              value === "month"
                ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-105"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            Month
          </TabsTrigger>
          <TabsTrigger
            value="year"
            className={cn(
              "rounded-full text-sm font-medium transition-all duration-300 py-2",
              value === "year"
                ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-105"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            Year
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
});

