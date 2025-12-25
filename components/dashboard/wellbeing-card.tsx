import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function WellbeingCard() {
  return (
    <Card className="border-none bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl shadow-blue-900/5 rounded-3xl ring-1 ring-black/5 overflow-hidden transition-all duration-300 hover:shadow-blue-900/10 hover:scale-[1.02]">
      <CardHeader className="pb-2 pt-6 px-6">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-blue-600/80 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          Wellbeing • Screen Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6">
        <div className="flex items-baseline justify-between">
          <span className="text-4xl font-extrabold text-gray-900 tracking-tight">3h 12m</span>
          <span className="text-xs font-medium text-gray-500 bg-white/50 px-2 py-1 rounded-full backdrop-blur-sm">Limit: 4h 00m</span>
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-blue-200/30 rounded-full h-3" />
          <Progress value={80} className="h-3 bg-transparent [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-indigo-500 [&>div]:rounded-full" />
        </div>
        <div className="flex items-center gap-3 text-xs font-medium text-gray-600 bg-white/60 p-3 rounded-xl backdrop-blur-sm">
          <div className="h-8 w-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600 shrink-0">
            IG
          </div>
          <div className="flex flex-col">
            <span className="text-gray-900 font-bold">High usage</span>
            <span>Instagram (45m), TikTok (32m)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

