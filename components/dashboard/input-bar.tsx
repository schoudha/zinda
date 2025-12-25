"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface InputBarProps {
  onAddNote?: (note: string) => void;
}

export function InputBar({ onAddNote }: InputBarProps) {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (action: "note" | "goal") => {
    if (!message.trim() || isLoading) return;

    if (action === "note" && onAddNote) {
      // Add note directly without API call
      onAddNote(message);
      setMessage("");
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: `Create this goal: ${message}`
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const data = await res.json();
      setResponse(data.response);
      setMessage(""); // Clear input after successful send
    } catch (error) {
      console.error("Error sending message:", error);
      setResponse("Sorry, there was an error processing your message.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit("goal");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-lg border-none shadow-lg ring-1 ring-black/5">
        <CardContent className="p-3">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-gray-400 overflow-visible"
            placeholder="What are you trying to achieve? Or just add a note to track later"
            disabled={isLoading}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          onClick={() => handleSubmit("note")}
          disabled={isLoading || !message.trim()}
          variant="outline"
          className="flex-1"
        >
          Add Note
        </Button>
        <Button
          onClick={() => handleSubmit("goal")}
          disabled={isLoading || !message.trim()}
          variant="default"
          className="flex-1 bg-black text-white hover:bg-gray-800"
        >
          Create Goal
        </Button>
      </div>

      {response && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
}

