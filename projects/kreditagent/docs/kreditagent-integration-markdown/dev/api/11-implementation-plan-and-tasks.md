# 11 — Implementation Plan and Tasks

## Build order

The backend should be implemented in vertical slices, not by building every module skeleton first.

## Phase 0 — Project foundation

- [ ] Create `apps/api` Fastify TypeScript app.
- [ ] Add `packages/shared` schemas and hashing utilities.
- [ ] Add Prisma + Postgres.
- [ ] Add Redis + BullMQ.
- [ ] Add Pino logger with request IDs.
- [ ] Add OpenAPI generation.
- [ ] Add env validation.
- [ ] Add health/readiness routes.

## Phase 1 — Domain core

- [ ] Borrower create/read.
- [ ] Agent model and seeded demo agents.
- [ ] Consent grant/list/revoke.
- [ ] Upload raw files.
- [ ] Parse QRIS CSV.
- [ ] Parse marketplace CSV.
- [ ] Store normalized redacted records.
- [ ] Generate evidence hash.

Acceptance:

```bash
pnpm backend:test --filter consent
pnpm backend:test --filter ingestion
```

## Phase 2 — Score pipeline

- [ ] Feature builder.
- [ ] Deterministic scoring v0.2.
- [ ] Score expiry/versioning.
- [ ] Risk/positive factor output.
- [ ] Prompt-injection-like detector tests.
- [ ] Narrative service with deterministic fallback.
- [ ] Narrative output validator.

Acceptance:

```bash
pnpm backend:test --filter scoring
```

## Phase 3 — Attestation

- [ ] Attestation envelope.
- [ ] Signature service.
- [ ] Standard/audit/underwriter tiers.
- [ ] Attestation DB state machine.
- [ ] Chain-publish job interface.
- [ ] Public/private payload filtering.

Acceptance:

```bash
pnpm backend:test --filter attestations
```

## Phase 4 — x402 payment guard

- [ ] x402 terms builder.
- [ ] Payment middleware.
- [ ] Mock mode.
- [ ] Receipt storage.
- [ ] Replay protection.
- [ ] Resource binding.
- [ ] Paid attestation endpoint.

Acceptance:

```bash
pnpm backend:test --filter payments
```

## Phase 5 — ERC-8004 chain worker

- [ ] viem client.
- [ ] Contract address config.
- [ ] Register agent job.
- [ ] Publish attestation job.
- [ ] Reputation event job.
- [ ] Validation request/result jobs.
- [ ] Indexer/reconciler.
- [ ] Chain tx retry/backoff.

Acceptance:

```bash
pnpm backend:test --filter chain
```

## Phase 6 — Lender + validation workflow

- [ ] Lender model.
- [ ] Lender request state.
- [ ] Lender decision endpoint.
- [ ] Validation request endpoint.
- [ ] Validation result endpoint.
- [ ] Repayment event endpoint.
- [ ] Dispute endpoint.
- [ ] Protocol timeline endpoint.

Acceptance:

```bash
pnpm backend:test:workflow
```

## Phase 7 — ForU AI-DID integration

- [ ] ForU provider interface.
- [ ] Mock ForU provider.
- [ ] DID binding endpoint.
- [ ] Business credit reliability export endpoint.
- [ ] AgentURI ForU metadata generator.
- [ ] Revocation propagation.

Acceptance:

```bash
pnpm backend:test --filter foru
```

## Phase 8 — Production hardening

- [ ] Rate limits.
- [ ] API key hashing.
- [ ] Wallet signature verification.
- [ ] Admin guard.
- [ ] Audit log coverage.
- [ ] OpenTelemetry traces.
- [ ] Metrics endpoint.
- [ ] CI: lint, typecheck, test.
- [ ] Docker compose.
- [ ] Deployment runbook.

## Suggested scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:workflow": "tsx test/workflows/full-demo-flow.test.ts",
    "openapi:generate": "tsx src/openapi/generate.ts",
    "worker:chain": "tsx src/workers/chain.worker.ts",
    "worker:all": "tsx src/workers/index.ts",
    "demo:seed": "tsx scripts/seed-demo.ts",
    "demo:curl": "bash scripts/demo_curl.sh"
  }
}
```

## Minimal folder scaffold

```text
apps/api/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── server.ts
│   ├── app.ts
│   ├── env.ts
│   ├── plugins/
│   │   ├── db.ts
│   │   ├── logger.ts
│   │   ├── auth.ts
│   │   ├── openapi.ts
│   │   └── rate-limit.ts
│   ├── modules/
│   │   ├── borrowers/
│   │   ├── consents/
│   │   ├── ingestion/
│   │   ├── features/
│   │   ├── scoring/
│   │   ├── narratives/
│   │   ├── attestations/
│   │   ├── payments-x402/
│   │   ├── validators/
│   │   ├── lenders/
│   │   ├── reputation/
│   │   ├── chain/
│   │   ├── foru/
│   │   ├── audit/
│   │   └── admin/
│   ├── workers/
│   └── lib/
├── test/
│   ├── unit/
│   ├── integration/
│   └── workflows/
└── scripts/
```

## Demo acceptance criteria

The backend is hackathon-ready when:

- [ ] `pnpm dev` starts API.
- [ ] `pnpm db:seed` creates Bu Siti, lender, validator, issuer.
- [ ] `pnpm test:workflow` passes.
- [ ] unpaid audit endpoint returns `402`.
- [ ] mock paid audit endpoint returns signed attestation.
- [ ] chain worker can be toggled mock/live.
- [ ] protocol timeline returns full visible sequence.
- [ ] no route leaks raw data or secrets.
- [ ] frontend can consume all demo states.
