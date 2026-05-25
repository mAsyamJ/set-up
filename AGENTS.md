# Agent Harness — Agent Workflow

Default workflow: **Hermes** as 24/7 orchestrator; **Cursor/Kiro** as implementation workers via bridge @ `127.0.0.1:8787`.

> **Product contracts** live in each project: `projects/<name>/AGENTS.md` and `.harness/project-context.md` — not here.

## Environment

| Variable | Purpose |
|----------|---------|
| `AGENT_HARNESS_HOME` | Harness root (this repo) |
| `AEGIS_PROJECTS_ROOT` | Default `projects/` |
| `AEGIS_RPC_ROOT` | Default project path (`projects/aegis-rpc`) |

## Runtimes

| System | Role |
|--------|------|
| **Hermes gateway** | Telegram 24/7, skills, `/plan`, Kanban dispatch |
| **Bridge** (`127.0.0.1:8787`) | Routes to Kiro CLI or headless Cursor |
| **Cursor** | Interactive IDE agent + Task subagents |
| **Kiro** | CLI coding agent (`kiro-cli --agent aegis-orchestrator`) |

## Read order

1. This file — harness workflow
2. `core/orchestrator/ORCHESTRATOR.md` — lifecycle and routing
3. `docs/kit/` — Hermes/Kiro playbooks
4. `<project>/.harness/project.manifest.json` — per-project config
5. `<project>/AGENTS.md` — product agent contract

## Projects

| Project | Path | Kanban board |
|---------|------|--------------|
| Aegis RPC | `projects/aegis-rpc/` | `aegis-hackathon` |
| (future) | `projects/<name>/` | per manifest |

Kanban workspace: `dir:$AEGIS_RPC_ROOT` (absolute path required).

## CLI

```bash
cli/harness doctor projects/aegis-rpc
cli/harness status projects/aegis-rpc
cli/harness sync-cursor projects/aegis-rpc
```

## Memory (Hivemind)

Cross-agent memory via Hivemind MCP. Details: [docs/kit/07-memory-architecture.md](docs/kit/07-memory-architecture.md).

## Headless 24/7 lanes

| Lane | Trigger | Script |
|------|---------|--------|
| A | 10m cron | `aegis-pm-tick-10m.sh` |
| O | 5m timer | `aegis-pm-orchestrate-once.sh` |
| B | Kanban | `hermes kanban dispatch` |

Install: `scripts/install-aegis-headless-24-7.sh`

## Rules

- Harness root stays **generic** — no product specs at root.
- Product code and docs only under `projects/<name>/`.
- Do not expose bridge `:8787` beyond localhost.
- Do not push/deploy without human approval.
- Use `hermes-gateway` only (not archived `telegram-kiro-gateway`).

## Learned preferences

- Run `aegis-dev` on WSL login to smoke-check stack.
- Hermes Telegram for coordination; heavy work via Kanban/Cursor.
- After `/provider` switch, send `/reset` in Telegram.
- Kanban workers must `kanban complete` or `kanban block` before exit.

## Learned workspace facts

- Harness repo: `~/dev/Project/agent-harness` (renamed from `aegis-hackathon-kit`).
- Default project: `projects/aegis-rpc/` — production https://web-gamma-bay-96.vercel.app
- Skills canonical: `skills/` + `.skills/` (sync via `cli/harness sync-skills`)
- Generic agents: `agents/*.agent.md`; project roles: `projects/<name>/.harness/agents/`
