"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { detectPeriod, markdownToHtml } from "@/lib/utils";
import { api } from "@/lib/api";
import { GoalCategory } from "@/types";
import { cn } from "@/lib/utils";

// Health icon (heart ❤️)
const HealthIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: 'inherit', lineHeight: 1 }}>❤️</span>
);

// Prayer icon (person kneeling 🧎)
const PrayerIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: 'inherit', lineHeight: 1 }}>🧎</span>
);

// Learn icon (book 📚)
const LearnIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: 'inherit', lineHeight: 1 }}>📚</span>
);

// Family icon (family 👨‍👩‍👧‍👦)
const FamilyIcon = ({ className }: { className?: string }) => (
  <span className={className} style={{ fontSize: 'inherit', lineHeight: 1 }}>👨‍👩‍👧‍👦</span>
);

interface InputBarProps {
  onGoalCreated?: () => void;
  initialCategory?: GoalCategory | null;
}

export function InputBar({ onGoalCreated, initialCategory }: InputBarProps) {
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<GoalCategory>(initialCategory || "health");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update category when initialCategory prop changes and focus input
  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory);
      // Focus the input when category is pre-selected
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [initialCategory]);

  const categories: { id: GoalCategory; icon: React.ElementType | React.FC<{ className?: string }>; label: string }[] = [
    { id: "health", icon: HealthIcon, label: "Health" },
    { id: "faith", icon: PrayerIcon, label: "Faith" },
    { id: "learn", icon: LearnIcon, label: "Learn" },
    { id: "family", icon: FamilyIcon, label: "Family" },
  ];

  // Parse tips from Gemini response
  const parseTips = (response: string): string[] => {
    // Remove markdown headers but keep bold/italics
    let cleaned = response
      .replace(/^#{1,6}\s+/gm, '') // Remove markdown headers
      .trim();
    
    // Try to extract numbered or bulleted tips
    const lines = cleaned.split("\n").filter(line => line.trim().length > 0);
    const tips: string[] = [];
    
    for (const line of lines) {
      // Skip headers and section labels
      if (line.toLowerCase().includes('tips to achieve') || 
          line.toLowerCase().includes('here are') ||
          line.toLowerCase().includes('suggestions')) {
        continue;
      }
      
      // Match numbered lists (1., 2., 3., etc.)
      const numberedMatch = line.match(/^\d+[\.\)]\s*(.+)$/);
      if (numberedMatch) {
        const tip = numberedMatch[1].trim();
        if (tip.length > 15 && tip.length < 300) {
          tips.push(markdownToHtml(tip));
        }
        continue;
      }
      
      // Match bullet points (-, •, *, etc.) - but not markdown bold/italic markers
      const bulletMatch = line.match(/^[-•]\s*(.+)$/);
      if (bulletMatch) {
        const tip = bulletMatch[1].trim();
        if (tip.length > 15 && tip.length < 300) {
          tips.push(markdownToHtml(tip));
        }
        continue;
      }
      
      // Match lines that look like tips (not headers, not too short/long)
      if (line.length > 20 && line.length < 300 && 
          !line.includes(":") && 
          !line.match(/^[A-Z\s]+$/) && // Not all caps (likely a header)
          !line.toLowerCase().startsWith('tip')) {
        tips.push(markdownToHtml(line.trim()));
      }
    }
    
    // If we couldn't parse structured tips, split by sentences and take first 3
    if (tips.length === 0) {
      const sentences = cleaned.split(/[.!?]+/).filter(s => {
        const trimmed = s.trim();
        return trimmed.length > 20 && trimmed.length < 300;
      });
      tips.push(...sentences.slice(0, 3).map(s => markdownToHtml(s.trim())));
    }
    
    // Limit to 2-3 tips and clean them up
    return tips.slice(0, 3)
      .filter(tip => tip.length > 0)
      .map(tip => tip.replace(/^["']|["']$/g, '').trim()); // Remove quotes
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
        category: category,
        tips: tips,
        createdAt: new Date(),
      });

      setMessage(""); // Clear input after successful creation
      setCategory("health"); // Reset to default category
      
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
    <div className="flex flex-col gap-4">
      <Card className="rounded-2xl border-none shadow-xl shadow-blue-900/5 dark:shadow-black/20 bg-white dark:bg-card overflow-hidden ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10 dark:hover:shadow-black/30">
        <CardContent className="p-0">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-16 px-6 border-none bg-transparent text-base placeholder:text-gray-400 dark:placeholder:text-gray-500 text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="What's your main goal today?"
            disabled={isLoading}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-center">
        {categories.map((cat) => {
          const Icon = cat.icon as React.ElementType<{ className?: string }>;
          const isSelected = category === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
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
        className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 font-semibold text-base shadow-lg shadow-blue-500/25 dark:shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
    </div>
  );
}
