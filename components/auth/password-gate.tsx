"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/check");
      const data = await response.json();
      setIsAuthenticated(data.authenticated);
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  // Check if running on Android device
  useEffect(() => {
    const checkPlatform = async () => {
      try {
        // Dynamically import Capacitor to avoid errors on web
        const { Capacitor } = await import("@capacitor/core");
        const platform = Capacitor.getPlatform();
        setIsAndroid(platform === "android");
        
        // Skip auth check on Android
        if (platform === "android") {
          setIsAuthenticated(true);
          return;
        }
      } catch (error) {
        // Capacitor not available (web environment) - proceed with auth check
        setIsAndroid(false);
      }
      
      // Check authentication status on mount for non-Android platforms
      checkAuth();
    };

    checkPlatform();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passcode: password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true);
        setPassword("");
      } else {
        setError(data.error || "Incorrect password");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Skip password gate on Android - show content directly
  if (isAndroid) {
    return <>{children}</>;
  }

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show password gate if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-6 rounded-lg bg-card border border-border p-8 shadow-lg">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Lock className="size-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-foreground">Zinda</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter password to access the application
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full bg-background"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-500">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !password}
              className="w-full"
            >
              {loading ? "Verifying..." : "Enter"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Show main content if authenticated
  return <>{children}</>;
}

