import type { Goal } from "@/types";

export type DashboardProgressRow = {
  goalId: string;
  date: string;
  progressValue: number;
};

function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type Period = "today" | "week" | "month" | "year";

/**
 * Builds the multiline goals summary string for the dashboard Gemini prompt (same semantics as the former Supabase-backed route).
 */
export function buildDashboardGoalsContext(
  goals: Goal[],
  progressData: DashboardProgressRow[],
  period: Period
): string {
  const now = new Date();
  let periodStart: Date;

  if (period === "today") {
    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "week") {
    periodStart = new Date(now);
    const dayOfWeek = now.getDay();
    periodStart.setDate(now.getDate() - dayOfWeek);
    periodStart.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    periodStart = new Date(now.getFullYear(), 0, 1);
  }

  const periodStartStr = getLocalDateString(periodStart);
  const nowStr = getLocalDateString(now);

  const inRange = progressData.filter((p) => p.date >= periodStartStr && p.date <= nowStr);

  const goalsSummary: Array<{
    text: string;
    category: string;
    target?: number;
    progress: number;
    progressPercentage: number;
  }> = [];

  goals.forEach((goal) => {
    const goalProgress = inRange.filter((p) => p.goalId === goal.id);

    if (period === "today") {
      const todayProgress = goalProgress.find((p) => p.date === nowStr);
      const progressValue = todayProgress ? Number(todayProgress.progressValue) : 0;
      const target = goal.target || goal.minutesPerDay || 100;
      const progressPercentage = target > 0 ? Math.round((progressValue / target) * 100) : 0;

      goalsSummary.push({
        text: goal.text,
        category: goal.category || "general",
        target,
        progress: progressValue,
        progressPercentage,
      });
    } else {
      if (goal.target) {
        const completedDays = goalProgress.filter((p) => Number(p.progressValue) >= goal.target).length;
        const totalDays = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const progressPercentage = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

        goalsSummary.push({
          text: goal.text,
          category: goal.category || "general",
          target: goal.target,
          progress: completedDays,
          progressPercentage,
        });
      } else if (goal.minutesPerDay) {
        const totalProgress = goalProgress.reduce((sum, p) => sum + Number(p.progressValue), 0);
        const targetTotal = goal.minutesPerDay * (period === "week" ? 7 : period === "month" ? 30 : 365);
        const progressPercentage = targetTotal > 0 ? Math.round((totalProgress / targetTotal) * 100) : 0;

        goalsSummary.push({
          text: goal.text,
          category: goal.category || "general",
          target: targetTotal,
          progress: totalProgress,
          progressPercentage,
        });
      } else {
        const totalProgress = goalProgress.reduce((sum, p) => sum + Number(p.progressValue), 0);
        const daysInPeriod = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const avgProgress = daysInPeriod > 0 ? totalProgress / daysInPeriod : 0;

        goalsSummary.push({
          text: goal.text,
          category: goal.category || "general",
          progress: avgProgress,
          progressPercentage: Math.round(avgProgress),
        });
      }
    }
  });

  return goalsSummary
    .map((g) => {
      if (g.target !== undefined) {
        if (g.category === "faith") {
          return `- ${g.text}: ${g.progress} days completed out of ${period === "today" ? 1 : period === "week" ? 7 : period === "month" ? "~30" : "365"} (${g.progressPercentage}% of goal)`;
        }
        return `- ${g.text}: ${g.progress}/${g.target} (${g.progressPercentage}% of goal)`;
      }
      return `- ${g.text}: ${g.progressPercentage}% progress`;
    })
    .join("\n");
}

export function dashboardPeriodLabel(period: Period): string {
  if (period === "today") return "today";
  if (period === "week") return "this week";
  if (period === "month") return "this month";
  return "this year";
}
