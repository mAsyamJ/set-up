# ORCHESTRATOR.md — KreditAgent Engineering Plan

## Objective

Coordinate agents to deliver a demo-ready KreditAgent MVP: x402-gated scoring API, MSME pipeline, ERC-8004 attestation.

## Execution strategy

Build in vertical slices.

### Slice 1 — API skeleton + health
- Turbo monorepo builds
- API health + OpenAPI stub
- `pnpm typecheck` green

### Slice 2 — x402 payment gate
- Payment middleware on scoring endpoints
- Fail-closed without valid x402 proof
- Reference: OpenSrc `x402` path

### Slice 3 — MSME scoring pipeline
- Ingestion → score → response shape
- Unit tests for scoring invariants

### Slice 4 — ERC-8004 + attestation
- Agent identity check before write
- Chain worker / indexer stub or devnet deploy

### Slice 5 — Frontend demo
- MSME dashboard flow
- Payment + score result UX

## Verify commands

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm demo:api
pnpm demo:web
```

## Kanban

Board `kreditagent-hackathon` — workspace is absolute path to this project root.
