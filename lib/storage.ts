/**
 * Client-side persistence for goals, notes, thoughts, chat messages, and progress.
 * Used by lib/api.ts (browser only).
 */

import type { Goal, GoalCategory, Note, Thought, Message } from "@/types";
import { extractIntegerTarget, normalizeDate } from "@/lib/utils";
import { generateId } from "@/lib/id-utils";

const K = {
  goals: "zinda:goals",
  notes: "zinda:notes",
  thoughts: "zinda:thoughts",
  messages: "zinda:goal_messages",
  progress: "zinda:goal_progress",
} as const;

function getLS(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (raw == null || raw === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function rowKey(goalId: string, date: string): string {
  return `${goalId}|${date}`;
}

type ProgressRow = { goalId: string; date: string; progressValue: number };

function readProgressRows(ls: Storage): ProgressRow[] {
  return parseJson<ProgressRow[]>(ls.getItem(K.progress), []);
}

function writeProgressRows(ls: Storage, rows: ProgressRow[]) {
  ls.setItem(K.progress, JSON.stringify(rows));
}

function upsertProgress(ls: Storage, goalId: string, date: string, progressValue: number) {
  const rows = readProgressRows(ls);
  const key = rowKey(goalId, date);
  const idx = rows.findIndex((r) => rowKey(r.goalId, r.date) === key);
  const next = { goalId, date, progressValue: Number(progressValue) || 0 };
  if (idx >= 0) rows[idx] = next;
  else rows.push(next);
  writeProgressRows(ls, rows);
}

function mapDbGoalToGoal(g: Record<string, unknown>): Goal {
  return {
    id: g.id as string,
    text: g.text as string,
    period: g.period as Goal["period"],
    tips: (g.tips as string[]) || [],
    createdAt: normalizeDate(g.createdAt as string | Date),
    userId: g.userId as string | undefined,
    notificationTime: g.notificationTime as Goal["notificationTime"],
    notificationDays: g.notificationDays as Goal["notificationDays"],
    category: g.category as GoalCategory | undefined,
    target: g.target as number | undefined,
    minutesPerDay: g.minutesPerDay as number | undefined,
    screentimeStartHour: g.screentimeStartHour as number | undefined,
    screentimeEndHour: g.screentimeEndHour as number | undefined,
    familyPhoneNumbers: g.familyPhoneNumbers as string[] | undefined,
  };
}

function serializeGoal(g: Goal): Record<string, unknown> {
  return {
    ...g,
    createdAt: g.createdAt instanceof Date ? g.createdAt.toISOString() : g.createdAt,
  };
}

function readGoals(ls: Storage): Goal[] {
  const raw = parseJson<Record<string, unknown>[]>(ls.getItem(K.goals), []);
  return raw.map(mapDbGoalToGoal).sort((a, b) => getDateTimestamp(b.createdAt) - getDateTimestamp(a.createdAt));
}

function getDateTimestamp(d: Date | string): number {
  return normalizeDate(d).getTime();
}

function writeGoals(ls: Storage, goals: Goal[]) {
  ls.setItem(K.goals, JSON.stringify(goals.map(serializeGoal)));
}

export const storage = {
  goals: {
    list(): Goal[] {
      const ls = getLS();
      if (!ls) return [];
      return readGoals(ls);
    },

    get(id: string): Goal | null {
      return this.list().find((g) => g.id === id) ?? null;
    },

    create(partial: Partial<Goal>): Goal {
      const ls = getLS();
      if (!ls) throw new Error("localStorage unavailable");

      if (!partial.id || !partial.text || !partial.period) {
        throw new Error("id, text, and period are required");
      }

      let target = partial.target;
      if (target === undefined || target === null) {
        const ex = extractIntegerTarget(partial.text);
        if (ex != null) target = ex;
      }
      if ((target === undefined || target === null) && partial.category === "faith") {
        target = 3;
      }

      const goal: Goal = {
        id: partial.id,
        text: partial.text,
        period: partial.period,
        tips: partial.tips || [],
        createdAt: partial.createdAt ? normalizeDate(partial.createdAt) : new Date(),
        userId: partial.userId,
        notificationTime: partial.notificationTime,
        notificationDays: partial.notificationDays,
        category: partial.category,
        target: target ?? undefined,
        minutesPerDay: partial.minutesPerDay,
        screentimeStartHour: partial.screentimeStartHour,
        screentimeEndHour: partial.screentimeEndHour,
        familyPhoneNumbers: partial.familyPhoneNumbers,
      };

      const goals = readGoals(ls);
      goals.unshift(goal);
      writeGoals(ls, goals);
      return goal;
    },

    update(id: string, updates: Partial<Goal>): Goal {
      const ls = getLS();
      if (!ls) throw new Error("localStorage unavailable");

      const goals = readGoals(ls);
      const idx = goals.findIndex((g) => g.id === id);
      if (idx < 0) throw new Error("Goal not found");

      const cur = goals[idx];
      let nextTarget = updates.target !== undefined ? updates.target : cur.target;
      if (updates.text !== undefined && updates.target === undefined) {
        const ex = extractIntegerTarget(updates.text);
        if (ex != null) nextTarget = ex;
      }

      const merged: Goal = {
        ...cur,
        ...updates,
        target: nextTarget,
        tips: updates.tips !== undefined ? updates.tips : cur.tips,
        createdAt: updates.createdAt ? normalizeDate(updates.createdAt) : cur.createdAt,
      };

      goals[idx] = merged;
      writeGoals(ls, goals);
      return merged;
    },

    delete(id: string): void {
      const ls = getLS();
      if (!ls) return;

      writeGoals(
        ls,
        readGoals(ls).filter((g) => g.id !== id)
      );

      const rows = readProgressRows(ls).filter((r) => r.goalId !== id);
      writeProgressRows(ls, rows);

      const allMsg = parseJson<Record<string, Message[]>>(ls.getItem(K.messages), {});
      delete allMsg[id];
      ls.setItem(K.messages, JSON.stringify(allMsg));
    },

    updateNotifications(
      goalId: string,
      notificationTime: Goal["notificationTime"] | null | undefined,
      notificationDays: Goal["notificationDays"] | null | undefined
    ): Goal {
      return this.update(goalId, {
        notificationTime: notificationTime ?? undefined,
        notificationDays: notificationDays ?? undefined,
      });
    },

    ensureDefaults(): { faith: boolean; screentime: boolean; learn: boolean } {
      const ls = getLS();
      const created = { faith: false, screentime: false, learn: false };
      if (!ls) return created;

      const goals = readGoals(ls);

      if (!goals.some((g) => g.category === "faith")) {
        this.create({
          id: generateId(),
          text: "Daily Prayers",
          period: "week",
          category: "faith",
          tips: [],
          target: 3,
          createdAt: new Date(),
        });
        created.faith = true;
      }

      const hasScreen = goals.some((g) => g.category === "family" || g.category === "screentime");
      if (!hasScreen) {
        this.create({
          id: generateId(),
          text: "Screen Time",
          period: "week",
          category: "family",
          tips: [],
          minutesPerDay: 150,
          screentimeStartHour: 18,
          screentimeEndHour: 20,
          createdAt: new Date(),
        });
        created.screentime = true;
      }

      const rawNotes = parseJson<Record<string, unknown>[]>(ls.getItem(K.notes), []);
      const hasUrlNote = rawNotes.some((n) => Boolean(n.url));
      if (!goals.some((g) => g.category === "learn") && hasUrlNote) {
        this.create({
          id: generateId(),
          text: "Learn",
          period: "week",
          category: "learn",
          tips: [],
          createdAt: new Date(),
        });
        created.learn = true;
      }

      return created;
    },
  },

  notes: {
    list(): Note[] {
      const ls = getLS();
      if (!ls) return [];
      const raw = parseJson<Record<string, unknown>[]>(ls.getItem(K.notes), []);
      return raw
        .map((n) => ({
          id: n.id as string,
          text: n.text as string,
          checked: Boolean(n.checked),
          checkedAt: n.checkedAt ? normalizeDate(n.checkedAt as string) : null,
          createdAt: normalizeDate(n.createdAt as string | Date),
          url: n.url as string | undefined,
          urlTitle: n.urlTitle as string | undefined,
          summary: n.summary as string | undefined,
        }))
        .sort((a, b) => getDateTimestamp(b.createdAt) - getDateTimestamp(a.createdAt));
    },

    get(id: string): Note | null {
      return this.list().find((n) => n.id === id) ?? null;
    },

    create(partial: Partial<Note>): Note {
      const ls = getLS();
      if (!ls) throw new Error("localStorage unavailable");
      if (!partial.id || !partial.text) throw new Error("id and text are required");

      const note: Note = {
        id: partial.id,
        text: partial.text,
        checked: partial.checked ?? false,
        checkedAt: partial.checkedAt ? normalizeDate(partial.checkedAt) : null,
        createdAt: partial.createdAt ? normalizeDate(partial.createdAt) : new Date(),
        url: partial.url,
        urlTitle: partial.urlTitle,
        summary: partial.summary,
      };

      const notes = this.list();
      notes.unshift(note);
      ls.setItem(
        K.notes,
        JSON.stringify(
          notes.map((n) => ({
            ...n,
            createdAt: n.createdAt.toISOString(),
            checkedAt: n.checkedAt ? n.checkedAt.toISOString() : null,
          }))
        )
      );
      return note;
    },

    update(id: string, updates: Partial<Note>): Note {
      const ls = getLS();
      if (!ls) throw new Error("localStorage unavailable");
      const notes = this.list();
      const idx = notes.findIndex((n) => n.id === id);
      if (idx < 0) throw new Error("Note not found");

      const cur = notes[idx];
      const merged: Note = {
        ...cur,
        ...updates,
        createdAt: updates.createdAt ? normalizeDate(updates.createdAt) : cur.createdAt,
        checkedAt:
          updates.checkedAt !== undefined
            ? updates.checkedAt
              ? normalizeDate(updates.checkedAt)
              : null
            : cur.checkedAt,
      };
      notes[idx] = merged;
      ls.setItem(
        K.notes,
        JSON.stringify(
          notes.map((n) => ({
            ...n,
            createdAt: n.createdAt.toISOString(),
            checkedAt: n.checkedAt ? n.checkedAt.toISOString() : null,
          }))
        )
      );
      return merged;
    },

    delete(ids: string[]): void {
      const ls = getLS();
      if (!ls) return;
      const set = new Set(ids);
      const notes = this.list().filter((n) => !set.has(n.id));
      ls.setItem(
        K.notes,
        JSON.stringify(
          notes.map((n) => ({
            ...n,
            createdAt: n.createdAt.toISOString(),
            checkedAt: n.checkedAt ? n.checkedAt.toISOString() : null,
          }))
        )
      );
    },
  },

  thoughts: {
    list(): Thought[] {
      const ls = getLS();
      if (!ls) return [];
      const raw = parseJson<Record<string, unknown>[]>(ls.getItem(K.thoughts), []);
      return raw
        .map((t) => ({
          id: t.id as string,
          text: t.text as string,
          createdAt: normalizeDate(t.createdAt as string | Date),
          date: t.date as string,
        }))
        .sort((a, b) => getDateTimestamp(b.createdAt) - getDateTimestamp(a.createdAt));
    },

    create(partial: Partial<Thought>): Thought {
      const ls = getLS();
      if (!ls) throw new Error("localStorage unavailable");
      if (!partial.text) throw new Error("text is required");

      const thought: Thought = {
        id: partial.id || generateId(),
        text: partial.text,
        createdAt: partial.createdAt ? normalizeDate(partial.createdAt) : new Date(),
        date: partial.date || getLocalDateString(),
      };

      const list = this.list();
      list.unshift(thought);
      ls.setItem(
        K.thoughts,
        JSON.stringify(
          list.map((t) => ({
            ...t,
            createdAt: t.createdAt.toISOString(),
          }))
        )
      );
      return thought;
    },
  },

  messages: {
    list(goalId: string): Message[] {
      const ls = getLS();
      if (!ls) return [];
      const all = parseJson<Record<string, Message[]>>(ls.getItem(K.messages), {});
      const arr = all[goalId] || [];
      return arr.map((m) => ({
        ...m,
        createdAt: normalizeDate(m.createdAt as string | Date),
      }));
    },

    append(goalId: string, message: Message): void {
      const ls = getLS();
      if (!ls) return;
      const all = parseJson<Record<string, Array<{ id: string; role: string; content: string; createdAt: string }>>>(
        ls.getItem(K.messages),
        {}
      );
      const list = all[goalId] || [];
      list.push({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt:
          message.createdAt instanceof Date ? message.createdAt.toISOString() : String(message.createdAt),
      });
      all[goalId] = list;
      ls.setItem(K.messages, JSON.stringify(all));
    },
  },

  progress: {
    getToday(): Record<string, number> {
      const ls = getLS();
      if (!ls) return {};
      const today = getLocalDateString();
      const map: Record<string, number> = {};
      readProgressRows(ls).forEach((r) => {
        if (r.date === today) map[r.goalId] = r.progressValue;
      });
      return map;
    },

    getHistory(): Array<{ goalId: string; progressValue: number; date: string }> {
      const ls = getLS();
      if (!ls) return [];
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      const cutoffStr = getLocalDateString(cutoff);
      return readProgressRows(ls)
        .filter((r) => r.date >= cutoffStr)
        .map((r) => ({
          goalId: r.goalId,
          progressValue: r.progressValue,
          date: r.date,
        }));
    },

    updateToday(goalId: string, progressValue: number): { goalId: string; date: string; progressValue: number } {
      const ls = getLS();
      if (!ls) throw new Error("localStorage unavailable");
      const today = getLocalDateString();
      upsertProgress(ls, goalId, today, progressValue);
      return { goalId, date: today, progressValue: Number(progressValue) || 0 };
    },
  },

  completions: {
    get(goalId: string, clientDate: string): {
      todayCompletion: number;
      weeklyCompletedDays: number;
      weeklyTotalDays: number;
      target?: number;
    } {
      const ls = getLS();
      if (!ls) {
        return { todayCompletion: 0, weeklyCompletedDays: 0, weeklyTotalDays: 7 };
      }

      const goal = storage.goals.get(goalId);
      const target = goal?.target;
      const rows = readProgressRows(ls);
      const todayRow = rows.find((r) => r.goalId === goalId && r.date === clientDate);
      const todayCompletion = todayRow ? Number(todayRow.progressValue) : 0;

      if (!target) {
        return { todayCompletion: 0, weeklyCompletedDays: 0, weeklyTotalDays: 7 };
      }

      const end = new Date(clientDate + "T12:00:00");
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      const startStr = getLocalDateString(start);

      const weekly = rows.filter(
        (r) => r.goalId === goalId && r.date >= startStr && r.date <= clientDate
      );
      const completedDays = weekly.filter((r) => Number(r.progressValue) >= target).length;

      return {
        todayCompletion,
        weeklyCompletedDays: completedDays,
        weeklyTotalDays: 7,
        target,
      };
    },

    increment(goalId: string, increment: number, clientDate: string) {
      const ls = getLS();
      if (!ls) throw new Error("localStorage unavailable");
      const goal = storage.goals.get(goalId);
      if (!goal?.target) throw new Error("Goal does not have a target");
      const target = goal.target;

      const rows = readProgressRows(ls);
      const key = rowKey(goalId, clientDate);
      const cur = rows.find((r) => rowKey(r.goalId, r.date) === key);
      const currentCompletion = cur ? Number(cur.progressValue) : 0;
      const maxCompletions = Math.min(3, target);
      const newCompletion = Math.min(maxCompletions, currentCompletion + increment);
      upsertProgress(ls, goalId, clientDate, newCompletion);

      return {
        goalId,
        date: clientDate,
        completionCount: newCompletion,
        target,
      };
    },

    set(goalId: string, completionCount: number, clientDate: string) {
      const ls = getLS();
      if (!ls) throw new Error("localStorage unavailable");
      const goal = storage.goals.get(goalId);
      if (!goal?.target) throw new Error("Goal does not have a target");
      const target = goal.target;
      const maxCompletions = Math.min(3, target);
      const clamped = Math.max(0, Math.min(maxCompletions, Math.floor(completionCount)));
      upsertProgress(ls, goalId, clientDate, clamped);
      return {
        goalId,
        date: clientDate,
        completionCount: clamped,
        target,
      };
    },
  },

  /** Raw goals + progress for dashboard summary API (client builds payload). */
  exportForDashboard() {
    const ls = getLS();
    if (!ls) return { goals: [] as Goal[], progress: [] as ProgressRow[] };
    return { goals: readGoals(ls), progress: readProgressRows(ls) };
  },
};
