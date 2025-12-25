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

  // Convert markdown to HTML (bold and italics only)
  const markdownToHtml = (text: string): string => {
    // Use placeholders to avoid conflicts
    const BOLD_PLACEHOLDER = '___BOLD_START___';
    const BOLD_END_PLACEHOLDER = '___BOLD_END___';
    
    // First, convert **bold** to placeholders
    let html = text.replace(/\*\*(.+?)\*\*/g, (match, content) => {
      return `${BOLD_PLACEHOLDER}${content}${BOLD_END_PLACEHOLDER}`;
    });
    
    // Then convert *italic* to <em>italic</em> (single asterisks that remain)
    html = html.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
    
    // Finally, convert bold placeholders to <strong>
    html = html.replace(new RegExp(BOLD_PLACEHOLDER, 'g'), '<strong>');
    html = html.replace(new RegExp(BOLD_END_PLACEHOLDER, 'g'), '</strong>');
    
    return html;
  };

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

