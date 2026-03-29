"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Loader2, RefreshCw } from "lucide-react";
import { useFinance } from "@/hooks/useFinance";
import { sumSpendingInRange, startOfToday, endOfToday } from "@/lib/finance-aggregates";
import { cn } from "@/lib/utils";

function formatUsd(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export const FinanceCard = memo(function FinanceCard() {
  const {
    items,
    transactions,
    loading,
    error,
    startConnect,
    refreshAll,
    disconnect,
  } = useFinance();

  const todaySpend =
    transactions.length > 0
      ? sumSpendingInRange(transactions, startOfToday(), endOfToday())
      : 0;

  const recent = [...transactions]
    .filter((t) => !t.pending)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  const connected = items.length > 0;

  return (
    <Card className="border-none bg-white dark:bg-card shadow-xl shadow-emerald-900/5 dark:shadow-black/20 rounded-3xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
      <CardHeader className="pb-2 pt-6 px-6">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Finance
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {connected ? "Accounts" : "Financial data"}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {connected && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => void refreshAll()}
                disabled={loading}
                aria-label="Refresh transactions"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                ) : (
                  <RefreshCw className="h-4 w-4 text-emerald-600" />
                )}
              </Button>
            )}
            <span
              className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                connected
                  ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40"
                  : "text-gray-400"
              )}
            >
              {connected ? "Connected" : "Not connected"}
            </span>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        {!connected && (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Link your bank to see spending and transactions (Plaid sandbox supported).
            </p>
            <Button
              type="button"
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => void startConnect()}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Connecting…
                </>
              ) : (
                "Connect bank account"
              )}
            </Button>
          </>
        )}

        {connected && (
          <div className="space-y-3 pt-1 border-t border-gray-100 dark:border-gray-800">
            <div className="flex flex-wrap gap-2">
              {items.map((it) => (
                <div
                  key={it.itemId}
                  className="flex items-center justify-between gap-2 text-xs bg-muted/50 rounded-lg px-2 py-1.5 flex-1 min-w-[140px]"
                >
                  <span className="font-medium text-foreground truncate">{it.institutionName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] text-muted-foreground"
                    onClick={() => disconnect(it.itemId)}
                  >
                    Disconnect
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Today (spend)</span>
              <span className="text-2xl font-extrabold text-gray-900 dark:text-white tabular-nums">
                {formatUsd(todaySpend)}
              </span>
            </div>

            {recent.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Recent</p>
                <ul className="space-y-1.5">
                  {recent.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-2 text-xs text-gray-800 dark:text-gray-200"
                    >
                      <span className="truncate">{t.merchantName || t.name}</span>
                      <span className="tabular-nums shrink-0 font-medium">
                        {t.amount > 0 ? "-" : ""}
                        {formatUsd(Math.abs(t.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-9 text-xs border-emerald-200 dark:border-emerald-900"
              onClick={() => void startConnect()}
              disabled={loading}
            >
              Link another account
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
