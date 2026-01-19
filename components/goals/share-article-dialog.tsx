"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink } from "lucide-react";

interface ShareArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  url?: string;
  text?: string;
  onConfirm: (title: string, url?: string) => Promise<void>;
}

export function ShareArticleDialog({
  open,
  onOpenChange,
  title,
  url,
  text,
  onConfirm,
}: ShareArticleDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Extract the best title to display
  const displayTitle = title || url || text || "Article";
  
  // Extract a clean title for the goal (prefer title, then URL domain, then text snippet)
  const getGoalTitle = () => {
    if (title) return title;
    if (url) {
      try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace(/^www\./, '');
      } catch {
        return url;
      }
    }
    if (text) {
      // Take first 50 characters of text as title
      return text.length > 50 ? text.substring(0, 50) + '...' : text;
    }
    return "Article";
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const goalTitle = getGoalTitle();
      await onConfirm(goalTitle, url);
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding article to learn goals:", error);
      alert("Sorry, there was an error adding the article to your learn goals. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md dark:bg-gray-900 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-gray-100">
            <BookOpen className="h-5 w-5 text-blue-500" />
            Add Article to Learn Goals?
          </DialogTitle>
          <DialogClose onClose={handleCancel} />
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Would you like to add this article to your learn goals?
              </p>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-2">
                  <BookOpen className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                      {displayTitle}
                    </p>
                    {url && (
                      <div className="flex items-center gap-1 mt-1">
                        <ExternalLink className="h-3 w-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                          {url}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleCancel}
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? "Adding..." : "Add to Learn Goals"}
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
