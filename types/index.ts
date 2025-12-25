export interface Note {
  id: string;
  text: string;
  checked: boolean;
  checkedAt: Date | null;
  createdAt: Date;
  url?: string;
  urlTitle?: string;
  summary?: string;
}

export type GoalPeriod = "week" | "month" | "year";

export interface Goal {
  id: string;
  text: string;
  period: GoalPeriod;
  tips: string[];
  createdAt: Date;
  userId?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

