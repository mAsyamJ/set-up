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
