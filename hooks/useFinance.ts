"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { storage } from "@/lib/storage";
import { formatYmd } from "@/lib/finance-aggregates";
import type { PlaidItem, PlaidTransaction } from "@/types";

const FINANCE_EVENT = "zinda-finance";
const PLAID_ITEMS_KEY = "zinda:plaid_items";
const PLAID_TX_KEY = "zinda:plaid_transactions";

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(FINANCE_EVENT, handler);
  return () => window.removeEventListener(FINANCE_EVENT, handler);
}

/**
 * getSnapshot must return a referentially stable value when the underlying
 * data hasn't changed — otherwise useSyncExternalStore re-renders in a loop.
 * We compare the raw localStorage JSON strings to decide when to re-parse.
 */
let _prevItemsRaw: string | null = null;
let _prevTxRaw: string | null = null;
let _cached: { items: PlaidItem[]; transactions: PlaidTransaction[] } = {
  items: [],
  transactions: [],
};

function getSnapshot() {
  const ls = typeof window !== "undefined" ? window.localStorage : null;
  if (!ls) return _cached;

  const itemsRaw = ls.getItem(PLAID_ITEMS_KEY);
  const txRaw = ls.getItem(PLAID_TX_KEY);

  if (itemsRaw !== _prevItemsRaw || txRaw !== _prevTxRaw) {
    _prevItemsRaw = itemsRaw;
    _prevTxRaw = txRaw;
    _cached = {
      items: storage.finance.getItems(),
      transactions: storage.finance.getTransactions(),
    };
  }

  return _cached;
}

function getServerSnapshot() {
  return { items: [] as PlaidItem[], transactions: [] as PlaidTransaction[] };
}

export function useFinance() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { items, transactions } = snapshot;

  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshForItem = useCallback(async (item: PlaidItem) => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - 1);
    const startDate = formatYmd(start);
    const endDate = formatYmd(end);
    const data = await api.finance.getTransactions(item.accessToken, startDate, endDate);
    storage.finance.mergeTransactionsForItem(item.itemId, data.transactions);
    storage.finance.setLastSyncedForItem(item.itemId, new Date().toISOString());
  }, []);

  const refreshAll = useCallback(async () => {
    const list = storage.finance.getItems();
    if (list.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      for (const item of list) {
        await refreshForItem(item);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setLoading(false);
    }
  }, [refreshForItem]);

  const onPlaidSuccess = useCallback(
    async (publicToken: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.finance.exchangeToken(publicToken);
        const item: PlaidItem = {
          itemId: data.item_id,
          accessToken: data.access_token,
          institutionName: data.institution_name,
          accounts: data.accounts,
          lastSynced: new Date().toISOString(),
        };
        storage.finance.saveItem(item);

        const end = new Date();
        const start = new Date();
        start.setFullYear(end.getFullYear() - 1);
        const txData = await api.finance.getTransactions(
          item.accessToken,
          formatYmd(start),
          formatYmd(end)
        );
        storage.finance.mergeTransactionsForItem(item.itemId, txData.transactions);
        storage.finance.setLastSyncedForItem(item.itemId, new Date().toISOString());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Connection failed");
      } finally {
        setLoading(false);
        setLinkToken(null);
      }
    },
    []
  );

  const onPlaidExit = useCallback(() => {
    setLinkToken(null);
  }, []);

  const startConnect = useCallback(async () => {
    setError(null);
    try {
      const { link_token } = await api.finance.createLinkToken();
      setLinkToken(link_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start Plaid");
    }
  }, []);

  const disconnect = useCallback((itemId: string) => {
    storage.finance.removeItem(itemId);
  }, []);

  const didAutoRefresh = useRef(false);
  useEffect(() => {
    if (didAutoRefresh.current) return;
    const list = storage.finance.getItems();
    if (list.length === 0) return;
    const stale = list.some((i) => {
      if (!i.lastSynced) return true;
      return Date.now() - new Date(i.lastSynced).getTime() > 60 * 60 * 1000;
    });
    if (!stale) return;
    didAutoRefresh.current = true;

    let cancelled = false;
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - 1);
    const startDate = formatYmd(start);
    const endDate = formatYmd(end);

    void (async () => {
      try {
        for (const item of list) {
          if (cancelled) return;
          const data = await api.finance.getTransactions(item.accessToken, startDate, endDate);
          storage.finance.mergeTransactionsForItem(item.itemId, data.transactions);
          storage.finance.setLastSyncedForItem(item.itemId, new Date().toISOString());
        }
      } catch {
        // silent: network / missing Plaid keys on first paint
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    items,
    transactions,
    loading,
    error,
    startConnect,
    refreshAll,
    disconnect,
    linkToken,
    onPlaidSuccess,
    onPlaidExit,
  };
}
