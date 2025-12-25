"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Mic, Camera, Sparkles, Send, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function InputBar() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
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
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-full border-none shadow-lg ring-1 ring-black/5">
        <CardContent className="flex items-center p-2 pl-4">
          <Sparkles className="mr-3 h-5 w-5 text-purple-500" />
          <form onSubmit={handleSubmit} className="flex-1 flex items-center">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-none bg-transparent p-0 text-base shadow-none focus-visible:ring-0 placeholder:text-gray-400"
              placeholder="What goal are you trying to achieve? Type here to get status, create a new goal or more"
              disabled={isLoading}
            />
          </form>
          <div className="flex items-center gap-1 pr-2 text-gray-400">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !message.trim()}
              className="p-2 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              className="p-2 hover:text-gray-600"
              disabled={isLoading}
            >
              <Mic className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="p-2 hover:text-gray-600"
              disabled={isLoading}
            >
              <Camera className="h-5 w-5" />
            </button>
          </div>
        </CardContent>
      </Card>

      {response && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
}

