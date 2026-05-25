# KreditAgent x402 + ERC-8004 + ForU AI Integration Source Pack

This folder is a repo-ready markdown source pack for KreditAgent's hackathon integration layer.

KreditAgent stack mapping:

- **x402 + Base**: paid API rail for lender attestation access.
- **ERC-8004**: agent identity, trust, reputation, and validation registry layer.
- **ForU AI AI-DID / Identifi**: user-facing identity and reputation binding.
- **KreditAgent custom contracts/API**: consent, score attestation, validation, dispute, x402 receipt anchoring.

## Files

```text
.
├── README.md
├── 01-x402-base-docs-and-integration.md
├── 02-erc8004-docs-and-integration.md
├── 03-foru-ai-ai-did-identifi-integration.md
├── 04-github-project-source-catalog.md
├── 05-kreditagent-integration-architecture.md
├── 06-clone-and-study-runbook.md
├── 07-monorepo-onchain-surface.md
└── kreditAgent/
    └── Deep integration maps (runbook §2–§7 external clones → [`docs/currentSmartContract.md`](../currentSmartContract.md)): see [kreditAgent/README.md](kreditAgent/README.md)
```

**Working inside this monorepo:** start with [07 — Monorepo on-chain surface](07-monorepo-onchain-surface.md) and [docs/currentSmartContract.md](../currentSmartContract.md) before cloning `external/` references. For runbook §2–§7 clone-to-contract mapping, use [kreditAgent/INNOVATION_MAP_X402_ERC8004.md](kreditAgent/INNOVATION_MAP_X402_ERC8004.md), [kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION3.md](kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION3.md), [kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION4.md](kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION4.md), [kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION5.md](kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION5.md), [kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION6.md](kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION6.md), and [kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION7.md](kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION7.md).

## Fastest hackathon stack

```bash
git clone https://github.com/x402-foundation/x402.git external/x402
git clone https://github.com/erc-8004/erc-8004-contracts.git external/erc-8004-contracts
git clone https://github.com/OnChainMee/x402-erc8004-agent.git external/onchainmee-x402-erc8004-agent
git clone https://github.com/0xgasless/agent-sdk.git external/0xgasless-agent-sdk
git clone https://github.com/ChaosChain/chaoschain-x402.git external/chaoschain-x402
```

Then build KreditAgent around ERC-8004 agent registration, `agentURI` metadata, x402-gated `/v1/attestations/:id/audit`, signed credit attestations, validation/reputation events, and ForU AI-DID binding as a mocked field until official developer API access is available.
