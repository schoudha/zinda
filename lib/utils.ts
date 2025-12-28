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

/**
 * Extracts an integer target from goal text (e.g., "Pray namaz 3 times" -> 3)
 * Returns null if no integer target is found
 */
export function extractIntegerTarget(text: string): number | null {
  // Match patterns like "3 times", "5x", "10 per day", etc.
  // Look for numbers followed by common completion words
  const patterns = [
    /(\d+)\s*(?:times?|x|per\s*(?:day|week|month|year))/i,
    /(\d+)\s*(?:completions?|tasks?|items?)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > 0 && num <= 100) { // Reasonable range
        return num;
      }
    }
  }
  
  // Fallback: look for standalone numbers that might be targets
  // This is less reliable, so we'll be conservative
  const standaloneMatch = text.match(/\b(\d{1,2})\s+(?:times?|x)\b/i);
  if (standaloneMatch) {
    const num = parseInt(standaloneMatch[1], 10);
    if (num > 0 && num <= 10) { // More conservative for standalone
      return num;
    }
  }
  
  return null;
}
