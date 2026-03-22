import { Note, Goal, Message, Thought, ChatContext } from "@/types";
import { storage } from "@/lib/storage";
import { generateId } from "@/lib/id-utils";

/** Gemini / external APIs only (no Supabase). */
async function fetchAi<T>(url: string, options?: RequestInit): Promise<T> {
  let headers: HeadersInit = { "Content-Type": "application/json" };
  try {
    const { Capacitor } = await import("@capacitor/core");
    const platform = Capacitor.getPlatform();
    if (platform === "android") {
      headers = {
        ...headers,
        "X-Capacitor-Platform": "android",
      };
    }
  } catch {
    // Capacitor not available
  }

  const response = await fetch(url, {
    credentials: "include",
    headers,
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { error?: string }).error || `API error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  goals: {
    list: async () => storage.goals.list(),

    get: async (id: string) => {
      const g = storage.goals.get(id);
      if (!g) throw new Error("Goal not found: Not Found");
      return g;
    },

    create: async (goal: Partial<Goal>) => storage.goals.create(goal as Partial<Goal> & { id: string; text: string; period: Goal["period"] }),

    update: async (id: string, updates: Partial<Goal>) => storage.goals.update(id, updates),

    delete: async (id: string) => {
      storage.goals.delete(id);
      return { success: true };
    },

    chat: {
      history: async (goalId: string) => storage.messages.list(goalId),

      send: async (goalId: string, message: string, additionalContext?: ChatContext) => {
        const goal = storage.goals.get(goalId);
        if (!goal) throw new Error("Goal not found");

        const userMessageId = generateId();
        const userMessage: Message = {
          id: userMessageId,
          role: "user",
          content: message,
          createdAt: new Date(),
        };

        const prior = storage.messages.list(goalId).slice(-10);
        const priorForApi = prior.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const data = await fetchAi<{
          aiText: string;
          aiMessageId: string;
        }>(`/api/goals/${goalId}/chat`, {
          method: "POST",
          body: JSON.stringify({
            message,
            goal: {
              ...goal,
              createdAt: goal.createdAt instanceof Date ? goal.createdAt.toISOString() : goal.createdAt,
            },
            previousMessages: priorForApi,
            ...additionalContext,
          }),
        });

        const aiMessage: Message = {
          id: data.aiMessageId,
          role: "assistant",
          content: data.aiText,
          createdAt: new Date(),
        };
        storage.messages.append(goalId, userMessage);
        storage.messages.append(goalId, aiMessage);

        return { userMessage, aiMessage };
      },
    },

    tips: async (goalText: string) => {
      const data = await fetchAi<{ response: string; category?: string }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: `Provide the user with 2-3 tips on how to achieve this goal: ${goalText}. Also, categorize this goal into exactly one of these categories: 'health', 'faith', 'learn', 'family'. Return the response in JSON format like: { "tips": ["tip 1", "tip 2"], "category": "health" }`,
          mode: "categorize",
        }),
      });
      return data.response;
    },

    generateSmartTip: async (
      goalText: string,
      progress: number = 0,
      target?: number,
      completion?: number
    ) => {
      let progressContext = "";
      if (target !== undefined && completion !== undefined) {
        progressContext = `Current progress: ${completion}/${target} completed today.`;
      } else {
        progressContext = `Current progress: ${progress}% completed today.`;
      }

      const message = `Provide a single, short tip (exactly 1 sentence, no more) on how to achieve this goal: "${goalText}". ${progressContext} The tip should be motivating and actionable. Return only one sentence without any additional text.`;

      const data = await fetchAi<{ response: string }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      });

      const response = data.response.trim();
      const firstSentence = response.split(/[.!?]+/)[0].trim();
      return firstSentence + (firstSentence.match(/[.!?]$/) ? "" : ".");
    },

    updateNotifications: async (
      goalId: string,
      notificationTime: Goal["notificationTime"] | null | undefined,
      notificationDays: Goal["notificationDays"] | null | undefined
    ) => storage.goals.updateNotifications(goalId, notificationTime, notificationDays),

    progress: {
      getToday: async () => ({ progress: storage.progress.getToday() }),

      getHistory: async () => ({ progress: storage.progress.getHistory() }),

      updateToday: async (goalId: string, progressValue: number) => ({
        success: true,
        progress: storage.progress.updateToday(goalId, progressValue),
      }),
    },

    completions: {
      get: async (goalId: string) => {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const g = storage.goals.get(goalId);
        if (!g) throw new Error("Goal not found");
        const stats = storage.completions.get(goalId, dateStr);
        return {
          todayCompletion: stats.todayCompletion,
          weeklyCompletedDays: stats.weeklyCompletedDays,
          weeklyTotalDays: stats.weeklyTotalDays,
          target: stats.target ?? g.target ?? 0,
        };
      },

      increment: async (goalId: string, increment: number = 1) => {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const c = storage.completions.increment(goalId, increment, dateStr);
        return {
          success: true,
          completion: {
            goalId: c.goalId,
            date: c.date,
            completionCount: c.completionCount,
            target: c.target,
          },
        };
      },

      set: async (goalId: string, completionCount: number) => {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const c = storage.completions.set(goalId, completionCount, dateStr);
        return {
          success: true,
          completion: {
            goalId: c.goalId,
            date: c.date,
            completionCount: c.completionCount,
            target: c.target,
          },
        };
      },
    },

    ensureDefaults: async () => {
      const created = storage.goals.ensureDefaults();
      return { success: true, created };
    },
  },

  notes: {
    list: async () => storage.notes.list(),

    get: async (id: string) => storage.notes.get(id),

    create: async (note: Partial<Note>) =>
      storage.notes.create(note as Partial<Note> & { id: string; text: string }),

    update: async (id: string, updates: Partial<Note>) => storage.notes.update(id, updates),

    delete: async (id: string) => {
      storage.notes.delete([id]);
      return { success: true };
    },

    cleanup: async (ids: string) => {
      storage.notes.delete(ids.split(",").map((x) => x.trim()).filter(Boolean));
      return { success: true };
    },
  },

  url: {
    title: async (url: string) => {
      const data = await fetchAi<{ title: string }>("/api/url/title", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      return data.title;
    },

    summarize: async (url: string) => {
      const data = await fetchAi<{ summary: string }>("/api/url/summarize", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      return data.summary;
    },
  },

  health: {
    chat: {
      send: async (message: string, history: Array<{ role: string; content: string }> = []) => {
        return fetchAi<{ userMessage: { role: string; content: string }; aiMessage: { role: string; content: string } }>(
          "/api/health/chat",
          {
            method: "POST",
            body: JSON.stringify({ message, history }),
          }
        );
      },
    },
  },

  thoughts: {
    list: async () => storage.thoughts.list(),

    create: async (thought: Partial<Thought>) => storage.thoughts.create(thought),
  },
};
