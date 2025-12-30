import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Goal } from "@/types";
import { api } from "@/lib/api";

export function useGoals() {
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading, refetch } = useQuery({
    queryKey: ["goals"],
    queryFn: api.goals.list,
  });

  const deleteMutation = useMutation({
    mutationFn: api.goals.delete,
    onMutate: async (goalId) => {
      await queryClient.cancelQueries({ queryKey: ["goals"] });
      const previousGoals = queryClient.getQueryData<Goal[]>(["goals"]);
      queryClient.setQueryData<Goal[]>(["goals"], (old) =>
        (old || []).filter((g) => g.id !== goalId)
      );
      return { previousGoals };
    },
    onError: (err, goalId, context) => {
      queryClient.setQueryData(["goals"], context?.previousGoals);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  return {
    goals,
    isLoading,
    refreshGoals: refetch,
    deleteGoal: deleteMutation.mutateAsync,
  };
}

export function useGoalProgress() {
  const queryClient = useQueryClient();

  const { data: progress = {}, isLoading: todayLoading } = useQuery({
    queryKey: ["goal-progress", "today"],
    queryFn: api.goals.progress.getToday,
    staleTime: 5 * 60 * 1000,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["goal-progress", "history"],
    queryFn: api.goals.progress.getHistory,
    staleTime: 5 * 60 * 1000,
  });

  // Group history by goalId and date for easy lookup
  const groupedHistory = useMemo(() => {
    const grouped: Record<string, Record<string, number>> = {};
    history.forEach(item => {
      if (!grouped[item.goalId]) grouped[item.goalId] = {};
      grouped[item.goalId][item.date] = item.progressValue;
    });
    return grouped;
  }, [history]);

  const updateMutation = useMutation({
    mutationFn: ({ goalId, progressValue }: { goalId: string; progressValue: number }) =>
      api.goals.progress.updateToday(goalId, progressValue),
    onMutate: async ({ goalId, progressValue }) => {
      await queryClient.cancelQueries({ queryKey: ["goal-progress", "today"] });
      const previousProgress = queryClient.getQueryData<Record<string, number>>(["goal-progress", "today"]);
      
      queryClient.setQueryData<Record<string, number>>(["goal-progress", "today"], (old) => ({
        ...(old || {}),
        [goalId]: progressValue,
      }));
      
      return { previousProgress };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["goal-progress", "today"], context?.previousProgress);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["goal-progress", "today"] });
    },
  });

  return {
    progress,
    history: groupedHistory,
    isLoading: todayLoading || historyLoading,
    refreshProgress: () => {
      queryClient.invalidateQueries({ queryKey: ["goal-progress"] });
    },
    updateProgress: updateMutation.mutateAsync,
  };
}
