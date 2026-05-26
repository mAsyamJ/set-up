# Agent Harness — Agent Workflow

Default workflow: **Hermes** as 24/7 orchestrator; **Cursor/Kiro** as implementation workers via bridge @ `127.0.0.1:8787`.

> **Product contracts** live in each project: `projects/<name>/AGENTS.md` and `.harness/project-context.md` — not here.

## Environment

| Variable | Purpose |
|----------|---------|
| `AGENT_HARNESS_HOME` | Harness root (this repo) |
| `AEGIS_PROJECTS_ROOT` | Default `projects/` |
| `AEGIS_RPC_ROOT` | Default project path (`projects/aegis-rpc`) |
| `AEGIS_WORKSPACE` | Active project for bridge / MCP (required for harness MCP) |

## Runtimes

| System | Role |
|--------|------|
| **Hermes gateway** | Telegram 24/7, skills, `/plan`, Kanban dispatch |
| **Bridge** (`127.0.0.1:8787`) | Telegram operator chat → Kiro CLI or headless Cursor |
| **Cursor fleet** | Kanban workers — `@cursor/sdk` in git worktrees (`cli/harness cursor-fleet`) |
| **Harness MCP** | Project tools (inspect, RAG, tasks) — Cursor + Hermes |
| **A2A server** (`127.0.0.1:8790`) | Local agent delegation (security, qa) |
| **Cursor** | Interactive IDE agent + Task subagents |
| **Kiro** | CLI coding agent (`kiro-cli --agent aegis-orchestrator`) |

## Control plane (doc-10)

| Module | Purpose |
|--------|---------|
| **Tool Gateway** | Typed tools with R0–R5 policy (`tools/gateway/`) |
| **RAG** | Hybrid search — `cli/harness index-project` |
| **Obsidian** | Vault at `~/dev/Project/_vaults/agentic-engineering` (UNTRUSTED_CONTEXT) |
| **TS Supervisor** | `cli/harness run-task <project> <task.md>` |
| **HarnessStore** | SQLite traces in `<project>/.harness/state/` |

Full architecture: [README.md](README.md), [docs/00-vision.md](docs/00-vision.md) … [docs/09-project-adapter.md](docs/09-project-adapter.md)

## Read order

1. This file — harness workflow
2. `core/orchestrator/ORCHESTRATOR.md` — lifecycle and routing
3. `docs/kit/` — Hermes/Kiro playbooks
4. `<project>/.harness/project.manifest.json` — per-project config
5. `<project>/AGENTS.md` — product agent contract

## Hermes-first operator

Operate from **Telegram / Hermes only** — Harness is the execution layer:

```bash
scripts/hermes-bootstrap-harness.sh   # once or after upgrade
# Telegram: /reset
```

Skills: `hermes-harness-operator`, `agent-harness-os`, `harness-mcp`

MCP: `harness_list_projects`, `harness_switch_project` (no gateway restart for switch)

Safe CLI: `scripts/hermes-harness-cli.sh list-projects|switch-project|validate-all`

## Projects

| Project | Path | Kanban board |
|---------|------|--------------|
| Aegis RPC | `projects/aegis-rpc/` | `aegis-hackathon` |
| KreditAgent | `projects/kreditagent/` | `kreditagent-hackathon` |
| RetroPick | `projects/retropick/` | `retropick-v1` |
| ArbEyes DeFi | `projects/defi-lab/arbeyes-defi/` | `arbeyes-defi-v1` |
| Agentic Ops | `projects/ops/` | `agentic-ops` (marketing/business) |

Registry: `projects/registry.json`. Switch active project:

```bash
cli/harness switch-project kreditagent   # sets AEGIS_RPC_ROOT, AEGIS_WORKSPACE, Kanban board
```

Kanban workspace: `dir:$AEGIS_RPC_ROOT` (absolute path required).

## CLI

```bash
cli/harness doctor projects/aegis-rpc
cli/harness status projects/aegis-rpc
cli/harness sync-cursor projects/aegis-rpc
cli/harness sync-skills projects/aegis-rpc
cli/harness sync-hermes projects/aegis-rpc   # Hermes skills + harness MCP
cli/harness switch-project kreditagent       # multi-project: active workspace + Kanban
cli/harness index-project projects/aegis-rpc
cli/harness start-mcp projects/aegis-rpc     # requires AEGIS_WORKSPACE
cli/harness start-hermes-doctor projects/aegis-rpc
```

## Hermes awareness

After harness upgrades, sync to Telegram path:

```bash
cli/harness sync-hermes projects/aegis-rpc
systemctl --user restart hermes-gateway
# Telegram: /reset
```

Skills installed: `hermes-harness-operator`, `agent-harness-os`, `harness-mcp` → `~/.hermes/skills/`

Telegram-safe CLI: `scripts/hermes-harness-cli.sh list-projects|switch-project|validate-all`

## Memory (Hivemind)

Cross-agent memory via Hivemind MCP. Details: [docs/kit/07-memory-architecture.md](docs/kit/07-memory-architecture.md).

Do not conflate Hivemind (org-wide) with harness RAG (project-scoped) or Obsidian vault (human notes, untrusted).

## Headless 24/7 lanes

| Lane | Trigger | Script |
|------|---------|--------|
| A | 10m cron | `aegis-pm-tick-10m.sh` |
| O | 5m timer | `aegis-pm-orchestrate-once.sh` |
| B | Kanban / fleet | `cursor-fleet` daemon or `aegis-kanban-dispatch-once.sh` |

Install: `scripts/install-aegis-headless-24-7.sh` (includes cursor-fleet systemd)

Fleet env: `AEGIS_CURSOR_FLEET_MAX_CONCURRENT` (default 4 local), `AEGIS_CURSOR_FLEET_QUEUE_MAX` (20), `AEGIS_KANBAN_DISPATCH_MAX`

## Rules

- Harness root stays **generic** — no product specs at root.
- Product code and docs only under `projects/<name>/`.
- Do not expose bridge `:8787` or A2A `:8790` beyond localhost.
- Do not push/deploy without human approval.
- Use `hermes-gateway` only (not archived `telegram-kiro-gateway`).
- Do **not** edit attached `.plan.md` files when implementing plans.
- Use existing todos; do not recreate when executing plans.

## Learned preferences

- Run `aegis-dev` on WSL login to smoke-check stack.
- Prefer hands-off setup: run `hermes-bootstrap-harness.sh`, fleet/systemd installs, and validation when asked.
- Hermes Telegram for coordination; Kanban/cursor-fleet for headless code work (bridge `:8787` for operator chat).
- After `/provider` switch, send `/reset` in Telegram.
- Kanban workers must `kanban complete` or `kanban block` before exit.
- After harness OS changes, run `sync-hermes` and restart `hermes-gateway`.
- Hermes orchestrates Kanban tasks, not full project autopilot — unblock/replan via Telegram when cards block.

## Learned workspace facts

- Harness repo: `~/dev/Project/agent-harness` (renamed from `aegis-hackathon-kit`).
- Default project: `projects/aegis-rpc/` — production https://web-gamma-bay-96.vercel.app
- Agent Harness OS doc-10 live: MCP + RAG + Obsidian + A2A + TS orchestrator (May 2026).
- Obsidian vault: `~/dev/Project/_vaults/agentic-engineering/` (shared cross-project).
- Skills canonical: `skills/` + `.skills/` (sync via `cli/harness sync-skills`); Hermes bootstrap: `runtime/hermes/skill-*/`.
- Generic agents: `agents/*.agent.md`; project roles: `projects/<name>/.harness/agents/`
- KreditAgent and RetroPick embedded at `projects/kreditagent/` and `projects/retropick/` (copied via `import-external-project.sh`; originals at `~/dev/Project/`).
- KreditAgent `external/` vendored repos excluded from harness copy; reference via OpenSrc cache.
- Cursor fleet on WSL: `cursor-fleet.service` (30s ticks); `kanban.dispatch_in_gateway: false` when fleet owns workers.
- ArbEyes DeFi at `projects/defi-lab/arbeyes-defi/` (registry slug `arbeyes-defi`).
