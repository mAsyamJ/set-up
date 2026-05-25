# HARNESS.md — KreditAgent

Embedded harness project under `agent-harness/projects/kreditagent/`.

## CLI

From harness root:

```bash
cli/harness switch-project kreditagent
cli/harness doctor projects/kreditagent
cli/harness index-project projects/kreditagent
cli/harness obsidian init projects/kreditagent
```

## Kanban

- Board: `kreditagent-hackathon`
- Workspace: `dir:$AGENT_HARNESS_HOME/projects/kreditagent`

## OpenSrc (external study repos)

```bash
bash scripts/kreditagent-opensrc-cache.sh   # harness root script
```

Paths land in `.harness/research/opensrc-paths/`.

## Migration note

Copied from `~/dev/Project/KreditAgent/kreditagent-hackathon`. Original kept until validation complete. `external/` not copied — use OpenSrc.
