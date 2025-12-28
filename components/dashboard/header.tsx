"use client";

import { useState, useEffect, memo } from "react";

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

  useEffect(() => {
    // Set initial greeting
    setGreeting(getGreeting());
    
    // Update greeting every minute
    const interval = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="px-6 pb-4 space-y-2" style={{ paddingTop: 'calc(3rem + env(safe-area-inset-top))' }}>
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
        {greeting},<br />
        <span className="text-muted-foreground">{userName}.</span>
      </h1>
    </div>
  );
});

