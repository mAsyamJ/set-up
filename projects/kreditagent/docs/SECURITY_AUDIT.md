# Security and Audit Notes

## Critical controls implemented

- LLM cannot set score, payment destination, or loan decision.
- Scoring is deterministic and versioned.
- Raw data is not written on-chain.
- x402 mock payment is explicitly labelled and resource-bound.
- Contract role controls restrict attestation, validation, and reputation writes.
- Negative reputation events can be disputed in product design.

## Known hackathon limitations

- Contracts are ERC-8004-style minimal implementations, not audited reference deployments.
- x402 is mock-compatible by default unless real facilitator integration is configured.
- API uses in-memory storage by default; Postgres schema is included for productionization.
- The score is a transparent heuristic, not a validated credit-risk model.

## Pre-demo audit checklist

- No private keys committed.
- `.env` excluded.
- Demo data is synthetic.
- Contracts deploy to testnet only.
- Payment rail is labelled test/mock unless real facilitator is used.
- UI clearly states lender owns final credit decision.
