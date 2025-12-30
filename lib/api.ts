import { Note, Goal, Message, Thought } from "@/types";

// Helper for standardized API calls
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  goals: {
    list: async () => {
      const data = await fetchApi<{ goals: Goal[] }>("/api/goals");
      return data.goals;
    },
    get: async (id: string) => {
      const data = await fetchApi<{ goal: Goal }>(`/api/goals/${id}`);
      return data.goal;
    },
    create: async (goal: Partial<Goal>) => {
      const data = await fetchApi<{ goal: Goal }>("/api/goals", {
        method: "POST",
        body: JSON.stringify(goal),
      });
      return data.goal;
    },
    delete: async (id: string) => {
      return fetchApi<{ success: boolean }>(`/api/goals?id=${id}`, {
        method: "DELETE",
      });
    },
    chat: {
      history: async (goalId: string) => {
        const data = await fetchApi<{ messages: Message[] }>(`/api/goals/${goalId}/messages`);
        return data.messages;
      },
      send: async (goalId: string, message: string) => {
        return fetchApi<{ userMessage: Message; aiMessage: Message }>(`/api/goals/${goalId}/chat`, {
          method: "POST",
          body: JSON.stringify({ message }),
        });
      },
    },
    tips: async (goalText: string) => {
      const data = await fetchApi<{ response: string; category?: string }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: `Provide the user with 2-3 tips on how to achieve this goal: ${goalText}. Also, categorize this goal into exactly one of these categories: 'health', 'faith', 'learn', 'family'. Return the response in JSON format like: { "tips": ["tip 1", "tip 2"], "category": "health" }`,
          mode: "categorize"
        }),
      });
      // The endpoint will handle the parsing/formatting if we structure it right, or we parse it here.
      // For now, let's keep the backend simple and just ask for the structured response there or parse it.
      // But actually, the existing endpoint returns just { response: string }.
      // We might need to modify the endpoint or how we call it.
      // Let's modify the endpoint to be smarter or do it in the input bar.
      
      // Since we can't easily change the endpoint return type without checking, let's assume we'll just parse the string or update the endpoint.
      // Actually, better plan: Update the input-bar logic to ask for categorization.
      return data.response;
    },
    categorize: async (goalText: string) => {
       const data = await fetchApi<{ response: string }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: `Categorize the following goal into exactly one of these 4 categories: 'health', 'faith', 'learn', 'family'. Return ONLY the category name in lowercase. Goal: "${goalText}"`,
        }),
      });
      return data.response.trim().toLowerCase().replace(/['".]/g, '');
    },
    generateSmartTip: async (goalText: string, progress: number = 0, target?: number, completion?: number) => {
      let progressContext = "";
      if (target !== undefined && completion !== undefined) {
        progressContext = `Current progress: ${completion}/${target} completed today.`;
      } else {
        progressContext = `Current progress: ${progress}% completed today.`;
      }

      const message = `Provide a single, short tip (exactly 1 sentence, no more) on how to achieve this goal: "${goalText}". ${progressContext} The tip should be motivating and actionable. Return only one sentence without any additional text.`;

      const data = await fetchApi<{ response: string }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      
      // Ensure we only return 1 sentence by splitting on sentence endings and taking the first
      const response = data.response.trim();
      const firstSentence = response.split(/[.!?]+/)[0].trim();
      // Add back the punctuation if it exists, otherwise add a period
      return firstSentence + (firstSentence.match(/[.!?]$/) ? '' : '.');
    },
    updateNotifications: async (goalId: string, notificationTime: Goal["notificationTime"] | null | undefined, notificationDays: Goal["notificationDays"] | null | undefined) => {
      const data = await fetchApi<{ goal: Goal }>(`/api/goals/${goalId}/notifications`, {
        method: "PATCH",
        body: JSON.stringify({ notificationTime: notificationTime ?? null, notificationDays: notificationDays ?? null }),
      });
      return data.goal;
    },
    progress: {
      getToday: async () => {
        const data = await fetchApi<{ progress: Record<string, number> }>("/api/goals/progress");
        return data.progress;
      },
      updateToday: async (goalId: string, progressValue: number) => {
        return fetchApi<{ success: boolean; progress: { goalId: string; date: string; progressValue: number } }>("/api/goals/progress", {
          method: "PATCH",
          body: JSON.stringify({ goalId, progressValue }),
        });
      },
    },
    completions: {
      get: async (goalId: string) => {
        return fetchApi<{ todayCompletion: number; weeklyCompletedDays: number; weeklyTotalDays: number; target: number }>(`/api/goals/completions?goalId=${goalId}`);
      },
      increment: async (goalId: string, increment: number = 1) => {
        return fetchApi<{ success: boolean; completion: { goalId: string; date: string; completionCount: number; target: number } }>("/api/goals/completions", {
          method: "POST",
          body: JSON.stringify({ goalId, increment }),
        });
      },
      set: async (goalId: string, completionCount: number) => {
        return fetchApi<{ success: boolean; completion: { goalId: string; date: string; completionCount: number; target: number } }>("/api/goals/completions", {
          method: "PATCH",
          body: JSON.stringify({ goalId, completionCount }),
        });
      },
    },
  },
  notes: {
    list: async () => {
      const data = await fetchApi<{ notes: Note[] }>("/api/notes");
      return data.notes;
    },
    create: async (note: Partial<Note>) => {
      const data = await fetchApi<{ note: Note }>("/api/notes", {
        method: "POST",
        body: JSON.stringify(note),
      });
      return data.note;
    },
    update: async (id: string, updates: Partial<Note>) => {
      const data = await fetchApi<{ note: Note }>("/api/notes", {
        method: "PATCH",
        body: JSON.stringify({ id, ...updates }),
      });
      return data.note;
    },
    delete: async (id: string) => {
      return fetchApi<{ success: boolean }>(`/api/notes?ids=${id}`, {
        method: "DELETE",
      });
    },
    cleanup: async (ids: string) => {
      return fetchApi<{ success: boolean }>(`/api/notes?ids=${encodeURIComponent(ids)}`, {
        method: "DELETE",
      });
    },
  },
  url: {
    title: async (url: string) => {
      const data = await fetchApi<{ title: string }>("/api/url/title", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      return data.title;
    },
    summarize: async (url: string) => {
      const data = await fetchApi<{ summary: string }>("/api/url/summarize", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      return data.summary;
    },
  },
  health: {
    chat: {
      send: async (message: string, history: Array<{ role: string; content: string }> = []) => {
        return fetchApi<{ userMessage: { role: string; content: string }; aiMessage: { role: string; content: string } }>("/api/health/chat", {
          method: "POST",
          body: JSON.stringify({ message, history }),
        });
      },
    },
  },
  thoughts: {
    list: async () => {
      const data = await fetchApi<{ thoughts: Thought[] }>("/api/thoughts");
      return data.thoughts;
    },
    create: async (thought: Partial<Thought>) => {
      const data = await fetchApi<{ thought: Thought }>("/api/thoughts", {
        method: "POST",
        body: JSON.stringify(thought),
      });
      return data.thought;
    },
  },
};

