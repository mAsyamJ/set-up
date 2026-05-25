# 02 — Information Architecture and Routes

## Route strategy

Use Next.js App Router with route groups for role-specific product surfaces:

```text
apps/web/src/app/
├── (marketing)/
│   ├── page.tsx
│   ├── pitch/page.tsx
│   └── docs/page.tsx
├── (app)/
│   ├── borrower/
│   │   ├── page.tsx
│   │   ├── consent/page.tsx
│   │   ├── data/page.tsx
│   │   ├── score/page.tsx
│   │   ├── attestations/page.tsx
│   │   └── reputation/page.tsx
│   ├── lender/
│   │   ├── page.tsx
│   │   ├── attestations/page.tsx
│   │   ├── decisions/page.tsx
│   │   └── monitoring/page.tsx
│   ├── protocol/
│   │   ├── page.tsx
│   │   ├── agents/[agentId]/page.tsx
│   │   ├── attestations/[attestationId]/page.tsx
│   │   ├── validations/[validationId]/page.tsx
│   │   └── payments/[receiptId]/page.tsx
│   └── admin/
│       ├── page.tsx
│       ├── demo-control/page.tsx
│       └── logs/page.tsx
├── api/
│   └── frontend-proxy/*
├── layout.tsx
├── error.tsx
├── loading.tsx
└── not-found.tsx
```

## Route groups

### `(marketing)`

Public pages that need high credibility and low jargon.

| Route | Purpose | Primary CTA |
|---|---|---|
| `/` | Explain KreditAgent and launch demo | Start demo |
| `/pitch` | Judge/investor pitch view | View demo flow |
| `/docs` | Link to technical docs/source ledger | Read architecture |

### `(app)/borrower`

Borrower console for MSME owner or demo persona.

| Route | Purpose | Key state |
|---|---|---|
| `/borrower` | Dashboard overview | score, consent, evidence, reputation |
| `/borrower/consent` | grant/revoke consent | active, expired, revoked |
| `/borrower/data` | upload/link QRIS/e-commerce data | data quality, evidence hash |
| `/borrower/score` | generate/review score | deterministic factors, AI explanation |
| `/borrower/attestations` | publish/share score attestation | tx, hash, expiry |
| `/borrower/reputation` | repayment/dispute history | reputation timeline |

### `(app)/lender`

Lender/underwriter console.

| Route | Purpose | Key state |
|---|---|---|
| `/lender` | lender dashboard | paid/unpaid requests, portfolio |
| `/lender/attestations` | request paid borrower attestation | x402 payment state |
| `/lender/decisions` | lender records decision | approved/rejected/manual review |
| `/lender/monitoring` | repayment/risk monitoring | repayment events, score drift |

### `(app)/protocol`

Protocol transparency layer.

| Route | Purpose | Data source |
|---|---|---|
| `/protocol` | trust graph overview | API + chain reads |
| `/protocol/agents/[agentId]` | ERC-8004 agent profile | Identity registry + agentURI |
| `/protocol/attestations/[attestationId]` | credit attestation detail | Score registry/API |
| `/protocol/validations/[validationId]` | validator result detail | Validation registry/API |
| `/protocol/payments/[receiptId]` | x402 receipt detail | Payment registry/API |

### `(app)/admin`

Demo operator surface. Keep it hidden from public navigation.

| Route | Purpose |
|---|---|
| `/admin` | operator status |
| `/admin/demo-control` | reset seed state, toggle mock/live, prefill personas |
| `/admin/logs` | frontend-visible API logs for demo |

## Navigation model

Use role tabs at top:

```text
Borrower | Lender | Protocol | Demo Control
```

For hackathon, role switching should be instant and obvious. In production, routes should be gated by auth/role.

## App shell

### Header

- KreditAgent logo.
- Environment badge: `Demo`, `Base Sepolia`, `Sepolia`, `Production Sandbox`.
- Wallet connect button.
- Network selector, if wallet connected.
- Small status indicator: API, chain, x402.

### Left rail / section nav

Borrower routes:

```text
Overview
Consent
Data
Score
Attestations
Reputation
```

Lender routes:

```text
Overview
Paid Attestations
Decisions
Monitoring
```

Protocol routes:

```text
Trust Graph
Agents
Attestations
Validations
Payments
```

## URL state

Use URL search params for demo reproducibility:

| Param | Example | Meaning |
|---|---|---|
| `borrower` | `?borrower=bu-siti` | selected borrower fixture |
| `mode` | `?mode=mock` | mock/live flow |
| `step` | `?step=x402` | highlight demo step |
| `chain` | `?chain=base-sepolia` | selected network |

## Page rendering strategy

Use Server Components for static/page shell and initial data where possible. Use Client Components for wallet, file upload, stepper state, forms, optimistic UI, and transaction buttons.

| UI piece | Server or client? | Reason |
|---|---|---|
| Marketing copy | Server | static, SEO |
| Borrower overview shell | Server | fetch initial profile/server state |
| Wallet connect | Client | wallet interaction |
| x402 payment button | Client | payment signing/retry state |
| Contract write buttons | Client | wallet transaction |
| Charts | Client | interactivity |
| File upload | Client | file input/progress |
| Audit timeline | Mixed | server initial + client polling |

## Loading and error boundaries

Each route group needs its own `loading.tsx` and `error.tsx` so demo failures are isolated.

Critical error copy examples:

- API offline: “KreditAgent API is unavailable. Demo fallback can still show seeded local state.”
- Wrong network: “Switch to Base Sepolia to pay x402 testnet attestations.”
- Consent revoked: “This attestation cannot be shared because borrower consent was revoked.”
- Payment required: “Audit-grade attestation requires x402 payment.”
- Validation pending: “Lender can view standard score now, but audit-grade status is pending validator confirmation.”

## Route-level acceptance criteria

A route is complete only if it has:

- happy state;
- loading state;
- empty state;
- error state;
- permission-denied state;
- mobile layout;
- event logging;
- copy explaining the financial/regulatory boundary.
