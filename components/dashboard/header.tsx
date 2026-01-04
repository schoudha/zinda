"use client";

import { useState, useEffect, memo } from "react";

interface HeaderProps {
  userName?: string;
  selectedPeriod?: "today" | "week" | "month" | "year";
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
  userName = "Salahuddin",
  selectedPeriod = "today"
}: HeaderProps) {
  const [greeting, setGreeting] = useState(getGreeting());
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  useEffect(() => {
    // Set initial greeting
    setGreeting(getGreeting());

    // Update greeting every minute
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Fetch summary when period changes
  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoadingSummary(true);
      try {
        const response = await fetch(`/api/dashboard/summary?period=${selectedPeriod}`);
        if (response.ok) {
          const data = await response.json();
          setSummary(data.summary);
        } else {
          console.error('Failed to fetch summary');
          setSummary(null);
        }
      } catch (error) {
        console.error('Error fetching summary:', error);
        setSummary(null);
      } finally {
        setIsLoadingSummary(false);
      }
    };

    fetchSummary();
  }, [selectedPeriod]);

  return (
    <div className="px-6 pb-6 pt-4 space-y-2">
      <h1 className="text-4xl font-serif font-medium tracking-tight text-foreground leading-tight">
        {greeting},<br />
        <span className="text-muted-foreground italic">{userName}.</span>
      </h1>
      {summary && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {summary}
        </p>
      )}
      {isLoadingSummary && !summary && (
        <p className="text-sm text-muted-foreground italic">
          Loading your summary...
        </p>
      )}
    </div>
  );
});

