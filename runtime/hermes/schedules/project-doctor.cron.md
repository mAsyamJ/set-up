# Hermes cron — project doctor + RAG reindex

Run daily or every 6h via Hermes cron. Delivers to Telegram on failure only (optional).

## Command

```bash
cli/harness start-hermes-doctor projects/aegis-rpc
```

Or via Hermes-safe wrapper:

```bash
scripts/hermes-harness-cli.sh projects/aegis-rpc start-hermes-doctor
```

## Hermes cron create (example)

```bash
hermes cron create \
  --schedule "0 */6 * * *" \
  --command "bash -lc 'cd \$AGENT_HARNESS_HOME && cli/harness start-hermes-doctor projects/aegis-rpc'" \
  --delivery local
```

## What it does

1. `harness doctor` — manifest, bridge, systemd, kanban
2. `harness index-project` — refresh RAG sqlite (tasks, manifest, repo, vault)

## After harness OS upgrade

Run once manually:

```bash
scripts/post-harness-upgrade-sync.sh projects/aegis-rpc
```
