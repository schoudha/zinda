"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NotificationTime, NotificationDays } from "@/types";
import { Bell } from "lucide-react";

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  currentTime?: NotificationTime;
  currentDays?: NotificationDays;
  onSave: (time: NotificationTime | null, days: NotificationDays | null) => Promise<void>;
}

const timeOptions: { value: NotificationTime; label: string; time: string }[] = [
  { value: "morning", label: "Morning", time: "8:00 AM" },
  { value: "evening", label: "Evening", time: "4:00 PM" },
  { value: "night", label: "Night", time: "7:30 PM" },
];

const dayOptions: { value: NotificationDays; label: string; description: string }[] = [
  { value: "everyday", label: "Everyday", description: "All days of the week" },
  { value: "weekday", label: "Weekdays", description: "Monday to Friday" },
  { value: "weekend", label: "Weekend", description: "Friday evening to Sunday night" },
];

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationDialog({
  open,
  onOpenChange,
  goalId,
  currentTime,
  currentDays,
  onSave,
}: NotificationDialogProps) {
  const [selectedTime, setSelectedTime] = useState<NotificationTime | null>(currentTime || null);
  const [selectedDays, setSelectedDays] = useState<NotificationDays | null>(currentDays || null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when dialog opens or props change
  useEffect(() => {
    if (open) {
      setSelectedTime(currentTime || null);
      setSelectedDays(currentDays || null);
    }
  }, [open, currentTime, currentDays]);

  const handleSave = async () => {
    setIsSaving(true);

    // Request notification permission if not already granted
    if ("Notification" in window && Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Please enable notifications to receive reminders.");
        setIsSaving(false);
        return;
      }
    }

    // Subscribe to push notifications
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        
        if (vapidPublicKey) {
           const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });

          // Send subscription to backend
          await fetch("/api/notifications/subscribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ subscription }),
          });
        } else {
           console.warn("VAPID public key not found");
        }
      }
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      // We continue even if push subscription fails, as local notifications/email might still work (in theory)
    }

    try {
      await onSave(selectedTime, selectedDays);
      onOpenChange(false);

      // Show a confirmation notification
      if ("Notification" in window && Notification.permission === "granted") {
        // Find labels for confirmation message
        const timeLabel = timeOptions.find(t => t.value === selectedTime)?.time;
        const dayLabel = dayOptions.find(d => d.value === selectedDays)?.label;
        
        new Notification("Goal Reminder Set", { 
          body: `We'll remind you about this goal ${dayLabel?.toLowerCase()} at ${timeLabel}.`,
          icon: "/icon-192x192.png",
          badge: "/icon-192x192.png"
        });
      }
    } catch (error) {
      console.error("Error saving notification settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      await onSave(null, null);
      setSelectedTime(null);
      setSelectedDays(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error clearing notification settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <DialogTitle>Set Goal Reminder</DialogTitle>
            </div>
            <DialogClose onClose={() => onOpenChange(false)} />
          </div>
        </DialogHeader>
        <DialogBody className="space-y-6">
          {/* Time Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Reminder Time</label>
            <div className="grid gap-2">
              {timeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedTime(option.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedTime === option.value
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-800 bg-white dark:bg-card hover:border-gray-300 dark:hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{option.label}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{option.time}</div>
                    </div>
                    {selectedTime === option.value && (
                      <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Days Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Reminder Days</label>
            <div className="grid gap-2">
              {dayOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedDays(option.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedDays === option.value
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-800 bg-white dark:bg-card hover:border-gray-300 dark:hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{option.label}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{option.description}</div>
                    </div>
                    {selectedDays === option.value && (
                      <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {(selectedTime || selectedDays || currentTime || currentDays) && (
              <Button
                variant="outline"
                onClick={handleClear}
                disabled={isSaving}
                className="flex-1"
              >
                Clear
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving || (!selectedTime || !selectedDays)}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? "Saving..." : "Save Reminder"}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

