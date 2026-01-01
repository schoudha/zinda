import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { AppBlocking } from '@/lib/capacitor/app-blocking';

// Default blocked apps
export const BLOCKED_APP_PACKAGES = [
  'com.twitter.android',      // X (Twitter)
  'com.instagram.android',     // Instagram
  'com.google.android.youtube', // YouTube
  'com.facebook.katana'        // Facebook
] as const;

export function useAppBlocking() {
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(false);
  const [isBlockingEnabled, setIsBlockingEnabled] = useState(false);
  const [blockedPackages, setBlockedPackages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isNative, setIsNative] = useState(false);

  const checkAccessibilityStatus = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      const result = await AppBlocking.isAccessibilityEnabled();
      setIsAccessibilityEnabled(result.enabled);
    } catch (error) {
      console.error('Failed to check accessibility status:', error);
      setIsAccessibilityEnabled(false);
    }
  }, []);

  const checkBlockingStatus = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      const result = await AppBlocking.isBlockingEnabled();
      setIsBlockingEnabled(result.enabled);
      setBlockedPackages(result.blockedPackages);
    } catch (error) {
      console.error('Failed to check blocking status:', error);
      setIsBlockingEnabled(false);
      setBlockedPackages([]);
    }
  }, []);

  const requestAccessibilityPermission = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      await AppBlocking.requestAccessibilityPermission();
      // Check status after a delay to allow user to enable
      setTimeout(checkAccessibilityStatus, 1000);
    } catch (error) {
      console.error('Failed to request accessibility permission:', error);
      throw error;
    }
  }, [checkAccessibilityStatus]);

  const enableBlocking = useCallback(async (packageNames: readonly string[] | string[] = BLOCKED_APP_PACKAGES) => {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('App blocking is only available on Android');
    }
    
    setIsLoading(true);
    try {
      // First check if accessibility is enabled
      const accessibilityResult = await AppBlocking.isAccessibilityEnabled();
      if (!accessibilityResult.enabled) {
        throw new Error('Accessibility service is not enabled. Please enable it in settings.');
      }
      
      // Convert to mutable array for the API call
      await AppBlocking.enableBlocking({ packageNames: Array.from(packageNames) });
      await checkBlockingStatus();
    } catch (error) {
      console.error('Failed to enable blocking:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [checkBlockingStatus]);

  const disableBlocking = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('App blocking is only available on Android');
    }
    
    setIsLoading(true);
    try {
      await AppBlocking.disableBlocking();
      await checkBlockingStatus();
    } catch (error) {
      console.error('Failed to disable blocking:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [checkBlockingStatus]);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    if (Capacitor.isNativePlatform()) {
      checkAccessibilityStatus();
      checkBlockingStatus();
      
      // Refresh status periodically
      const interval = setInterval(() => {
        checkAccessibilityStatus();
        checkBlockingStatus();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [checkAccessibilityStatus, checkBlockingStatus]);

  return {
    isNative,
    isAccessibilityEnabled,
    isBlockingEnabled,
    blockedPackages,
    isLoading,
    requestAccessibilityPermission,
    enableBlocking,
    disableBlocking,
    refreshStatus: () => {
      checkAccessibilityStatus();
      checkBlockingStatus();
    },
  };
}

