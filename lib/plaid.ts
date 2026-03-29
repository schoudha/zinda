/**
 * Server-only Plaid client. Do not import from client components.
 */
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

function getBasePath(): string {
  const env = process.env.PLAID_ENV || "sandbox";
  if (env === "production") return PlaidEnvironments.production;
  if (env === "development") return "https://development.plaid.com";
  return PlaidEnvironments.sandbox;
}

function createPlaidClient(): PlaidApi {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) {
    throw new Error("PLAID_CLIENT_ID and PLAID_SECRET must be set");
  }

  const configuration = new Configuration({
    basePath: getBasePath(),
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

let cached: PlaidApi | null = null;

export function getPlaidClient(): PlaidApi {
  if (!cached) cached = createPlaidClient();
  return cached;
}
