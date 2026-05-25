# 07 — Monorepo on-chain surface (this repo)

This document maps the **integration pack** concepts (x402, ERC-8004, ForU) to the **concrete Foundry contracts** shipped in this monorepo under [`contracts/`](../../contracts/).

## Map: integration diagram to Solidity

| Concept in 01–05 | Monorepo contract | Source |
|---|---|---|
| ERC-8004-style Identity / `agentId` | `KreditAgentIdentityRegistry` | [`contracts/src/KreditAgentIdentityRegistry.sol`](../../contracts/src/KreditAgentIdentityRegistry.sol) |
| Protocol pause, owner, agent/account roles | `KreditAccessController` | [`contracts/src/KreditAccessController.sol`](../../contracts/src/KreditAccessController.sol) |
| Borrower consent receipts | `KreditConsentRegistry` | [`contracts/src/KreditConsentRegistry.sol`](../../contracts/src/KreditConsentRegistry.sol) |
| Score attestation anchoring (consent-gated) | `KreditScoreRegistry` | [`contracts/src/KreditScoreRegistry.sol`](../../contracts/src/KreditScoreRegistry.sol) |
| Independent validation quorum workflow | `KreditValidationRegistry` | [`contracts/src/KreditValidationRegistry.sol`](../../contracts/src/KreditValidationRegistry.sol) |
| Repayment/default/dispute reputation | `KreditReputationRegistry` | [`contracts/src/KreditReputationRegistry.sol`](../../contracts/src/KreditReputationRegistry.sol) |
| x402/API payment receipt anchoring | `KreditPaymentReceiptRegistry` | [`contracts/src/KreditPaymentReceiptRegistry.sol`](../../contracts/src/KreditPaymentReceiptRegistry.sol) |
| One-shot deploy | `KreditProtocolDeployer` | [`contracts/src/KreditProtocolDeployer.sol`](../../contracts/src/KreditProtocolDeployer.sol) |

Off-chain in this monorepo (not Solidity): **x402 middleware** in [`apps/api`](../../apps/api), **Borrower/Lender UI** in [`apps/web`](../../apps/web). The API implements `402` and signed payloads; the payment receipt hash is what you anchor with `KreditPaymentReceiptRegistry`.

## CAIP registry references

Use the **deployed** identity contract address in `agentURI` / integration metadata, for example:

`eip155:11155111:<KreditAgentIdentityRegistry address>`

Replace with `84532` for Base Sepolia when you deploy there. Canonical inventory: [`docs/currentSmartContract.md`](../../docs/currentSmartContract.md).

## Role wiring (ERC-8004 agents ↔ `KreditRoles`)

| Agent (docs) | On-chain | Role bytes32 (see `KreditRoles`) |
|---|---|---|
| KreditAgent (issuer/scoring) | issuer `agentId` | `ISSUER_AGENT_ROLE` |
| LenderAgent | lender `agentId` | `LENDER_AGENT_ROLE` |
| ValidatorAgent | validator `agentId` | `VALIDATOR_AGENT_ROLE` |
| Optional regulator viewer | agent `agentId` | `REGULATOR_VIEWER_AGENT_ROLE` |

Borrower agents do not receive a privileged issuer/lender/validator role; they control consent and disputes via `KreditAgentIdentityRegistry` ownership / controller checks.

## Deploy and verify (from repo root)

```bash
cd contracts
forge install foundry-rs/forge-std
forge build
forge test
forge coverage --ir-minimum --report summary
```

Broadcast deploy: [`contracts/docs/DEPLOYMENT_RUNBOOK.md`](../../contracts/docs/DEPLOYMENT_RUNBOOK.md) and script [`contracts/script/DeployKreditProtocol.s.sol`](../../contracts/script/DeployKreditProtocol.s.sol).

## Relationship to external clones (06)

The runbook in [`06-clone-and-study-runbook.md`](06-clone-and-study-runbook.md) is for **reference repos** under `external/`. This monorepo already implements the KreditAgent-specific registries; you can compare behavior to `erc-8004-contracts` without replacing the hackathon suite unless you choose to after an audit.
