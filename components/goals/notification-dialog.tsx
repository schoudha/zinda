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
    try {
      await onSave(selectedTime, selectedDays);
      onOpenChange(false);
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
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Bell className="h-5 w-5 text-blue-600" />
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
            <label className="text-sm font-semibold text-gray-900">Reminder Time</label>
            <div className="grid gap-2">
              {timeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedTime(option.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedTime === option.value
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.time}</div>
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
            <label className="text-sm font-semibold text-gray-900">Reminder Days</label>
            <div className="grid gap-2">
              {dayOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedDays(option.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedDays === option.value
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
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

