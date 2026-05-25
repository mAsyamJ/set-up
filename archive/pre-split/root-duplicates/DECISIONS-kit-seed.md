# DECISIONS.md

Record all architectural decisions here.

## Decision format

```md
## YYYY-MM-DD — Decision title

Context:
Decision:
Reason:
Alternatives:
Impact:
Owner:
```

## Initial decisions

### Aegis is a wrapped RPC for MVP

Context: Full RPC node infra is too large for hackathon.
Decision: Build `/api/rpc` wrapper with passthrough and transaction screening.
Impact: Faster demo, credible IaaS roadmap later.

### AI does not enforce

Context: AI hallucination can create safety risk.
Decision: Deterministic policy decides SAFE/WARN/BLOCK; AI explains.
Impact: Safer and judge-friendly.

### Chainlink is an adapter

Context: Chainlink has usable live feed data.
Decision: Use `ChainlinkPriceAdapter` as first adapter, not core product.
Impact: Product remains extensible.
