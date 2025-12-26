import { registerPlugin } from '@capacitor/core';

export interface UsageStatsPlugin {
  getDailyUsage(): Promise<{
    totalTime: number; // in milliseconds
    apps: Record<string, number>; // package name -> time in ms
  }>;
  hasPermission(): Promise<{ hasPermission: boolean }>;
  requestPermission(): Promise<void>;
}

export const UsageStats = registerPlugin<UsageStatsPlugin>('UsageStats');

