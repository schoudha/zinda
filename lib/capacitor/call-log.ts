import { registerPlugin } from '@capacitor/core';

export interface CallLogCall {
  phoneNumber: string;
  date: number; // timestamp in milliseconds
  duration: number; // duration in seconds
  type: 'incoming' | 'outgoing';
  matchedNumber: string; // which target number this call matched
}

export interface CallLogPlugin {
  /**
   * Check if call log permission is granted
   */
  hasPermission(): Promise<{ hasPermission: boolean }>;
  
  /**
   * Request call log permission
   */
  requestPermission(): Promise<void>;
  
  /**
   * Get call history for specified phone numbers within date range
   */
  getCallHistory(options: {
    phoneNumbers: string[];
    startDate: number; // timestamp in milliseconds
    endDate: number; // timestamp in milliseconds
    minDurationSeconds?: number; // minimum call duration in seconds (default: 30)
  }): Promise<{
    calls: CallLogCall[];
    count: number;
  }>;
}

export const CallLog = registerPlugin<CallLogPlugin>('CallLog', {
  web: () => import('./call-log.web').then(m => new m.CallLogWeb()),
});

