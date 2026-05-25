# Task Lifecycle

1. **Discover** — read manifest, project-context, AGENTS.md
2. **Map** — write `.harness/state/project-map.json`
3. **Plan** — create tasks in `backlog/`
4. **Task** — move one task to `active/`
5. **Implement** — Cursor/Hermes worker executes
6. **Verify** — run manifest commands
7. **Review** — security/qa pass
8. **Document** — update docs/changelog
9. **Handoff** — move to `done/`
