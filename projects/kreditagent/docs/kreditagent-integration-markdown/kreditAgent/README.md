# kreditAgent — integration deep dives

Curated docs that connect **external canonical sources** (x402, ERC-8004 reference contracts) to **this monorepo’s** on-chain and API surfaces.

| Doc | Purpose |
|-----|---------|
| [INNOVATION_MAP_X402_ERC8004.md](INNOVATION_MAP_X402_ERC8004.md) | Map `external/x402` + `erc-8004-contracts` (runbook **§2**) to [`docs/currentSmartContract.md`](../../currentSmartContract.md); demand matrix; roadmap. |
| [INNOVATION_MAP_RUNBOOK_SECTION3.md](INNOVATION_MAP_RUNBOOK_SECTION3.md) | Map runbook **§3** clones (`0xgasless-agent-sdk`, `chaoschain-x402`, duplicate `erc-8004-contracts` pointer) to KreditAgent API + contracts. |
| [INNOVATION_MAP_RUNBOOK_SECTION4.md](INNOVATION_MAP_RUNBOOK_SECTION4.md) | Map runbook **§4** combined x402 + ERC-8004 **example repos** (OnChainMee, pandit, create-8004-agent, nuwa) to KreditAgent patterns. |
| [INNOVATION_MAP_RUNBOOK_SECTION5.md](INNOVATION_MAP_RUNBOOK_SECTION5.md) | Map runbook **§5** x402 **tooling** (Second State facilitator/skill, wallet, agent kit, x402-secure, mainnet facilitator) to KreditAgent API + contracts. |
| [INNOVATION_MAP_RUNBOOK_SECTION6.md](INNOVATION_MAP_RUNBOOK_SECTION6.md) | Map runbook **§6** **ecosystem references** (awesome-erc8004, Celo agent-skills, aixyz, chaoschain-sdk-ts, cobotsdk, agentwallet-sdk) to KreditAgent patterns. |
| [INNOVATION_MAP_RUNBOOK_SECTION7.md](INNOVATION_MAP_RUNBOOK_SECTION7.md) | Map runbook **§7** **lower-confidence** examples (x402-resource, CRE price alerts, FLUX mining demo, worker middleware); spike-only, strong caveats. |
| [07-monorepo-onchain-surface.md](07-monorepo-onchain-surface.md) | Concept → Solidity contract table (may mirror parent [07](../07-monorepo-onchain-surface.md)). |
| [05-kreditagent-integration-architecture.md](05-kreditagent-integration-architecture.md) | Target architecture diagram and judge checklist (may mirror parent [05](../05-kreditagent-integration-architecture.md)). |

**Runbook (clone order):** [06 — Clone and study runbook](../06-clone-and-study-runbook.md) **§2** (`x402`, `erc-8004-contracts`), **§3** (`0xgasless-agent-sdk`, `chaoschain-x402`; skip duplicate `erc-8004-contracts` if already cloned), **§4** (combined reference apps: onchainmee, pandit, create-8004-agent, nuwa), **§5** (x402 tooling: facilitators, skill, wallet, agent kit, secure, mainnet facilitator), **§6** (ecosystem references: awesome list, Celo skills, aixyz, ChaosChain SDK-TS, cobotsdk, agentwallet-sdk), **§7** (lower-confidence demos: x402-resource, CRE price alerts, FLUX mining, worker middleware).

**Canonical contract list:** [`docs/currentSmartContract.md`](../../currentSmartContract.md).
