import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { UsageStats } from '@/lib/capacitor/usage-stats';

export interface AppUsage {
  packageName: string;
  timeInForeground: number;
}

export function useUsageStats(
  period: string = 'today',
  startHour?: number,
  endHour?: number,
  startMinute?: number,
  endMinute?: number
) {
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

  const loadStats = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      const options: {
        period: string;
        startHour?: number;
        endHour?: number;
        startMinute?: number;
        endMinute?: number;
      } = { period };
      if (startHour !== undefined && endHour !== undefined) {
        options.startHour = startHour;
        options.endHour = endHour;
        options.startMinute = startMinute ?? 0;
        options.endMinute = endMinute ?? 0;
      }
      const stats = await UsageStats.getUsage(options);
      
      // Deduplicate stats by package name
      const aggregated = new Map<string, typeof stats.apps[0]>();
      
      stats.apps.forEach(app => {
        const existing = aggregated.get(app.packageName);
        if (existing) {
          existing.time += app.time;
          // Keep the "updated system" flag if either entry has it
          existing.isUpdatedSystem = existing.isUpdatedSystem || app.isUpdatedSystem;
        } else {
          aggregated.set(app.packageName, { ...app });
        }
      });
      
      const uniqueApps = Array.from(aggregated.values());
      
      const appList = uniqueApps
        .filter((app) => {
          const pkg = app.packageName;

          // Filter out apps with less than 3 minutes usage
          if (app.time < 3 * 60 * 1000) return false;
          
          // Always filter out core system packages
          const blocklist = [
            'android',
            'com.android.systemui',
            'com.google.android.googlequicksearchbox', // Google App / Assistant
            'com.android.vending', // Play Store
            'com.android.settings', // Settings
            'com.android.permissioncontroller',
            'com.google.android.gms', // Play Services
            'com.android.providers.media',
            'com.android.providers.calendar',
          ];
          
          if (blocklist.includes(pkg)) return false;
          if (pkg === 'android' || pkg.startsWith('com.android.internal') || pkg.startsWith('com.google.android.packageinstaller')) return false;
          if (pkg.toLowerCase().includes('launcher')) return false;

          // Check system flags
          // Keep if it's NOT a system app
          if (!app.isSystem) return true;
          
          // Keep if it IS a system app but updated (e.g. Chrome, YouTube)
          if (app.isUpdatedSystem) return true;

          // Allowlist for system apps that are actually consumer apps
          // (In case they are preinstalled and not updated yet)
          const allowlistKeywords = [
            'chrome', 'youtube', 'maps', 'gmail', 'photos', 'camera', 'calendar', 'calculator', 'clock', 'messaging', 'music', 'spotify', 'netflix', 'whatsapp', 'instagram', 'facebook', 'twitter', 'tiktok', 'snapchat'
          ];
          
          // Exclude YouTube Music (for podcasts)
          if (pkg.toLowerCase().includes('youtubemusic') || pkg.toLowerCase().includes('youtube.music')) {
            return false;
          }
          
          if (allowlistKeywords.some(keyword => pkg.toLowerCase().includes(keyword))) {
            return true;
          }

          // Otherwise, it's a non-updated system app that isn't in our allowlist (bloatware/internal)
          return false;
        })
        .map((app) => ({
          packageName: app.packageName,
          timeInForeground: app.time,
        }))
        .sort((a, b) => b.timeInForeground - a.timeInForeground);
        
      setApps(appList);
      
      // Calculate total time from filtered apps instead of using raw total
      const filteredTotalTime = appList.reduce((acc, app) => acc + app.timeInForeground, 0);
      setTotalTime(filteredTotalTime);
    } catch (e) {
      console.error('Failed to load usage stats', e);
    }
  }, [period, startHour, endHour, startMinute, endMinute]);

  const requestPermission = async () => {
    if (!Capacitor.isNativePlatform()) return;
    await UsageStats.requestPermission();
    setTimeout(checkPermission, 1000);
    // Also reload stats after permission is granted
    setTimeout(loadStats, 1500);
  };

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | undefined;
    let cleanupResume: (() => void) | undefined;
    let removeVisibility: (() => void) | undefined;

    const init = async () => {
      // Order matters: permission state must update before first read (matches HealthConnect pattern)
      await checkPermission();
      await loadStats();

      intervalId = setInterval(loadStats, 60000);

      const refreshFromForeground = () => {
        setTimeout(() => {
          void checkPermission();
          void loadStats();
        }, 300);
      };

      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("resume", refreshFromForeground);
        cleanupResume = () => {
          void handle.remove();
        };
      } catch {
        // @capacitor/app unavailable (e.g. some web builds)
      }

      if (typeof document !== "undefined") {
        const onVisibility = () => {
          if (document.visibilityState === "visible") {
            refreshFromForeground();
          }
        };
        document.addEventListener("visibilitychange", onVisibility);
        removeVisibility = () => document.removeEventListener("visibilitychange", onVisibility);
      }
    };

    void init();

    return () => {
      if (intervalId !== undefined) clearInterval(intervalId);
      cleanupResume?.();
      removeVisibility?.();
    };
  }, [loadStats]);

  return {
    isNative,
    hasPermission,
    totalTime,
    apps,
    requestPermission,
    refresh: loadStats
  };
}
