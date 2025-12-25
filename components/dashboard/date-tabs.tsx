"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface DateTabsProps {
  value: "week" | "month" | "year";
  onValueChange: (value: "week" | "month" | "year") => void;
}

export function DateTabs({ value, onValueChange }: DateTabsProps) {
  return (
    <Tabs value={value} onValueChange={(val) => onValueChange(val as "week" | "month" | "year")} className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-transparent p-0">
        <TabsTrigger
          value="week"
          className={cn(
            "rounded-full font-medium transition-colors",
            value === "week"
              ? "bg-blue-100 text-blue-700 shadow-none"
              : "bg-transparent text-gray-500 hover:bg-gray-50"
          )}
        >
          Week
        </TabsTrigger>
        <TabsTrigger
          value="month"
          className={cn(
            "rounded-full font-medium transition-colors",
            value === "month"
              ? "bg-blue-100 text-blue-700 shadow-none"
              : "bg-transparent text-gray-500 hover:bg-gray-50"
          )}
        >
          Month
        </TabsTrigger>
        <TabsTrigger
          value="year"
          className={cn(
            "rounded-full font-medium transition-colors",
            value === "year"
              ? "bg-blue-100 text-blue-700 shadow-none"
              : "bg-transparent text-gray-500 hover:bg-gray-50"
          )}
        >
          Year
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

