"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { detectPeriod, markdownToHtml } from "@/lib/utils";
import { api } from "@/lib/api";
import { GoalCategory, Goal } from "@/types";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/id-utils";

// Health icon (heart ❤️)
const HealthIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: 'inherit', lineHeight: 1 }}>❤️</span>
);

// Prayer icon (folded hands 🙏)
const PrayerIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: 'inherit', lineHeight: 1 }}>🙏</span>
);

// Learn icon (book 📚)
const LearnIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: 'inherit', lineHeight: 1 }}>📚</span>
);

// Screentime icon (no phones 📵)
const ScreentimeIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: 'inherit', lineHeight: 1 }}>📵</span>
);

interface GoalCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: GoalCategory;
  onGoalCreated?: () => void;
}

export function GoalCreationDialog({ open, onOpenChange, category, onGoalCreated }: GoalCreationDialogProps) {
  const [message, setMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory>(category);
  const [minutesPerDay, setMinutesPerDay] = useState<string>("30");
  const [momPhoneNumber, setMomPhoneNumber] = useState<string>("707 813 9151");
  const [sisterPhoneNumber, setSisterPhoneNumber] = useState<string>("802 310 5975");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update category when prop changes
  useEffect(() => {
    if (open) {
      setSelectedCategory(category);
      setMessage("");
      // Set default minutesPerDay: 10 for screentime, 150 for family, 30 for health
      setMinutesPerDay(category === "screentime" || category === "family" ? (category === "screentime" ? "10" : "150") : "30");
      // Set default phone numbers for family goals
      if (category === "family") {
        setMomPhoneNumber("707 813 9151");
        setSisterPhoneNumber("802 310 5975");
      }
      // Focus the input when dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [category, open]);

  const categories: { id: GoalCategory; icon: React.ElementType | React.FC<{ className?: string }>; label: string }[] = [
    { id: "health", icon: HealthIcon, label: "Health" },
    { id: "faith", icon: PrayerIcon, label: "Faith" },
    { id: "learn", icon: LearnIcon, label: "Learn" },
    { id: "family", icon: ScreentimeIcon, label: "Screentime" },
  ];

  // Parse tips from Gemini response
  const parseTips = (response: string): string[] => {
    let cleaned = response
      .replace(/^#{1,6}\s+/gm, '')
      .trim();
    
    const lines = cleaned.split("\n").filter(line => line.trim().length > 0);
    const tips: string[] = [];
    
    for (const line of lines) {
      if (line.toLowerCase().includes('tips to achieve') || 
          line.toLowerCase().includes('here are') ||
          line.toLowerCase().includes('suggestions')) {
        continue;
      }
      
      const numberedMatch = line.match(/^\d+[\.\)]\s*(.+)$/);
      if (numberedMatch) {
        const tip = numberedMatch[1].trim();
        if (tip.length > 15 && tip.length < 300) {
          tips.push(markdownToHtml(tip));
        }
        continue;
      }
      
      const bulletMatch = line.match(/^[-•]\s*(.+)$/);
      if (bulletMatch) {
        const tip = bulletMatch[1].trim();
        if (tip.length > 15 && tip.length < 300) {
          tips.push(markdownToHtml(tip));
        }
        continue;
      }
      
      if (line.length > 20 && line.length < 300 && 
          !line.includes(":") && 
          !line.match(/^[A-Z\s]+$/) &&
          !line.toLowerCase().startsWith('tip')) {
        tips.push(markdownToHtml(line.trim()));
      }
    }
    
    if (tips.length === 0) {
      const sentences = cleaned.split(/[.!?]+/).filter(s => {
        const trimmed = s.trim();
        return trimmed.length > 20 && trimmed.length < 300;
      });
      tips.push(...sentences.slice(0, 3).map(s => markdownToHtml(s.trim())));
    }
    
    return tips.slice(0, 3)
      .filter(tip => tip.length > 0)
      .map(tip => tip.replace(/^["']|["']$/g, '').trim());
  };

  const handleSubmit = async () => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);

    try {
      const goalText = message.trim();
      const period = detectPeriod(goalText);

      // Get tips from Gemini
      const tipsResponse = await api.goals.tips(goalText);
      const tips = parseTips(tipsResponse);

      // Create the goal with selected category
      const goalId = generateId();
      const goalData: Partial<Goal> = {
        id: goalId,
        text: goalText,
        period: period,
        category: selectedCategory,
        tips: tips,
        createdAt: new Date(),
      };
      
      // Add minutesPerDay for health, screentime, and family goals
      if (selectedCategory === "health" || selectedCategory === "family" || selectedCategory === "screentime") {
        const minutes = parseInt(minutesPerDay, 10);
        if (!isNaN(minutes) && minutes > 0) {
          goalData.minutesPerDay = minutes;
        }
      }

      // Set time window defaults for screentime goals (6pm-8pm)
      if (selectedCategory === "screentime" || selectedCategory === "family") {
        goalData.screentimeStartHour = 18; // 6pm
        goalData.screentimeEndHour = 20; // 8pm
      }

      // Set family phone numbers for family goals
      if (selectedCategory === "family") {
        const phoneNumbers: string[] = [];
        if (momPhoneNumber.trim()) {
          phoneNumbers.push(momPhoneNumber.trim());
        }
        if (sisterPhoneNumber.trim()) {
          phoneNumbers.push(sisterPhoneNumber.trim());
        }
        if (phoneNumbers.length > 0) {
          goalData.familyPhoneNumbers = phoneNumbers;
        }
      }

      // Default target for faith goals
      if (selectedCategory === "faith") {
        goalData.target = 3;
      }
      
      await api.goals.create(goalData);

      setMessage("");
      onOpenChange(false);
      
      // Notify parent to refresh goals
      if (onGoalCreated) {
        onGoalCreated();
      }
    } catch (error) {
      console.error("Error creating goal:", error);
      alert("Sorry, there was an error creating your goal. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background">
        <DialogHeader>
          <DialogTitle>Create Goal</DialogTitle>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-12 px-4 border border-input bg-background text-base"
            placeholder="What's your main goal?"
            disabled={isLoading}
          />

          <div className="flex gap-2 justify-center">
            {categories.map((cat) => {
              const Icon = cat.icon as React.ElementType<{ className?: string }>;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    // Set default minutesPerDay: 10 for screentime, 150 for family, 30 for health
                    setMinutesPerDay(cat.id === "screentime" ? "10" : cat.id === "family" ? "150" : "30");
                    // Set default phone numbers for family goals
                    if (cat.id === "family") {
                      setMomPhoneNumber("707 813 9151");
                      setSisterPhoneNumber("802 310 5975");
                    }
                  }}
                  title={cat.label}
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                    isSelected
                      ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-md"
                      : "bg-white text-gray-400 border-gray-200 dark:bg-white/5 dark:text-gray-500 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </div>
          
          {(selectedCategory === "health" || selectedCategory === "family" || selectedCategory === "screentime") && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Target: Minutes per day
              </label>
              <Input
                type="number"
                min="1"
                max="1440"
                value={minutesPerDay}
                onChange={(e) => setMinutesPerDay(e.target.value)}
                className="w-full h-12 px-4 border border-input bg-background text-base"
                placeholder={selectedCategory === "screentime" ? "10" : selectedCategory === "family" ? "150" : "30"}
                disabled={isLoading}
              />
            </div>
          )}

          {selectedCategory === "family" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Mom's Phone Number
                </label>
                <Input
                  type="tel"
                  value={momPhoneNumber}
                  onChange={(e) => setMomPhoneNumber(e.target.value)}
                  className="w-full h-12 px-4 border border-input bg-background text-base"
                  placeholder="707 813 9151"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Sister's Phone Number
                </label>
                <Input
                  type="tel"
                  value={sisterPhoneNumber}
                  onChange={(e) => setSisterPhoneNumber(e.target.value)}
                  className="w-full h-12 px-4 border border-input bg-background text-base"
                  placeholder="802 310 5975"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}
          
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !message.trim()}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 font-semibold text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating Goal...</span>
              </div>
            ) : (
              "Create Goal"
            )}
          </Button>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

