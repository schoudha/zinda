import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { GoalPeriod } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function detectPeriod(text: string): GoalPeriod {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("year") || lowerText.includes("yearly") || lowerText.includes("annual")) {
    return "year";
  }
  if (lowerText.includes("month") || lowerText.includes("monthly")) {
    return "month";
  }
  return "week"; // Default to weekly
}

export function markdownToHtml(text: string): string {
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
}
