"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface DateTabsProps {
  value: "week" | "month" | "year";
  onValueChange: (value: "week" | "month" | "year") => void;
}

export function DateTabs({ value, onValueChange }: DateTabsProps) {
  return (
    <div className="p-1 bg-gray-100/50 rounded-full border border-gray-200/50 backdrop-blur-sm">
      <Tabs value={value} onValueChange={(val) => onValueChange(val as "week" | "month" | "year")} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-transparent p-0 gap-1 h-auto">
          <TabsTrigger
            value="week"
            className={cn(
              "rounded-full text-sm font-medium transition-all duration-300 py-2",
              value === "week"
                ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5 scale-105"
                : "bg-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50"
            )}
          >
            Week
          </TabsTrigger>
          <TabsTrigger
            value="month"
            className={cn(
              "rounded-full text-sm font-medium transition-all duration-300 py-2",
              value === "month"
                ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5 scale-105"
                : "bg-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50"
            )}
          >
            Month
          </TabsTrigger>
          <TabsTrigger
            value="year"
            className={cn(
              "rounded-full text-sm font-medium transition-all duration-300 py-2",
              value === "year"
                ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5 scale-105"
                : "bg-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50"
            )}
          >
            Year
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

