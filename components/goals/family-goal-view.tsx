"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Lock, Phone, PhoneCall, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Goal } from "@/types";
import { useCallLog } from "@/hooks/useCallLog";

interface FamilyGoalViewProps {
  goal: Goal;
  period: "today" | "week" | "month" | "year";
  setPeriod: (period: "today" | "week" | "month" | "year") => void;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

function getContactLabel(phoneNumber: string, phoneNumbers: string[]): string {
  // Default labels based on position (Mom first, Sister second)
  const index = phoneNumbers.findIndex(num => {
    const normalizedNum = num.replace(/\D/g, '');
    const normalizedCall = phoneNumber.replace(/\D/g, '');
    return normalizedCall === normalizedNum || 
           normalizedCall.endsWith(normalizedNum) || 
           normalizedNum.endsWith(normalizedCall);
  });
  
  if (index === 0) return "Mom";
  if (index === 1) return "Sister";
  return phoneNumber;
}

export function FamilyGoalView({ 
  goal, 
  period, 
  setPeriod 
}: FamilyGoalViewProps) {
  const phoneNumbers = goal.familyPhoneNumbers || [];
  const { 
    calls, 
    callsByDate, 
    weeklyStatus, 
    isLoading, 
    hasPermission, 
    isNative, 
    requestPermission 
  } = useCallLog(phoneNumbers, period);

  // Get current period calls
  const currentPeriodCalls = calls;
  
  // Count calls per contact for current period
  const callCountsByContact = phoneNumbers.reduce((acc, num) => {
    const count = currentPeriodCalls.filter(call => {
      const normalizedCall = call.matchedNumber.replace(/\D/g, '');
      const normalizedTarget = num.replace(/\D/g, '');
      return normalizedCall === normalizedTarget || 
             normalizedCall.endsWith(normalizedTarget) || 
             normalizedTarget.endsWith(normalizedCall);
    }).length;
    acc[num] = count;
    return acc;
  }, {} as Record<string, number>);

  // Calculate success status for current period
  const isSuccessful = phoneNumbers.every(num => {
    return callCountsByContact[num] > 0;
  });

  // For week/month/year views, show weekly status
  const showWeeklyStatus = period === 'week' || period === 'month' || period === 'year';

  return (
    <div className="space-y-4">
      <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
        <TabsList className="w-full">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="year">Year</TabsTrigger>
        </TabsList>
        
        <TabsContent value={period} className="space-y-4 mt-4">
          {/* Phone Numbers Being Tracked */}
          {phoneNumbers.length > 0 && (
            <Card className="border-none shadow-sm bg-blue-50 dark:bg-blue-950/30">
              <CardContent className="p-4 space-y-2">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Tracking Calls To:
                </div>
                <div className="space-y-1">
                  {phoneNumbers.map((num, index) => {
                    const label = index === 0 ? "Mom" : index === 1 ? "Sister" : `Contact ${index + 1}`;
                    const count = callCountsByContact[num] || 0;
                    const hasCalled = count > 0;
                    return (
                      <div key={num} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {hasCalled ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="font-medium text-blue-900 dark:text-blue-100">
                            {label}
                          </span>
                        </div>
                        <span className="text-blue-700 dark:text-blue-300">
                          {count} {count === 1 ? 'call' : 'calls'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Status */}
          {period === 'week' && (
            <Card className={`border-none shadow-sm ${
              isSuccessful 
                ? 'bg-green-50 dark:bg-green-950/30' 
                : 'bg-yellow-50 dark:bg-yellow-950/30'
            }`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    isSuccessful 
                      ? 'text-green-900 dark:text-green-100' 
                      : 'text-yellow-900 dark:text-yellow-100'
                  }`}>
                    Week Status
                  </span>
                  {isSuccessful ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  )}
                </div>
                <div className={`text-xs ${
                  isSuccessful 
                    ? 'text-green-700/70 dark:text-green-300/70' 
                    : 'text-yellow-700/70 dark:text-yellow-300/70'
                }`}>
                  {isSuccessful 
                    ? '✓ Called both Mom and Sister this week'
                    : 'Need to call both Mom and Sister this week'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Permissions / Connect */}
          {isNative && !hasPermission && (
            <Card className="border-dashed border-2 border-gray-200 dark:border-gray-800 bg-transparent">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
                <Lock className="h-8 w-8 text-gray-400" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Connect Call Log</p>
                  <p className="text-xs text-muted-foreground">Allow access to track calls to family members</p>
                </div>
                <Button size="sm" onClick={requestPermission}>
                  Connect
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && (
            <Card className="border-none shadow-sm">
              <CardContent className="p-6 flex items-center justify-center">
                <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </CardContent>
            </Card>
          )}

          {/* Weekly Status (for week/month/year views) */}
          {showWeeklyStatus && weeklyStatus.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Weekly Progress</h3>
                <div className="space-y-2">
                  {weeklyStatus.map((week, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        week.isSuccessful
                          ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                          : 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-foreground">
                          {formatDate(week.weekStart)} - {formatDate(week.weekEnd)}
                        </span>
                        {week.isSuccessful ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {week.calls.length} {week.calls.length === 1 ? 'call' : 'calls'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Call History */}
          {isNative && hasPermission && !isLoading && (
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Recent Calls</h3>
                {currentPeriodCalls.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No calls found for {period === "today" ? "today" : period === "week" ? "this week" : period === "month" ? "this month" : "this year"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {currentPeriodCalls.slice(0, 20).map((call, index) => {
                      const callDate = new Date(call.date);
                      const contactLabel = getContactLabel(call.matchedNumber, phoneNumbers);
                      return (
                        <div
                          key={index}
                          className="bg-muted rounded-lg p-3 flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white shrink-0">
                            <PhoneCall className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm text-foreground">
                                {contactLabel}
                              </span>
                              <span className="text-xs font-semibold text-muted-foreground">
                                {formatDuration(call.duration)}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {callDate.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })} • {call.type}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {!isNative && (
            <div className="text-center p-4 text-sm text-muted-foreground">
              Call log tracking is only available on Android devices.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

