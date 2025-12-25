import { useState, useCallback, useEffect } from "react";
import { Goal, GoalPeriod } from "@/types";
import { api } from "@/lib/api";

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshGoals = useCallback(async () => {
    try {
      const data = await api.goals.list();
      setGoals(data || []);
    } catch (error) {
      console.error("Error loading goals:", error);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await refreshGoals();
      setIsLoading(false);
    };
    load();
  }, [refreshGoals]);

  const deleteGoal = useCallback(async (goalId: string) => {
    // Optimistic update
    setGoals((prev) => prev.filter((g) => g.id !== goalId));

    try {
      await api.goals.delete(goalId);
    } catch (error) {
      console.error("Error deleting goal:", error);
      // Revert on error
      refreshGoals();
    }
  }, [refreshGoals]);

  const getGoalsForPeriod = useCallback((period: GoalPeriod): Goal[] => {
    return goals.filter((goal) => {
      if (goal.period === "year") return true;
      if (goal.period === "month") return period === "month" || period === "week";
      return goal.period === period;
    });
  }, [goals]);

  return {
    goals,
    isLoading,
    refreshGoals,
    deleteGoal,
    getGoalsForPeriod
  };
}

