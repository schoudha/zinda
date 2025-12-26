import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { UsageStats } from '@/lib/capacitor/usage-stats';

export interface AppUsage {
  packageName: string;
  timeInForeground: number;
}

export function useUsageStats() {
  const [totalTime, setTotalTime] = useState<number>(0);
  const [apps, setApps] = useState<AppUsage[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isNative, setIsNative] = useState<boolean>(false);

  const checkPermission = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { hasPermission } = await UsageStats.hasPermission();
      setHasPermission(hasPermission);
    } catch (e) {
      console.error('Failed to check usage stats permission', e);
    }
  };

  const loadStats = async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      const stats = await UsageStats.getDailyUsage();
      setTotalTime(stats.totalTime);
      
      const appList = Object.entries(stats.apps)
        .map(([pkg, time]) => ({
          packageName: pkg,
          timeInForeground: time
        }))
        .sort((a, b) => b.timeInForeground - a.timeInForeground);
        
      setApps(appList);
    } catch (e) {
      console.error('Failed to load usage stats', e);
    }
  };

  const requestPermission = async () => {
    if (!Capacitor.isNativePlatform()) return;
    await UsageStats.requestPermission();
    // Re-check after a delay or on resume (simplified here)
    setTimeout(checkPermission, 1000);
  };

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    if (Capacitor.isNativePlatform()) {
      checkPermission();
      loadStats();
      
      // Refresh every minute
      const interval = setInterval(loadStats, 60000);
      return () => clearInterval(interval);
    }
  }, []);

  return {
    isNative,
    hasPermission,
    totalTime,
    apps,
    requestPermission,
    refresh: loadStats
  };
}

