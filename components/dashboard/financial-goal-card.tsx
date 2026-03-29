"use client";

import { memo, useMemo } from "react";
import { DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinance } from "@/hooks/useFinance";
import { sumSpendingInRange, startOfToday, endOfToday } from "@/lib/finance-aggregates";

export const FinancialGoalCard = memo(function FinancialGoalCard() {
  const { items, transactions } = useFinance();

  const spendData = useMemo(() => {
    if (items.length === 0 || transactions.length === 0) {
      return [
        { label: "Today", amount: null as number | null, color: "text-white/30" },
        { label: "Week", amount: null, color: "text-white/30" },
        { label: "Month", amount: null, color: "text-white/30" },
        { label: "Year", amount: null, color: "text-white/30" },
      ];
    }

    const end = new Date();
    const weekStart = new Date();
    weekStart.setDate(end.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(end.getDate() - 29);
    monthStart.setHours(0, 0, 0, 0);

    const yearStart = new Date();
    yearStart.setDate(end.getDate() - 364);
    yearStart.setHours(0, 0, 0, 0);

    const today = sumSpendingInRange(transactions, startOfToday(), endOfToday());
    const week = sumSpendingInRange(transactions, weekStart, end);
    const month = sumSpendingInRange(transactions, monthStart, end);
    const year = sumSpendingInRange(transactions, yearStart, end);

    const color = (n: number) =>
      n > 2000 ? "text-amber-400" : "text-emerald-400";

    return [
      { label: "Today", amount: today, color: color(today) },
      { label: "Week", amount: week, color: color(week) },
      { label: "Month", amount: month, color: color(month) },
      { label: "Year", amount: year, color: color(year) },
    ];
  }, [items.length, transactions]);

  const disconnected = items.length === 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border transition-all duration-300 group active:scale-[0.98] min-h-[100px]",
        "bg-gradient-to-br from-emerald-950/40 to-black/40 border-emerald-500/20",
        "col-span-2"
      )}
    >
      <div className="absolute inset-0 backdrop-blur-xl -z-10" />

      <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex-shrink-0 flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-emerald-400" />
          </div>
          {disconnected && (
            <p className="text-xs text-white/50 sm:hidden">
              Connect in Time → Finance to see spending
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 sm:gap-6 flex-1 overflow-x-auto pb-1">
          {spendData.map((item) => (
            <div key={item.label} className="flex flex-col gap-1 min-w-[70px]">
              <span className="text-xs font-medium text-white/40 uppercase tracking-widest text-[10px]">
                {item.label}
              </span>
              <span className={cn("text-xl font-semibold tabular-nums", item.color)}>
                {item.amount === null ? "—" : `$${Math.round(item.amount).toLocaleString()}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {disconnected && (
        <p className="px-4 pb-3 text-[11px] text-white/45 hidden sm:block">
          Connect your bank under Time → Finance to see spending here.
        </p>
      )}

      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </div>
  );
});
