import { WebPlugin } from '@capacitor/core';
import type { AppBlockingPlugin } from './app-blocking';

export class AppBlockingWeb extends WebPlugin implements AppBlockingPlugin {
  async isAccessibilityEnabled(): Promise<{ enabled: boolean }> {
    return { enabled: false };
  }

  async requestAccessibilityPermission(): Promise<void> {
    throw new Error('App blocking is only available on Android');
  }

  async enableBlocking(): Promise<void> {
    throw new Error('App blocking is only available on Android');
  }

  async disableBlocking(): Promise<void> {
    throw new Error('App blocking is only available on Android');
  }

  async isBlockingEnabled(): Promise<{ enabled: boolean; blockedPackages: string[] }> {
    return { enabled: false, blockedPackages: [] };
  }
}

