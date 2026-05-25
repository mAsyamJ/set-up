# 09 — Security, Privacy, and Compliance

## Security thesis

KreditAgent is high-stakes financial infrastructure. The backend must be designed as if every input is adversarial, every uploaded file can contain prompt injection, every paid resource can be scraped, and every reputation event can harm a borrower.

## Threat model

| Threat | Backend defense |
|---|---|
| Prompt injection in CSV | Raw text never sent to LLM; numeric feature whitelist; detector flags suspicious strings. |
| Fake borrower data | Deduplication, anomaly detection, source verification roadmap, validator recomputation. |
| Unauthorized lender access | Agent role auth, active consent check, x402 payment/entitlement, rate limits. |
| Payment replay | Receipt uniqueness, resource binding, nonce/expiry. |
| Wallet/private-key compromise | Worker-only signing, KMS/HSM roadmap, spend caps, no frontend keys. |
| Bad lender reputation report | Dispute lifecycle, evidence hash requirement, validator review. |
| Raw data leakage | Encrypted storage, redacted records, no raw data on-chain, no raw rows to LLM/lender. |
| Model hallucination | LLM output schema validation, deterministic fallback, no decision authority. |
| Chain RPC instability | Queue, retries, idempotency, pending state visible to user. |
| Insider abuse | Audit logs, least privilege, admin actions logged, break-glass controls. |

## Authentication

### Borrower

- Wallet signature login for production.
- Demo session allowed in hackathon.
- Borrower wallet can grant/revoke consent.
- Optional ForU DID binding.

### Lender

- Partner API key + wallet/agent signature.
- LenderAgent must be registered or allowlisted.
- Paid access requires x402 receipt or entitlement.

### Validator

- Validator API key + validator agent signature.
- Validator cannot validate its own issued score.
- Duplicate validator result rejected.

### Admin

- MFA.
- IP allowlist for production admin.
- Separate admin domain.
- All admin actions logged.

## Authorization policy

Use centralized policy functions:

```ts
canGrantConsent(actor, borrower)
canUploadData(actor, borrower, consent)
canGenerateScore(actor, borrower)
canPublishAttestation(actor, score)
canRequestPaidAttestation(actor, attestation)
canSubmitValidation(actor, validationRequest)
canSubmitReputation(actor, borrower)
canOpenDispute(actor, reputationEvent)
```

Do not scatter authorization checks only inside route handlers.

## Data protection

### Encryption

| Data | Storage |
|---|---|
| Raw uploads | encrypted object storage |
| Normalized records | Postgres, redacted |
| PII | separate table/schema if possible |
| Secrets | secrets manager |
| Private keys | KMS/HSM or isolated signer |
| Audit logs | append-only storage |

### Deletion and revocation

- Consent revocation stops future score generation and paid access.
- Raw off-chain data can be deleted or tombstoned depending retention obligations.
- On-chain hashes cannot be deleted, so never put direct PII on-chain.
- Existing paid attestations can be marked revoked/expired in DB and future access denied.

## LLM safety

### Allowed input

- score value;
- score band;
- factor labels;
- risk factors;
- positive factors;
- data quality warning codes;
- manual-review flags.

### Forbidden input

- raw CSV rows;
- borrower KTP/phone/address;
- raw marketplace order IDs;
- raw QRIS merchant/customer identifiers;
- lender notes;
- secrets/API keys;
- chain private keys.

### Output validator rejects

- “approved” / “reject” as final lending decision;
- APR/pricing recommendation;
- guaranteed repayment claim;
- protected-class inference;
- new facts not in input;
- wallet/payment instructions.

## API security controls

| Control | Requirement |
|---|---|
| Rate limits | Per IP, per API key, per agent. |
| Body size limits | Strict upload limits by source type. |
| File scanning | MIME/type checks; CSV parser safe mode. |
| CORS | Explicit frontend origins only. |
| CSRF | Required for cookie-based dashboard sessions. |
| Headers | HSTS, no-sniff, frame-ancestors, CSP for admin. |
| Input validation | Schema validation on every route. |
| OpenAPI drift | CI check generated OpenAPI matches route schemas. |
| Secrets | Never expose env vars to frontend. |
| Logs | Redact auth, payment headers, raw data, PII. |

## Compliance posture

KreditAgent should be positioned as:

- alternative credit attestation infrastructure;
- vendor to licensed lenders;
- not the lender;
- not a payment service provider unless licensed;
- not custodying borrower funds.

Compliance backend features:

| Requirement | Backend feature |
|---|---|
| Consent | Consent receipts, scope, purpose, expiry, revocation. |
| Data minimization | Redacted records and hash commitments. |
| Explainability | Deterministic factors + bounded narrative. |
| Auditability | Append-only audit logs and chain tx hashes. |
| Human review | Manual-review flags and lender-owned decision field. |
| Dispute | Reputation event dispute lifecycle. |
| Sandbox reporting | Exportable audit packs and non-PII reports. |

## Audit log schema

Every critical action writes:

```json
{
  "requestId": "req_...",
  "actorType": "lender_agent",
  "actorId": "eip155:84532:...",
  "action": "attestation.delivered_paid",
  "resourceType": "attestation",
  "resourceId": "att_...",
  "result": "success",
  "payloadHash": "0x...",
  "createdAt": "..."
}
```

## Security acceptance checklist

- [ ] Every mutating route has auth.
- [ ] Every lender read of paid data has x402 or entitlement.
- [ ] Every score generation checks active consent.
- [ ] Every upload has raw hash and object key.
- [ ] Every chain write is queued and idempotent.
- [ ] Every LLM call uses whitelisted input.
- [ ] Every output narrative is schema-validated.
- [ ] Every payment receipt is resource-bound and replay-checked.
- [ ] Every negative reputation event is disputeable.
- [ ] No raw PII is included in chain metadata.
