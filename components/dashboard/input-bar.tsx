"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface InputBarProps {
  onGoalCreated?: () => void;
}

export function InputBar({ onGoalCreated }: InputBarProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Detect period from goal text
  const detectPeriod = (text: string): "week" | "month" | "year" => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("year") || lowerText.includes("yearly") || lowerText.includes("annual")) {
      return "year";
    }
    if (lowerText.includes("month") || lowerText.includes("monthly")) {
      return "month";
    }
    return "week"; // Default to weekly
  };

  // Parse tips from Gemini response
  const parseTips = (response: string): string[] => {
    // Try to extract numbered or bulleted tips
    const lines = response.split("\n").filter(line => line.trim().length > 0);
    const tips: string[] = [];
    
    for (const line of lines) {
      // Match numbered lists (1., 2., 3., etc.)
      const numberedMatch = line.match(/^\d+[\.\)]\s*(.+)$/);
      if (numberedMatch) {
        tips.push(numberedMatch[1].trim());
        continue;
      }
      
      // Match bullet points (-, •, *, etc.)
      const bulletMatch = line.match(/^[-•*]\s*(.+)$/);
      if (bulletMatch) {
        tips.push(bulletMatch[1].trim());
        continue;
      }
      
      // If line starts with a tip-like pattern
      if (line.length > 20 && line.length < 200 && !line.includes(":")) {
        tips.push(line.trim());
      }
    }
    
    // If we couldn't parse structured tips, split by sentences and take first 3
    if (tips.length === 0) {
      const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 20);
      tips.push(...sentences.slice(0, 3).map(s => s.trim()));
    }
    
    // Limit to 2-3 tips
    return tips.slice(0, 3).filter(tip => tip.length > 0);
  };

  const handleSubmit = async () => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);

    try {
      const goalText = message.trim();
      const period = detectPeriod(goalText);

      // Get tips from Gemini
      const tipsResponse = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: `Provide the user with 2-3 tips on how to achieve this goal: ${goalText}`
        }),
      });

      if (!tipsResponse.ok) {
        throw new Error("Failed to get tips from AI");
      }

      const tipsData = await tipsResponse.json();
      const tips = parseTips(tipsData.response);

      // Create the goal
      const goalId = Date.now().toString();
      const goalResponse = await fetch("/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: goalId,
          text: goalText,
          period: period,
          tips: tips,
          createdAt: new Date().toISOString(),
        }),
      });

      if (!goalResponse.ok) {
        throw new Error("Failed to create goal");
      }

      setMessage(""); // Clear input after successful creation
      
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
      <Card className="rounded-2xl border-none shadow-xl shadow-blue-900/5 bg-white overflow-hidden ring-1 ring-black/5 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10">
        <CardContent className="p-0">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-16 px-6 border-none bg-transparent text-base placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="What's your main goal today?"
            disabled={isLoading}
          />
        </CardContent>
      </Card>
      
      <Button
        onClick={handleSubmit}
        disabled={isLoading || !message.trim()}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 font-semibold text-base shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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

