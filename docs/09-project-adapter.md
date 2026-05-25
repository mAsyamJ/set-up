# Project Adapter

Required under `<project>/.harness/`:

- `project.manifest.json` — identity, paths, commands, agents, skills
- `project-context.md` — domain context
- `obsidian.config.json` — vault link (optional)
- `rag.config.json` — index globs (optional)
- `tasks/{backlog,active,review,done,blocked}/`
- `state/` — harness.sqlite, rag.sqlite, events/

Init: `cli/harness init-project <path> [name]`
