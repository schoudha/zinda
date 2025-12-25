"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Goal, Message } from "@/types";
import { markdownToHtml } from "@/lib/utils";
import { api } from "@/lib/api";

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [goal, setGoal] = useState<Goal | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const [goalData, messagesData] = await Promise.all([
          api.goals.get(id),
          api.goals.chat.history(id)
        ]);
        
        setGoal(goalData);
        setMessages(messagesData.map((m) => ({
          ...m,
          createdAt: new Date(m.createdAt)
        })));
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

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
      const { userMessage, aiMessage } = await api.goals.chat.send(id, userMsgText);

      // Replace temp message with real one and add AI response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempId);
        return [
          ...filtered,
          { ...userMessage, createdAt: new Date(userMessage.createdAt) },
          { ...aiMessage, createdAt: new Date(aiMessage.createdAt) }
        ];
      });
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove temp message or show error
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 flex-col gap-4">
        <p className="text-gray-500">Goal not found</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const periodColors = {
    week: "bg-blue-50 text-blue-900",
    month: "bg-purple-50 text-purple-900",
    year: "bg-orange-50 text-orange-900",
  };

  const periodDotColors = {
    week: "bg-blue-500",
    month: "bg-purple-500",
    year: "bg-orange-500",
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 p-4 flex items-center gap-4 z-10 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900 truncate flex-1">
          Goal Discussion
        </h1>
      </div>

      {/* Goal Context Card */}
      <div className="p-4 bg-gray-50 z-10 shrink-0">
        <Card className={`border-none shadow-sm ${periodColors[goal.period]} transition-all`}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <div className={`h-2 w-2 rounded-full ${periodDotColors[goal.period]}`} />
              <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                {goal.period === 'week' ? 'Weekly' : goal.period === 'month' ? 'Monthly' : 'Yearly'} Goal
              </span>
            </div>
            <p className="font-bold text-lg leading-tight">{goal.text}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden relative bg-white rounded-t-3xl shadow-inner -mt-2 pt-4">
        <div 
          ref={scrollRef} 
          className="h-full overflow-y-auto px-4 pb-20 pt-2 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50 space-y-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full bg-blue-500" />
              </div>
              <p className="text-sm font-medium">
                Start a conversation with your AI coach about this goal.
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
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-gray-100 text-gray-800 rounded-bl-none"
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
              <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow-sm">
                <div className="flex gap-1 h-5 items-center">
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <div className="flex gap-2 items-center">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for advice..."
            className="flex-1 rounded-full border-gray-200 bg-gray-50 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isSending}
            size="icon"
            className="rounded-full h-10 w-10 shrink-0 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20"
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}
