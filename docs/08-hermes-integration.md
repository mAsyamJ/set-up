# Hermes Integration

Hermes is the **single operator interface**. Harness OS is the **execution engine** Hermes uses for grounded project work. Hermes never "becomes" Harness — after bootstrap, Hermes routes all goals through Harness tools.

## Stack

```txt
Telegram → hermes-gateway → Harness MCP + Hivemind
                ↓                    ↓
         hermes-harness-operator   Tool Gateway → RAG / tasks / Obsidian
                ↓
         bridge :8787 → Cursor/Kiro (Kanban workers)
```

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
| B | Kanban | Workers via bridge |

## Acceptance (Telegram)

1. `scripts/hermes-bootstrap-harness.sh`
2. `/reset` in Telegram
3. Ask: *"What harness tools and projects do you have?"* — must list registry + ops + MCP tools
4. Ask: *"Switch to kreditagent and search RAG for x402"* — uses switch + RAG
5. Ask: *"Create a marketing task for launch plan"* — routes to `ops` / `agentic-ops`

See also: [docs/kit/02-hermes-24-7.md](kit/02-hermes-24-7.md) · [README.md](../README.md#operate-from-hermes-only)
