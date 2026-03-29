"use client";

import { useEffect, useRef } from "react";
import { usePlaidLink } from "react-plaid-link";

export interface PlaidLinkSessionProps {
  token: string;
  onSuccess: (publicToken: string) => void | Promise<void>;
  onExit: () => void;
}

/**
 * Mount only when `token` is set so `usePlaidLink` does not run on every dashboard load.
 * That avoids Plaid script initialization / "Failed to find script" issues and update-depth loops (#185).
 */
export function PlaidLinkSession({ token, onSuccess, onExit }: PlaidLinkSessionProps) {
  const { open, ready } = usePlaidLink({
    token,
    onSuccess,
    onExit,
  });

  const openedForTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      openedForTokenRef.current = null;
      return;
    }
    if (!ready) return;
    if (openedForTokenRef.current === token) return;
    openedForTokenRef.current = token;
    open();
  }, [token, ready, open]);

  return null;
}
