---
name: hermes-harness-operator
description: Hermes-only operator — always route goals through Harness OS (RAG, tasks, Kanban, Obsidian)
---

# Hermes Harness Operator

Load this skill **for every work request** — code, marketing, business, research, or fleet health. Hermes is the UI; Harness OS is the execution engine.

## Mental model

- **Hermes** = operator (Telegram, cron, Kanban, Hivemind)
- **Harness OS** = project brain (RAG, tasks, policy, Obsidian, supervisor)
- Hermes never "becomes" Harness — it **uses** Harness tools after bootstrap

## Always-on workflow

For any user goal:

1. **Recall** — `hivemind_search` when org/history context helps
2. **Resolve workspace** — `harness_list_projects` then `harness_switch_project` to the right slug
3. **Ground** — `harness_project_inspect` + `harness_rag_search` before planning
4. **Track** — `harness_task_create` or Hermes Kanban `create` on the project's board
5. **Capture notes** — `obsidian capture` (via hermes-harness-cli) for free-form human knowledge
6. **Implement code** — **cursor-fleet** (headless SDK workers in git worktrees) or `cli/harness cursor-fleet once`

## Cursor fleet (Kanban workers)

- **Telegram chat** → bridge `:8787` (planning, status)
- **Kanban code tasks** → `cursor-fleet` service (worktree per task, up to 20 queued, 4 concurrent local default)
- Disable Hermes embedded dispatch: `kanban.dispatch_in_gateway: false` (bootstrap merges this)

```bash
cli/harness cursor-fleet status
cli/harness cursor-fleet once
scripts/aegis-kanban-seed-fleet-wave.sh projects/kreditagent 20
```

## Goal routing

| Goal type | Switch to | Primary tools |
|-----------|-----------|---------------|
| Product code (Aegis, KreditAgent, RetroPick) | `aegis-rpc`, `kreditagent`, `retropick` | RAG, tasks, Kanban dispatch |
| Marketing / business / GTM / strategy | `ops` | Obsidian vault, ops RAG, board `agentic-ops` |
| Cross-cutting research | current + Hivemind | `hivemind_search`, `obsidian capture` |
| Fleet / stack health | any (read-only) | `hermes-harness-cli validate-all`, doctor |

## Registry projects

Read via `harness_list_projects`: `aegis-rpc`, `kreditagent`, `retropick`, `ops`.

Switch without gateway restart: `harness_switch_project` with slug.

Active workspace file: `$AGENT_HARNESS_HOME/.harness/state/active-project.env`

## Kanban boards

| Slug | Board |
|------|-------|
| aegis-rpc | aegis-hackathon |
| kreditagent | kreditagent-hackathon |
| retropick | retropick-v1 |
| ops | agentic-ops |

Create tasks: `hermes kanban --board <board> create "title" --workspace "dir:<absolute-path>"`

Workers end with `kanban complete` or `kanban block`.

## Telegram-safe CLI fallback

```bash
scripts/hermes-harness-cli.sh <project-or-slug> doctor
scripts/hermes-harness-cli.sh switch-project kreditagent
scripts/hermes-harness-cli.sh list-projects
scripts/hermes-harness-cli.sh validate-all
```

## Bootstrap (once or after upgrade)

```bash
scripts/hermes-bootstrap-harness.sh
# Telegram: /reset
```

See also: **agent-harness-os**, **harness-mcp**
