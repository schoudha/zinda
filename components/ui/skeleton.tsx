"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  );
}

export function GoalCardSkeleton() {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-6 space-y-4 ring-1 ring-black/5 dark:ring-white/5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-1.5 w-1.5 rounded-full" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <div className="space-y-3 pt-4 border-t border-white/40 dark:border-white/10">
        <Skeleton className="h-3 w-32" />
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="flex items-start gap-3">
            <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-lg mt-4" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <main className="flex min-h-screen justify-center bg-background">
      <div className="flex h-full w-full max-w-md flex-col bg-background shadow-2xl shadow-black/20 overflow-hidden min-h-screen relative border-x border-border">
        <div className="flex-1 pb-16">
          <div className="flex flex-col gap-6 pb-6">
            {/* Header skeleton */}
            <div className="px-6 pt-12 pb-4 space-y-2">
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-8 w-32" />
              </div>
              <div className="pt-2 space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>

            {/* Input skeleton */}
            <div className="px-6 space-y-4">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>

            {/* Tabs skeleton */}
            <div className="px-6">
              <Skeleton className="h-10 w-full rounded-full" />
            </div>

            {/* Goal cards skeleton */}
            <div className="flex flex-col gap-4 px-6">
              <GoalCardSkeleton />
              <GoalCardSkeleton />
            </div>
          </div>
        </div>
        
        {/* Bottom nav skeleton */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe">
          <div className="flex justify-around items-center max-w-md mx-auto py-3">
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-10 w-16" />
          </div>
        </div>
      </div>
    </main>
  );
}

