import type { PlaidTransaction } from "@/types";

export function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Sum positive amounts (typical outflows) in [start, end] by transaction date. */
export function sumSpendingInRange(
  transactions: PlaidTransaction[],
  start: Date,
  end: Date
): number {
  const s = formatYmd(start);
  const e = formatYmd(end);
  return transactions
    .filter((t) => !t.pending && t.date >= s && t.date <= e && t.amount > 0)
    .reduce((acc, t) => acc + t.amount, 0);
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}
