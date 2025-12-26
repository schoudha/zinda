import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { UsageStats } from '@/lib/capacitor/usage-stats';

export interface AppUsage {
  packageName: string;
  timeInForeground: number;
}

export function useUsageStats(period: string = 'today') {
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
      const stats = await UsageStats.getUsage({ period });
      
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
  }, [period]);

  return {
    isNative,
    hasPermission,
    totalTime,
    apps,
    requestPermission,
    refresh: loadStats
  };
}
