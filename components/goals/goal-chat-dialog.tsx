"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Goal, Message, ChatContext } from "@/types";
import { markdownToHtml } from "@/lib/utils";
import { api } from "@/lib/api";
import { Send, Loader2 } from "lucide-react";
import { generateId } from "@/lib/id-utils";

interface GoalChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
  additionalContext?: ChatContext;
}

export function GoalChatDialog({ open, onOpenChange, goal, additionalContext }: GoalChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat history when dialog opens
  useEffect(() => {
    if (open && goal?.id) {
      loadHistory();
    } else {
      setMessages([]);
    }
  }, [open, goal?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadHistory = async () => {
    if (!goal?.id) return;
    
    setIsLoading(true);
    try {
      const history = await api.goals.chat.history(goal.id);
      setMessages(history.map((m) => ({
        ...m,
        createdAt: new Date(m.createdAt)
      })));
    } catch (error) {
      console.error("Error loading chat history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending || !goal?.id) return;

    const userMsgText = inputValue.trim();
    setInputValue("");
    setIsSending(true);

    // Optimistically add user message
    const tempId = generateId();
    const tempUserMsg: Message = {
      id: tempId,
      role: "user",
      content: userMsgText,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const { userMessage, aiMessage } = await api.goals.chat.send(goal.id, userMsgText, additionalContext);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] bg-background flex flex-col">
        <DialogHeader>
          <DialogTitle>Chat about your goal</DialogTitle>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>
        <DialogBody className="flex flex-col overflow-hidden p-0">
          {/* Messages Area */}
          <div 
            ref={scrollRef} 
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50 space-y-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <div className="h-6 w-6 rounded-full bg-blue-500" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
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

          {/* Input Area */}
          <div className="border-t border-border p-4 bg-background">
            <div className="flex gap-2 items-center">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask for advice..."
                className="flex-1 rounded-full border-input bg-muted focus-visible:ring-blue-500 focus-visible:ring-offset-0"
                disabled={isSending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isSending}
                size="icon"
                className="rounded-full h-10 w-10 shrink-0 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 dark:shadow-none"
              >
                <Send className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

