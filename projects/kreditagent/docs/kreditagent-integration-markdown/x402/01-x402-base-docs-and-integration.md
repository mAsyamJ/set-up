# 01 — x402 + Base Docs and KreditAgent Integration

## What x402 does for KreditAgent

x402 is the payment rail for paid lender access. KreditAgent should use it to protect paid resources such as:

- `GET /v1/attestations/:id/standard`
- `GET /v1/attestations/:id/audit`
- `GET /v1/attestations/:id/underwriter`
- `GET /v1/monitoring/:borrower/risk-delta`

The lender agent requests a protected resource, receives HTTP `402 Payment Required`, signs a payment, retries, and receives the signed attestation.

## Primary docs

| Source | URL | Use |
|---|---|---|
| x402 docs | https://docs.cdp.coinbase.com/x402/welcome | Main conceptual docs |
| Seller quickstart | https://docs.cdp.coinbase.com/x402/quickstart-for-sellers | Protect API routes |
| How x402 works | https://docs.cdp.coinbase.com/x402/core-concepts/how-it-works | Lifecycle and headers |
| x402 official repo | https://github.com/x402-foundation/x402 | SDKs, specs, examples |
| x402 ecosystem | https://www.x402.org/ecosystem | Discover services/tools |
| x402 `upto` scheme | https://github.com/coinbase/x402/blob/main/specs/schemes/upto/scheme_upto.md | Variable-cost payment design |

## Base network config

| Network | CAIP-2 | Use |
|---|---|---|
| Base Sepolia | `eip155:84532` | Hackathon and testnet demo |
| Base Mainnet | `eip155:8453` | Production x402 settlement after legal review |

For hackathon, use Base Sepolia with `https://x402.org/facilitator` when you want a signup-free testnet path. For production or stronger demos, use the CDP facilitator.

## Install commands

```bash
npm install @x402/express @x402/evm @x402/core
npm install @x402/next @x402/evm @x402/core
pip install "x402[fastapi]"
pip install "x402[flask]"
```

## Minimal Express middleware for KreditAgent

```ts
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

const app = express();
const facilitatorClient = new HTTPFacilitatorClient({
  url: process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator",
});
const server = new x402ResourceServer(facilitatorClient)
  .register("eip155:84532", new ExactEvmScheme());

app.use(
  paymentMiddleware(
    {
      "GET /v1/attestations/:id/audit": {
        accepts: [{ scheme: "exact", price: "$0.25", network: "eip155:84532", payTo: process.env.X402_PAY_TO! }],
        description: "Audit-grade MSME credit attestation",
        mimeType: "application/json",
      },
      "GET /v1/attestations/:id/underwriter": {
        accepts: [{ scheme: "exact", price: "$0.50", network: "eip155:84532", payTo: process.env.X402_PAY_TO! }],
        description: "Underwriter-grade MSME credit memo",
        mimeType: "application/json",
      },
    },
    server
  )
);
```

## KreditAgent x402 response binding

```json
{
  "attestationId": "att_001",
  "borrowerAgentId": "42",
  "issuerAgentId": "1",
  "scoreHash": "0x...",
  "featureHash": "0x...",
  "evidenceHash": "0x...",
  "validationStatus": "validated",
  "payment": {
    "protocol": "x402",
    "network": "eip155:84532",
    "receiptHash": "0x...",
    "paidByAgentId": "12",
    "resource": "/v1/attestations/att_001/audit"
  },
  "signature": "0x..."
}
```

## Production constraints

- Do not let an LLM pick the `payTo` address.
- Hardcode/allowlist payment recipient.
- Bind payment receipt to `resource`, `attestationId`, `borrowerAgentId`, `lenderAgentId`, and expiry.
- Reject reused payment receipts.
- Keep IDR invoice / BI-FAST fallback for Indonesian production.

## This monorepo

On-chain receipt anchoring and agent registries live in [`contracts/src/`](../../contracts/src/). Concept-to-contract mapping: [07 — Monorepo on-chain surface](07-monorepo-onchain-surface.md); addresses and deploy wiring: [`docs/currentSmartContract.md`](../currentSmartContract.md).
