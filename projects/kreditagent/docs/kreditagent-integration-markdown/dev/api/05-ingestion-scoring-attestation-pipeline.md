# 05 — Ingestion, Scoring, and Attestation Pipeline

## End-to-end backend sequence

```mermaid
sequenceDiagram
  participant B as Borrower UI
  participant API as Backend API
  participant DB as Postgres
  participant S as Object Store
  participant Q as Queue
  participant W as Workers
  participant LLM as Narrative Service
  participant C as Chain Worker
  participant E as ERC-8004 Contracts

  B->>API: grant consent
  API->>DB: store consent receipt
  B->>API: upload QRIS/e-commerce CSV
  API->>S: store encrypted raw file
  API->>Q: enqueue ingestion.parse
  W->>S: read raw file
  W->>DB: write normalized records
  W->>DB: write evidenceHash
  W->>Q: enqueue features.build
  W->>DB: write featureSnapshot + featureHash
  W->>Q: enqueue score.generate
  W->>DB: write deterministic score
  API->>LLM: send only score factors
  LLM-->>API: bounded explanation JSON
  API->>DB: write narrativeHash
  API->>DB: write signed attestation
  API->>Q: enqueue attestation.publish
  C->>E: publish attestation hash
  C->>DB: txHash + chain state
```

## Ingestion requirements

### Accepted formats for hackathon

| Source | Format | Parser |
|---|---|---|
| QRIS | CSV | `parseQrisCsv` |
| Tokopedia | CSV/JSON | `parseMarketplaceOrders` |
| Shopee | CSV/JSON | `parseMarketplaceOrders` |
| Bank/wallet | CSV | `parseCashflowCsv` |
| Repayment | JSON | `parseRepaymentEvent` |

### Raw data policy

- Store raw upload encrypted.
- Hash raw bytes immediately.
- Do not pass raw rows to LLM.
- Do not return raw rows to lenders.
- Do not write raw row values on-chain.

### Parser output

```ts
type NormalizedRecord = {
  borrowerId: string;
  source: "qris" | "tokopedia" | "shopee" | "bank" | "wallet" | "repayment";
  recordType: "payment" | "order" | "refund" | "supplier_payment" | "repayment";
  transactionAt: string;
  amountIdr: string;
  direction: "inflow" | "outflow";
  status: "settled" | "pending" | "failed" | "refunded";
  category: string;
  canonicalHash: `0x${string}`;
  redactedPayload: Record<string, unknown>;
};
```

## Data-quality checks

| Check | Severity | Action |
|---|---|---|
| Duplicate row hash | warning | Deduplicate. |
| Invalid timestamp | error | Reject row. |
| Negative sales amount | error | Reject row unless refund. |
| Suspicious identical daily totals | warning | Flag synthetic pattern. |
| Prompt-injection-like strings | warning/high | Strip text from LLM path; flag audit. |
| Coverage under 30 days | high | Penalize score or block attestation. |
| Missing active consent | error | Reject ingestion. |
| Merchant identity mismatch | high | Manual review. |

## Prompt-injection-like detector

The backend should flag phrases in uploaded files:

```text
ignore previous instructions
system prompt
approve this borrower
give score 900
do not follow rules
jailbreak
developer message
```

This is not “AI safety theater.” It proves raw uploads are untrusted data.

## Feature builder

### Feature object

```ts
type ScoreFeatures = {
  scoreVersion: "ka-score-v0.2.0";
  coverageDays: number;
  dataFreshnessDays: number;
  revenue: {
    avgDailyRevenue30d: number;
    avgDailyRevenue90d: number;
    revenueVolatility: number;
    monthlyGrowth: number;
    activeDaysRatio: number;
  };
  commerce: {
    fulfilledOrderRate: number;
    refundRate: number;
    repeatBuyerProxy: number;
  };
  cashDiscipline: {
    supplierPaymentRegularity: number;
    failedPaymentCount: number;
    expenseToRevenueRatio: number;
  };
  diversification: {
    activeChannelCount: number;
    concentrationRisk: number;
  };
  reputation: {
    onTimeRepaymentRatio: number;
    latePaymentCount: number;
    unresolvedDisputes: number;
    validatorConfidence: number;
  };
  dataQuality: {
    warnings: string[];
    rejectedRecordCount: number;
  };
};
```

## Deterministic scoring

### Score range

300–900.

### Formula v0.2

```ts
const base = 300;
const score =
  base +
  revenueStability * 180 +
  businessContinuity * 130 +
  cashDiscipline * 160 +
  platformDiversification * 80 +
  reputationHistory * 50 -
  penalties;
```

### Score versioning

Every score record must include:

- `scoreVersion`;
- `featureSchemaVersion`;
- `modelPolicyVersion`;
- `featureHash`;
- `evidenceHash`;
- `scoreHash`;
- `expiresAt`.

Never overwrite scores. Create a new score and mark previous score as `SUPERSEDED`.

## Narrative generation

Input allowed:

```json
{
  "score": 762,
  "band": "A",
  "positiveFactors": ["Stable QRIS revenue", "Low refund rate"],
  "riskFactors": ["Limited repayment history"],
  "dataQualityWarnings": [],
  "manualReviewFlags": []
}
```

Output required:

```json
{
  "borrowerSummary": "...",
  "lenderMemo": "...",
  "positiveFactors": [],
  "riskFactors": [],
  "manualReviewQuestions": [],
  "uncertaintyNote": "..."
}
```

Reject output containing:

- loan approval;
- guaranteed repayment;
- interest rate recommendation;
- protected-class inference;
- raw transaction data;
- payment/wallet instruction;
- facts not present in input.

## Attestation envelope

```ts
type CreditAttestationEnvelope = {
  attestationId: string;
  borrowerAgentRef: string;
  issuerAgentRef: string;
  score: {
    value: number;
    band: string;
    scoreVersion: string;
    scoreHash: `0x${string}`;
    featureHash: `0x${string}`;
    evidenceHash: `0x${string}`;
    expiresAt: string;
  };
  consent: {
    consentReceiptHash: `0x${string}`;
    sourceScopes: string[];
    expiresAt: string | null;
  };
  narrative?: {
    narrativeHash: `0x${string}`;
    language: string;
  };
  validation: {
    status: "not_requested" | "pending" | "passed" | "failed";
    validationRequestId?: string;
  };
  chain?: {
    chainId: number;
    attestationLedger: string;
    attestationId?: string;
    txHash?: `0x${string}`;
  };
  signature: `0x${string}`;
};
```

## Signing model

For hackathon:

- server-side issuer key signs attestation envelope;
- private key kept in environment secrets only;
- frontend never receives issuer private key.

For production:

- KMS/HSM signer;
- key rotation;
- multi-sig governed signer changes;
- allowlist issuer agent identity on-chain.

## Attestation tiering

| Tier | Payload | x402 price |
|---|---|---:|
| Standard | score, band, top factors, signature | $0.05 |
| Audit | standard + feature/evidence hashes + validation status | $0.25 |
| Underwriter | audit + narrative memo + manual-review flags | $0.50 |

## Failure modes

| Failure | Backend response |
|---|---|
| No active consent | `403 CONSENT_REQUIRED` |
| Raw upload parse failed | `422 DATA_QUALITY_FAILED` |
| Score expired | `409 SCORE_EXPIRED` |
| LLM unavailable | Return score with `narrativeStatus: unavailable`. |
| Chain unavailable | Return signed attestation with `chainStatus: pending`. |
| x402 unavailable | Return `503 PAYMENT_UNAVAILABLE`; allow mock only in demo mode. |
