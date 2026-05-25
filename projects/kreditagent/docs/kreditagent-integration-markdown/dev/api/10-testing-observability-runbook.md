# 10 — Testing, Observability, and Runbook

## Test strategy

Backend quality must be proven at three layers:

1. **Pure domain tests** — scoring, hashing, parsing, policy rules.
2. **API integration tests** — route behavior, DB writes, x402 guard, error states.
3. **Workflow tests** — full borrower-to-lender-to-reputation flow.

## Test pyramid

```text
70% domain/unit tests
20% integration/API tests
10% end-to-end workflow tests
```

## Unit tests

| Module | Tests |
|---|---|
| `scoring` | deterministic same input -> same score; penalties; bands; expiry. |
| `hashing` | canonical JSON stable ordering; hash changes on input change. |
| `ingestion` | parse valid CSV; reject malformed rows; detect prompt-injection-like text. |
| `consent` | active/expired/revoked state transitions. |
| `payments-x402` | terms generation; resource binding; receipt replay. |
| `attestations` | signature covers scoreHash/featureHash/evidenceHash/expiry. |
| `auth` | wrong role rejected; missing agent rejected. |
| `narratives` | output validator blocks approval/pricing/protected inference. |

## Integration tests

Use test Postgres + Redis + mock x402 + mock chain client.

### Must-pass scenarios

1. Borrower grant consent.
2. Upload sample QRIS CSV.
3. Build features and score.
4. Generate narrative.
5. Publish attestation to mock chain.
6. Request audit attestation unpaid -> `402`.
7. Retry with mock paid header -> `200`.
8. Reuse same payment -> `409 PAYMENT_REPLAYED`.
9. Revoke consent -> new score generation blocked.
10. Submit validation -> attestation status updates.
11. Submit repayment -> reputation event created.
12. Open dispute -> event status becomes `DISPUTED`.

## Workflow test script

```bash
pnpm backend:test:workflow
```

Expected output:

```json
{
  "ok": true,
  "borrowerId": "bor_demo_bu_siti",
  "score": 762,
  "attestationStatus": "PUBLISHED",
  "unpaidStatus": 402,
  "paidStatus": 200,
  "validationStatus": "PASSED",
  "reputationEvent": "repayment_on_time"
}
```

## Demo curl runbook

```bash
# 1. Health
curl http://localhost:4000/v1/health

# 2. Seed demo
curl -X POST http://localhost:4000/v1/admin/demo/seed

# 3. Score borrower
curl -X POST http://localhost:4000/v1/borrowers/bor_demo_bu_siti/scores

# 4. Create attestation
curl -X POST http://localhost:4000/v1/scores/score_demo_bu_siti/attestations \
  -H "Content-Type: application/json" \
  -d '{"tier":"AUDIT","publishToChain":true}'

# 5. Try paid endpoint without payment
curl -i http://localhost:4000/v1/attestations/att_demo_bu_siti/audit

# 6. Retry with mock payment
curl -i http://localhost:4000/v1/attestations/att_demo_bu_siti/audit \
  -H "PAYMENT-SIGNATURE: demo-paid"
```

## Observability

### Logs

Use structured JSON logs.

Required fields:

- `requestId`;
- `actorId`;
- `actorRole`;
- `route`;
- `statusCode`;
- `latencyMs`;
- `resourceId`;
- `errorCode`.

### Metrics

| Metric | Why |
|---|---|
| `api_request_duration_ms` | API latency. |
| `score_generation_duration_ms` | Scoring performance. |
| `ingestion_records_accepted_total` | Data volume. |
| `ingestion_records_rejected_total` | Data quality. |
| `x402_payment_required_total` | Monetization funnel. |
| `x402_payment_verified_total` | Paid conversion. |
| `x402_payment_replay_rejected_total` | Abuse detection. |
| `chain_tx_pending_total` | RPC/chain health. |
| `chain_tx_failed_total` | Chain worker reliability. |
| `validation_pass_total` / `validation_fail_total` | Validator outcomes. |
| `reputation_dispute_total` | Consumer-protection signal. |

### Traces

Trace these spans:

```text
HTTP request
  -> auth guard
  -> DB query
  -> ingestion parse
  -> feature build
  -> score compute
  -> narrative generate
  -> attestation sign
  -> x402 verify
  -> chain tx
```

## Runbook

### API down

1. Check readiness endpoint.
2. Check DB connection.
3. Check Redis connection.
4. Check recent deployment.
5. Roll back if needed.

### Scores not generating

1. Check consent status.
2. Check data-source parse status.
3. Check feature snapshot.
4. Check scoring worker logs.
5. Requeue `score.generate`.

### Paid endpoint always returns 402

1. Check payment header is present.
2. Check resource path matches payment resource.
3. Check payee/network/amount.
4. Check facilitator status.
5. Check replay table.

### Chain tx stuck

1. Check RPC status.
2. Check signer balance.
3. Check nonce lock.
4. Check pending tx age.
5. Replace tx or switch RPC.
6. Keep local state as `PUBLISH_PENDING`, not failed until confirmed.

### LLM fails

1. Return deterministic score and factor table.
2. Mark narrative unavailable.
3. Do not block score/attestation if tier does not require narrative.
4. Alert if failure rate exceeds threshold.

### Data privacy incident

1. Disable affected endpoint.
2. Rotate secrets if needed.
3. Freeze relevant audit logs.
4. Identify exposed data.
5. Notify compliance owner.
6. Prepare deletion/revocation if allowed.
