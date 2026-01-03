import { WebPlugin } from '@capacitor/core';
import type { CallLogPlugin, CallLogCall } from './call-log';

export class CallLogWeb extends WebPlugin implements CallLogPlugin {
  async hasPermission(): Promise<{ hasPermission: boolean }> {
    return { hasPermission: false };
  }

  async requestPermission(): Promise<void> {
    throw new Error('Call log access is not available on web');
  }

  async getCallHistory(): Promise<{ calls: CallLogCall[]; count: number }> {
    throw new Error('Call log access is not available on web');
  }
}

