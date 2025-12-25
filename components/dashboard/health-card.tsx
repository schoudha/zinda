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
          className="text-gray-100"
          strokeWidth="6"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="30"
          cy="30"
        />
        {/* Progress circle */}
        <circle
          className="text-green-500 transition-all duration-1000 ease-out"
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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-extrabold text-gray-900">{value}%</span>
      </div>
    </div>
  );
}

export function HealthCard() {
  return (
    <Card className="border-none bg-white shadow-xl shadow-green-900/5 rounded-3xl ring-1 ring-black/5 overflow-hidden transition-all duration-300 hover:shadow-green-900/10 hover:scale-[1.02]">
      <CardHeader className="pb-2 pt-6 px-6">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-green-600/80 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Health • Marathon Prep
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-6 px-6 pb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-green-50 rounded-full blur-xl scale-110" />
          <RadialProgress value={20} size={72} />
        </div>
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors duration-200 cursor-pointer group">
            <Checkbox id="task1" checked disabled className="data-[state=checked]:bg-green-500 data-[state=checked]:text-white border-green-200 h-5 w-5 rounded-md" />
            <label
              htmlFor="task1"
              className="text-sm font-medium text-gray-400 line-through cursor-pointer group-hover:text-gray-500 transition-colors"
            >
              Morning Stretch
            </label>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors duration-200 cursor-pointer group">
            <Checkbox id="task2" className="border-gray-300 data-[state=checked]:bg-green-500 h-5 w-5 rounded-md transition-all duration-200" />
            <label
              htmlFor="task2"
              className="text-sm font-semibold text-gray-700 cursor-pointer group-hover:text-gray-900 transition-colors"
            >
              6-mile easy run <span className="text-gray-400 font-normal ml-1">12:30 PM</span>
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

