# Aegis RPC Agentic Workspace Index

This workspace is the development operating system for building **Aegis RPC** in a 24-hour hackathon with agentic coding tools.

## Core product truth

Aegis RPC is a programmable pre-broadcast transaction screening gateway.

It wraps an underlying RPC provider, passes through read-only JSON-RPC calls, intercepts transaction calls, decodes intent, evaluates deterministic policy, collects adapter signals, optionally uses AI to explain suspicious context, and returns `SAFE`, `WARN`, or `BLOCK` before broadcast.

## Non-negotiables

- Aegis RPC is the product.
- Chainlink is only the first real-data adapter.
- AI explains and assists. Deterministic policy decides.
- The dashboard is the OpsRisk proof surface, not the whole product.
- Build a reliable 24-hour demo before adding broad platform features.
- Base Sepolia is the hackathon chain.
- Vercel is the hackathon deployment target.
- Smart contracts prove policy auditability, but the RPC engine remains off-chain.

## How to use this workspace

1. Start with root `AGENTS.md` (kit), `agents/AGENTS.md` (product), `ORCHESTRATOR.md`, and `DECISIONS.md`.
2. Use `docs/` for product specifications; `docs/kit/` for Hermes/Kiro playbooks.
3. Use `agents/` for role-specific coding prompts (`agents/AGENTS.md` = product contract).
4. Use `tasks/` for sequenced implementation.
5. Use `.skills/` for custom Aegis skills; `vendor/skills/` for external bundles.
6. Use `runtime/` and `tools/` for Hermes/Kiro local runtime setup.
7. Use `templates/` for file templates and prompts.
8. Use `checklists/` before demo or deployment.

## Recommended build order

```text
Phase 0: Repo setup
Phase 1: /api/rpc passthrough
Phase 2: /api/preflight + TxIntent
Phase 3: Policy engine
Phase 4: Adapters
Phase 5: Audit log
Phase 6: Dashboard
Phase 7: Smart contracts
Phase 8: AI memo layer
Phase 9: Tests
Phase 10: Vercel + Base Sepolia deployment
Phase 11: Demo polish
```

## Workspace structure

```text
aegis_rpc_agentic_workspace/
├── AGENTS.md
├── ORCHESTRATOR.md
├── DECISIONS.md
├── README.md
├── WORKSPACE_INDEX.md
├── docs/
├── agents/
├── skills/
├── tasks/
├── runtime/
├── templates/
├── checklists/
└── prompts/
```
