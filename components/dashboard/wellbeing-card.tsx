import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function WellbeingCard() {
  return (
    <Card className="border-none bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 shadow-xl shadow-blue-900/5 dark:shadow-black/20 rounded-3xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden transition-all duration-300 hover:shadow-blue-900/10 dark:hover:shadow-black/30 hover:scale-[1.02]">
      <CardHeader className="pb-2 pt-6 px-6">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-blue-600/80 dark:text-blue-400 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          Wellbeing • Screen Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6">
        <div className="flex items-baseline justify-between">
          <span className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">3h 12m</span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-white/5 px-2 py-1 rounded-full backdrop-blur-sm">Limit: 4h 00m</span>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-blue-200/30 dark:bg-blue-900/30 rounded-full h-3" />
          <Progress value={80} className="h-3 bg-transparent [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-indigo-500 [&>div]:rounded-full" />
        </div>
        <div className="flex items-center gap-3 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white/60 dark:bg-white/5 p-3 rounded-xl backdrop-blur-sm">
          <div className="h-8 w-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 shrink-0">
            IG
          </div>
          <div className="flex flex-col">
            <span className="text-gray-900 dark:text-white font-bold">High usage</span>
            <span>Instagram (45m), TikTok (32m)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

