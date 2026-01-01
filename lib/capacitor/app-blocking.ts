import { registerPlugin } from '@capacitor/core';

export interface AppBlockingPlugin {
  /**
   * Check if accessibility service is enabled
   */
  isAccessibilityEnabled(): Promise<{ enabled: boolean }>;
  
  /**
   * Open accessibility settings for user to enable the service
   */
  requestAccessibilityPermission(): Promise<void>;
  
  /**
   * Enable blocking for specified package names
   */
  enableBlocking(options: { packageNames: string[] }): Promise<void>;
  
  /**
   * Disable app blocking
   */
  disableBlocking(): Promise<void>;
  
  /**
   * Check if blocking is currently enabled
   */
  isBlockingEnabled(): Promise<{ enabled: boolean; blockedPackages: string[] }>;
}

export const AppBlocking = registerPlugin<AppBlockingPlugin>('AppBlocking', {
  web: () => import('./app-blocking.web').then(m => new m.AppBlockingWeb()),
});

