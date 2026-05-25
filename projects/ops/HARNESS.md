# HARNESS.md — Agentic Ops

Marketing, business, and strategy workspace under `projects/ops/`.

## CLI

```bash
cli/harness switch-project ops
cli/harness obsidian init projects/ops
cli/harness index-project projects/ops
cli/harness obsidian capture projects/ops "Launch plan note"
```

## Kanban

- Board: `agentic-ops`
- Workspace: `dir:$AGENT_HARNESS_HOME/projects/ops`

## Vault layout

| Path | Use |
|------|-----|
| `01-Projects/Ops/` | Project index + structured notes |
| `00-Inbox/` | Quick captures from Telegram |
| `04-Research/` | Market / competitor research |
| `05-Decisions/` | ADRs for business choices |

Structured tasks → `.harness/tasks/` + Kanban. Free-form → Obsidian capture.
