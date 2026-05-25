# Hermes cron — fleet doctor (all registry projects)

Run every 6h via Hermes cron. Delivers to Telegram on failure (configure delivery in Hermes).

## Command

```bash
bash -lc 'cd "$AGENT_HARNESS_HOME" && scripts/harness-validate-all-projects.sh'
```

Or via Hermes-safe wrapper:

```bash
scripts/hermes-harness-cli.sh validate-all
```

## Hermes cron create (example)

```bash
hermes cron create \
  --schedule "0 */6 * * *" \
  --command "bash -lc 'cd \$AGENT_HARNESS_HOME && scripts/harness-validate-all-projects.sh'" \
  --delivery local
```

## What it checks (per registry entry)

- `harness doctor` — manifest, bridge, systemd, project Kanban
- `rag.sqlite` present
- Kanban board stats
- OpenSrc paths (kreditagent only)

## One-shot bootstrap

```bash
scripts/hermes-bootstrap-harness.sh
```
