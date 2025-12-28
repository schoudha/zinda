import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { HealthConnect } from '@/lib/capacitor/health-connect';

export function useHealthConnect(period: string = 'week') {
  const [totalMinutes, setTotalMinutes] = useState<number>(0);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isNative, setIsNative] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  
  // Keep track of permission status in a ref to use in effects without dependency loops
  const hasPermissionRef = useRef(false);

  const checkAvailability = async () => {
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
    if (!Capacitor.isNativePlatform()) {
      // Mock data for web
      const mockMinutes = period === 'week' ? 180 : period === 'today' ? 45 : 720;
      setTotalMinutes(mockMinutes);
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
      const { totalMinutes: minutes } = await HealthConnect.getExerciseMinutes({ period });
      setTotalMinutes(minutes || 0);
    } catch (e) {
      console.error('Failed to load exercise minutes', e);
      setTotalMinutes(0);
    }
  };

  const requestPermission = async () => {
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

      return () => {
          clearInterval(interval);
          resumeListener.then((handle: any) => handle.remove());
      };
    } else {
      loadExerciseMinutes();
    }
  }, [period]);

  return {
    isNative,
    isAvailable,
    hasPermission,
    totalMinutes,
    requestPermission,
    refresh: loadExerciseMinutes
  };
}
