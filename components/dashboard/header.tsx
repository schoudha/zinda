"use client";

import { useState, useEffect } from "react";
import { getRandomQuranQuote, type QuranQuote } from "@/lib/quran-quotes";

interface HeaderProps {
  userName?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  } else if (hour < 17) {
    return "Good afternoon";
  } else if (hour < 21) {
    return "Good evening";
  } else {
    return "Good night";
  }
}

export function Header({ 
  userName = "Salahuddin"
}: HeaderProps) {
  const [greeting, setGreeting] = useState(getGreeting());
  const [quote, setQuote] = useState<QuranQuote | null>(null);

  useEffect(() => {
    // Set initial greeting
    setGreeting(getGreeting());
    
    // Update greeting every minute
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);

    // Load random Quran quote on mount
    setQuote(getRandomQuranQuote());

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 pt-8 space-y-3">
      <h1 className="text-xl font-bold tracking-tight text-gray-900">
        {greeting}, {userName}.
      </h1>
      {quote && (
        <div className="space-y-1">
          <p className="text-sm text-gray-700 leading-relaxed italic" dir="rtl" lang="ar">
            {quote.arabic}
          </p>
          <p className="text-xs text-gray-600">
            {quote.english}
          </p>
          <p className="text-xs text-gray-400">
            {quote.reference}
          </p>
        </div>
      )}
    </div>
  );
}

