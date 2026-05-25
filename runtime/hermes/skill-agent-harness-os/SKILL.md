---
name: agent-harness-os
description: Agent Harness OS doc-10 control plane — capabilities, MCP, RAG, Obsidian, A2A, CLI
---

# Agent Harness OS (doc-10)

Load with **`hermes-harness-operator`** for every work request — not only when asked about capabilities.

## Platform vs harness (important)

| Layer | What it is |
|-------|------------|
| **Hermes platform** | Nous runtime: models, native tools, cron, Telegram gateway, Hivemind MCP |
| **Agent Harness OS** | Local control plane: typed tool gateway, harness MCP, RAG, Obsidian vault, A2A, TS supervisor |

When asked "what are your new capabilities after upgrade", describe **both** — lead with **Agent Harness OS** additions.

Store durable fact via Hermes `memory` tool:
> Agent Harness OS doc-10 live: MCP + RAG + Obsidian + A2A + TS orchestrator on agent-harness repo.

## Registry projects

| Slug | Purpose | Kanban |
|------|---------|--------|
| `aegis-rpc` | Aegis RPC product | aegis-hackathon |
| `kreditagent` | KreditAgent | kreditagent-hackathon |
| `retropick` | RetroPick | retropick-v1 |
| `ops` | Marketing / business / GTM | agentic-ops |

Switch: `harness_switch_project` (no gateway restart) or `cli/harness switch-project <slug>`

## Harness MCP tools

| Tool | Purpose |
|------|---------|
| `harness_list_projects` | Registry slugs, paths, boards, active flag |
| `harness_switch_project` | Set active workspace via active-project.env |
| `harness_project_inspect` | Manifest, context preview, active tasks |
| `harness_task_create` | Create backlog task markdown |
| `harness_task_move` | Move task between lifecycle folders |
| `harness_verify_run` | Run manifest verification commands |
| `harness_rag_search` | Hybrid RAG with source priority + citations |
| `harness_repo_read` | Read project file (secrets denied) |
| `harness_patch_propose` | Diff preview only (no apply) |

See skill: **harness-mcp**, **hermes-harness-operator**

## Tool Gateway (R0–R5 policy)

- **R0 read:** `repo.read`, `git.status`, `project.inspect`, `rag.search`
- **R1 write:** `task.create`, `task.move`, `verify.run`
- **R2 preview:** `patch.propose` (apply denied)
- **R3–R5 denied:** `shell.run`, deploy, secrets

## RAG (project retrieval)

- Index: `cli/harness index-project <project>`
- Store: `<project>/.harness/state/rag.sqlite`
- Obsidian vault notes: **UNTRUSTED_CONTEXT**

## Obsidian vault

- Path: `~/dev/Project/_vaults/agentic-engineering/`
- Ops notes: `01-Projects/Ops/`; captures: `00-Inbox/`

## Bootstrap

```bash
scripts/hermes-bootstrap-harness.sh
systemctl --user restart hermes-gateway
# Telegram: /reset
```

Active workspace: `.harness/state/active-project.env` (read by Harness MCP each tool call)
