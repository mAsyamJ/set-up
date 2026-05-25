# 06 — Clone and Study Runbook

## 1. Create external source folder

```bash
mkdir -p external
```

## 2. Clone canonical sources

```bash
git clone https://github.com/x402-foundation/x402.git external/x402
git clone https://github.com/erc-8004/erc-8004-contracts.git external/erc-8004-contracts
```

## 3. Clone the three repos you explicitly requested

```bash
git clone https://github.com/0xgasless/agent-sdk.git external/0xgasless-agent-sdk
git clone https://github.com/ChaosChain/chaoschain-x402.git external/chaoschain-x402
git clone https://github.com/erc-8004/erc-8004-contracts.git external/erc-8004-contracts
```

If `external/erc-8004-contracts` already exists, skip the duplicate clone.

**Integration map for this section:** [kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION3.md](kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION3.md).

## 4. Clone best combined x402 + ERC-8004 references

```bash
git clone https://github.com/OnChainMee/x402-erc8004-agent.git external/onchainmee-x402-erc8004-agent
git clone https://github.com/panditdhamdhere/x402-erc8004-agent.git external/pandit-x402-erc8004-agent
git clone https://github.com/Eversmile12/create-8004-agent.git external/create-8004-agent
git clone https://github.com/nuwa-protocol/nuwa-8004.git external/nuwa-8004
```

**Integration map for this section:** [kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION4.md](kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION4.md).

## 5. Clone x402 tooling

```bash
git clone https://github.com/second-state/x402-facilitator.git external/second-state-x402-facilitator
git clone https://github.com/second-state/x402-skill.git external/second-state-x402-skill
git clone https://github.com/0xkoda/x402-wallet.git external/x402-wallet
git clone https://github.com/xpaysh/x402-agent-kit.git external/x402-agent-kit
git clone https://github.com/t54-labs/x402-secure.git external/x402-secure
git clone https://github.com/primev/mainnet-x402-facilitator.git external/mainnet-x402-facilitator
```

**Integration map for this section:** [kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION5.md](kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION5.md).

## 6. Clone ecosystem references

```bash
git clone https://github.com/sudeepb02/awesome-erc8004.git external/awesome-erc8004
git clone https://github.com/celo-org/agent-skills.git external/celo-agent-skills
git clone https://github.com/AgentlyHQ/aixyz.git external/aixyz
git clone https://github.com/ChaosChain/chaoschain-sdk-ts.git external/chaoschain-sdk-ts
git clone https://github.com/cobotgg/cobotsdk.git external/cobotsdk
git clone https://github.com/up2itnow0822/agentwallet-sdk.git external/agentwallet-sdk
```

**Integration map for this section:** [kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION6.md](kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION6.md).

## 7. Clone lower-confidence example apps

```bash
git clone https://github.com/chaalpritam/x402-resource.git external/x402-resource
git clone https://github.com/smartcontractkit/x402-cre-price-alerts.git external/x402-cre-price-alerts
git clone https://github.com/hetu-project/FLUX-Mining-8004-x402.git external/flux-mining-8004-x402
git clone https://github.com/Stable402/x402-worker-middleware.git external/x402-worker-middleware
```

**Integration map for this section:** [kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION7.md](kreditAgent/INNOVATION_MAP_RUNBOOK_SECTION7.md).

## 8. Suggested reading order

When hacking **in this monorepo**, read first:

1. [07 — Monorepo on-chain surface](07-monorepo-onchain-surface.md)
2. [`docs/currentSmartContract.md`](../currentSmartContract.md)
3. [`contracts/docs/DEPLOYMENT_RUNBOOK.md`](../../contracts/docs/DEPLOYMENT_RUNBOOK.md)

Then optional external references:

1. `external/x402`
2. `external/erc-8004-contracts`
3. `external/onchainmee-x402-erc8004-agent`
4. `external/0xgasless-agent-sdk`
5. `external/chaoschain-x402`
6. `external/second-state-x402-skill`
7. `external/nuwa-8004`
8. `external/create-8004-agent`

## 9. What to avoid

- Do not commit `external/` into your main repo unless needed.
- Do not paste private keys into examples.
- Do not use abandoned/deprecated repos as direct dependencies.
- Do not mix chains accidentally: Base Sepolia is `84532`; Avalanche Fuji is `43113`; Ethereum Sepolia is `11155111`.
- Do not claim official ForU API support until you have an official API reference or partner access.
