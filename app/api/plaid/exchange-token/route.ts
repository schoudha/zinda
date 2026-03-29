import { NextResponse } from "next/server";
import { getPlaidClient } from "@/lib/plaid";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const public_token = typeof body.public_token === "string" ? body.public_token : null;
    if (!public_token) {
      return NextResponse.json({ error: "public_token is required" }, { status: 400 });
    }

    const plaid = getPlaidClient();
    const exchange = await plaid.itemPublicTokenExchange({ public_token });
    const access_token = exchange.data.access_token;
    const item_id = exchange.data.item_id;

    const accountsRes = await plaid.accountsGet({ access_token });
    const item = accountsRes.data.item;
    const institutionName = item.institution_name ?? "Linked account";

    const accounts = accountsRes.data.accounts.map((a) => ({
      id: a.account_id,
      name: a.name,
      mask: a.mask ?? null,
      type: a.type,
      subtype: a.subtype ?? null,
      institutionName: institutionName,
    }));

    return NextResponse.json({
      access_token,
      item_id,
      institution_name: institutionName,
      accounts,
    });
  } catch (e) {
    console.error("Plaid exchange failed", e);
    const message = e instanceof Error ? e.message : "Token exchange failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
