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
