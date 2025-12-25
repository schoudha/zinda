"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Goal } from "@/types";
import { NotificationDialog } from "@/components/goals/notification-dialog";
import { api } from "@/lib/api";

interface GoalCardProps {
  goal: Goal;
  onDelete?: (goalId: string) => void;
}

export function GoalCard({ goal, onDelete }: GoalCardProps) {
  const router = useRouter();
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<Goal>(goal);

  // Sync goal prop with local state when it changes
  useEffect(() => {
    setCurrentGoal(goal);
  }, [goal]);

  const periodLabels = {
    week: "Weekly",
    month: "Monthly",
    year: "Yearly",
  };

  const periodColors = {
    week: "from-blue-50 to-indigo-50 text-blue-600/80",
    month: "from-purple-50 to-pink-50 text-purple-600/80",
    year: "from-orange-50 to-amber-50 text-orange-600/80",
  };

  const handleCardClick = () => {
    router.push(`/goals/${goal.id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(goal.id);
    }
  };

  const handleBellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotificationDialogOpen(true);
  };

  const handleSaveNotification = async (time: Goal["notificationTime"] | null, days: Goal["notificationDays"] | null) => {
    const updatedGoal = await api.goals.updateNotifications(
      currentGoal.id,
      time ?? undefined,
      days ?? undefined
    );
    setCurrentGoal(updatedGoal);
    // Update parent if needed - but since goal is passed as prop, we might need to handle this differently
    // For now, we'll just update local state
  };

  return (
    <Card 
      onClick={handleCardClick}
      className={`border-none bg-gradient-to-br ${periodColors[goal.period]} shadow-xl shadow-blue-900/5 rounded-3xl ring-1 ring-black/5 overflow-hidden transition-all duration-300 hover:shadow-blue-900/10 hover:scale-[1.01] relative cursor-pointer`}
    >
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full opacity-60 hover:opacity-100 hover:bg-white/50"
          onClick={handleBellClick}
        >
          <Bell className={`h-4 w-4 ${currentGoal.notificationTime && currentGoal.notificationDays ? 'fill-current' : ''}`} />
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full opacity-60 hover:opacity-100 hover:bg-white/50"
            onClick={handleDelete}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <NotificationDialog
        open={notificationDialogOpen}
        onOpenChange={setNotificationDialogOpen}
        goalId={currentGoal.id}
        currentTime={currentGoal.notificationTime}
        currentDays={currentGoal.notificationDays}
        onSave={handleSaveNotification}
      />
      <CardHeader className="pb-2 pt-6 px-6">
        <CardTitle className={`text-[10px] font-bold uppercase tracking-widest ${periodColors[goal.period].split(' ')[2]} flex items-center gap-2`}>
          <div className={`h-1.5 w-1.5 rounded-full ${goal.period === 'week' ? 'bg-blue-500' : goal.period === 'month' ? 'bg-purple-500' : 'bg-orange-500'} animate-pulse`} />
          {periodLabels[goal.period]} Goal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-gray-900 leading-snug tracking-tight">
            {goal.text}
          </h3>
        </div>
        {goal.tips.length > 0 && (
          <div className="space-y-4 pt-1 border-t border-white/40">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Tips to achieve this goal
            </p>
            <ul className="space-y-3.5">
              {goal.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3.5">
                  <div className={`h-2 w-2 rounded-full ${goal.period === 'week' ? 'bg-blue-500' : goal.period === 'month' ? 'bg-purple-500' : 'bg-orange-500'} mt-1.5 shrink-0`} />
                  <p 
                    className="flex-1 text-sm text-gray-700 leading-relaxed font-medium"
                    dangerouslySetInnerHTML={{ __html: tip }}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
