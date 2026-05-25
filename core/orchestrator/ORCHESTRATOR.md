# Orchestrator

Hermes is the 24/7 orchestrator. Cursor/Kiro are implementation workers.

## Read order

1. `$AGENT_HARNESS_HOME/AGENTS.md` — harness workflow
2. `<project>/.harness/project.manifest.json` — project identity
3. `<project>/.harness/project-context.md` — domain context
4. `<project>/AGENTS.md` — product agent contract
5. `<project>/ORCHESTRATOR.md` — active phase (if present)

## Lifecycle

DISCOVER → MAP → PLAN → TASK → IMPLEMENT → VERIFY → REVIEW → DOCUMENT → HANDOFF

See `core/lifecycle/` for each stage.

## Routing

| Lane | Trigger | Role |
|------|---------|------|
| A | 10m cron | Script-only status |
| O | 5m timer | Seed, dispatch, deploy gates |
| B | Kanban dispatch | Builder/security/qa workers via bridge |

## CLI (harness root)

```bash
cli/harness doctor|smoke|status <project>
cli/harness new-task|verify-task|sync-kanban|run-task|run-report <project> [args]
cli/harness sync-cursor|sync-skills <project>
cli/harness start-mcp
```

Validation: `scripts/harness-validation.sh projects/aegis-rpc` — see `docs/kit/11-validation-checklist.md`.

## Boards

- `agent-harness` (infra) — harness root workspace
- `<project-board>` — default project workspace under `projects/<name>/`
