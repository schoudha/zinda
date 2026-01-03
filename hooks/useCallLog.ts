import { useState, useEffect, useCallback } from 'react';
import { CallLog, type CallLogCall } from '@/lib/capacitor/call-log';
import { Capacitor } from '@capacitor/core';

export interface CallHistoryByDate {
  [date: string]: CallLogCall[]; // date in YYYY-MM-DD format
}

export interface WeeklyCallStatus {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  calls: CallLogCall[];
  contactsCalled: Set<string>; // Set of phone numbers that were called
  isSuccessful: boolean; // true if all target numbers were called at least once
}

export interface UseCallLogResult {
  calls: CallLogCall[];
  callsByDate: CallHistoryByDate;
  weeklyStatus: WeeklyCallStatus[];
  isLoading: boolean;
  hasPermission: boolean;
  isNative: boolean;
  requestPermission: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCallLog(
  phoneNumbers: string[],
  period: 'today' | 'week' | 'month' | 'year' = 'week'
): UseCallLogResult {
  const [calls, setCalls] = useState<CallLogCall[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  // Get period date range
  const getPeriodRange = useCallback(() => {
    const now = new Date();
    let startDate: Date;
    
    if (period === 'today') {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate = new Date(now);
      const dayOfWeek = startDate.getDay();
      startDate.setDate(startDate.getDate() - dayOfWeek); // Go back to Sunday
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
    } else { // year
      startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
    }
    
    return {
      startDate: startDate.getTime(),
      endDate: now.getTime(),
    };
  }, [period]);

  // Check permission
  const checkPermission = useCallback(async () => {
    if (!isNative) {
      setHasPermission(false);
      return;
    }
    
    try {
      const result = await CallLog.hasPermission();
      setHasPermission(result.hasPermission);
    } catch (error) {
      console.error('Error checking call log permission:', error);
      setHasPermission(false);
    }
  }, [isNative]);

  // Request permission
  const requestPermission = useCallback(async () => {
    if (!isNative) {
      throw new Error('Call log access is only available on native platforms');
    }
    
    try {
      await CallLog.requestPermission();
      await checkPermission();
    } catch (error) {
      console.error('Error requesting call log permission:', error);
      throw error;
    }
  }, [isNative, checkPermission]);

  // Fetch call history
  const fetchCallHistory = useCallback(async () => {
    if (!isNative || !hasPermission || phoneNumbers.length === 0) {
      setCalls([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const { startDate, endDate } = getPeriodRange();
      const result = await CallLog.getCallHistory({
        phoneNumbers,
        startDate,
        endDate,
        minDurationSeconds: 30, // Minimum 30 seconds
      });
      
      setCalls(result.calls);
    } catch (error) {
      console.error('Error fetching call history:', error);
      setCalls([]);
    } finally {
      setIsLoading(false);
    }
  }, [isNative, hasPermission, phoneNumbers, getPeriodRange]);

  // Group calls by date
  const callsByDate: CallHistoryByDate = calls.reduce((acc, call) => {
    const date = new Date(call.date);
    const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(call);
    return acc;
  }, {} as CallHistoryByDate);

  // Calculate weekly status
  const weeklyStatus: WeeklyCallStatus[] = (() => {
    if (period !== 'week' && period !== 'month' && period !== 'year') {
      return [];
    }
    
    const weeks: WeeklyCallStatus[] = [];
    const { startDate } = getPeriodRange();
    const now = new Date();
    
    // Group calls into weeks
    const currentWeekStart = new Date(startDate);
    while (currentWeekStart <= now) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekCalls = calls.filter(call => {
        const callDate = new Date(call.date);
        return callDate >= currentWeekStart && callDate <= weekEnd;
      });
      
      // Get unique phone numbers that were called this week
      const contactsCalled = new Set(
        weekCalls.map(call => call.matchedNumber)
      );
      
      // Success: all target phone numbers were called at least once
      const isSuccessful = phoneNumbers.every(num => 
        contactsCalled.has(num) || 
        weekCalls.some(call => {
          // Normalize comparison
          const normalizedCall = call.matchedNumber.replace(/\D/g, '');
          const normalizedTarget = num.replace(/\D/g, '');
          return normalizedCall === normalizedTarget || 
                 normalizedCall.endsWith(normalizedTarget) || 
                 normalizedTarget.endsWith(normalizedCall);
        })
      );
      
      weeks.push({
        weekStart: currentWeekStart.toLocaleDateString('en-CA'),
        weekEnd: weekEnd.toLocaleDateString('en-CA'),
        calls: weekCalls,
        contactsCalled,
        isSuccessful,
      });
      
      // Move to next week
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    return weeks;
  })();

  // Initial load
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Fetch when permission is granted and phone numbers are available
  useEffect(() => {
    if (hasPermission && phoneNumbers.length > 0) {
      fetchCallHistory();
    }
  }, [hasPermission, phoneNumbers, fetchCallHistory]);

  return {
    calls,
    callsByDate,
    weeklyStatus,
    isLoading,
    hasPermission,
    isNative,
    requestPermission,
    refresh: fetchCallHistory,
  };
}

