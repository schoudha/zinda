"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

function RadialProgress({ value, size = 60 }: { value: number; size?: number }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 60 60">
        {/* Background circle */}
        <circle
          className="text-gray-200"
          strokeWidth="6"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="30"
          cy="30"
        />
        {/* Progress circle */}
        <circle
          className="text-green-500 transition-all duration-300 ease-in-out"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="30"
          cy="30"
        />
      </svg>
      <span className="absolute text-xs font-bold text-green-700">{value}%</span>
    </div>
  );
}

export function HealthCard() {
  return (
    <Card className="border-none bg-white shadow-sm ring-1 ring-black/5">
      <CardHeader className="pb-2 pt-6">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-green-600">
          Health • Marathon Prep
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <RadialProgress value={20} size={64} />
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox id="task1" checked disabled className="data-[state=checked]:bg-green-600 data-[state=checked]:text-white border-green-200" />
            <label
              htmlFor="task1"
              className="text-sm font-medium text-gray-400 line-through"
            >
              Morning Stretch
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="task2" className="border-gray-300 data-[state=checked]:bg-green-600" />
            <label
              htmlFor="task2"
              className="text-sm font-medium text-gray-900"
            >
              6-mile easy run (12:30 PM)
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

