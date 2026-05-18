# OpenSrc Package Research

## Description

Use opensrc.sh to inspect real package source for viem, Next, Zod, Supabase, and UI dependencies.

## When to use

Use when implementation details require source-level package understanding.

## When not to use

- Do not broaden scope outside the 24-hour demo.
- Do not make product claims that are not implemented.
- Do not use for secrets, private keys, or production credentials.

## Owner agent

Research Agent

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

- docs/16-package-source-research.md

## Dependencies

None

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

