# Security Review

## Critical invariants

1. No score attestation can be issued without active borrower consent.
2. Consent can only be granted or revoked by the borrower agent controller.
3. Score issuer must be a role-approved issuer agent and caller must control that agent.
4. Validation cannot be submitted by issuer-owned validators or by the requester agent.
5. x402 payment receipt hashes cannot be replayed.
6. Negative reputation events are disputeable by the borrower agent.
7. Pausing blocks sensitive writes: consent, score, validation, reputation, and payment receipt flows.
8. Agent wallet delegation is cleared on agent identity transfer.
9. Raw personal data must never be passed as on-chain strings.

## Known non-goals

- No ERC-20 custody.
- No lending pool.
- No loan approval logic.
- No on-chain interest-rate calculation.
- No oracle reads for financial prices.
- No storage of raw personal data.

## Threat model

| Threat | Mitigation |
|---|---|
| Fake borrower data | Off-chain source verification, evidence hashes, validator recomputation. |
| Issuer publishes score after revocation | `KreditScoreRegistry` checks consent active at issuance. |
| Old score used after consent revoke | `isAttestationUsable` checks current consent status. |
| Validator self-attests | `KreditValidationRegistry` blocks issuer/requester/same-owner validator submissions. |
| Lender posts false default | Borrower dispute lifecycle and resolver role. |
| x402 replay | receipt hash + resource/payer/payee replay guard. |
| Agent transfer stale wallet | identity transfer clears agent wallet. |
| Emergency incident | guardian pause. |

## Audit recommendations before production

- Replace self-contained ERC-721-like identity with official ERC-8004/OpenZeppelin ERC721URIStorage implementation or externally audit this registry.
- Add EIP-712 signature verification for agent wallet changes if agent wallet will differ from owner frequently.
- Add timelock/multisig owner for `KreditAccessController`.
- Add dedicated subgraph/indexer and event reconciliation tests.
- Decide whether exact score should be on-chain in production or whether only score band/commitment should be stored.
- Run Slither, Mythril/Medusa, Echidna, and Foundry invariant tests.

## Severity assessment of current package

This package is suitable for hackathon, testnet deployment, and early sandbox technical review. It is not yet suitable for production mainnet value-bearing deployment without external audit, real x402 integration review, legal review, and production key management.
