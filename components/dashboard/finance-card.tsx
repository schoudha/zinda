"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, DollarSign } from "lucide-react";

export const FinanceCard = memo(function FinanceCard() {
  return (
    <Card className="border-none bg-white dark:bg-card shadow-xl shadow-emerald-900/5 dark:shadow-black/20 rounded-3xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
      <CardHeader className="pb-2 pt-6 px-6">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Finance
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Financial Data
            </span>
          </div>
          <span className="text-xs font-medium text-gray-400 px-2 py-1 rounded-full">
            Not connected
          </span>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-500 pt-2">
          Financial tracking is not available yet
        </p>
      </CardContent>
    </Card>
  );
});

