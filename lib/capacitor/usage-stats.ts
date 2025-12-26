import { registerPlugin } from '@capacitor/core';

export interface UsageStatsPlugin {
  getUsage(options?: { period: string }): Promise<{
    totalTime: number; // in milliseconds
    apps: {
      packageName: string;
      time: number;
      isSystem: boolean;
      isUpdatedSystem: boolean;
    }[];
  }>;
  hasPermission(): Promise<{ hasPermission: boolean }>;
  requestPermission(): Promise<void>;
}

export const UsageStats = registerPlugin<UsageStatsPlugin>('UsageStats');
