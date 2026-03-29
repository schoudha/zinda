# Plaid (finance) setup

Add these to `.env.local` (never commit secrets):

| Variable | Description |
|----------|-------------|
| `PLAID_CLIENT_ID` | From [Plaid Dashboard](https://dashboard.plaid.com/) |
| `PLAID_SECRET` | Sandbox, Development, or Production secret matching your environment |
| `PLAID_ENV` | `sandbox` (default), `production`, or `development` |

- Use **Sandbox** credentials while developing; test institutions and logins are provided by Plaid.
- The app stores Plaid **access tokens in the browser (localStorage)** for a local-first flow. This is convenient but less secure than a server-side vault—do not use production tokens on shared devices without additional hardening.

After setting env vars, restart `npm run dev` and use **Time → Finance → Connect bank account**.
