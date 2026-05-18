# Policy Engine

## Description

Evaluate deterministic JSON policies and produce SAFE/WARN/BLOCK.

## When to use

Use for policy schema, verdict engine, and policy templates.

## When not to use

- Do not broaden scope outside the 24-hour demo.
- Do not make product claims that are not implemented.
- Do not use for secrets, private keys, or production credentials.

## Owner agent

Policy Engine Agent

## Inputs

- Current task file from `tasks/`
- Relevant architecture doc from `docs/`
- `AGENTS.md`
- `ORCHESTRATOR.md`
- `DECISIONS.md`

## Outputs

- Implementation plan or code changes
- Commands run
- Tests performed
- Demo impact
- Known limitations
- Next action

## Files owned

- apps/web/lib/engine/policyEngine.ts
- apps/web/lib/engine/verdictEngine.ts
- apps/web/lib/policies/

## Dependencies

preflight-decoder adapter-layer

## Aegis rules

- Aegis RPC is the product.
- Chainlink is only an adapter.
- AI explains and assists. Deterministic policy decides.
- Every `BLOCK` needs a `reasonCode`.
- Every adapter returns a structured `AdapterSignal`.
- Every decision creates an audit event.
- Prefer reliable demo slices over broad platform claims.

## Acceptance criteria

- Supports at least one demo flow.
- Has a deterministic verification command.
- Does not require mainnet funds.
- Does not expose secrets.
- Can be explained to judges in one sentence.

## Failure fallback

If blocked for more than 45 minutes:
1. Stop.
2. Reduce to the smallest demo-compatible implementation.
3. Document the limitation.
4. Ask the Orchestrator to cut or defer stretch work.

