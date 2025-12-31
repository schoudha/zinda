"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, Check } from "lucide-react";
import { Goal } from "@/types";

interface FaithGoalViewProps {
  goal: Goal;
  todayCompletion: number;
  handleIncrementCompletion: (increment: number) => void;
  isUpdating: boolean;
  target?: number;
}

export function FaithGoalView({
  goal,
  todayCompletion,
  handleIncrementCompletion,
  isUpdating,
  target = 3, // Default to 3 for prayer goals as requested
}: FaithGoalViewProps) {
  
  // Calculate percentage for progress bar or visual indicator
  const percentage = Math.min(100, Math.round((todayCompletion / target) * 100));

  return (
    <div className="space-y-4">
      {/* Manual Progress Tracking */}
      <Card className="border-none shadow-sm bg-violet-50 dark:bg-violet-950/30">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-violet-900 dark:text-violet-100">
              Today's Prayers
            </span>
            <span className="text-lg font-bold text-violet-700 dark:text-violet-300">
              {todayCompletion} / {target}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-violet-200 dark:bg-violet-900 rounded-full h-2.5 mb-4">
            <div 
              className="bg-violet-600 h-2.5 rounded-full transition-all duration-500 ease-in-out" 
              style={{ width: `${percentage}%` }}
            ></div>
          </div>

          <div className="flex gap-3">
             <Button
              onClick={() => handleIncrementCompletion(-1)}
              disabled={isUpdating || todayCompletion <= 0}
              variant="outline"
              className="h-12 w-12 border-violet-200 hover:bg-violet-100 hover:text-violet-700 dark:border-violet-800 dark:hover:bg-violet-900"
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={() => handleIncrementCompletion(1)}
              disabled={isUpdating || todayCompletion >= target}
              className="flex-1 h-12 bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Prayer
            </Button>
          </div>
          
          {todayCompletion >= target && (
             <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium pt-2 animate-in fade-in slide-in-from-bottom-2">
                <Check className="h-4 w-4" />
                <span>Daily goal completed! MashaAllah!</span>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

