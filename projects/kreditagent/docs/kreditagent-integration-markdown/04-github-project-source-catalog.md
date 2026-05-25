# 04 — GitHub Project Source Catalog

Clone these repos into an `external/` folder and study them. Do not blindly merge all code into the app.

## Tier 0 — Canonical sources

### x402 official protocol repo

```bash
git clone https://github.com/x402-foundation/x402.git external/x402
```

### ERC-8004 official contracts

```bash
git clone https://github.com/erc-8004/erc-8004-contracts.git external/erc-8004-contracts
```

## Tier 1 — Highest-value combined x402 + ERC-8004 references

### OnChainMee x402 + ERC-8004 agent

```bash
git clone https://github.com/OnChainMee/x402-erc8004-agent.git external/onchainmee-x402-erc8004-agent
```

### 0xGasless Agent SDK

```bash
git clone https://github.com/0xgasless/agent-sdk.git external/0xgasless-agent-sdk
```

### ChaosChain x402

```bash
git clone https://github.com/ChaosChain/chaoschain-x402.git external/chaoschain-x402
```

## Tier 2 — ERC-8004 agent scaffolds and ecosystem

```bash
git clone https://github.com/sudeepb02/awesome-erc8004.git external/awesome-erc8004
git clone https://github.com/Eversmile12/create-8004-agent.git external/create-8004-agent
git clone https://github.com/nuwa-protocol/nuwa-8004.git external/nuwa-8004
git clone https://github.com/celo-org/agent-skills.git external/celo-agent-skills
```

## Tier 3 — x402 infrastructure, tools, and clients

```bash
git clone https://github.com/second-state/x402-facilitator.git external/second-state-x402-facilitator
git clone https://github.com/second-state/x402-skill.git external/second-state-x402-skill
git clone https://github.com/0xkoda/x402-wallet.git external/x402-wallet
git clone https://github.com/xpaysh/x402-agent-kit.git external/x402-agent-kit
git clone https://github.com/t54-labs/x402-secure.git external/x402-secure
git clone https://github.com/primev/mainnet-x402-facilitator.git external/mainnet-x402-facilitator
```

## Tier 4 — Agent frameworks and app examples

```bash
git clone https://github.com/AgentlyHQ/aixyz.git external/aixyz
git clone https://github.com/panditdhamdhere/x402-erc8004-agent.git external/pandit-x402-erc8004-agent
git clone https://github.com/ChaosChain/chaoschain-sdk-ts.git external/chaoschain-sdk-ts
git clone https://github.com/cobotgg/cobotsdk.git external/cobotsdk
git clone https://github.com/up2itnow0822/agentwallet-sdk.git external/agentwallet-sdk
```

## Tier 5 — Example apps / lower-confidence references

```bash
git clone https://github.com/chaalpritam/x402-resource.git external/x402-resource
git clone https://github.com/smartcontractkit/x402-cre-price-alerts.git external/x402-cre-price-alerts
git clone https://github.com/hetu-project/FLUX-Mining-8004-x402.git external/flux-mining-8004-x402
git clone https://github.com/Stable402/x402-worker-middleware.git external/x402-worker-middleware
```

## KreditAgent shortlist

```bash
git clone https://github.com/x402-foundation/x402.git external/x402
git clone https://github.com/erc-8004/erc-8004-contracts.git external/erc-8004-contracts
git clone https://github.com/OnChainMee/x402-erc8004-agent.git external/onchainmee-x402-erc8004-agent
git clone https://github.com/0xgasless/agent-sdk.git external/0xgasless-agent-sdk
git clone https://github.com/ChaosChain/chaoschain-x402.git external/chaoschain-x402
```

## This monorepo (not `external/`)

This repo already contains the KreditAgent Foundry contracts under [`contracts/`](../../contracts). For contract names, deploy script, and integration mapping start with [07 — Monorepo on-chain surface](07-monorepo-onchain-surface.md) and [`docs/currentSmartContract.md`](../currentSmartContract.md). The clones above are reference material for study and comparison.
