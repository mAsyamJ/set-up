# Hermes Integration

Hermes is the **single operator interface**. Harness OS is the **execution engine** Hermes uses for grounded project work. Hermes never "becomes" Harness — after bootstrap, Hermes routes all goals through Harness tools.

## Stack

```txt
Telegram → hermes-gateway → Harness MCP + Hivemind
                ↓                    ↓
         hermes-harness-operator   Tool Gateway → RAG / tasks / Obsidian
                ↓
         bridge :8787 → operator chat (planning/status)
                ↓
         cursor-fleet → @cursor/sdk workers (git worktree per Kanban task)
```

**Kanban in a browser** lives at `http://127.0.0.1:9119/kanban?board=…` and is served by **`hermes dashboard`** (port 9119), not by `hermes-gateway`. If the URL fails from Windows on WSL, start `hermes dashboard --host 0.0.0.0 --insecure` (or install `systemd/user/hermes-dashboard.service`) and use `scripts/fix-hermes-kanban-ui.sh` / `scripts/update-wsl-portproxy.sh` as needed.

## Cursor fleet (20-agent headless orchestration)

Kanban **code workers** bypass the bridge. Each task gets an isolated git worktree under `<project>/.harness/worktrees/<taskId>/`.

| Env | Default | Purpose |
|-----|---------|---------|
| `AEGIS_CURSOR_FLEET_ENABLED` | `1` | Use fleet instead of `hermes kanban dispatch` for Lane B |
| `AEGIS_CURSOR_FLEET_QUEUE_MAX` | `20` | Max managed ready+running tasks |
| `AEGIS_CURSOR_FLEET_MAX_CONCURRENT` | `4` (local) | Active SDK agents (raise on VPS) |
| `AEGIS_KANBAN_DISPATCH_MAX` | same as concurrent | Dispatch slot cap |

```bash
cli/harness cursor-fleet doctor
cli/harness cursor-fleet status
cli/harness cursor-fleet once
AEGIS_CURSOR_FLEET_DRY_RUN=1 cli/harness cursor-fleet once
scripts/aegis-kanban-seed-fleet-wave.sh projects/kreditagent 20
systemctl --user status cursor-fleet
```

Bootstrap merges `kanban.dispatch_in_gateway: false` via `scripts/merge-hermes-kanban-fleet.py` so Hermes does not double-spawn workers.

Install: `scripts/install-cursor-fleet-systemd.sh` (also from `install-aegis-headless-24-7.sh`).

## One-shot bootstrap (Hermes-only operation)

```bash
scripts/hermes-bootstrap-harness.sh
# Telegram: /reset
```

Does: `switch-project`, `sync-hermes`, index all registry projects, `harness-validate-all-projects`, restart gateway + bridge.

Also runs from `scripts/install-systemd-user.sh` on install.

## What sync-hermes / bootstrap installs

| Target | Content |
|--------|---------|
| `~/.hermes/skills/hermes-harness-operator/` | Always-on goal routing |
| `~/.hermes/skills/agent-harness-os/` | Capability map + registry |
| `~/.hermes/skills/harness-mcp/` | MCP tool reference |
| `~/.hermes/memory-rules/` | Mandatory harness-first rules |
| `~/.hermes/config.yaml` | `mcp_servers.harness` |

## Harness MCP in Hermes (dynamic workspace)

Harness MCP re-reads `.harness/state/active-project.env` on **each tool call** — switch projects without gateway restart.

| Tool | Purpose |
|------|---------|
| `harness_list_projects` | Registry slugs, boards, active flag |
| `harness_switch_project` | Update active workspace |
| `harness_project_inspect` | Manifest + context + tasks |
| `harness_rag_search` | Project-scoped RAG |
| `harness_task_create` / `harness_task_move` | Task lifecycle |

Merge script: `scripts/merge-hermes-harness-mcp.sh`

## Goal routing

| Goal | Switch to | Board |
|------|-----------|-------|
| Product code | `aegis-rpc`, `kreditagent`, `retropick` | per registry |
| Marketing / business | `ops` | `agentic-ops` |
| Fleet health | — | `validate-all` |

Skill: `runtime/hermes/skill-hermes-harness-operator/SKILL.md`

## Telegram-safe CLI

```bash
scripts/hermes-harness-cli.sh list-projects
scripts/hermes-harness-cli.sh switch-project kreditagent
scripts/hermes-harness-cli.sh validate-all
scripts/hermes-harness-cli.sh ops obsidian capture "Note title"
scripts/hermes-harness-cli.sh kreditagent run-task rag.search '{"query":"x402"}'
```

## Scheduled health

- Per-project: [runtime/hermes/schedules/project-doctor.cron.md](../runtime/hermes/schedules/project-doctor.cron.md)
- Fleet: [runtime/hermes/schedules/fleet-doctor.cron.md](../runtime/hermes/schedules/fleet-doctor.cron.md)

## Lanes

| Lane | Trigger | Role |
|------|---------|------|
| A | 10m cron | Fleet Kanban stats + stack health → Telegram |
| O | ~5m timer | Orchestrate + multi-board dispatch |
| B | Kanban | **cursor-fleet** SDK workers (worktree-isolated); bridge for Telegram chat only |

## Acceptance (Telegram)

1. `scripts/hermes-bootstrap-harness.sh`
2. `/reset` in Telegram
3. Ask: *"What harness tools and projects do you have?"* — must list registry + ops + MCP tools
4. Ask: *"Switch to kreditagent and search RAG for x402"* — uses switch + RAG
5. Ask: *"Create a marketing task for launch plan"* — routes to `ops` / `agentic-ops`

See also: [docs/kit/02-hermes-24-7.md](kit/02-hermes-24-7.md) · [README.md](../README.md#operate-from-hermes-only)
