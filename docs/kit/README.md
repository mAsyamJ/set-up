# Agent Harness Kit — Documentation

Playbooks for Hermes orchestration, Cursor/Kiro workers, and project adapters. Product specs live under `projects/<name>/`.

| Doc | Topic |
|-----|--------|
| [01-daily-setup.md](01-daily-setup.md) | Debian login, systemd stack, MCP, debug |
| [02-hermes-24-7.md](02-hermes-24-7.md) | Telegram gateway, slash commands, `/plan`, Kanban lanes A/O/B |
| [03-kiro-agents.md](03-kiro-agents.md) | Orchestrator, builder, security, pitch, qa |
| [04-hackathon-lifecycle.md](04-hackathon-lifecycle.md) | Prep → build → grill → production → push |
| [05-ai-collaboration.md](05-ai-collaboration.md) | `Co-authored-by`, commit template, collaboration log |
| [06-mvp-and-demo.md](06-mvp-and-demo.md) | Product scope, MVP modules, demo proof |
| [07-memory-architecture.md](07-memory-architecture.md) | Hivemind, Hermes, Kiro bridge, shared memory |
| [10-portable-workflow-migration.md](10-portable-workflow-migration.md) | **Architecture blueprint** — portable harness OS, MCP/A2A/RAG, build phases |
| [11-validation-checklist.md](11-validation-checklist.md) | Smoke, workflow integration, control-plane tests |

## Architecture docs (doc-10)

| Doc | Topic |
|-----|--------|
| [../00-vision.md](../00-vision.md) | Harness OS vision |
| [../01-architecture.md](../01-architecture.md) | Control plane layout |
| [../03-mcp.md](../03-mcp.md) | MCP tools and prompts |
| [../04-a2a.md](../04-a2a.md) | A2A local server |
| [../05-rag-memory.md](../05-rag-memory.md) | RAG source hierarchy |
| [../06-tools-security.md](../06-tools-security.md) | R0–R5 policy |
| [../07-cursor-integration.md](../07-cursor-integration.md) | Cursor rules + MCP |
| [../08-hermes-integration.md](../08-hermes-integration.md) | Hermes lanes |
| [../09-project-adapter.md](../09-project-adapter.md) | `.harness/` adapter |

## Harness CLI

```bash
cli/harness doctor projects/aegis-rpc
cli/harness smoke projects/aegis-rpc
cli/harness status projects/aegis-rpc
cli/harness new-task projects/aegis-rpc "title" phase --kanban
cli/harness sync-kanban projects/aegis-rpc
cli/harness verify-task projects/aegis-rpc .harness/tasks/active/task.md
cli/harness run-task projects/aegis-rpc git.status '{}'
cli/harness run-report projects/aegis-rpc
cli/harness index-project projects/aegis-rpc
cli/harness obsidian init projects/aegis-rpc
cli/harness start-a2a
cli/harness start-hermes-doctor projects/aegis-rpc
cli/harness sync-cursor projects/aegis-rpc
cli/harness sync-skills projects/aegis-rpc
cli/harness start-mcp
```

## Templates

| Template | Use |
|----------|-----|
| [templates/HACKATHON.md](templates/HACKATHON.md) | Root checklist in app repo |
| [templates/AI_COLLABORATION_LOG.md](templates/AI_COLLABORATION_LOG.md) | Collaboration log |
| [templates/git-commit-template.txt](templates/git-commit-template.txt) | Optional git commit template |
| [../../templates/cursor-mcp/harness.mcp.example.json](../../templates/cursor-mcp/harness.mcp.example.json) | Cursor harness MCP config |

Back to [../../README.md](../../README.md).
