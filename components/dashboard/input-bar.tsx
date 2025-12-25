"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function InputBar() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || isLoading) return;

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
          <div className="px-4 pb-4 flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !message.trim()}
              className="rounded-xl bg-black text-white hover:bg-gray-800 hover:scale-105 transition-all duration-200 px-6 h-10 font-medium text-sm shadow-lg shadow-gray-900/20"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Create Goal"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {response && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-lg shadow-purple-500/5 ring-1 ring-purple-500/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-purple-600" />
            </div>
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">AI Analysis</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
}

