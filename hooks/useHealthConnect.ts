import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { HealthConnect } from '@/lib/capacitor/health-connect';

export function useHealthConnect(period: string = 'week') {
  const [totalMinutes, setTotalMinutes] = useState<number>(0);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isNative, setIsNative] = useState<boolean>(false);

  const checkPermission = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { hasPermission: hasPerm } = await HealthConnect.hasPermission();
      setHasPermission(hasPerm);
    } catch (e) {
      console.error('Failed to check health connect permission', e);
      setHasPermission(false);
    }
  };

  const loadExerciseMinutes = async () => {
    if (!Capacitor.isNativePlatform()) {
      // Mock data for web
      const mockMinutes = period === 'week' ? 180 : period === 'today' ? 45 : 720;
      setTotalMinutes(mockMinutes);
      return;
    }
    
    try {
      const { totalMinutes: minutes } = await HealthConnect.getExerciseMinutes({ period });
      setTotalMinutes(minutes || 0);
    } catch (e) {
      console.error('Failed to load exercise minutes', e);
      setTotalMinutes(0);
    }
  };

  const requestPermission = async () => {
    if (!Capacitor.isNativePlatform()) return;
    await HealthConnect.requestPermission();
    setTimeout(checkPermission, 1000);
  };

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    if (Capacitor.isNativePlatform()) {
      checkPermission();
      loadExerciseMinutes();
      
      // Refresh every 5 minutes
      const interval = setInterval(loadExerciseMinutes, 5 * 60000);
      return () => clearInterval(interval);
    } else {
      loadExerciseMinutes();
    }
  }, [period]);

  return {
    isNative,
    hasPermission,
    totalMinutes,
    requestPermission,
    refresh: loadExerciseMinutes
  };
}

