import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function WellbeingCard() {
  return (
    <Card className="border-none bg-blue-50/50 shadow-sm">
      <CardHeader className="pb-2 pt-6">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-600">
          Wellbeing • Screen Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold text-gray-900">3h 12m</span>
          <span className="text-xs text-gray-500">Limit: 4h 00m</span>
        </div>
        <Progress value={80} className="h-2 bg-gray-200 [&>div]:bg-blue-600" />
        <p className="text-xs font-medium text-gray-700">
          High usage: Instagram (45m), TikTok (32m)
        </p>
      </CardContent>
    </Card>
  );
}

