"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, CreditCard } from "lucide-react";

interface FamilyTasksCardProps {
  // Future: can accept tasks as props when we integrate with backend
}

type TaskItem = 
  | string 
  | { type: 'financial'; title: string; price: number };

export const FamilyTasksCard = memo(function FamilyTasksCard({}: FamilyTasksCardProps) {
  // Hardcoded tasks for now
  const tasks: TaskItem[] = [
    "Shikansen Tickets for Osaka",
    "Universal Osaka + Nintendo World",
    { type: 'financial', title: 'United', price: 7442.26 },
  ];

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const isFinancialItem = (item: TaskItem): item is { type: 'financial'; title: string; price: number } => {
    return typeof item === 'object' && item !== null && 'type' in item && item.type === 'financial';
  };

  return (
    <Card className="border-none bg-white dark:bg-card shadow-xl shadow-purple-900/5 dark:shadow-black/20 rounded-3xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
      <CardHeader className="pb-2 pt-6 px-6">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-purple-600/80 dark:text-purple-400 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
          Family Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-3">
        {tasks.length > 0 ? (
          <div className="space-y-3 pt-2">
            {tasks.map((task, index) => {
              if (isFinancialItem(task)) {
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <CreditCard className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {task.title}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatPrice(task.price)}
                    </span>
                  </div>
                );
              }
              
              return (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                    {task}
                  </span>
                  <div className="flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-500 pt-2">
            No shared tasks yet
          </p>
        )}
      </CardContent>
    </Card>
  );
});
