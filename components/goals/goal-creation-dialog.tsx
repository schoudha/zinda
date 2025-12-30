"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { detectPeriod, markdownToHtml } from "@/lib/utils";
import { api } from "@/lib/api";
import { GoalCategory } from "@/types";
import { Heart, BookOpen, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// Custom Islamic crescent icon
const CrescentIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
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
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update category when prop changes
  useEffect(() => {
    if (open) {
      setSelectedCategory(category);
      setMessage("");
      // Focus the input when dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [category, open]);

  const categories: { id: GoalCategory; icon: React.ElementType | React.FC<{ className?: string }>; label: string }[] = [
    { id: "health", icon: Heart, label: "Health" },
    { id: "faith", icon: CrescentIcon, label: "Faith" },
    { id: "learn", icon: BookOpen, label: "Learn" },
    { id: "family", icon: Users, label: "Family" },
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
      const goalId = Date.now().toString();
      await api.goals.create({
        id: goalId,
        text: goalText,
        period: period,
        category: selectedCategory,
        tips: tips,
        createdAt: new Date(),
      });

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
                  onClick={() => setSelectedCategory(cat.id)}
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

