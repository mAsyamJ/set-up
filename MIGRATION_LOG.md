# Agent Harness Migration Log

Started: 2026-05-25

## Classification (Phase 0)

| Path | Classification |
|------|----------------|
| `scripts/`, `tools/`, `systemd/`, `runtime/` | GENERIC_HARNESS |
| `docs/kit/` | GENERIC_HARNESS |
| `.agent-plugins/`, `.hermes/`, `.cursor/` | GENERIC_HARNESS |
| `.skills/`, `skills/` | GENERIC_HARNESS (consolidate) |
| `.kiro/` (kit root) | GENERIC_HARNESS (dedupe → project) |
| `frontend/` | ARCHIVE → `examples/frontend-reference/` |
| `research/` | GENERIC_HARNESS (Aegis notes → project) |
| `templates/`, `prompts/` | GENERIC_HARNESS / ARCHIVE |
| `aegis-rpc/` | PROJECT_AEGIS → `projects/aegis-rpc/` |
| `plan.md`, `docs/00-16*.md`, `agents/`, `tasks/` | PROJECT_AEGIS → `projects/aegis-rpc/` |
| `ORCHESTRATOR.md`, `DECISIONS.md` (kit root) | PROJECT_AEGIS → merge into project |
| `checklists/`, `HACKATHON.md` | PROJECT_AEGIS → project archive |

## Moves (completed 2026-05-25)

- `aegis-rpc/` → `projects/aegis-rpc/`
- Kit product docs → `projects/aegis-rpc/docs/specs/`
- `plan.md` → `projects/aegis-rpc/docs/plan.md`
- `tasks/`, `agents/` → `projects/aegis-rpc/.harness/`
- Repo renamed: `aegis-hackathon-kit` → `agent-harness`
- Harness scaffold: `core/`, `cli/`, `templates/`, `projects/`
- Kit `.kiro/agents/` archived to `archive/pre-split/root-duplicates/kiro-agents-kit`
