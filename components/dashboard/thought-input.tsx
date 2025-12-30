"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function ThoughtInput() {
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (text: string) => {
      const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
      return api.thoughts.create({
        id: Date.now().toString(),
        text: text,
        createdAt: new Date(),
        date: today,
      });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["thoughts"] });
    },
    onError: (error) => {
      console.error("Error creating thought:", error);
    },
  });

  const handleSubmit = () => {
    if (!message.trim() || mutation.isPending) return;
    mutation.mutate(message.trim());
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
            placeholder="Share a thought on how the day is going"
            disabled={mutation.isPending}
          />
        </CardContent>
      </Card>
      
      <Button
        onClick={handleSubmit}
        disabled={mutation.isPending || !message.trim()}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 font-semibold text-base shadow-lg shadow-blue-500/25 dark:shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {mutation.isPending ? (
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Saving...</span>
          </div>
        ) : (
          "Share Thought"
        )}
      </Button>
      {mutation.isError && (
        <p className="text-sm text-red-500 text-center">
          Failed to save thought. Please try again.
        </p>
      )}
    </div>
  );
}
