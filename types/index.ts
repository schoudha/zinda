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
export type NotificationTime = "morning" | "evening" | "night";
export type NotificationDays = "everyday" | "weekday" | "weekend";

export interface Goal {
  id: string;
  text: string;
  period: GoalPeriod;
  tips: string[];
  createdAt: Date;
  userId?: string;
  notificationTime?: NotificationTime;
  notificationDays?: NotificationDays;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

