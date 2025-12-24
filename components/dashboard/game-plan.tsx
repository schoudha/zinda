import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GamePlanCard() {
  const tasks = [
    { id: 1, text: "Finish the Q3 report draft (Deep Work)", category: "Deep Work" },
    { id: 2, text: "30-minute run before lunch (Health)", category: "Health" },
    { id: 3, text: "Review subscriptions (Finance)", category: "Finance" },
  ];

  return (
    <Card className="border-none bg-white shadow-sm">
      <CardHeader className="pb-2 pt-6">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Today's Game Plan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-black" />
              <span className="text-sm font-medium text-gray-900">{task.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

