import { useState, useEffect, useRef } from 'react';
import { HealthConnect, ExerciseSession } from '@/lib/capacitor/health-connect';

export function useHealthConnect(period: string = 'week') {
  const [totalMinutes, setTotalMinutes] = useState<number>(0);
  const [dailyStats, setDailyStats] = useState<Record<string, number>>({});
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isNative, setIsNative] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  
  // Keep track of permission status in a ref to use in effects without dependency loops
  const hasPermissionRef = useRef(false);

  const checkAvailability = async () => {
    let Capacitor: typeof import('@capacitor/core').Capacitor;
    try {
      Capacitor = (await import('@capacitor/core')).Capacitor;
    } catch {
      return false;
    }
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const { isAvailable } = await HealthConnect.checkAvailability();
      setIsAvailable(isAvailable);
      return isAvailable;
    } catch (e) {
      console.error('Failed to check health connect availability', e);
      setIsAvailable(false);
      return false;
    }
  };

  const checkPermission = async () => {
    let Capacitor: typeof import('@capacitor/core').Capacitor;
    try {
      Capacitor = (await import('@capacitor/core')).Capacitor;
    } catch {
      return false;
    }
    if (!Capacitor.isNativePlatform()) return false;
    
    // Check availability if we haven't confirmed it's available
    if (!isAvailable) {
        const available = await checkAvailability();
        if (!available) return false;
    }

    try {
      const { hasPermission: hasPerm } = await HealthConnect.hasPermission();
      setHasPermission(hasPerm);
      hasPermissionRef.current = hasPerm;
      return hasPerm;
    } catch (e) {
      console.error('Failed to check health connect permission', e);
      setHasPermission(false);
      hasPermissionRef.current = false;
      return false;
    }
  };

  const loadExerciseMinutes = async () => {
    let Capacitor: typeof import('@capacitor/core').Capacitor;
    try {
      Capacitor = (await import('@capacitor/core')).Capacitor;
    } catch {
      // No Capacitor on web - show 0
      setTotalMinutes(0);
      return;
    }
    if (!Capacitor.isNativePlatform()) {
      // No mock data - show 0 on web
      setTotalMinutes(0);
      return;
    }

    // CRITICAL: Do not attempt to read if we don't have permission
    if (!hasPermissionRef.current) {
        // Double check just in case state is stale
        const hasPerm = await checkPermission();
        if (!hasPerm) {
            console.log('Skipping loadExerciseMinutes: No permission');
            return;
        }
    }
    
    try {
      const [minutesResult, sessionsResult] = await Promise.all([
        HealthConnect.getExerciseMinutes({ period }),
        HealthConnect.getExerciseSessions({ period })
      ]);
      
      setTotalMinutes(minutesResult.totalMinutes || 0);
      setSessions(sessionsResult.sessions || []);

      // Process sessions into daily stats
      const stats: Record<string, number> = {};
      sessionsResult.sessions.forEach(session => {
        // Use local date string YYYY-MM-DD
        const date = new Date(session.startTime).toLocaleDateString('en-CA');
        stats[date] = (stats[date] || 0) + session.durationMinutes;
      });
      setDailyStats(stats);
    } catch (e) {
      console.error('Failed to load exercise data', e);
      setTotalMinutes(0);
      setDailyStats({});
    }
  };

  const requestPermission = async () => {
    let Capacitor: typeof import('@capacitor/core').Capacitor;
    try {
      Capacitor = (await import('@capacitor/core')).Capacitor;
    } catch {
      return;
    }
    if (!Capacitor.isNativePlatform()) return;
    
    // Check availability first
    if (!isAvailable) {
        const available = await checkAvailability();
        if (!available) {
            console.warn("Health Connect is not available on this device");
            return;
        }
    }

    await HealthConnect.requestPermission();
    // The permission flow is asynchronous and native. 
    // We rely on the App 'resume' event to re-check permissions.
  };

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    const init = async () => {
      let Capacitor: typeof import('@capacitor/core').Capacitor;
      let App: typeof import('@capacitor/app').App;
      try {
        const capacitorModule = await import('@capacitor/core');
        Capacitor = capacitorModule.Capacitor;
        const appModule = await import('@capacitor/app');
        App = appModule.App;
      } catch {
        // Capacitor not available (web environment)
        setIsNative(false);
        // Show mock data on web
        const mockSessions: ExerciseSession[] = [
          { startTime: Date.now() - 1000 * 60 * 60 * 2, endTime: Date.now() - 1000 * 60 * 60 * 2 + 1000 * 60 * 45, durationMinutes: 45, title: 'Morning Run', exerciseType: 'running', notes: '' },
          { startTime: Date.now() - 1000 * 60 * 60 * 24 * 1, endTime: Date.now() - 1000 * 60 * 60 * 24 * 1 + 1000 * 60 * 30, durationMinutes: 30, title: 'Yoga Flow', exerciseType: 'yoga', notes: '' },
          { startTime: Date.now() - 1000 * 60 * 60 * 24 * 2, endTime: Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60, durationMinutes: 60, title: 'Gym Workout', exerciseType: 'strength_training', notes: '' },
          { startTime: Date.now() - 1000 * 60 * 60 * 24 * 3, endTime: Date.now() - 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 20, durationMinutes: 20, title: 'Quick HIIT', exerciseType: 'high_intensity_interval_training', notes: '' },
          { startTime: Date.now() - 1000 * 60 * 60 * 24 * 4, endTime: Date.now() - 1000 * 60 * 60 * 24 * 4 + 1000 * 60 * 40, durationMinutes: 40, title: 'Evening Walk', exerciseType: 'walking', notes: '' },
        ];
        
        const filteredSessions = mockSessions.filter(s => {
          const date = new Date(s.startTime);
          const now = new Date();
          if (period === 'today') return date.toDateString() === now.toDateString();
          if (period === 'week') return date.getTime() > now.getTime() - 7 * 24 * 60 * 60 * 1000;
          if (period === 'month') return date.getTime() > now.getTime() - 30 * 24 * 60 * 60 * 1000;
          return true;
        });
        
        const total = filteredSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
        setTotalMinutes(total);
        
        const stats: Record<string, number> = {};
        filteredSessions.forEach(session => {
          const date = new Date(session.startTime).toLocaleDateString('en-CA');
          stats[date] = (stats[date] || 0) + session.durationMinutes;
        });
        setDailyStats(stats);
        setSessions(filteredSessions);
        setHasPermission(true);
        setIsAvailable(true);
        return;
      }

      setIsNative(Capacitor.isNativePlatform());
      if (Capacitor.isNativePlatform()) {
        checkAvailability().then(async (available) => {
            if (available) {
              const hasPerm = await checkPermission();
              if (hasPerm) {
                  loadExerciseMinutes();
              }
            }
        });
        
        // Refresh every 5 minutes
        const interval = setInterval(() => {
            if (isAvailable && hasPermissionRef.current) {
                loadExerciseMinutes();
            }
        }, 5 * 60000);

        // Re-check permission when app resumes (returns from settings/permission dialog)
        const resumeListener = App.addListener('resume', () => {
            // Add a small delay to allow Health Connect to update its permission state
            setTimeout(async () => {
                const hasPerm = await checkPermission();
                if (hasPerm) {
                    loadExerciseMinutes();
                }
            }, 500);
        });

        cleanup = () => {
            clearInterval(interval);
            resumeListener.then((handle: any) => handle.remove());
        };
      } else {
        // On web, provide mock data for development
        const mockSessions: ExerciseSession[] = [
          { startTime: Date.now() - 1000 * 60 * 60 * 2, endTime: Date.now() - 1000 * 60 * 60 * 2 + 1000 * 60 * 45, durationMinutes: 45, title: 'Morning Run', exerciseType: 'running', notes: '' },
          { startTime: Date.now() - 1000 * 60 * 60 * 24 * 1, endTime: Date.now() - 1000 * 60 * 60 * 24 * 1 + 1000 * 60 * 30, durationMinutes: 30, title: 'Yoga Flow', exerciseType: 'yoga', notes: '' },
          { startTime: Date.now() - 1000 * 60 * 60 * 24 * 2, endTime: Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60, durationMinutes: 60, title: 'Gym Workout', exerciseType: 'strength_training', notes: '' },
          { startTime: Date.now() - 1000 * 60 * 60 * 24 * 3, endTime: Date.now() - 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 20, durationMinutes: 20, title: 'Quick HIIT', exerciseType: 'high_intensity_interval_training', notes: '' },
          { startTime: Date.now() - 1000 * 60 * 60 * 24 * 4, endTime: Date.now() - 1000 * 60 * 60 * 24 * 4 + 1000 * 60 * 40, durationMinutes: 40, title: 'Evening Walk', exerciseType: 'walking', notes: '' },
        ];
        
        const filteredSessions = mockSessions.filter(s => {
          const date = new Date(s.startTime);
          const now = new Date();
          if (period === 'today') return date.toDateString() === now.toDateString();
          if (period === 'week') return date.getTime() > now.getTime() - 7 * 24 * 60 * 60 * 1000;
          if (period === 'month') return date.getTime() > now.getTime() - 30 * 24 * 60 * 60 * 1000;
          return true;
        });
        
        const total = filteredSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
        setTotalMinutes(total);
        
        const stats: Record<string, number> = {};
        filteredSessions.forEach(session => {
          const date = new Date(session.startTime).toLocaleDateString('en-CA');
          stats[date] = (stats[date] || 0) + session.durationMinutes;
        });
        setDailyStats(stats);
        setSessions(filteredSessions);
        setHasPermission(true);
        setIsAvailable(true);
      }
    };

    init();

    return () => {
      if (cleanup) cleanup();
    };
  }, [period]);

  return {
    isNative,
    isAvailable,
    hasPermission,
    totalMinutes,
    dailyStats,
    sessions,
    requestPermission,
    refresh: loadExerciseMinutes
  };
}
