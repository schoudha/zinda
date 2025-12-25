import { Note, Goal, Message } from "@/types";

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
      const data = await fetchApi<{ response: string }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: `Provide the user with 2-3 tips on how to achieve this goal: ${goalText}`,
        }),
      });
      return data.response;
    }
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
      return fetchApi<{ success: boolean }>(`/api/notes?id=${id}`, {
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
};

