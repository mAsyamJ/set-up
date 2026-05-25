# KreditAgent Hackathon Monorepo

> Reputation-collateralized lending for Indonesia's underbanked MSMEs, powered by ERC-8004-style trustless agents and x402-compatible payment rails.

This repo is a full hackathon scaffold for the BlockDevId × ForU AI Real World AI Agents Hackathon. It is intentionally built as a **high-fidelity prototype** rather than a production lending platform.

## What this proves

KreditAgent demonstrates the full trust/payment loop:

1. Borrower links sample QRIS + e-commerce data.
2. Deterministic scoring engine computes a borrower score.
3. LLM-safe narrative explains the deterministic factors.
4. Attestation hash is anchored in ERC-8004-style registries.
5. LenderAgent requests an audit-grade attestation.
6. API returns HTTP `402 Payment Required` in x402-compatible shape.
7. LenderAgent pays through mock/live x402 mode and receives signed attestation.
8. Repayment event updates on-chain reputation.

## Monorepo layout

```text
kreditagent-hackathon/
├── apps/
│   ├── api/                 # Fastify API, x402 middleware, scoring routes
│   └── web/                 # Next.js borrower/lender demo UI
├── contracts/               # Solidity contracts + Foundry tests/scripts
├── packages/
│   ├── shared/              # Scoring, schemas, hashing, fixtures
│   └── sdk/                 # TypeScript client SDK for lenders/agents
├── data/samples/            # QRIS + marketplace CSV fixtures
├── docs/                    # Architecture, demo, audit and product docs
└── scripts/                 # Local demo helpers
```

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open:

- Web UI: http://localhost:3000
- API: http://localhost:4000/health

## Contracts

Canonical contract inventory and deploy wiring: [docs/currentSmartContract.md](docs/currentSmartContract.md). Detailed spec: [contracts/docs/DEPLOYMENT_RUNBOOK.md](contracts/docs/DEPLOYMENT_RUNBOOK.md).

```bash
cd contracts
forge build
forge test
forge script script/DeployKreditProtocol.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast
```

## Demo mode

The default demo runs with:

- local in-memory API store;
- deterministic scoring;
- mock x402 payment validation;
- optional chain writes if contract env vars are configured.

Set `X402_MOCK_MODE=false` only after integrating a real x402 facilitator and funded test wallet.

## Safety stance

KreditAgent does **not** issue loans, approve credit, custody deposits, or provide financial advice. Licensed lenders remain the decision makers. The LLM only generates explanations from deterministic factors and cannot alter score, payee, wallet, or decision state.

## Hackathon pitch line

> KreditAgent turns every QRIS payment and every e-commerce order into a portable, auditable credit reputation that licensed lenders can underwrite against in seconds.
