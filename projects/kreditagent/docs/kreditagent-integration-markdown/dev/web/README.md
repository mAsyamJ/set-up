# KreditAgent Frontend Specification

This package defines the end-to-end frontend product, UX, workflow, component, state, integration, testing, and demo specification for KreditAgent.

KreditAgent frontend is not just a dashboard. It is the user-facing proof layer for the whole protocol:

- MSME borrowers consent to connect business evidence.
- KreditAgent computes an explainable, deterministic credit score.
- The borrower can see what was used, what was not used, and what is shared.
- Lender users or LenderAgents request audit-grade attestations through x402.
- ERC-8004 agent identities, reputation signals, validation states, and on-chain proofs are made visible.
- ForU AI-DID / Identifi binding is represented as the identity and reputation surface.

## Recommended frontend stack

| Area | Choice |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Forms | React Hook Form + Zod |
| Server state | TanStack Query |
| Wallet / contracts | wagmi + viem + RainbowKit |
| Charts | Recharts or lightweight SVG charts |
| E2E tests | Playwright |
| Visual testing | Storybook optional |

## Files

```text
frontend/
├── 01-product-frontend-strategy.md
├── 02-information-architecture-and-routes.md
├── 03-end-to-end-user-workflows.md
├── 04-screen-and-component-spec.md
├── 05-state-api-and-data-contracts.md
├── 06-web3-x402-erc8004-foru-integration.md
├── 07-design-system-and-ux-writing.md
├── 08-implementation-plan-and-tasks.md
├── 09-testing-qa-and-observability.md
└── 10-hackathon-demo-frontend-runbook.md
```

## Source assumptions

This spec assumes KreditAgent remains infrastructure, not a lender. The UI must never claim that KreditAgent approves loans, holds borrower funds, guarantees approvals, or replaces licensed lender underwriting.

