# KreditAgent Production Smart Contracts

Production-grade ERC-8004-aligned smart contract system for KreditAgent: borrower-owned MSME credit reputation, consent-gated score attestations, independent validation, disputeable reputation, and x402 receipt anchoring.

## Design goals

- ERC-8004-compatible agent identity: ERC-721-like `agentId`, `agentURI`, transferable ownership, and agent wallet binding.
- Strong separation of concerns: identity, access, consent, scoring, validation, reputation, and payment receipts are separate contracts.
- No lending custody: contracts anchor evidence, consent, validation, reputation, and paid-attestation receipts. They do **not** issue loans or hold borrower funds.
- Privacy-by-design: no raw QRIS, marketplace order, phone number, address, borrower name, or lender decision memo is stored on-chain.
- Hackathon-ready and production-shaped: all flows can run on Sepolia/Base Sepolia, while governance and validator controls are designed for a later OJK sandbox/pilot.

## Contracts

| Contract | Purpose |
|---|---|
| `KreditAgentIdentityRegistry` | ERC-8004-style agent identity registry with NFT-like ownership and agent URI. |
| `KreditAccessController` | Protocol owner, guardian pause, account roles, and agent roles. |
| `KreditConsentRegistry` | Borrower-controlled, revocable, expiring consent receipts. |
| `KreditScoreRegistry` | Consent-gated credit attestation publication. |
| `KreditValidationRegistry` | Independent validator workflow with quorum and self-validation prevention. |
| `KreditReputationRegistry` | Repayment/default/feedback reputation events with dispute lifecycle. |
| `KreditPaymentReceiptRegistry` | x402/API payment receipt anchoring and replay protection. |
| `KreditProtocolDeployer` | Deploys the complete protocol suite in deterministic order. |

## Install and test

`lib/` is gitignored; install dependencies once:

```bash
forge install foundry-rs/forge-std
forge build
forge test -vvv
```

Coverage (uses `viaIR` workaround so solc can instrument `KreditScoreRegistry`):

```bash
forge coverage --ir-minimum --report summary
```

[`script/DeployKreditProtocol.s.sol`](script/DeployKreditProtocol.s.sol) usually shows **0%** in that report: Foundry instruments `src/` tests against compiled sources, and broadcast scripts that write JSON and depend on `vm` cheats are not exercised the same way as unit tests. Prefer [`KreditProtocolDeployer`](src/KreditProtocolDeployer.sol) tests and manual `forge script … --dry-run` / testnet smoke for the script path.

## Deploy

```bash
forge script script/DeployKreditProtocol.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify
```

## Protocol warning

This package is infrastructure for credit attestations. It does not provide lending, custody, deposits, matching, or consumer credit decisioning. Partner lenders remain responsible for KYC, AML/CFT, credit approval, disbursement, collections, consumer protection, and local licensing.
