import { NextResponse } from "next/server";
import type { Transaction } from "plaid";
import { getPlaidClient } from "@/lib/plaid";

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const access_token = typeof body.access_token === "string" ? body.access_token : null;
    if (!access_token) {
      return NextResponse.json({ error: "access_token is required" }, { status: 400 });
    }

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 365);

    const start_date =
      typeof body.start_date === "string" ? body.start_date : formatDate(start);
    const end_date = typeof body.end_date === "string" ? body.end_date : formatDate(end);

    const plaid = getPlaidClient();

    const allTransactions: Transaction[] = [];
    let offset = 0;
    let total_transactions = 0;

    do {
      const res = await plaid.transactionsGet({
        access_token,
        start_date,
        end_date,
        options: {
          count: 500,
          offset,
        },
      });

      total_transactions = res.data.total_transactions;
      allTransactions.push(...res.data.transactions);
      offset += res.data.transactions.length;
      if (res.data.transactions.length === 0) break;
    } while (offset < total_transactions);

    const acctRes = await plaid.accountsGet({ access_token });
    const item_id = acctRes.data.item.item_id;
    const institutionName = acctRes.data.item.institution_name ?? "Linked account";

    const accounts = acctRes.data.accounts.map((a) => ({
      id: a.account_id,
      name: a.name,
      mask: a.mask ?? null,
      type: a.type,
      subtype: a.subtype ?? null,
      institutionName,
    }));

    const transactions = allTransactions.map((t) => ({
      id: t.transaction_id,
      itemId: item_id,
      accountId: t.account_id,
      amount: t.amount,
      date: t.date,
      name: t.name,
      merchantName: t.merchant_name ?? null,
      category: (t.category ?? []).filter(Boolean) as string[],
      pending: Boolean(t.pending),
    }));

    return NextResponse.json({ transactions, accounts, item_id });
  } catch (e) {
    console.error("Plaid transactionsGet failed", e);
    const message = e instanceof Error ? e.message : "Failed to fetch transactions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
