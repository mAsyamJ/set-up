# KreditAgent Backend Specification

> Production-shaped backend architecture and end-to-end workflow for KreditAgent: consented MSME data ingestion, deterministic credit scoring, x402 paid attestation access, ERC-8004 trust anchoring, ForU AI-DID binding, validation, disputes, and repayment reputation.

## Goal

The backend must prove that KreditAgent is not a chatbot and not a lending balance sheet. It is a trust pipeline:

```text
Borrower consent
  -> QRIS / e-commerce evidence ingestion
  -> feature extraction
  -> deterministic scoring
  -> bounded AI explanation
  -> signed attestation
  -> ERC-8004 identity / reputation / validation anchoring
  -> x402 paid lender access
  -> lender-owned decision
  -> repayment / dispute reputation update
```

## Backend principles

1. **Deterministic score first.** The LLM never calculates score, approves loans, prices loans, or alters risk state.
2. **Consent gates every data action.** No score, attestation, validation, lender access, or ForU reputation update without active consent.
3. **No raw personal data on-chain.** Store raw evidence encrypted off-chain; publish salted commitments and non-identifying state.
4. **x402 is a paid API boundary.** The attestation endpoint is the paid resource; payment receipts are bound to one resource and one lender agent.
5. **ERC-8004 is the trust anchor.** Agent identity, reputation events, and validator results must be discoverable and auditable.
6. **Lender decides.** KreditAgent provides verified decision support; licensed lenders own KYC, approval, disbursement, collections, and compliance.
7. **Every critical transition is auditable.** Persist request ID, actor, input hash, output hash, signature, and chain tx when available.

## Files

```text
docs/backend/
├── 01-backend-product-strategy.md
├── 02-service-architecture-and-boundaries.md
├── 03-domain-model-and-database-schema.md
├── 04-api-contracts-openapi.md
├── 05-ingestion-scoring-attestation-pipeline.md
├── 06-x402-payment-and-access-control.md
├── 07-erc8004-chain-worker-and-indexer.md
├── 08-foru-ai-did-identity-backend.md
├── 09-security-privacy-compliance.md
├── 10-testing-observability-runbook.md
├── 11-implementation-plan-and-tasks.md
└── SOURCE_NOTES.md
```

## Recommended backend stack

| Layer | Choice | Reason |
|---|---|---|
| HTTP API | Fastify + TypeScript | High-throughput, schema-friendly, plugin architecture. |
| Validation | Zod or TypeBox | Runtime validation plus shared frontend/backend schemas. |
| Database | PostgreSQL + Prisma | Strong relational model, migrations, type-safe app access. |
| Queue | Redis + BullMQ | Chain writes, ingestion jobs, validation jobs, retry/backoff. |
| Chain client | viem | Typed EVM calls, Base/Sepolia support. |
| Payment | x402 middleware | HTTP-native paid API access. |
| Logs | Pino | Structured logs with request IDs. |
| Tracing | OpenTelemetry | Trace API -> queue -> worker -> chain transaction. |
| Storage | S3-compatible encrypted bucket | Raw evidence, CSVs, JSON snapshots, signed bundles. |
| Secrets | Doppler/1Password/Vault/Cloud secrets | No private keys or API keys in frontend or repo. |

## Backend deliverables for hackathon

- Working REST API with OpenAPI docs.
- Seeded borrowers and synthetic QRIS/e-commerce data.
- Deterministic score generation.
- Signed attestation envelope.
- x402-style `402 Payment Required` flow and mock/live mode switch.
- ERC-8004 agent registration metadata and chain worker.
- Validation request/result lifecycle.
- Repayment simulator and dispute lifecycle.
- Admin/demo control endpoints.
- Test suite and demo curl script.
