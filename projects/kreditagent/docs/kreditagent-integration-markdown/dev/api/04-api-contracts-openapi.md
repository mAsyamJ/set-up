# 04 — API Contracts and OpenAPI

## API design rules

1. All APIs are versioned under `/v1`.
2. All mutating APIs are idempotent.
3. All paid resources are protected by x402 middleware or a mock-compatible equivalent.
4. All responses include `requestId`.
5. All actor-scoped requests require either wallet signature, partner API key, or demo session.
6. All errors use a stable machine-readable code.

## Common response envelope

```json
{
  "requestId": "req_01HX...",
  "ok": true,
  "data": {}
}
```

## Common error envelope

```json
{
  "requestId": "req_01HX...",
  "ok": false,
  "error": {
    "code": "CONSENT_REVOKED",
    "message": "Borrower consent is revoked or expired.",
    "details": {}
  }
}
```

## Auth headers

```http
Authorization: Bearer <session-or-partner-token>
X-Agent-Id: eip155:84532:0xIdentityRegistry:42
X-Wallet-Signature: 0x...
X-Idempotency-Key: ...
```

## Borrower APIs

### `POST /v1/borrowers`

Create borrower profile and optionally bind ForU DID.

Request:

```json
{
  "displayName": "Bu Siti Warung",
  "walletAddress": "0xBorrower",
  "foruDid": "did:foru:bu-siti"
}
```

Response:

```json
{
  "borrowerId": "bor_...",
  "status": "CREATED",
  "walletAddress": "0xBorrower",
  "foruDid": "did:foru:bu-siti"
}
```

### `POST /v1/borrowers/{borrowerId}/agents/register`

Register or bind ERC-8004 BorrowerAgent.

Request:

```json
{
  "chainId": 84532,
  "registryAddress": "0xIdentityRegistry",
  "agentUri": "ipfs://...",
  "agentWallet": "0xBorrowerAgent"
}
```

Response:

```json
{
  "agentRef": "eip155:84532:0xIdentityRegistry:42",
  "txHash": "0x..."
}
```

### `POST /v1/borrowers/{borrowerId}/consents`

Grant consent.

Request:

```json
{
  "source": "QRIS_CSV",
  "scope": ["read_transactions", "derive_credit_features", "share_attestation"],
  "purpose": "credit_attestation",
  "expiresAt": "2026-07-01T00:00:00.000Z",
  "signature": "0x..."
}
```

Response:

```json
{
  "consentId": "con_...",
  "status": "ACTIVE",
  "receiptHash": "0x..."
}
```

### `POST /v1/consents/{consentId}/revoke`

Response:

```json
{
  "consentId": "con_...",
  "status": "REVOKED",
  "revokedAt": "2026-04-30T12:00:00.000Z"
}
```

## Ingestion APIs

### `POST /v1/borrowers/{borrowerId}/data-sources/upload`

Multipart form-data:

```text
source=QRIS_CSV
consentId=con_...
file=@qris_bu_siti.csv
```

Response:

```json
{
  "dataSourceId": "src_...",
  "status": "PARSING",
  "rawHash": "0x...",
  "jobId": "job_..."
}
```

### `GET /v1/data-sources/{dataSourceId}`

Response:

```json
{
  "dataSourceId": "src_...",
  "status": "PARSED",
  "recordsAccepted": 340,
  "recordsRejected": 2,
  "evidenceHash": "0x...",
  "warnings": [
    {
      "code": "PROMPT_INJECTION_LIKE_TEXT",
      "count": 1
    }
  ]
}
```

## Feature and scoring APIs

### `POST /v1/borrowers/{borrowerId}/features/build`

Response:

```json
{
  "featureSnapshotId": "feat_...",
  "featureHash": "0x...",
  "evidenceHash": "0x...",
  "coverageDays": 92,
  "dataFreshnessDays": 1
}
```

### `POST /v1/borrowers/{borrowerId}/scores`

Request:

```json
{
  "featureSnapshotId": "feat_...",
  "scoreVersion": "ka-score-v0.2.0"
}
```

Response:

```json
{
  "scoreId": "score_...",
  "score": 762,
  "band": "A",
  "scoreVersion": "ka-score-v0.2.0",
  "featureHash": "0x...",
  "evidenceHash": "0x...",
  "riskFactors": [],
  "positiveFactors": [
    "Stable QRIS revenue over 90 days",
    "Low refund rate",
    "Multiple revenue channels"
  ],
  "expiresAt": "2026-05-30T00:00:00.000Z"
}
```

## Narrative API

### `POST /v1/scores/{scoreId}/narrative`

Request:

```json
{
  "audience": "lender",
  "language": "en",
  "includeManualReviewQuestions": true
}
```

Response:

```json
{
  "narrativeId": "nar_...",
  "narrativeHash": "0x...",
  "borrowerSummary": "...",
  "lenderMemo": "...",
  "manualReviewQuestions": []
}
```

## Attestation APIs

### `POST /v1/scores/{scoreId}/attestations`

Request:

```json
{
  "tier": "AUDIT",
  "issuerAgentRef": "eip155:84532:0xIdentityRegistry:1",
  "publishToChain": true
}
```

Response:

```json
{
  "attestationId": "att_...",
  "status": "PUBLISH_PENDING",
  "scoreHash": "0x...",
  "featureHash": "0x...",
  "evidenceHash": "0x...",
  "signature": "0x...",
  "chainJobId": "job_..."
}
```

### `GET /v1/attestations/{attestationId}/standard`

May be free or cheaper paid endpoint.

### `GET /v1/attestations/{attestationId}/audit`

Paid x402 endpoint.

Unpaid response:

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
X-Payment-Required: true
```

```json
{
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact",
      "network": "eip155:84532",
      "price": "$0.25",
      "payTo": "0xKreditAgentTreasury",
      "resource": "https://api.kreditagent.id/v1/attestations/att_123/audit",
      "description": "Audit-grade MSME credit attestation"
    }
  ]
}
```

Paid response:

```json
{
  "attestationId": "att_...",
  "borrowerAgentRef": "eip155:84532:0xIdentityRegistry:42",
  "issuerAgentRef": "eip155:84532:0xIdentityRegistry:1",
  "score": {
    "value": 762,
    "band": "A",
    "scoreVersion": "ka-score-v0.2.0",
    "scoreHash": "0x...",
    "featureHash": "0x...",
    "evidenceHash": "0x...",
    "expiresAt": "2026-05-30T00:00:00.000Z"
  },
  "validation": {
    "status": "PENDING",
    "requestId": null
  },
  "payment": {
    "protocol": "x402",
    "receiptHash": "0x...",
    "network": "eip155:84532"
  },
  "signature": "0x..."
}
```

## Validation APIs

### `POST /v1/validations`

Request:

```json
{
  "attestationId": "att_...",
  "requesterAgentRef": "eip155:84532:0xIdentityRegistry:12",
  "requiredQuorum": 1,
  "deadlineSeconds": 86400
}
```

Response:

```json
{
  "validationRequestId": "val_...",
  "status": "PENDING",
  "chainRequestId": "17",
  "txHash": "0x..."
}
```

### `POST /v1/validations/{validationRequestId}/results`

Request:

```json
{
  "validatorAgentRef": "eip155:84532:0xIdentityRegistry:7",
  "result": "PASS",
  "recomputedScore": 762,
  "evidenceHash": "0x...",
  "notes": "Score matches deterministic rules.",
  "signature": "0x..."
}
```

## Lender APIs

### `POST /v1/lenders/{lenderId}/decisions`

Request:

```json
{
  "attestationId": "att_...",
  "decision": "APPROVED",
  "principalIdr": "15000000",
  "termDays": 180,
  "aprBps": 2200,
  "decisionBy": "lender"
}
```

Response:

```json
{
  "decisionId": "dec_...",
  "payloadHash": "0x...",
  "status": "RECORDED"
}
```

## Repayment and reputation APIs

### `POST /v1/borrowers/{borrowerId}/reputation/repayments`

Request:

```json
{
  "issuerAgentRef": "eip155:84532:0xIdentityRegistry:12",
  "loanRef": "loan_demo_001",
  "amountIdr": "1500000",
  "paidAt": "2026-06-15T10:00:00+07:00",
  "status": "ON_TIME",
  "evidenceHash": "0x..."
}
```

Response:

```json
{
  "reputationEventId": "rep_...",
  "eventType": "repayment_on_time",
  "scoreDelta": 8,
  "chainTxHash": "0x..."
}
```

### `POST /v1/reputation-events/{eventId}/dispute`

Request:

```json
{
  "borrowerAgentRef": "eip155:84532:0xIdentityRegistry:42",
  "reason": "Payment was made on time; lender webhook was delayed.",
  "evidenceHash": "0x..."
}
```

## Protocol explorer APIs

### `GET /v1/protocol/agents/{agentRef}`

Returns agent metadata, roles, chain state, and known endpoints.

### `GET /v1/protocol/timeline/{borrowerAgentRef}`

Returns credit timeline:

```json
{
  "events": [
    { "type": "agent_registered", "txHash": "0x..." },
    { "type": "consent_granted", "hash": "0x..." },
    { "type": "score_issued", "txHash": "0x..." },
    { "type": "attestation_paid", "receiptHash": "0x..." },
    { "type": "validation_passed", "txHash": "0x..." },
    { "type": "repayment_on_time", "txHash": "0x..." }
  ]
}
```

## Admin/demo APIs

These must be disabled in production unless explicitly protected.

```http
POST /v1/admin/demo/reset
POST /v1/admin/demo/seed
POST /v1/admin/demo/toggle-x402-mode
GET  /v1/admin/audit-logs
GET  /v1/health
GET  /v1/ready
```

## Error codes

| Code | HTTP | Meaning |
|---|---:|---|
| `UNAUTHORIZED` | 401 | Missing/invalid auth. |
| `FORBIDDEN_AGENT_ROLE` | 403 | Agent role cannot perform action. |
| `CONSENT_REQUIRED` | 403 | No active consent for requested source/purpose. |
| `CONSENT_REVOKED` | 403 | Consent was revoked. |
| `PAYMENT_REQUIRED` | 402 | x402 payment needed. |
| `PAYMENT_INVALID` | 402/400 | Payment proof invalid or insufficient. |
| `PAYMENT_REPLAYED` | 409 | Payment receipt already used. |
| `SCORE_EXPIRED` | 409 | Score/attestation expired. |
| `VALIDATION_PENDING` | 202 | Validation not complete. |
| `DATA_QUALITY_FAILED` | 422 | Evidence insufficient or invalid. |
| `CHAIN_TX_PENDING` | 202 | Chain tx is queued/pending. |
| `CHAIN_TX_FAILED` | 502 | Chain write failed after retries. |
| `RATE_LIMITED` | 429 | Too many requests. |
