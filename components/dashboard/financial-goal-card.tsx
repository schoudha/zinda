"use client";

import { memo } from "react";
import { DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export const FinancialGoalCard = memo(function FinancialGoalCard() {
  const spendData = [
    { label: "Today", amount: 140, color: "text-yellow-500 dark:text-yellow-400" },
    { label: "Week", amount: 600, color: "text-green-500 dark:text-green-400" },
    { label: "Month", amount: 3245, color: "text-green-500 dark:text-green-400" },
    { label: "Year", amount: 3245, color: "text-green-500 dark:text-green-400" },
  ];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border transition-all duration-300 group active:scale-[0.98] h-[100px]",
        "bg-gradient-to-br from-emerald-950/40 to-black/40 border-emerald-500/20",
        "col-span-2"
      )}
    >
      {/* Glass Effect Background */}
      <div className="absolute inset-0 backdrop-blur-xl -z-10" />

      {/* Content */}
      <div className="p-4 flex items-center gap-6 h-full">
        {/* Dollar Icon */}
        <div className="flex-shrink-0">
          <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-emerald-400" />
          </div>
        </div>

        {/* Spend Amounts - Horizontal Layout */}
        <div className="flex items-center gap-6 flex-1 overflow-x-auto">
          {spendData.map((item, index) => (
            <div key={item.label} className="flex flex-col gap-1 min-w-[70px]">
              <span className="text-xs font-medium text-white/40 uppercase tracking-widest text-[10px]">
                {item.label}
              </span>
              <span className={cn("text-2xl font-semibold tabular-nums", item.color)}>
                ${item.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </div>
  );
});
