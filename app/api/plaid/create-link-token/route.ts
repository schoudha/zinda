import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { getPlaidClient } from "@/lib/plaid";

export async function POST() {
  try {
    const clientId = process.env.PLAID_CLIENT_ID;
    const secret = process.env.PLAID_SECRET;
    if (!clientId || !secret) {
      return NextResponse.json(
        { error: "Plaid is not configured (missing PLAID_CLIENT_ID or PLAID_SECRET)" },
        { status: 500 }
      );
    }

    const plaid = getPlaidClient();
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: "zinda-local-user" },
      client_name: "Zinda",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
    });

    const link_token = response.data.link_token;
    return NextResponse.json({ link_token });
  } catch (e) {
    console.error("Plaid linkTokenCreate failed", e);
    const message = e instanceof Error ? e.message : "Failed to create link token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
