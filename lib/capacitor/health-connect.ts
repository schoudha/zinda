import { registerPlugin } from '@capacitor/core';

export interface ExerciseSession {
  title: string;
  exerciseType: string;
  exerciseTypeValue?: number;
  startTime: number;
  endTime: number;
  durationMinutes: number;
  notes: string;
}

export interface HealthConnectPlugin {
  checkAvailability(): Promise<{ status: number; isAvailable: boolean }>;
  getExerciseMinutes(options?: { period: string }): Promise<{
    totalMinutes: number;
  }>;
  getExerciseSessions(options?: { period: string }): Promise<{
    sessions: ExerciseSession[];
  }>;
  hasPermission(): Promise<{ hasPermission: boolean }>;
  requestPermission(): Promise<void>;
}

export const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect');
