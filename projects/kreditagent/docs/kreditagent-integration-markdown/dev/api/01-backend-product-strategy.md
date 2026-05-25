# 01 — Backend Product Strategy

## What the backend must prove

The backend is the actual product proof. The frontend only visualizes it.

For judges, investors, and technical reviewers, the backend must make four claims true:

| Claim | Backend proof |
|---|---|
| Real-world use case | Ingests MSME payment/order evidence and produces verifiable credit features. |
| Payment integration | Returns `402 Payment Required` for paid attestations and unlocks only after payment proof. |
| Sustainable revenue | Tracks paid lender pulls, payment receipts, tiers, and usage. |
| ERC-8004 deployment | Registers agents, publishes reputation events, and records validation state. |

## Backend success metric

A reviewer should be able to run one script and see:

```text
1. Create borrower
2. Grant consent
3. Upload sample QRIS and marketplace data
4. Generate deterministic score
5. Publish score attestation
6. Request audit attestation without payment -> HTTP 402
7. Retry with x402 payment -> HTTP 200 signed attestation
8. Request validation
9. Submit validator result
10. Submit lender decision
11. Simulate repayment
12. Read updated reputation timeline
```

## Product boundaries

KreditAgent backend must not become:

- a lending engine;
- a P2P marketplace;
- a custody platform;
- an interest-rate engine;
- a consumer loan app;
- a stablecoin lending protocol.

The backend provides:

- consent;
- evidence normalization;
- deterministic score;
- signed attestation;
- x402 monetization;
- ERC-8004 anchoring;
- validation and dispute records;
- repayment reputation events.

## User roles

| Role | Backend capabilities |
|---|---|
| Borrower | Create profile, grant/revoke consent, upload evidence, view score, publish borrower-approved attestation. |
| KreditAgent issuer | Generate score, sign attestation, publish hash, refresh expired score. |
| LenderAgent | Request paid attestation, submit credit decision, submit repayment/default events, open validation request. |
| ValidatorAgent | Recompute score from committed features/evidence and submit validation result. |
| Admin / Guardian | Pause writes, manage allowlists, view audit logs, reset demo data. |
| RegulatorViewerAgent | Read-only export of audit logs and non-PII compliance reports. |

## Backend product states

### Borrower state machine

```text
CREATED
  -> CONSENT_GRANTED
  -> DATA_LINKED
  -> FEATURES_READY
  -> SCORED
  -> ATTESTED
  -> SHARED_WITH_LENDER
  -> LOAN_DECISION_RECORDED
  -> REPAYMENT_TRACKED
  -> REPUTATION_UPDATED
```

### Attestation state machine

```text
DRAFT
  -> SIGNED
  -> PUBLISHED_PENDING_CHAIN
  -> PUBLISHED
  -> VALIDATION_PENDING
  -> VALIDATED / VALIDATION_FAILED
  -> EXPIRED / REVOKED
```

### Lender request state machine

```text
REQUESTED
  -> PAYMENT_REQUIRED
  -> PAYMENT_SUBMITTED
  -> PAYMENT_VERIFIED
  -> ATTESTATION_DELIVERED
  -> DECISION_SUBMITTED
```

## Hackathon vs production scope

| Capability | Hackathon | Production |
|---|---|---|
| Data source | Mock CSV / sample JSON | Partner APIs, bank/payment aggregator exports, marketplace APIs. |
| Score model | Deterministic rule engine | Deterministic policy layer + calibrated model + challenger models. |
| LLM | Template-grounded explanation | Guardrailed narrative service with output validator and human review for high-risk cases. |
| x402 | Mock-compatible or Base Sepolia | CDP facilitator / production payment routing / invoice fallback. |
| ERC-8004 | Testnet registry | Official registry implementation or audited compatible contracts. |
| Storage | Local/S3 dev bucket | Encrypted object store, local data residency, retention policy. |
| Security | JWT/API key + wallet signature demo | mTLS for lender partners, KMS/HSM signing, WAF, SIEM, DLP. |
