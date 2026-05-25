# File: README.md

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



# File: docs/frontend/01-product-frontend-strategy.md

# 01 — Product Frontend Strategy

## Frontend mission

The KreditAgent frontend must make a complex protocol feel safe, obvious, and credible in under 90 seconds.

The product has four audiences:

1. **MSME borrower** — needs trust, consent control, clear score explanation, and a path to lender-ready reputation.
2. **Lender / underwriter** — needs fast score review, evidence hashes, validation status, x402 payment proof, and risk disclaimers.
3. **Judge / technical reviewer** — needs to see that ERC-8004, x402, deterministic scoring, and ForU identity are real product primitives, not decorations.
4. **Regulator / compliance reviewer** — needs to see that KreditAgent does not lend, does not store raw data on-chain, does not let AI approve credit, and supports consent/revocation/disputes.

## Product promise in UI

> Turn MSME business activity into a portable, verifiable credit reputation lenders can trust.

Every screen should reinforce one of these ideas:

- **Borrower owns consent.**
- **KreditAgent explains, but does not approve loans.**
- **Lender pays for attestations.**
- **ERC-8004 makes agent trust portable.**
- **x402 makes paid score access machine-readable.**
- **ForU AI-DID gives the user-facing identity/reputation layer.**

## Frontend must not do

The frontend must not:

- present KreditAgent as a lender;
- promise loan approval;
- show unsupported production regulatory claims;
- expose raw QRIS/e-commerce personal data in on-chain views;
- let LLM-generated text appear as a final credit decision;
- hide payment, consent, or validation failures;
- make wallet signatures look like ordinary web confirmations without explaining purpose.

## Product surfaces

| Surface | Audience | Goal |
|---|---|---|
| Public landing | judges, lenders, partners | Explain why KreditAgent exists and launch demo. |
| Borrower app | MSME borrower | Link identity, grant consent, upload/link evidence, generate score, review explanation, publish attestation. |
| Lender app | lender/underwriter | Pay for audit-grade attestation, review score package, record lender-owned decision, simulate repayment event. |
| Protocol explorer | technical reviewers | Show ERC-8004 agents, attestations, validations, reputation events, and x402 receipts. |
| Admin/demo console | internal hackathon operator | Reset demo state, seed sample borrowers, toggle mock/live x402, view logs. |

## Winning hackathon frontend narrative

The UI should tell a complete story without requiring judges to inspect code first:

1. **Borrower evidence exists.** Bu Siti has QRIS and e-commerce activity.
2. **Consent gates usage.** She chooses what to share and why.
3. **Score is deterministic.** The score shows formula factors, hashes, version, expiry.
4. **AI is bounded.** The explanation explicitly says it is generated from deterministic factors only.
5. **Attestation is portable.** The score is linked to a BorrowerAgent and KreditAgent issuer.
6. **Lender pays.** Lender sees `402 Payment Required`, pays via x402, and receives audit-grade payload.
7. **Validation is independent.** ValidatorAgent confirms the score package.
8. **Reputation evolves.** Repayment updates reputation; future lenders do not see a blank file.

## Product north star metric

For a frontend hackathon demo:

> Time from opening borrower screen to showing paid lender attestation: under 90 seconds.

For production:

> Percentage of consented borrowers who successfully generate a lender-shareable score and receive at least one lender pull.

## Frontend priorities

### Priority 1 — Demo clarity

The first version should optimize for a smooth judge demo:

- one borrower profile preloaded;
- one lender profile preloaded;
- deterministic sample data;
- visible status timeline;
- clear success/failure states;
- copy that explains trust/payment logic.

### Priority 2 — Safety and trust

All high-stakes states must be explicit:

- consent active/expired/revoked;
- score valid/expired/stale;
- validation pending/validated/failed;
- x402 unpaid/paid/invalid/replayed;
- chain pending/confirmed/failed;
- lender decision is lender-owned.

### Priority 3 — Production extensibility

After the demo works, the UI should support:

- real partner data adapters;
- multiple borrowers;
- multiple lenders;
- validation quorum;
- disputes;
- regional/language support;
- real x402 facilitator;
- real ForU AI-DID once official API is available.

## Recommended product mode toggles

| Mode | Description | UI badge |
|---|---|---|
| `DEMO_MOCK` | local backend, mock x402, mock chain tx hashes | Demo mode |
| `TESTNET_LIVE` | Base Sepolia/Sepolia contracts, x402 testnet facilitator | Testnet live |
| `PRODUCTION_SANDBOX` | real partners, sandbox terms, non-production lending | Sandbox |
| `PRODUCTION` | audited contracts, compliance approved, real partners | Production |

## Core UX rule

If something is trust-critical, show it as a timeline step with status, timestamp, and proof link.

Example:

```text
Consent granted → Evidence hashed → Score generated → Attestation published → x402 paid → Validation passed → Repayment reputation posted
```


# File: docs/frontend/02-information-architecture-and-routes.md

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


# File: docs/frontend/03-end-to-end-user-workflows.md

# 03 — End-to-End User Workflows

## Workflow A — Public visitor to demo

### Goal

A judge or lender understands the product and starts the demo in under 20 seconds.

### Steps

1. User lands on `/`.
2. Hero says: “Portable credit reputation for Indonesian MSMEs.”
3. User sees three product primitives: QRIS/e-commerce evidence, ERC-8004 reputation, x402 paid attestation.
4. User clicks `Start 90-second demo`.
5. App opens `/borrower?borrower=bu-siti&step=consent`.

### Success criteria

- CTA visible above fold.
- No crypto jargon in first screen.
- “Not a lender” disclaimer visible but not dominant.

## Workflow B — Borrower onboarding and consent

### Actor

MSME borrower, e.g. Bu Siti.

### Goal

Grant scoped consent for KreditAgent to derive credit features from business evidence.

### Steps

1. Borrower opens `/borrower`.
2. UI shows profile card:
   - business name;
   - ForU AI-DID status;
   - BorrowerAgent ID;
   - current score status;
   - consent status.
3. Borrower goes to `/borrower/consent`.
4. UI shows consent scopes:
   - read QRIS transactions;
   - read e-commerce orders;
   - derive credit features;
   - share score band with eligible lenders;
   - share audit-grade attestation after x402 payment.
5. Borrower reviews purpose and expiry.
6. Borrower signs consent message or clicks demo grant.
7. UI shows consent receipt:
   - `consentId`;
   - scope list;
   - evidence source list;
   - expiry;
   - revocation CTA.

### Required UI states

| State | UI treatment |
|---|---|
| No consent | warning card + `Grant consent` CTA |
| Active consent | green/neutral badge + expiry date |
| Expiring soon | amber badge + renewal CTA |
| Revoked | red/gray badge + `Regenerate score unavailable` message |
| Expired | gray badge + `Renew consent` CTA |

### Safety copy

> You can revoke consent. Revocation blocks new attestations. Existing on-chain hashes cannot be deleted, but they do not contain raw transaction data.

## Workflow C — Evidence upload/linking

### Goal

Convert borrower data into normalized, auditable features.

### Steps

1. Borrower opens `/borrower/data`.
2. UI shows data-source cards:
   - QRIS CSV;
   - Tokopedia/Shopee orders;
   - repayment events;
   - optional wallet/bank mock.
3. Borrower uploads sample QRIS CSV.
4. Upload component validates file type/size.
5. API returns:
   - records accepted/rejected;
   - warnings;
   - evidence hash;
   - latest transaction date;
   - coverage days.
6. Borrower uploads e-commerce CSV.
7. Feature readiness indicator turns green.

### Data quality UI

| Warning | User-facing text |
|---|---|
| duplicate rows | “Some repeated rows were ignored.” |
| prompt-injection-like text | “Untrusted text was removed from scoring input.” |
| short history | “Score may be less reliable because evidence covers fewer than 30 days.” |
| stale data | “Latest transaction is older than recommended freshness window.” |
| merchant mismatch | “Business identity mismatch; manual review required.” |

### Important visual

Show a “data minimization” block:

```text
Raw rows → normalized summary → feature hash → score hash → on-chain commitment
```

## Workflow D — Generate deterministic score

### Goal

Show that KreditAgent can compute a lender-usable score without AI deciding credit.

### Steps

1. Borrower opens `/borrower/score`.
2. UI shows `Ready to score` if consent + data readiness pass.
3. Borrower clicks `Generate score`.
4. UI shows loading stepper:
   - normalize evidence;
   - calculate features;
   - apply scoring policy;
   - generate explanation;
   - create signed package.
5. UI displays score card:
   - score number;
   - score band;
   - positive factors;
   - risk factors;
   - score version;
   - evidence hash;
   - feature hash;
   - expiry.
6. UI displays explanation panel:
   - borrower summary;
   - lender memo;
   - manual review questions;
   - explicit “AI explanation only” disclaimer.

### Score card layout

```text
[742] [Band B — Lendable with monitoring]
Stable QRIS revenue     + High
Fulfillment rate        + Good
Platform diversification  Moderate
Repayment history         New borrower
Evidence coverage         92 days
```

### Critical warning

> KreditAgent does not approve loans. Licensed lenders make final credit decisions.

## Workflow E — Publish attestation to ERC-8004-style registry

### Goal

Link the score to an ERC-8004 borrower identity and KreditAgent issuer identity.

### Steps

1. Borrower clicks `Publish attestation`.
2. UI checks:
   - wallet connected;
   - correct chain;
   - consent active;
   - score unexpired;
   - score package signed.
3. If no wallet, prompt connect.
4. If wrong chain, prompt switch.
5. Contract write or backend relayer posts score hash/metadata.
6. UI shows transaction pending.
7. UI shows confirmed attestation:
   - `attestationId`;
   - tx hash;
   - borrower agent ID;
   - issuer agent ID;
   - score hash;
   - expiry;
   - validation status.

### Transaction state copy

| State | Copy |
|---|---|
| preparing | “Preparing attestation transaction.” |
| wallet pending | “Confirm transaction in your wallet.” |
| broadcast | “Transaction submitted. Waiting for confirmation.” |
| confirmed | “Credit attestation anchored.” |
| failed | “Attestation was not published. No lender can access audit-grade proof yet.” |

## Workflow F — Lender x402 paid attestation request

### Actor

Licensed lender or LenderAgent.

### Goal

Pay for an audit-grade attestation and receive signed score package.

### Steps

1. Lender opens `/lender/attestations`.
2. UI shows borrower search or prefilled `Bu Siti` fixture.
3. Lender clicks `Request audit-grade attestation`.
4. API returns `402 Payment Required`.
5. UI shows payment terms:
   - price;
   - network;
   - token;
   - payee;
   - resource path;
   - expiry;
   - purpose.
6. Lender clicks `Pay and retrieve`.
7. Wallet signs/payment flow executes.
8. Client retries attestation request with payment proof.
9. API returns attestation payload.
10. UI shows:
   - score;
   - validation status;
   - hashes;
   - x402 receipt hash;
   - policy flags;
   - underwriter memo.

### x402 UI states

| State | UI treatment |
|---|---|
| unpaid | price card + `Pay with x402` CTA |
| paying | spinner + payment details locked |
| paid pending retry | “Payment accepted, retrieving attestation.” |
| paid success | show attestation payload |
| invalid payment | error + retry terms |
| replayed receipt | error + generate new payment |
| facilitator offline | demo fallback notice |

## Workflow G — Validator review

### Goal

Make validation visible as independent trust, not just issuer self-claim.

### Steps

1. Lender or KreditAgent requests validation.
2. UI displays `Validation pending`.
3. ValidatorAgent recomputes score from approved evidence/feature hash.
4. Validation result posts:
   - pass;
   - fail;
   - disputed;
   - inconclusive.
5. UI updates attestation detail.

### Validation status copy

| Status | Copy |
|---|---|
| not_requested | “No independent validator has checked this score yet.” |
| pending | “Validator is recomputing the score package.” |
| passed | “Validator confirmed the score matches committed features.” |
| failed | “Validator found a mismatch. Do not use this attestation for automated underwriting.” |
| expired | “Validation window expired.” |

## Workflow H — Lender decision and repayment reputation

### Goal

Show that lender owns credit decision and repayment updates reputation.

### Steps

1. Lender reviews attestation.
2. Lender selects decision:
   - approve;
   - reject;
   - manual review;
   - request more data.
3. UI requires explicit confirmation:
   - “This decision is made by the lender, not KreditAgent.”
4. Demo simulates accepted loan.
5. Lender clicks `Simulate on-time repayment`.
6. Reputation event posts.
7. Borrower reputation timeline updates.
8. Score/reputation summary reflects repayment signal.

### Decision form fields

- decision;
- principal IDR;
- term days;
- APR / fee optional;
- reason code;
- attestation ID;
- lender agent ID;
- policy version;
- human reviewer flag.

## Workflow I — Borrower dispute

### Goal

Negative reputation must be disputeable.

### Steps

1. Borrower opens `/borrower/reputation`.
2. Borrower sees negative event.
3. Borrower clicks `Open dispute`.
4. Borrower selects reason:
   - payment posted late by lender;
   - amount incorrect;
   - borrower identity mismatch;
   - fraud / account takeover;
   - other.
5. UI submits dispute.
6. Event status changes to `disputed`.
7. Lender and validator review off-chain evidence.
8. Final state becomes `upheld`, `reversed`, or `annotated`.

### Dispute UI rule

Do not delete negative history visually. Show the dispute state and final resolution trail.

## Workflow J — ForU AI-DID binding

### Goal

Represent ForU identity without overclaiming official API support.

### Steps

1. Borrower sees `ForU AI-DID` card.
2. In hackathon mode, UI shows mock DID binding:
   - `did:foru:bu-siti-demo`;
   - Identifi component: `business_credit_reliability`;
   - status: `demo binding`.
3. In future live mode, user connects official ForU account/API.
4. KreditAgent writes ForU DID into agentURI/off-chain profile.
5. ForU receives minimized reputation component, not raw data.

### Fallback copy

> Official ForU developer API is not assumed in this demo. KreditAgent shows the intended AI-DID binding and keeps raw business evidence inside KreditAgent/partner systems.


# File: docs/frontend/04-screen-and-component-spec.md

# 04 — Screen and Component Specification

## Component architecture

```text
apps/web/src/
├── app/
├── components/
│   ├── layout/
│   ├── marketing/
│   ├── borrower/
│   ├── lender/
│   ├── protocol/
│   ├── demo/
│   ├── charts/
│   ├── forms/
│   ├── status/
│   └── primitives/
├── features/
│   ├── borrower/
│   ├── lender/
│   ├── attestation/
│   ├── x402/
│   ├── erc8004/
│   └── foru/
├── lib/
│   ├── api/
│   ├── chain/
│   ├── schemas/
│   ├── formatting/
│   └── demo/
└── hooks/
```

## Global layout components

### `AppShell`

Purpose: shared authenticated/demo app shell.

Props:

```ts
interface AppShellProps {
  children: React.ReactNode;
  activeRole: "borrower" | "lender" | "protocol" | "admin";
  environment: "demo" | "testnet" | "sandbox" | "production";
}
```

Contains:

- top nav;
- wallet connect;
- network badge;
- status ribbon;
- side nav;
- main content area;
- demo reset shortcut.

### `EnvironmentBadge`

Shows current mode.

Colors:

- Demo: amber.
- Testnet: blue.
- Sandbox: purple.
- Production: green.

### `SystemStatusPill`

Displays:

- API status;
- chain RPC status;
- x402 facilitator status;
- wallet status.

## Borrower components

### `BorrowerOverviewCard`

Purpose: summarize borrower state.

Fields:

- display name;
- business type;
- location;
- BorrowerAgent ID;
- ForU DID status;
- score band;
- consent status;
- latest attestation status.

Actions:

- `Grant consent`;
- `Upload evidence`;
- `Generate score`;
- `Publish attestation`.

### `ConsentScopeSelector`

Purpose: make consent understandable.

Required scopes:

```ts
type ConsentScope =
  | "read_qris_transactions"
  | "read_ecommerce_orders"
  | "derive_credit_features"
  | "share_score_band"
  | "share_audit_attestation_after_payment";
```

UX behavior:

- scopes are checkboxes with explanation;
- required scopes are locked for score generation;
- optional scopes have toggles;
- expiry dropdown: 7 days, 30 days, 90 days;
- purpose text must be visible before signing.

### `ConsentReceiptCard`

Displays:

- `consentId`;
- granted at;
- expires at;
- source list;
- purpose;
- scope hash;
- revocation button;
- link to on-chain/off-chain receipt if available.

### `DataSourceCard`

Data source card for QRIS, e-commerce, repayment, optional bank/wallet.

Props:

```ts
interface DataSourceCardProps {
  source: "qris" | "tokopedia" | "shopee" | "repayment" | "bank" | "wallet";
  status: "not_connected" | "uploaded" | "processing" | "ready" | "warning" | "failed";
  recordsAccepted?: number;
  recordsRejected?: number;
  evidenceHash?: string;
  latestRecordAt?: string;
  warnings?: DataQualityWarning[];
}
```

Actions:

- upload CSV;
- view warnings;
- replace file;
- revoke source.

### `EvidenceHashPanel`

Purpose: teach privacy and auditability.

Shows:

- raw evidence not public;
- normalized summary hash;
- feature hash;
- score hash;
- tx hash after attestation.

### `ScoreHeroCard`

Displays:

- score number;
- band;
- validity window;
- score version;
- delta after repayment if applicable;
- disclaimer.

Layout:

```text
┌──────────────────────────────┐
│ Score 742                    │
│ Band B — Lendable w/ review  │
│ Valid until 2026-07-01       │
│ Score version ka-score-v0.2  │
└──────────────────────────────┘
```

### `ScoreFactorBreakdown`

Factor rows:

- revenue stability;
- business continuity;
- cash discipline;
- platform diversification;
- reputation history;
- risk penalties.

Each row contains:

- label;
- normalized value;
- contribution points;
- explanation;
- confidence.

### `AiExplanationPanel`

Must show badge:

> AI explanation only — not a credit decision.

Sections:

- borrower-friendly summary;
- lender memo;
- positive factors;
- risk factors;
- manual review questions.

### `AttestationPublishPanel`

Preflight checks:

- wallet connected;
- correct network;
- consent active;
- score exists;
- score unexpired;
- hashes generated;
- issuer configured.

States:

- blocked;
- ready;
- preparing;
- wallet confirming;
- pending tx;
- confirmed;
- failed.

## Lender components

### `BorrowerSearchPanel`

For hackathon: hardcode/select sample borrowers.

For production: search by borrower invite code, DID, agent ID, or partner reference.

Fields:

- borrower identifier;
- attestation tier;
- purpose;
- lender agent ID.

### `X402PaymentCard`

Shows exact payment terms.

Fields:

- resource path;
- price;
- currency;
- network;
- facilitator;
- payee;
- expiry;
- payment mode: mock/live.

Actions:

- `Request attestation`;
- `Pay with x402`;
- `Retry retrieval`;
- `Copy payment terms`.

### `PaidAttestationViewer`

Displays paid payload after success:

- score;
- band;
- borrower agent;
- issuer agent;
- validation status;
- hashes;
- payment receipt;
- signature;
- expiry;
- risk flags.

### `UnderwriterDecisionForm`

Fields:

```ts
interface LenderDecisionForm {
  attestationId: string;
  decision: "approved" | "rejected" | "manual_review" | "request_more_data";
  principalIdr?: number;
  termDays?: number;
  aprBps?: number;
  reasonCodes: string[];
  humanReviewer: boolean;
  notes?: string;
}
```

Validation:

- approved requires principal and term;
- APR cannot be negative;
- rejected requires reason code;
- manual review requires note;
- always show lender-owned decision disclaimer.

### `RepaymentSimulator`

Hackathon-only component.

Fields:

- repayment status: on-time, late, missed;
- amount IDR;
- paid date;
- days late;
- lender agent ID.

Action:

- post reputation event.

## Protocol components

### `TrustTimeline`

The most important demo component.

Steps:

1. BorrowerAgent registered.
2. Consent granted.
3. Evidence hash created.
4. Score issued.
5. Attestation published.
6. x402 receipt recorded.
7. Validation passed.
8. Repayment reputation posted.

Each step shows:

- status icon;
- timestamp;
- tx hash or API proof;
- link to detail page.

### `AgentIdentityCard`

Shows ERC-8004-like agent identity:

- agent ID;
- owner/wallet;
- agentURI;
- role;
- active status;
- reputation count;
- validation count.

### `HashEvidenceTable`

Rows:

- evidence hash;
- feature hash;
- score hash;
- narrative hash;
- payment receipt hash;
- validation hash.

Each row includes copy button and tooltip explaining what is hidden.

### `ProtocolGraph`

Visual graph:

```text
BorrowerAgent ──consent/evidence──> KreditAgent
KreditAgent ──attestation──> ERC-8004 registry
LenderAgent ──x402 paid query──> KreditAgent API
ValidatorAgent ──validation──> Validation Registry
LenderAgent ──repayment event──> Reputation Registry
```

## Demo control components

### `DemoStepController`

Buttons:

- reset demo;
- seed Bu Siti;
- grant consent;
- upload sample data;
- generate score;
- publish attestation;
- simulate x402 payment;
- validate score;
- simulate repayment.

### `DemoLogStream`

Shows user-friendly logs:

```text
[10:00:01] Consent granted for QRIS and e-commerce features.
[10:00:03] Evidence hash generated: 0xabc...
[10:00:06] Score generated: 742 / Band B.
[10:00:10] x402 payment required: $0.25 USDC on Base Sepolia.
```

## Component implementation standards

All major components need:

- typed props;
- story/demo fixture;
- loading state;
- empty state;
- error state;
- mobile layout;
- accessibility labels;
- copy buttons for hashes/IDs;
- test IDs for Playwright.

Example test IDs:

```text
data-testid="score-hero-card"
data-testid="x402-pay-button"
data-testid="attestation-status"
data-testid="consent-revoke-button"
data-testid="trust-timeline-step-validation"
```


# File: docs/frontend/05-state-api-and-data-contracts.md

# 05 — State, API, and Data Contracts

## State architecture

Use three layers of state:

| Layer | Tool | Examples |
|---|---|---|
| Server state | TanStack Query | borrower profile, score, attestation, validation, payment, reputation |
| Form state | React Hook Form + Zod | consent form, lender decision form, repayment simulator |
| Local UI state | Zustand or React state | selected demo step, modal open, copied hash, active tab |

Avoid duplicating server state into Zustand. Use Zustand only for ephemeral demo/UI state.

## Query key convention

```ts
export const queryKeys = {
  borrower: (id: string) => ["borrower", id] as const,
  consents: (borrowerId: string) => ["borrower", borrowerId, "consents"] as const,
  dataSources: (borrowerId: string) => ["borrower", borrowerId, "data-sources"] as const,
  score: (borrowerId: string) => ["borrower", borrowerId, "score"] as const,
  attestation: (id: string) => ["attestation", id] as const,
  validation: (id: string) => ["validation", id] as const,
  x402Terms: (resource: string) => ["x402", "terms", resource] as const,
  reputation: (agentId: string) => ["reputation", agentId] as const,
  protocolAgents: () => ["protocol", "agents"] as const,
};
```

## API client layout

```text
lib/api/
├── client.ts
├── borrower.ts
├── consent.ts
├── dataSources.ts
├── scoring.ts
├── attestations.ts
├── x402.ts
├── validation.ts
├── lender.ts
├── reputation.ts
└── protocol.ts
```

## Common response envelope

```ts
export type ApiOk<T> = {
  ok: true;
  data: T;
  requestId: string;
  generatedAt: string;
};

export type ApiErr = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
};

export type ApiResponse<T> = ApiOk<T> | ApiErr;
```

## Core frontend domain types

### Borrower

```ts
export type BorrowerProfile = {
  borrowerId: string;
  displayName: string;
  businessName: string;
  businessType: "warung" | "online_seller" | "food_stall" | "services" | "other";
  city: string;
  walletAddress?: `0x${string}`;
  foruDid?: string;
  borrowerAgentId?: string;
  createdAt: string;
};
```

### Consent

```ts
export type ConsentStatus = "active" | "expired" | "revoked" | "pending_signature";

export type ConsentReceipt = {
  consentId: string;
  borrowerId: string;
  borrowerAgentId?: string;
  source: "qris" | "ecommerce" | "bank" | "wallet" | "repayment";
  scopes: string[];
  purpose: "credit_attestation" | "monitoring" | "lender_review";
  processorAgentId: string;
  grantedAt: string;
  expiresAt: string;
  revokedAt?: string;
  status: ConsentStatus;
  consentHash: `0x${string}`;
  signature?: `0x${string}`;
};
```

### Data source

```ts
export type DataQualityWarning = {
  code:
    | "DUPLICATE_ROWS"
    | "PROMPT_INJECTION_LIKE_TEXT"
    | "SHORT_HISTORY"
    | "STALE_DATA"
    | "MERCHANT_MISMATCH"
    | "UNUSUAL_UNIFORMITY"
    | "NEGATIVE_AMOUNT";
  severity: "info" | "warning" | "critical";
  message: string;
  affectedRows?: number;
};

export type DataSourceSummary = {
  sourceId: string;
  borrowerId: string;
  source: "qris" | "tokopedia" | "shopee" | "repayment" | "bank" | "wallet";
  status: "not_connected" | "processing" | "ready" | "warning" | "failed";
  recordsAccepted: number;
  recordsRejected: number;
  evidenceHash?: `0x${string}`;
  latestRecordAt?: string;
  coverageDays?: number;
  warnings: DataQualityWarning[];
};
```

### Score

```ts
export type ScoreBand = "A" | "B" | "C" | "D" | "E" | "UNAVAILABLE";

export type ScoreFactor = {
  key:
    | "revenue_stability"
    | "business_continuity"
    | "cash_discipline"
    | "platform_diversification"
    | "reputation_history"
    | "risk_penalty";
  label: string;
  normalizedValue: number;
  contributionPoints: number;
  explanation: string;
  confidence: "low" | "medium" | "high";
};

export type CreditScorePackage = {
  scoreId: string;
  borrowerId: string;
  borrowerAgentId?: string;
  score: number;
  band: ScoreBand;
  scoreVersion: string;
  featureSchemaVersion: string;
  modelPolicyVersion: string;
  evidenceHash: `0x${string}`;
  featureHash: `0x${string}`;
  scoreHash: `0x${string}`;
  narrativeHash?: `0x${string}`;
  generatedAt: string;
  expiresAt: string;
  factors: ScoreFactor[];
  positiveFactors: string[];
  riskFactors: string[];
  aiExplanation?: AiExplanation;
};
```

### AI explanation

```ts
export type AiExplanation = {
  borrowerSummary: string;
  lenderMemo: string;
  positiveFactors: string[];
  riskFactors: string[];
  manualReviewQuestions: string[];
  disclaimer: "AI_EXPLANATION_ONLY_NOT_A_CREDIT_DECISION";
};
```

### Attestation

```ts
export type AttestationStatus =
  | "draft"
  | "published"
  | "expired"
  | "revoked_by_consent"
  | "validation_pending"
  | "validated"
  | "validation_failed";

export type CreditAttestation = {
  attestationId: string;
  borrowerId: string;
  borrowerAgentId: string;
  issuerAgentId: string;
  score: number;
  band: ScoreBand;
  scoreVersion: string;
  scoreHash: `0x${string}`;
  featureHash: `0x${string}`;
  evidenceHash: `0x${string}`;
  narrativeHash?: `0x${string}`;
  validationStatus: "not_requested" | "pending" | "passed" | "failed" | "expired";
  txHash?: `0x${string}`;
  issuedAt: string;
  expiresAt: string;
  status: AttestationStatus;
};
```

### x402 payment

```ts
export type X402PaymentTerms = {
  resource: string;
  scheme: "exact" | "upto";
  price: string;
  currency: "USDC";
  network: "eip155:84532" | "eip155:8453" | string;
  payTo: `0x${string}`;
  facilitatorUrl: string;
  expiresAt: string;
  description: string;
};

export type X402PaymentReceipt = {
  receiptId: string;
  resource: string;
  payerAgentId: string;
  payerAddress: `0x${string}`;
  amount: string;
  currency: string;
  network: string;
  receiptHash: `0x${string}`;
  txHash?: `0x${string}`;
  paidAt: string;
  mode: "mock" | "testnet" | "mainnet";
};
```

### Validation

```ts
export type ValidationResult = {
  validationId: string;
  attestationId: string;
  validatorAgentId: string;
  result: "pass" | "fail" | "inconclusive";
  recomputedScore?: number;
  evidenceHash: `0x${string}`;
  featureHash: `0x${string}`;
  validationHash: `0x${string}`;
  txHash?: `0x${string}`;
  submittedAt: string;
  notes?: string;
};
```

### Reputation event

```ts
export type ReputationEventType =
  | "score_issued"
  | "score_validated"
  | "loan_disbursed"
  | "repayment_on_time"
  | "repayment_late"
  | "default_reported"
  | "dispute_opened"
  | "dispute_resolved";

export type ReputationEvent = {
  eventId: string;
  subjectAgentId: string;
  issuerAgentId: string;
  eventType: ReputationEventType;
  evidenceHash: `0x${string}`;
  scoreDelta: number;
  disputed: boolean;
  txHash?: `0x${string}`;
  createdAt: string;
};
```

## Endpoint mapping

| UI action | Method | Endpoint | Notes |
|---|---|---|---|
| Load borrower | GET | `/v1/borrowers/:id` | server state |
| Grant consent | POST | `/v1/borrowers/:id/consents` | wallet signature optional in demo |
| Revoke consent | POST | `/v1/consents/:consentId/revoke` | invalidates future score issuance |
| Upload data | POST | `/v1/borrowers/:id/data-sources/:source/upload` | multipart |
| Generate score | POST | `/v1/borrowers/:id/scores` | deterministic |
| Publish attestation | POST | `/v1/scores/:scoreId/attestations` | can trigger chain worker |
| Request audit attestation | GET | `/v1/attestations/:id/audit` | returns 402 if unpaid |
| Submit payment proof | GET | `/v1/attestations/:id/audit` | with payment header/signature |
| Request validation | POST | `/v1/validations` | creates validation request |
| Submit decision | POST | `/v1/lenders/:id/decisions` | lender-owned |
| Simulate repayment | POST | `/v1/loans/:id/repayments` | hackathon-only |

## Mutation behavior

### Consent grant mutation

On success:

- invalidate borrower;
- invalidate consents;
- invalidate score readiness;
- append trust timeline event.

### Upload data mutation

On success:

- invalidate data sources;
- invalidate score readiness;
- show warnings modal if critical warnings exist.

### Generate score mutation

On success:

- cache score package;
- route to `/borrower/score`;
- highlight score hero;
- enable attestation publish CTA.

### x402 paid request mutation

Pseudo-flow:

```ts
async function requestPaidAttestation(attestationId: string) {
  const response = await api.get(`/v1/attestations/${attestationId}/audit`);

  if (response.status === 402) {
    const terms = parseX402Terms(response);
    const paymentProof = await payWithX402(terms);
    return api.get(`/v1/attestations/${attestationId}/audit`, {
      headers: { "PAYMENT-SIGNATURE": paymentProof.signature },
    });
  }

  return response.json();
}
```

## Error handling contract

Map backend errors to UI actions:

| Backend code | UI action |
|---|---|
| `CONSENT_REVOKED` | route to consent page, disable publish/share |
| `SCORE_EXPIRED` | show regenerate CTA |
| `PAYMENT_REQUIRED` | show x402 payment card |
| `PAYMENT_INVALID` | show payment retry |
| `VALIDATION_PENDING` | show pending state + polling |
| `UNAUTHORIZED_AGENT` | show role/auth error |
| `DATA_QUALITY_FAILED` | show evidence warning panel |
| `RATE_LIMITED` | show retry-after countdown |

## Polling and real-time updates

Poll these states during demo:

| Resource | Interval | Stop condition |
|---|---:|---|
| chain tx confirmation | 2s | confirmed/failed |
| validation request | 3s | passed/failed/expired |
| x402 receipt | 2s | paid/invalid/expired |
| reputation timeline | 5s | after new event confirmed |

For production, replace polling with SSE/WebSocket for logs and chain worker events.

## Frontend validation schemas

Use Zod for:

- consent form;
- lender decision form;
- repayment simulator;
- borrower search;
- manual review note;
- dispute form;
- API response parsing if using runtime safety.

Example:

```ts
import * as z from "zod";

export const lenderDecisionSchema = z.object({
  attestationId: z.string().min(1),
  decision: z.enum(["approved", "rejected", "manual_review", "request_more_data"]),
  principalIdr: z.number().positive().optional(),
  termDays: z.number().int().positive().optional(),
  aprBps: z.number().int().nonnegative().optional(),
  reasonCodes: z.array(z.string()).min(1),
  humanReviewer: z.boolean(),
  notes: z.string().max(2000).optional(),
});
```

## Optimistic UI rules

Never optimistically mark these as successful before backend/chain confirmation:

- consent grant/revocation;
- attestation publication;
- x402 payment;
- validation result;
- negative reputation event;
- dispute resolution.

You may optimistically show:

- selected borrower;
- selected tab;
- copied hash;
- form field changes;
- local demo step highlight.


# File: docs/frontend/06-web3-x402-erc8004-foru-integration.md

# 06 — Web3, x402, ERC-8004, and ForU Integration

## Integration thesis

The frontend should make the protocol stack understandable:

```text
ForU AI-DID = user-facing identity/reputation surface
ERC-8004 = agent identity, reputation, validation trust layer
x402/Base = paid machine-to-machine attestation rail
KreditAgent API = deterministic score and attestation service
```

## Chain strategy

Recommended hackathon setup:

| Layer | Network |
|---|---|
| x402 payment | Base Sepolia (`eip155:84532`) |
| ERC-8004 demo contracts | Base Sepolia if possible; Sepolia acceptable if already deployed |
| Wallet UI | Base Sepolia default |
| Mock mode | local no-chain fallback |

Base Sepolia keeps the x402 story clean because x402 docs explicitly support Base Sepolia for testnet demos.

## Wallet integration

Use RainbowKit + wagmi + viem.

Frontend responsibilities:

- connect wallet;
- show address;
- show network;
- switch to Base Sepolia;
- call contract reads;
- submit contract writes only when user explicitly chooses wallet mode;
- never store private keys in browser;
- never expose backend relayer private keys.

## Wallet UX states

| State | UI |
|---|---|
| disconnected | `Connect wallet` button |
| connected correct chain | show address + chain badge |
| connected wrong chain | show `Switch to Base Sepolia` CTA |
| unsupported wallet | show wallet support copy |
| transaction pending | show hash and block explorer link |
| transaction failed | show revert reason if available |

## Chain config example

```ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia, base, sepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "KreditAgent",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [baseSepolia, sepolia, base],
  ssr: true,
});
```

## ERC-8004 frontend responsibilities

### Read actions

The frontend should read/display:

- agent owner;
- agent URI;
- agent active status;
- agent role metadata;
- reputation event list;
- validation request/result status;
- attestation hash metadata.

### Write actions

For hackathon, writes can be backend-relayed or wallet-signed depending demo needs.

Write actions:

- register demo agent;
- publish attestation;
- request validation;
- submit validation result;
- post reputation event;
- open dispute.

### UI rule

If a transaction is backend-relayed, the UI must label it:

> Submitted by KreditAgent worker for demo convenience.

If wallet-signed, label it:

> You are signing this action as the connected agent owner.

## ERC-8004 object model in UI

### Agent profile

```ts
export type AgentProfile = {
  agentRegistry: string;
  agentId: string;
  owner: `0x${string}`;
  agentWallet?: `0x${string}`;
  agentURI: string;
  role: "borrower" | "issuer" | "lender" | "validator" | "regulator_viewer";
  active: boolean;
  metadata?: Record<string, unknown>;
};
```

### Agent card display

```text
BorrowerAgent #42
Owner: 0x1234...abcd
Role: MSME Borrower
ForU DID: did:foru:bu-siti-demo
Reputation events: 3
Validation references: 1
```

## agentURI rendering

The frontend should parse and display selected fields from `agentURI`, but never trust it blindly.

Use `agentURI` as metadata, not authorization.

Display:

- name;
- description;
- endpoints;
- supported trust modes;
- x402 support;
- ForU DID binding;
- update timestamp.

Warn if:

- malformed JSON;
- endpoint domain not allowlisted in demo;
- unsupported payment network;
- missing trust fields.

## x402 frontend flow

The frontend should not hide the 402. For the hackathon, the `402 Payment Required` response is a product moment.

### Flow

1. Lender clicks `Request audit attestation`.
2. Frontend calls API.
3. API returns 402.
4. Frontend displays payment terms.
5. Lender clicks `Pay with x402`.
6. x402 client signs/settles payment.
7. Frontend retries request with payment proof.
8. API returns attestation.
9. Frontend records receipt state and updates trust timeline.

### UI payment details

Show:

- price;
- currency;
- chain;
- payee;
- facilitator;
- resource;
- expiry;
- receipt hash after payment;
- tx hash if available.

### Mock mode

In mock mode, preserve the same UX but clearly label:

> Demo x402 mock mode — no real funds move.

Do not hide mock mode in the UI. Judges appreciate reliability, but not deception.

## x402 client wrapper

```ts
export type PaidFetchOptions = {
  resource: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
};

export async function paidFetch<T>(opts: PaidFetchOptions): Promise<T> {
  const first = await fetch(opts.resource, {
    method: opts.method ?? "GET",
    headers: opts.headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (first.status !== 402) {
    return first.json();
  }

  const terms = await parsePaymentTerms(first);
  const proof = await createX402PaymentProof(terms);

  const second = await fetch(opts.resource, {
    method: opts.method ?? "GET",
    headers: {
      ...opts.headers,
      "PAYMENT-SIGNATURE": proof.signature,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!second.ok) throw new Error(`Paid request failed: ${second.status}`);
  return second.json();
}
```

## ForU AI-DID integration

### Current public-doc assumption

Public ForU docs describe AI-DID / portable identity / Identifi Score, but a stable public developer API for programmatic AI-DID issuance/Identifi writeback should not be assumed unless provided by organizers.

### Frontend modes

| Mode | Behavior |
|---|---|
| mock | show fake `did:foru:*` binding and demo Identifi component |
| connect | user clicks connect ForU; redirects/OAuth/API if provided |
| read-only | show imported DID and score component |
| unavailable | explain official API not configured |

### ForU identity card

Fields:

- ForU DID;
- Identifi score or component;
- business credit reliability component;
- last sync;
- sync status;
- privacy note.

### Data minimization copy

> ForU receives reputation components and verification status, not raw QRIS or e-commerce transaction rows.

## Contract read hooks

```ts
export function useAgent(agentId?: bigint) {
  return useReadContract({
    address: process.env.NEXT_PUBLIC_IDENTITY_REGISTRY as `0x${string}`,
    abi: identityRegistryAbi,
    functionName: "getAgent",
    args: agentId ? [agentId] : undefined,
    query: { enabled: Boolean(agentId) },
  });
}
```

## Contract write hooks

```ts
export function usePublishAttestation() {
  return useWriteContract();
}
```

Use explicit preflight checks before writes:

```ts
const checks = [
  walletConnected,
  correctChain,
  consentActive,
  scoreUnexpired,
  hashesPresent,
  issuerConfigured,
];
```

Do not show transaction button as enabled until all checks pass.

## Proof link policy

Each confirmed protocol action should expose:

- internal detail page;
- explorer link;
- copyable hash;
- status badge.

Explorer base URLs:

| Network | Explorer |
|---|---|
| Base Sepolia | `https://sepolia.basescan.org/tx/{hash}` |
| Base mainnet | `https://basescan.org/tx/{hash}` |
| Sepolia | `https://sepolia.etherscan.io/tx/{hash}` |

## Security rules

The frontend must not:

- construct arbitrary payment recipient addresses from LLM output;
- accept arbitrary x402 payment terms without checking expected resource/price/payee/network;
- treat `agentURI` as trusted executable config;
- expose API secrets or private keys;
- store raw borrower CSV rows in localStorage;
- use demo mock receipts without mock labels;
- let a lender view audit-grade attestation if consent is revoked.

## Integration acceptance tests

- Wrong network blocks x402 payment.
- 402 response renders terms.
- Mock payment unlocks attestation in demo mode.
- Invalid payment proof renders retry.
- Replayed payment proof renders replay error.
- Revoked consent blocks paid attestation retrieval.
- Expired score renders regenerate CTA.
- ERC-8004 agentURI render survives malformed JSON.
- ForU unavailable mode does not break borrower flow.


# File: docs/frontend/07-design-system-and-ux-writing.md

# 07 — Design System and UX Writing

## Design goal

KreditAgent needs to look like fintech infrastructure, not a crypto toy. The design should feel:

- trustworthy;
- calm;
- data-rich but readable;
- explainable;
- regulatory-aware;
- fast enough for a live demo.

## Visual principles

### 1. Trust over hype

Avoid neon DeFi aesthetics. Use clean cards, strong typography, soft borders, explicit labels, and high contrast.

### 2. Status-first UI

The product is a trust workflow. Every important object needs a status:

- consent;
- evidence;
- score;
- attestation;
- payment;
- validation;
- reputation.

### 3. Hashes are proof, not decoration

Do not dump hashes in raw tables only. Use proof cards with copy buttons and plain-language explanation.

### 4. Explain before asking for signatures

Before any wallet signature or x402 payment, show:

- what user is doing;
- why it is needed;
- what is shared;
- what is not shared;
- expected cost if payment is involved.

## Theme tokens

Recommended CSS variables:

```css
:root {
  --ka-background: 0 0% 100%;
  --ka-foreground: 222 47% 11%;
  --ka-muted: 215 20% 65%;
  --ka-border: 214 32% 91%;
  --ka-card: 0 0% 100%;
  --ka-primary: 220 70% 45%;
  --ka-success: 142 55% 35%;
  --ka-warning: 38 90% 45%;
  --ka-danger: 0 70% 45%;
  --ka-info: 199 89% 48%;
}
```

## Core UI patterns

### Status badge

| Status | Color intent | Example text |
|---|---|---|
| active | success | Consent active |
| pending | warning/info | Validation pending |
| failed | danger | Payment invalid |
| revoked | neutral/danger | Consent revoked |
| mock | warning | Demo mock |
| live | success/info | Testnet live |

### Proof card

Use for:

- evidence hash;
- score hash;
- attestation tx;
- validation hash;
- x402 receipt.

Layout:

```text
[Proof type]                         [copy]
Evidence hash
0xabc...123
Raw transaction rows are not stored on-chain.
```

### Timeline step

Each step:

- icon;
- label;
- status;
- timestamp;
- proof link;
- explanation.

Example:

```text
✓ Evidence hash created
  2026-06-01 10:01 WIB
  Feature hash: 0x123...abc
  Raw QRIS rows remain off-chain.
```

### Risk factor row

```text
Revenue volatility         Medium risk       0.31 CV
The last 30 days are stable, but weekends show lower sales.
```

## Information density rules

Use progressive disclosure:

- summary card first;
- expandable details;
- raw JSON only in developer/protocol view;
- hashes collapsed on mobile;
- long memo in tabs or accordion.

## Copywriting rules

### Say this

- “KreditAgent generated a score from deterministic factors.”
- “The lender makes the final credit decision.”
- “This attestation is valid until…”
- “Audit-grade access requires x402 payment.”
- “Raw business data is not stored on-chain.”
- “Consent revocation blocks new sharing.”

### Do not say this

- “You are approved.”
- “Guaranteed loan.”
- “AI decided your credit.”
- “OJK approved.”
- “Fully legal stablecoin lending.”
- “Your data is deleted from the blockchain.”

## Bahasa Indonesia / English strategy

For hackathon, English UI is acceptable, but borrower copy should support Bahasa Indonesia soon.

Critical borrower copy should have simple Indonesian variants:

| English | Indonesian |
|---|---|
| Grant consent | Beri persetujuan |
| Revoke consent | Cabut persetujuan |
| Generate score | Buat skor |
| Share attestation | Bagikan atestasi |
| Not a credit decision | Bukan keputusan kredit |
| Raw data is not on-chain | Data mentah tidak disimpan di blockchain |

## Screen-level UX copy

### Landing hero

```text
Portable credit reputation for Indonesian MSMEs.
KreditAgent turns QRIS and e-commerce evidence into verifiable credit attestations that licensed lenders can query through x402.
```

CTA:

```text
Start demo
View protocol proof
```

### Borrower consent

```text
You control what KreditAgent can use.
We use your selected business evidence to derive credit features and produce a lender-shareable attestation. You can revoke consent later.
```

### Score explanation

```text
This score is generated by deterministic rules. The AI explanation below summarizes the factors; it does not approve or reject loans.
```

### Lender payment

```text
Audit-grade attestation requires x402 payment.
After payment, you will receive the signed score package, evidence hashes, validation status, and expiry.
```

### Validation

```text
ValidatorAgent recomputes the score from committed features and confirms whether the attestation matches the published scoring version.
```

### Repayment reputation

```text
Repayment events update borrower reputation. Negative events can be disputed.
```

## Accessibility requirements

- All buttons need visible labels.
- Hash copy buttons need `aria-label`.
- Timeline status cannot rely on color alone.
- Payment and wallet modals must be keyboard navigable.
- Error messages must be attached to form fields.
- Score cards must include text band, not just number/color.
- Charts must have text summaries.

## Mobile design

Mobile priorities:

1. score card;
2. consent status;
3. next required action;
4. trust timeline;
5. proof hashes hidden in accordions.

Avoid dense side-by-side layouts on mobile. Use stacked cards and sticky CTA.

## shadcn/ui components to use

| UI need | Component |
|---|---|
| cards | `Card` |
| actions | `Button` |
| status | `Badge` |
| tabs | `Tabs` |
| details | `Accordion` |
| forms | `Form`, `Input`, `Checkbox`, `Select`, `Textarea` |
| alerts | `Alert` |
| modals | `Dialog`, `Sheet` |
| table | `Table` |
| progress | `Progress` |
| menu | `DropdownMenu` |
| toast | `Sonner` |

## Empty states

### No consent

```text
No active consent yet.
Grant scoped consent so KreditAgent can derive score features from your business evidence.
```

### No data

```text
No business evidence uploaded.
Upload QRIS and e-commerce samples to generate your first score.
```

### No attestation

```text
No published attestation yet.
Generate a score first, then publish it as a lender-shareable proof.
```

### No validation

```text
No validator has checked this score yet.
Audit-grade lender access should request validation before relying on it.
```

## Error tone

Errors should be calm and actionable.

Bad:

```text
Transaction failed.
```

Good:

```text
Attestation was not published. Your score is still saved locally, but lenders cannot access the audit-grade proof until publication succeeds.
```


# File: docs/frontend/08-implementation-plan-and-tasks.md

# 08 — Implementation Plan and Tasks

## Implementation principle

Build the frontend in vertical slices. Do not build every screen shell first. Each slice should prove one part of the end-to-end trust/payment loop.

## Phase 0 — Project foundation

### Goal

Create a stable Next.js frontend base with wallet, styling, API client, typed schemas, and demo fixtures.

### Tasks

```text
[ ] Create Next.js App Router app with TypeScript.
[ ] Add Tailwind CSS.
[ ] Install shadcn/ui.
[ ] Add shared layout and route groups.
[ ] Add TanStack Query provider.
[ ] Add RainbowKit/wagmi/viem provider.
[ ] Add Zod schemas.
[ ] Add API client wrapper.
[ ] Add mock fixture data.
[ ] Add environment badge.
[ ] Add global error/loading states.
```

### Suggested install

```bash
pnpm create next-app apps/web --ts --tailwind --eslint --app --src-dir
cd apps/web
pnpm dlx shadcn@latest init
pnpm add @tanstack/react-query zod react-hook-form @hookform/resolvers
pnpm add wagmi viem @rainbow-me/rainbowkit
pnpm add lucide-react recharts sonner date-fns clsx tailwind-merge
pnpm add -D @playwright/test
```

## Phase 1 — Borrower demo path

### Goal

User can go from borrower dashboard to generated score.

### Tasks

```text
[ ] Build borrower dashboard.
[ ] Build consent page.
[ ] Build consent scope selector.
[ ] Build consent receipt card.
[ ] Build data source upload cards.
[ ] Build data quality warning UI.
[ ] Build score generation page.
[ ] Build score hero card.
[ ] Build factor breakdown.
[ ] Build AI explanation panel.
[ ] Connect to mock/local API.
```

### Acceptance

- Bu Siti profile loads.
- Consent can be granted and revoked.
- QRIS/e-commerce sample data can be uploaded or marked as uploaded.
- Score can be generated.
- Score UI shows hashes and explanation.
- Revoked consent blocks new score generation.

## Phase 2 — Attestation publication path

### Goal

Borrower can publish attestation and see protocol proof.

### Tasks

```text
[ ] Build attestation preflight checklist.
[ ] Add wallet connect UI.
[ ] Add chain switch UI.
[ ] Add contract write or backend-relay action.
[ ] Add tx pending/confirmed/failed states.
[ ] Add attestation detail page.
[ ] Add proof hash table.
[ ] Add protocol trust timeline.
```

### Acceptance

- Publish button disabled until preflight passes.
- Wrong network produces clear error.
- Successful publish shows tx hash.
- Attestation detail links borrower agent and issuer agent.

## Phase 3 — Lender x402 path

### Goal

Lender sees 402 payment requirement, pays, and receives attestation.

### Tasks

```text
[ ] Build lender dashboard.
[ ] Build borrower lookup / sample selector.
[ ] Build x402 payment terms card.
[ ] Implement paidFetch wrapper.
[ ] Add mock x402 mode.
[ ] Add live x402 feature flag.
[ ] Build paid attestation viewer.
[ ] Build payment receipt detail page.
[ ] Add payment error states.
```

### Acceptance

- First audit attestation request returns payment-required UI.
- Payment card shows price/network/payee/resource.
- Mock payment unlocks attestation.
- Paid attestation displays validation status and hashes.
- Receipt hash appears in protocol timeline.

## Phase 4 — Validation and reputation path

### Goal

Validator and repayment flows are visible and understandable.

### Tasks

```text
[ ] Build validation status component.
[ ] Build validation request action.
[ ] Build validation result detail page.
[ ] Build lender decision form.
[ ] Build repayment simulator.
[ ] Build borrower reputation timeline.
[ ] Build dispute UI skeleton.
[ ] Add reputation event cards.
```

### Acceptance

- Validation can be requested and shown as pending.
- Validation result updates attestation status.
- Lender decision form requires reason codes.
- Repayment simulator posts reputation event.
- Borrower reputation timeline updates.
- Negative event can be marked disputed in UI.

## Phase 5 — ForU identity surface

### Goal

Represent ForU AI-DID/Identifi integration without depending on unavailable API.

### Tasks

```text
[ ] Build ForU identity card.
[ ] Add mock DID binding.
[ ] Add Identifi component display.
[ ] Add privacy/data minimization copy.
[ ] Add integration unavailable state.
[ ] Add agentURI ForU field renderer.
```

### Acceptance

- Borrower profile shows ForU DID status.
- agentURI preview includes ForU DID field.
- UI clearly says official API is mocked if not configured.
- Raw evidence is not shown as shared with ForU.

## Phase 6 — Protocol explorer and demo polish

### Goal

Judges can inspect the whole trust graph.

### Tasks

```text
[ ] Build protocol overview.
[ ] Build AgentIdentityCard.
[ ] Build TrustTimeline.
[ ] Build ProtocolGraph.
[ ] Build HashEvidenceTable.
[ ] Build admin demo control.
[ ] Build demo log stream.
[ ] Add reset/seed demo action.
[ ] Add 90-second guided mode.
```

### Acceptance

- One page shows complete trust/payment flow.
- Demo can be reset without database surgery.
- Guided mode highlights each step.
- Protocol objects link to details.

## Phase 7 — QA and production readiness

### Goal

Make the frontend reliable enough for live demo and pilot discussions.

### Tasks

```text
[ ] Add Playwright end-to-end demo test.
[ ] Add component tests for forms/states.
[ ] Add schema contract tests.
[ ] Add accessibility pass.
[ ] Add mobile pass.
[ ] Add Sentry or console-safe error logging.
[ ] Add analytics events.
[ ] Add performance budget.
[ ] Add final demo checklist.
```

## Recommended file tree

```text
apps/web/src/
├── app/
│   ├── (marketing)/page.tsx
│   ├── (app)/borrower/page.tsx
│   ├── (app)/borrower/consent/page.tsx
│   ├── (app)/borrower/data/page.tsx
│   ├── (app)/borrower/score/page.tsx
│   ├── (app)/borrower/attestations/page.tsx
│   ├── (app)/borrower/reputation/page.tsx
│   ├── (app)/lender/page.tsx
│   ├── (app)/lender/attestations/page.tsx
│   ├── (app)/lender/decisions/page.tsx
│   ├── (app)/protocol/page.tsx
│   └── (app)/admin/demo-control/page.tsx
├── components/
│   ├── borrower/
│   ├── lender/
│   ├── protocol/
│   ├── x402/
│   ├── foru/
│   ├── status/
│   └── ui/
├── features/
│   ├── borrower/
│   ├── consent/
│   ├── scoring/
│   ├── attestation/
│   ├── lender/
│   ├── reputation/
│   ├── x402/
│   ├── erc8004/
│   └── foru/
├── hooks/
├── lib/
│   ├── api/
│   ├── chain/
│   ├── schemas/
│   ├── demo/
│   └── formatting/
└── test/
```

## Milestone sequence for hackathon

| Day | Build target |
|---|---|
| Day 1 | App shell, borrower dashboard, demo fixtures |
| Day 2 | Consent + data upload + score UI |
| Day 3 | Attestation publish + protocol timeline |
| Day 4 | Lender x402 paid request flow |
| Day 5 | Validation + repayment reputation |
| Day 6 | ForU DID mock + demo control + polish |
| Day 7 | Testing, backup video, presentation rehearsal |

## Definition of done

A frontend feature is done when it has:

- functional happy path;
- error states;
- loading states;
- mobile layout;
- typed API contract;
- copy reviewed for compliance language;
- Playwright or component test;
- visible event in trust timeline if protocol-relevant.

## Highest-risk frontend work

| Risk | Mitigation |
|---|---|
| x402 SDK changes | wrap behind `paidFetch` adapter |
| wallet/network failures | mock mode + clear fallback |
| chain confirmation slow | show pending state + pre-saved tx fallback |
| too much information | progressive disclosure |
| judge confusion | guided demo mode |
| ForU API unavailable | mock DID binding with explicit label |
| regulatory wording risk | fixed copy library, no “approved by KreditAgent” language |


# File: docs/frontend/09-testing-qa-and-observability.md

# 09 — Testing, QA, and Observability

## Testing goal

The frontend must be reliable enough for a live hackathon demo and safe enough to discuss with lenders/regulators.

Test the product as a trust workflow, not just individual components.

## Test pyramid

| Layer | Tool | Purpose |
|---|---|---|
| Type checks | TypeScript | prevent API/prop drift |
| Schema tests | Zod | validate API payloads and forms |
| Unit tests | Vitest | formatters, guards, adapters |
| Component tests | Testing Library / Storybook | forms, cards, state views |
| E2E tests | Playwright | end-to-end borrower/lender/protocol flow |
| Manual demo QA | checklist | hackathon reliability |

## Critical E2E test: 90-second demo

Test name:

```text
kreditagent-demo-flow.spec.ts
```

Steps:

1. Open landing page.
2. Click start demo.
3. Grant borrower consent.
4. Upload/load sample QRIS data.
5. Upload/load e-commerce data.
6. Generate score.
7. Publish attestation.
8. Switch to lender route.
9. Request audit attestation.
10. Confirm 402 payment UI appears.
11. Pay in mock x402 mode.
12. Verify paid attestation visible.
13. Request validation.
14. Simulate on-time repayment.
15. Check protocol timeline has all required steps.

Assertions:

- score appears;
- `AI explanation only` disclaimer appears;
- evidence hash appears;
- payment terms appear;
- attestation appears only after payment;
- validation status appears;
- repayment event appears;
- no page-level crash.

## Playwright skeleton

```ts
import { test, expect } from "@playwright/test";

test("KreditAgent end-to-end demo flow", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /start demo/i }).click();

  await expect(page.getByTestId("borrower-overview-card")).toBeVisible();

  await page.getByTestId("grant-consent-button").click();
  await expect(page.getByText(/consent active/i)).toBeVisible();

  await page.getByTestId("load-sample-data-button").click();
  await expect(page.getByText(/evidence hash/i)).toBeVisible();

  await page.getByTestId("generate-score-button").click();
  await expect(page.getByTestId("score-hero-card")).toContainText("742");
  await expect(page.getByText(/not a credit decision/i)).toBeVisible();

  await page.getByTestId("publish-attestation-button").click();
  await expect(page.getByText(/attestation anchored/i)).toBeVisible();

  await page.getByRole("link", { name: /lender/i }).click();
  await page.getByTestId("request-audit-attestation-button").click();
  await expect(page.getByText(/payment required/i)).toBeVisible();

  await page.getByTestId("x402-pay-button").click();
  await expect(page.getByTestId("paid-attestation-viewer")).toBeVisible();

  await page.getByTestId("simulate-repayment-button").click();
  await expect(page.getByText(/repayment_on_time/i)).toBeVisible();
});
```

## Component test matrix

| Component | Required tests |
|---|---|
| `ConsentScopeSelector` | required scopes locked, expiry validation, revoke state |
| `DataSourceCard` | ready/warning/failed states, warning count |
| `ScoreHeroCard` | bands, expiry, unavailable score |
| `AiExplanationPanel` | disclaimer always visible |
| `AttestationPublishPanel` | preflight disabled states |
| `X402PaymentCard` | unpaid/paid/invalid/replayed/facilitator-offline |
| `PaidAttestationViewer` | hides audit data until paid |
| `TrustTimeline` | ordered steps, pending/confirmed/failed statuses |
| `ForUIdentityCard` | mock/connect/unavailable modes |

## Contract/API mock tests

Use MSW or local test API to simulate:

- successful consent;
- revoked consent;
- score expired;
- 402 required;
- payment invalid;
- payment replayed;
- validation pending;
- validation failed;
- chain tx pending forever;
- RPC failure;
- ForU API unavailable.

## Accessibility QA

Checklist:

```text
[ ] All interactive elements reachable by keyboard.
[ ] Wallet/payment modals have focus management.
[ ] Score band not color-only.
[ ] Timeline status not color-only.
[ ] Form errors announced and tied to fields.
[ ] Hash copy buttons have accessible labels.
[ ] Tables have headers.
[ ] Charts have text summaries.
[ ] Mobile font sizes remain readable.
```

## Security QA

| Risk | Test |
|---|---|
| raw CSV in localStorage | inspect storage after upload |
| payment address modified by client | tamper network request, expect rejection |
| x402 mock hidden | verify mock badge visible |
| revoked consent still shares score | revoke then request audit attestation, expect blocked |
| expired score still publishable | set expiry past, expect publish disabled |
| agentURI XSS | malicious JSON field renders escaped |
| prompt injection in CSV | warning shown, score unchanged |

## Observability events

Track frontend analytics events:

```ts
export type FrontendEvent =
  | "demo_started"
  | "wallet_connected"
  | "consent_granted"
  | "consent_revoked"
  | "data_uploaded"
  | "score_generated"
  | "attestation_publish_clicked"
  | "attestation_confirmed"
  | "x402_payment_required"
  | "x402_payment_success"
  | "x402_payment_failed"
  | "validation_requested"
  | "validation_passed"
  | "lender_decision_submitted"
  | "repayment_simulated"
  | "dispute_opened";
```

Do not log raw PII or raw transaction rows.

## Error logging policy

Log:

- request ID;
- route;
- error code;
- chain ID;
- mock/live mode;
- browser info;
- timestamp.

Do not log:

- raw CSV content;
- borrower phone/address;
- private keys;
- wallet signatures beyond hash/reference;
- full payment payload if sensitive.

## Performance targets

| Metric | Target |
|---|---:|
| landing LCP | <2.5s |
| borrower dashboard TTI | <3s |
| score generation UI feedback | <500ms |
| route transition | <500ms perceived |
| x402 payment card render after 402 | <1s |
| demo reset | <5s |

## Manual pre-demo QA checklist

```text
[ ] Open landing page in clean browser.
[ ] Start demo works.
[ ] Borrower route loads.
[ ] Consent can be granted.
[ ] Sample data loads.
[ ] Score generates.
[ ] Attestation publishes or mock publishes.
[ ] Lender route loads.
[ ] 402 payment screen appears.
[ ] x402 mock/live payment succeeds.
[ ] Paid attestation appears.
[ ] Validation state updates.
[ ] Repayment event appears.
[ ] Protocol timeline complete.
[ ] Reset demo works.
[ ] Wrong network message works.
[ ] API offline fallback message works.
[ ] Mobile layout is usable.
```

## Demo fallback plan

If live chain fails:

- switch to mock mode;
- show pre-saved tx hash;
- keep trust timeline visible;
- explain “chain worker queued; demo uses cached proof.”

If x402 facilitator fails:

- switch to x402 mock mode;
- show real 402 response shape;
- explain “facilitator unavailable; mock mode preserves protocol flow.”

If API fails:

- use static demo fixture page;
- show screenshots/video;
- use protocol explorer links.

## Release gate

Do not present unless all pass:

```text
[ ] TypeScript passes.
[ ] E2E demo path passes.
[ ] No real secrets in client bundle.
[ ] No raw data persisted in browser storage.
[ ] All high-stakes actions have disclaimers.
[ ] Mock mode clearly labeled.
[ ] Payment and consent failures are visible.
[ ] Protocol timeline tells complete story.
```


# File: docs/frontend/10-hackathon-demo-frontend-runbook.md

# 10 — Hackathon Demo Frontend Runbook

## Demo objective

Show that KreditAgent is a working trust/payment frontend, not a static pitch deck.

The demo must prove:

1. borrower consent;
2. evidence hashing;
3. deterministic score;
4. bounded AI explanation;
5. ERC-8004-style attestation;
6. x402 payment required and paid access;
7. validation;
8. repayment reputation update.

## Demo tabs

Open these before presenting:

1. `/borrower?borrower=bu-siti&mode=demo`
2. `/lender?borrower=bu-siti&mode=demo`
3. `/protocol?borrower=bu-siti&mode=demo`
4. `/admin/demo-control`
5. Optional: block explorer tx page.

## Demo mode config

Recommended environment:

```env
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_DEFAULT_BORROWER=bu-siti
NEXT_PUBLIC_DEFAULT_CHAIN=base-sepolia
NEXT_PUBLIC_X402_MODE=mock
NEXT_PUBLIC_ERC8004_MODE=testnet-or-mock
NEXT_PUBLIC_FORU_MODE=mock
```

## 90-second frontend demo

### 0:00–0:10 — Borrower identity

Screen: `/borrower`

Say:

> This is Bu Siti, an MSME owner. She has digital business activity but no portable credit reputation.

Show:

- BorrowerAgent ID;
- ForU AI-DID mock binding;
- no/initial score.

### 0:10–0:20 — Consent

Screen: `/borrower/consent`

Action:

- click `Grant consent`.

Say:

> KreditAgent only uses scoped consent. She controls QRIS and e-commerce data access.

Show:

- active consent;
- expiry;
- revocation CTA.

### 0:20–0:32 — Evidence

Screen: `/borrower/data`

Action:

- click `Load sample QRIS + e-commerce evidence`.

Say:

> Raw rows stay off-chain. The app converts them into features and hashes.

Show:

- records accepted;
- evidence hash;
- warnings if any.

### 0:32–0:45 — Score

Screen: `/borrower/score`

Action:

- click `Generate score`.

Say:

> The score is deterministic. The AI only explains the factors; it cannot approve the loan.

Show:

- score card;
- factor breakdown;
- AI explanation disclaimer.

### 0:45–0:58 — Publish attestation

Screen: `/borrower/attestations`

Action:

- click `Publish attestation`.

Say:

> The score package is anchored to her ERC-8004 BorrowerAgent and issued by KreditAgent.

Show:

- attestation ID;
- tx/proof hash;
- trust timeline update.

### 0:58–1:15 — x402 lender payment

Screen: `/lender/attestations`

Action:

- click `Request audit-grade attestation`;
- show 402 payment card;
- click `Pay with x402`.

Say:

> The lender agent cannot access the audit-grade payload until it pays. x402 turns the attestation into a paid API resource.

Show:

- payment terms;
- paid receipt;
- signed attestation.

### 1:15–1:25 — Validation

Screen: same or `/protocol`

Action:

- click `Request validation` or show prevalidated status.

Say:

> ValidatorAgent confirms the score matches the committed features and scoring version.

Show:

- validation passed;
- validator agent ID;
- validation hash.

### 1:25–1:30 — Repayment reputation

Screen: `/lender/decisions` or `/borrower/reputation`

Action:

- click `Simulate on-time repayment`.

Say:

> Repayment updates her portable reputation, so the next lender sees more than a blank file.

Show:

- repayment_on_time event;
- reputation timeline.

## 5-minute extended demo

Use the 90-second flow plus:

1. Open protocol graph.
2. Open x402 receipt detail.
3. Show consent revocation blocks new attestation.
4. Show prompt-injection-like CSV warning.
5. Show dispute UI for negative reputation.

## Frontend demo control panel

`/admin/demo-control` should include:

- reset state;
- seed Bu Siti;
- seed lender;
- toggle mock/live x402;
- toggle mock/live chain;
- force API offline simulation;
- force validation fail simulation;
- show latest logs;
- copy all proof hashes.

## Judge questions and UI answer

### “Where is ERC-8004?”

Open `/protocol` and show:

- BorrowerAgent;
- KreditAgent issuer;
- LenderAgent;
- ValidatorAgent;
- reputation and validation events.

### “Where is x402?”

Open lender attestation flow and show:

- `402 Payment Required` state;
- payment terms;
- receipt hash;
- paid attestation only after payment.

### “Does AI approve loans?”

Open score page and show:

- deterministic factor table;
- AI explanation disclaimer;
- lender decision form saying lender owns decision.

### “Where is privacy?”

Open evidence hash panel and show:

- raw rows off-chain;
- only hashes/metadata on-chain;
- consent revocation.

### “What if lender reports false default?”

Open reputation page and show:

- dispute button;
- disputed status;
- validator review flow.

## Final frontend checklist

```text
[ ] Demo starts from public landing.
[ ] Borrower dashboard loads in <3s.
[ ] Consent step is obvious.
[ ] Score page clearly says AI is explanation-only.
[ ] x402 payment screen is visually memorable.
[ ] Paid attestation appears after payment.
[ ] Protocol timeline has all steps.
[ ] Mock/live badges are visible.
[ ] Wrong-network state works.
[ ] Reset demo works.
[ ] Backup screenshots recorded.
```

## Backup script if frontend crashes

Say:

> The live frontend is having a runtime issue, so I’ll show the captured protocol flow: consent, evidence hash, score, x402 payment, validation, and repayment reputation.

Then show:

- screenshots;
- API logs;
- contract tx hash;
- compiled demo video.

## Best final line

> KreditAgent makes informal MSME cash flow legible without becoming the lender: borrowers control consent, lenders pay for attestations, and ERC-8004 makes trust portable.


# File: docs/frontend/SOURCE_NOTES.md

# Source Notes

This frontend spec is built around these implementation assumptions and external references:

- Next.js App Router: https://nextjs.org/docs/app
- Next.js Server and Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js forms and Server Actions: https://nextjs.org/docs/app/guides/forms
- shadcn/ui Next.js installation: https://ui.shadcn.com/docs/installation/next
- shadcn/ui React Hook Form docs: https://ui.shadcn.com/docs/forms/react-hook-form
- React Hook Form: https://react-hook-form.com/get-started
- Zod: https://zod.dev/
- TanStack Query: https://tanstack.com/query
- wagmi: https://wagmi.sh/
- RainbowKit: https://rainbowkit.com/docs/introduction
- x402 seller quickstart: https://docs.cdp.coinbase.com/x402/quickstart-for-sellers
- x402 network support: https://docs.cdp.coinbase.com/x402/network-support
- x402 FAQ: https://docs.cdp.coinbase.com/x402/support/faq
- ERC-8004 EIP: https://eips.ethereum.org/EIPS/eip-8004
- ERC-8004 reference contracts: https://github.com/erc-8004/erc-8004-contracts
- ForU AI official site: https://foruai.io/
- ForU AI GitBook: https://foru-ai.gitbook.io/foru-ai
- ForU AI Google Play listing: https://play.google.com/store/apps/details?id=ai.untukmu.mobile
- Playwright: https://playwright.dev/



