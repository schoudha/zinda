"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { name: "Home", color: "bg-emerald-500", hours: 4.5 },
  { name: "Work", color: "bg-blue-500", hours: 8 },
  { name: "Driving", color: "bg-amber-500", hours: 1.5 },
  { name: "Restaurants", color: "bg-orange-500", hours: 1 },
  { name: "Exercise", color: "bg-red-500", hours: 1.2 },
  { name: "Events", color: "bg-purple-500", hours: 2 },
  { name: "Parks", color: "bg-green-500", hours: 0.8 },
];

export const TimeDistributionCard = memo(function TimeDistributionCard() {
  const maxHours = Math.max(...CATEGORIES.map(c => c.hours));

  return (
    <Card className="border-none bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 shadow-xl shadow-blue-900/5 dark:shadow-black/20 rounded-3xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden transition-all duration-300 hover:shadow-blue-900/10 dark:hover:shadow-black/30">
      <CardHeader className="pb-2 pt-6 px-6">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-600/80 dark:text-slate-400 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-pulse" />
          Time Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="flex items-end justify-between h-48 gap-2 pt-4">
          {CATEGORIES.map((category) => {
            const heightPercentage = (category.hours / maxHours) * 100;
            
            return (
              <div key={category.name} className="flex flex-col items-center gap-2 flex-1 group">
                <div className="relative w-full flex-1 flex items-end justify-center">
                  <div 
                    className={cn(
                      "w-full rounded-t-lg transition-all duration-500 relative group-hover:opacity-80",
                      category.color
                    )}
                    style={{ height: `${heightPercentage}%` }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white/80 dark:bg-black/80 px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm z-10">
                      {category.hours}h
                    </span>
                  </div>
                </div>
                <div className="h-16 flex items-start justify-center">
                  <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400 -rotate-45 origin-top-left translate-y-3 whitespace-nowrap">
                    {category.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

