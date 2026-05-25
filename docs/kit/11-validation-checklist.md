# Validation Checklist

Run after harness changes or before relying on 24/7 lanes.

## Layer 1 — Smoke (daily)

```bash
cli/harness doctor projects/aegis-rpc
cli/harness smoke projects/aegis-rpc
curl -sf http://127.0.0.1:8787/health
systemctl --user is-active kiro-openai-bridge hermes-gateway
scripts/aegis-model.sh status
```

Pass: doctor exits 0; bridge `/health` returns JSON; gateway active.

## Layer 2 — Workflow integration

| Scenario | Command | Pass |
|----------|---------|------|
| Lane A | `scripts/aegis-pm-tick-10m.sh` | Script completes; no LLM required |
| Lane O | `AEGIS_KANBAN_DRY_RUN=1 scripts/aegis-pm-orchestrate-once.sh` | Orchestrate script runs; dispatch gated |
| Dispatch gate | `AEGIS_KANBAN_DRY_RUN=1 scripts/aegis-kanban-dispatch-once.sh` | Exits 0 when bridge up |
| Task lifecycle | `cli/harness new-task …` → `verify-task` | Task file created; verify uses manifest |
| Kanban sync | `cli/harness sync-kanban projects/aegis-rpc` | Lists active stubs/links |
| Provider | `scripts/aegis-model.sh status` | Shows kiro or cursor |

## Layer 3 — Control plane

```bash
npm test                                    # tool policy unit tests
cli/harness run-task projects/aegis-rpc git.status '{}'
cli/harness run-report projects/aegis-rpc
timeout 2 cli/harness start-mcp </dev/null # MCP stdio starts
```

Pass: policy tests green; git.status returns JSON; MCP starts without error.

## Layer 4 — Full validation script

```bash
scripts/harness-validation.sh projects/aegis-rpc
```

Automates layers 1–3 where services are available.

## Security checks

- Bridge binds `127.0.0.1` only
- Doctor/smoke never print `.env`
- Tool gateway denies `.env` reads (see `npm test`)
