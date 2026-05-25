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
