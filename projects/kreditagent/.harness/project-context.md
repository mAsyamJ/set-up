# KreditAgent — Project Context

## Product

KreditAgent is an MSME credit-scoring platform combining:

- **x402 micropayment loop** — pay-per-API access for scoring and attestation endpoints
- **ERC-8004 agent identity** — on-chain agent registry and reputation for credit agents
- **MSME scoring pipeline** — ingestion → scoring → attestation → chain worker/indexer

## Monorepo layout

| Path | Role |
|------|------|
| `apps/` | Web and API applications |
| `packages/` | Shared libraries |
| `contracts/` | Solidity (`script/DeployKreditProtocol.s.sol`) |
| `docs/` | Specs, runbooks, integration markdown |

Canonical on-chain snapshot: `docs/currentSmartContract.md`.

## External reference repos (OpenSrc — not vendored)

The original `external/` study repos are **not** copied into this tree. Agents read them via OpenSrc paths:

```bash
bash ../../scripts/kreditagent-opensrc-cache.sh   # from project root
ls .harness/research/opensrc-paths/*.path
```

Key packages: `x402`, `erc-8004-contracts`, `agentwallet-sdk`, x402 facilitators.

OpenSrc paths are reference-only — **not indexed into RAG by default**.

## Invariants

1. Deploy from `contracts/` with `DeployKreditProtocol.s.sol`, not legacy scripts.
2. x402 payment gates must fail closed (no free scoring without valid payment proof).
3. ERC-8004 identity checks precede attestation writes.
4. Never log private keys, seed phrases, or full PII payloads.
5. Integration study material lives under `docs/kreditagent-integration-markdown/`.

## Verification

```bash
pnpm install
pnpm typecheck
pnpm test
```

## Kanban

- Board: `kreditagent-hackathon`
- Workspace: absolute path to this directory
