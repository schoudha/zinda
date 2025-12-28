"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Message } from "@/types";
import { markdownToHtml } from "@/lib/utils";
import { useHealthConnect } from "@/hooks/useHealthConnect";

function HealthChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = (searchParams.get('period') || 'week') as "today" | "week" | "month" | "year";
  const { totalMinutes, hasPermission } = useHealthConnect(period);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calculate goal minutes based on period (150 minutes/week as base)
  const goalMinutes = period === "today" ? 21 : // ~21 min/day (150/7)
                      period === "week" ? 150 :
                      period === "month" ? 600 : // ~150 * 4 weeks
                      7800; // ~150 * 52 weeks
  
  const percentage = Math.min(100, Math.round((totalMinutes / goalMinutes) * 100));
  
  // Get period label for display
  const periodLabel = period === "today" ? "Today" :
                      period === "week" ? "This Week" :
                      period === "month" ? "This Month" :
                      "This Year";

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return;

    const userMsgText = inputValue.trim();
    setInputValue("");
    setIsSending(true);

    // Optimistically add user message
    const tempId = Date.now().toString();
    const tempUserMsg: Message = {
      id: tempId,
      role: "user",
      content: userMsgText,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const history = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/health/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsgText,
          history,
          healthStats: {
            totalMinutes,
            goalMinutes,
            period,
            percentage,
            periodLabel
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const { userMessage, aiMessage } = await response.json();

      // Replace temp message with real one and add AI response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempId);
        return [
          ...filtered,
          { ...userMessage, id: Date.now().toString(), createdAt: new Date() },
          { ...aiMessage, id: (Date.now() + 1).toString(), createdAt: new Date() }
        ];
      });
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  function formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  return (
    <div className="flex flex-col h-screen bg-background max-w-md mx-auto shadow-2xl overflow-hidden relative pt-[env(safe-area-inset-top)]">
      {/* Header */}
      <div className="bg-background border-b border-border p-4 flex items-center gap-4 z-10 shadow-sm shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>
        <h1 className="text-lg font-bold text-foreground truncate flex-1">
          Health Chat
        </h1>
      </div>

      {/* Health Context Card */}
      <div className="p-4 bg-background z-10 shrink-0">
        <Card className="border-none shadow-sm bg-green-50 dark:bg-green-950/50 transition-all">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs font-bold uppercase tracking-wider opacity-70 text-green-900 dark:text-green-100">
                Exercise {periodLabel}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="font-bold text-lg leading-tight text-green-900 dark:text-green-100">
                {formatMinutes(totalMinutes)} / {formatMinutes(goalMinutes)}
              </p>
              <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                {percentage}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden relative bg-card rounded-t-3xl shadow-inner -mt-2 pt-4 border-t border-border/50">
        <div 
          ref={scrollRef} 
          className="h-full overflow-y-auto px-4 pb-20 pt-2 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50 space-y-4">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full bg-green-500" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Start a conversation about your health and exercise progress.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    msg.role === "user"
                      ? "bg-green-600 text-white rounded-br-none"
                      : "bg-muted text-foreground rounded-bl-none"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }} 
                    />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))
          )}
          
          {isSending && (
            <div className="flex w-full justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow-sm">
                <div className="flex gap-1 h-5 items-center">
                  <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-background border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex gap-2 items-center">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your health..."
            className="flex-1 rounded-full border-input bg-muted focus-visible:ring-green-500 focus-visible:ring-offset-0"
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isSending}
            size="icon"
            className="rounded-full h-10 w-10 shrink-0 bg-green-600 hover:bg-green-700 shadow-md shadow-green-500/20 dark:shadow-none"
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function HealthChatPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <HealthChatContent />
    </Suspense>
  );
}
