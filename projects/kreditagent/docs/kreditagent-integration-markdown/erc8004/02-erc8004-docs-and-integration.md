# 02 — ERC-8004 Docs and KreditAgent Integration

## What ERC-8004 does for KreditAgent

ERC-8004 is the trust layer. KreditAgent uses it to make agents discoverable and auditable across organizations.

| Agent | Purpose |
|---|---|
| `BorrowerAgent` | owns consent and portable reputation |
| `KreditAgent` | issuer/scoring agent |
| `LenderAgent` | pays for attestations and submits loan outcome feedback |
| `ValidatorAgent` | recomputes score/evidence and posts validation |
| `RegulatorViewerAgent` | optional read-only compliance identity |

## Primary docs

| Source | URL | Use |
|---|---|---|
| EIP-8004 official spec | https://eips.ethereum.org/EIPS/eip-8004 | Protocol source of truth |
| ERC-8004 contracts | https://github.com/erc-8004/erc-8004-contracts | Reference contracts |
| 8004.org build page | https://www.8004.org/build | Builder onboarding |
| Sperax ERC-8004 explainer | https://github.com/Sperax/erc8004-agents/blob/main/docs/what-is-erc8004.md | Human-readable explanation |
| Awesome ERC-8004 | https://github.com/sudeepb02/awesome-erc8004 | Ecosystem repo list |

## Clone official contracts

```bash
git clone https://github.com/erc-8004/erc-8004-contracts.git external/erc-8004-contracts
```

## KreditAgent mapping

| ERC-8004 primitive | KreditAgent implementation |
|---|---|
| Identity Registry | register `KreditAgent`, `BorrowerAgent`, `LenderAgent`, `ValidatorAgent` |
| `agentRegistry` | CAIP-style registry reference, e.g. `eip155:84532:0x...` |
| `agentId` | ERC-721 token ID for the agent |
| `agentURI` | JSON metadata with endpoint, x402 support, ForU DID binding |
| Reputation Registry | score issuance, repayment, late/default, disputes |
| Validation Registry | validator recomputation request/result |
| Off-chain payloads | consent receipt, score package, evidence summary, payment receipt |

## Recommended `agentURI`

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "KreditAgent Underwriting Agent",
  "description": "Deterministic MSME credit attestation agent for licensed Indonesian lenders.",
  "services": [
    { "name": "attestation-api", "endpoint": "https://api.kreditagent.id/v1/attestations" },
    { "name": "mcp", "endpoint": "https://api.kreditagent.id/mcp" },
    { "name": "a2a", "endpoint": "https://api.kreditagent.id/a2a" }
  ],
  "registrations": [{ "agentRegistry": "eip155:84532:0xIdentityRegistry", "agentId": "1" }],
  "supportedTrust": ["reputation", "validation", "audit-grade-credit-scoring"],
  "payments": { "x402": true, "network": "eip155:84532", "currency": "USDC" },
  "foru": { "aiDid": "did:foru:kreditagent", "identifiComponent": "business_credit_reliability" }
}
```

## Reputation event types

```text
score_issued
score_validated
attestation_paid
loan_decision_submitted
loan_disbursed
repayment_on_time
repayment_late
default_reported
dispute_opened
dispute_resolved
consent_revoked
```

## Production design decision

Use official ERC-8004 contracts for identity/reputation/validation when possible, or an audited reference implementation. **This monorepo** already ships a self-contained, ERC-8004-aligned suite under [`contracts/src/`](../../contracts/src/) (`KreditAgentIdentityRegistry`, consent, score, validation, reputation, payment receipts, access control). Mapping from integration concepts to those files: [07 — Monorepo on-chain surface](07-monorepo-onchain-surface.md).
