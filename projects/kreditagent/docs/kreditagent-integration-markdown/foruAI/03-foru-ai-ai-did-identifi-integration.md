# 03 — ForU AI AI-DID / Identifi Integration

## What ForU does for KreditAgent

ForU AI is the user-facing identity and reputation layer. KreditAgent should use ForU AI-DID / Identifi as the borrower identity and reputation surface, while keeping raw credit evidence inside KreditAgent or lender/partner systems.

## Public docs and sources

| Source | URL | Use |
|---|---|---|
| ForU AI official site | https://foruai.io/ | Product positioning |
| ForU AI GitBook / V3 whitepaper | https://foru-ai.gitbook.io/foru-ai | Trust/reputation concept |
| ForU AI Google Play | https://play.google.com/store/apps/details?id=ai.untukmu.mobile | AI-DID wording |
| ForU AI Chrome extension | https://chromewebstore.google.com/detail/foru-ai/goooklbnaabepobkohfjlpkgoggcnafo | Identifi profile surface |

## Important limitation

I did not find a clean public developer API reference for creating or reading ForU AI-DID / Identifi Score programmatically. For the hackathon, implement a mocked integration and label it honestly:

```text
ForU AI-DID binding mocked for hackathon. Replace with official ForU API when available.
```

## KreditAgent integration model

| Layer | Implementation |
|---|---|
| Borrower profile | `foruDid: "did:foru:..."` field |
| BorrowerAgent | ERC-8004 `agentURI` includes ForU DID |
| Identifi component | `business_credit_reliability` |
| Data sent to ForU | score band, verification status, consent state, attestation URL |
| Data not sent to ForU by default | raw QRIS/e-commerce rows, personal phone/address, lender notes |

## Suggested Identifi component

```json
{
  "component": "business_credit_reliability",
  "version": "ka-identifi-v0.1",
  "status": "active",
  "scoreBand": "B",
  "validationConfidence": "validated_l1",
  "dataFreshnessDays": 7,
  "repaymentReputation": { "onTimeRepayments": 3, "lateRepayments": 0, "disputesOpen": 0 },
  "attestation": {
    "agentRegistry": "eip155:84532:0xIdentityRegistry",
    "borrowerAgentId": "42",
    "latestAttestationHash": "0x..."
  }
}
```

## Production questions to ask ForU AI

- Is there an API for AI-DID creation or DID resolution?
- Is there an API for writing Identifi Score components?
- Can third-party apps attach signed reputation modules?
- Can ForU store an ERC-8004 `agentRegistry + agentId` binding?
- How are user consent and revocation represented?

## This monorepo

KreditAgent implements consent, score attestations, and registry CAIP references in Solidity under [`contracts/src/`](../../contracts/src/). See [07 — Monorepo on-chain surface](07-monorepo-onchain-surface.md) and [`docs/currentSmartContract.md`](../currentSmartContract.md) for names and deploy artifacts; keep ForU fields in `agentURI` JSON as in [02](02-erc8004-docs-and-integration.md) until official APIs exist.
