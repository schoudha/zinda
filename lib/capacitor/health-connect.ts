import { registerPlugin } from '@capacitor/core';

export interface HealthConnectPlugin {
  getExerciseMinutes(options?: { period: string }): Promise<{
    totalMinutes: number;
  }>;
  hasPermission(): Promise<{ hasPermission: boolean }>;
  requestPermission(): Promise<void>;
}

export const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect');

