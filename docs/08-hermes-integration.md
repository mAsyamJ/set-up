# Hermes Integration

Hermes remains the **external 24/7 orchestrator**. The harness augments it — does not replace it.

## Stack

```txt
Telegram → hermes-gateway → bridge :8787 → Cursor/Kiro
                ↓
         ~/.hermes/skills/  (agent-harness-os, harness-mcp, …)
         mcp_servers.hivemind + mcp_servers.harness
         Lanes A / O / B
```

## Sync harness into Hermes (required after upgrade)

```bash
cli/harness sync-hermes projects/aegis-rpc
systemctl --user restart hermes-gateway
```

Telegram: send **`/reset`** then ask about harness capabilities.

One-shot post-upgrade:

```bash
scripts/post-harness-upgrade-sync.sh projects/aegis-rpc
```

## What sync-hermes installs

| Target | Content |
|--------|---------|
| `~/.hermes/skills/agent-harness-os/` | Full doc-10 capability map |
| `~/.hermes/skills/harness-mcp/` | MCP tool reference |
| `~/.hermes/memory-rules/` | MEMORY_RULES with harness OS section |
| `~/.hermes/config.yaml` | `mcp_servers.harness` (via merge script) |
| Project skills | From manifest via `sync-skills` |

## Harness MCP in Hermes

Template: [docs/kit/templates/hermes-config.harness-mcp.yaml](kit/templates/hermes-config.harness-mcp.yaml)

Merge script: `scripts/merge-hermes-harness-mcp.sh`

Tools available when wired: `harness_project_inspect`, `harness_rag_search`, `harness_task_create`, `harness_verify_run`, …

## Telegram-safe CLI

When MCP unavailable, Hermes may use:

```bash
scripts/hermes-harness-cli.sh projects/aegis-rpc doctor
scripts/hermes-harness-cli.sh projects/aegis-rpc run-task rag.search '{"query":"manifest"}'
scripts/hermes-harness-cli.sh projects/aegis-rpc obsidian capture "Note title"
```

Allowlist only — no `start-a2a`, arbitrary shell, or secrets.

## Bridge prompt injection

`tools/kiro-openai-bridge/server.js` injects Agent Harness OS context into Cursor/Kiro backend prompts (capabilities, CLI, vault path, manifest snippet).

## Scheduled doctor

Cron spec: [runtime/hermes/schedules/project-doctor.cron.md](../runtime/hermes/schedules/project-doctor.cron.md)

```bash
cli/harness start-hermes-doctor projects/aegis-rpc
```

## Lanes

| Lane | Trigger | Role |
|------|---------|------|
| A | 10m cron | PM status |
| O | ~5m timer | Orchestrate + dispatch |
| B | Kanban | Workers via bridge |

Install: `scripts/install-aegis-headless-24-7.sh`

## Acceptance (Telegram)

1. `cli/harness sync-hermes projects/aegis-rpc`
2. Restart `hermes-gateway`
3. `/reset` in Telegram
4. Ask: *"What are your new harness capabilities?"*
5. **Pass:** response includes MCP, RAG, Obsidian vault, A2A, CLI — not only generic Nous skills

See also: [docs/kit/02-hermes-24-7.md](kit/02-hermes-24-7.md) · [docs/kit/07-memory-architecture.md](kit/07-memory-architecture.md)
