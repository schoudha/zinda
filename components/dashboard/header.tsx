"use client";

import { useState, useEffect, memo } from "react";
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

export const Header = memo(function Header({ 
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
    <div className="px-6 pt-12 pb-4 space-y-2">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        {greeting},<br />
        <span className="text-muted-foreground">{userName}.</span>
      </h1>
      {quote && (
        <div className="pt-2 space-y-1">
          <p className="text-sm font-medium text-foreground/80 leading-relaxed italic border-l-2 border-blue-500 pl-3">
            "{quote.english}"
          </p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground pl-3">
            {quote.reference}
          </p>
        </div>
      )}
    </div>
  );
});

