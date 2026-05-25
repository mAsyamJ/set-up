# Implementation Plan

## MVP scope locked for hackathon

- Smart contracts: deployable ERC-8004-style registries, role-gated writes, Foundry tests.
- Backend: Fastify API, deterministic scoring, x402-compatible paywall, mock chain events.
- Frontend: one-page borrower/lender demo with clear buttons matching demo script.
- Shared: score engine, typed schemas, hashing, fixtures.
- SDK: minimal lender client.

## Production hardening backlog

1. Replace minimal identity registry with audited ERC-8004 reference contracts.
2. Integrate official x402 middleware and facilitator.
3. Move state from memory to Postgres/Prisma.
4. Add OAuth/partner API ingestion adapters.
5. Add real signature scheme for attestation envelope.
6. Add OJK/PDP-compliant audit logging and data retention.
7. Add model validation pipeline against lender shadow-mode cohorts.
8. Add multi-validator quorum and dispute governance.
