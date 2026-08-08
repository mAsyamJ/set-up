# Hermes Activation Runbook

Hermes is optional. Cursor and the Harness CLI must pass their acceptance gates
while Hermes is stopped.

## H0 - Inactive

`cli/harness doctor` must report Hermes as optional. No Hermes absence may fail
core diagnostics.

## H1 - Isolated Foreground Profile

After the full npm baseline and approval/lease tests pass:

```bash
scripts/configure-hermes-harness-profiles.sh --apply operator
harnessop model
```

Choose each Hermes provider/model explicitly. Do not copy the default profile
or its tools, skills, memory, gateway configuration, or credentials. Never use
`--oneshot`, `--yolo`, or `--accept-hooks`.

## H2 - Read-Only MCP

Run `harnessop mcp configure harness` and retain only:

- `harness_health`
- `harness_list_projects`
- `harness_project_inspect`
- `harness_rag_search`
- `harness_task_list`
- `harness_task_get`

Confirm terminal, file, code execution, browser, web, delegation, cron,
computer-use, approval response, service management, push, merge, and
deployment are absent. Run
`harnessop chat --toolsets mcp-harness` in the foreground before any gateway.

## H3 - Task Submission

After H2 passes, explicitly add
`HARNESS_HERMES_TASK_SUBMISSION=1` to the `harness` MCP server's configured
`env` mapping, then reconnect and allow only `harness_task_submit` in addition
to the H2 list. Submitted tasks remain `proposed`; a passphrase-authenticated
human must queue them.

## H4 - Disposable Worker

Only a registry project with `executionPolicy: canary-worker` is eligible:

```bash
scripts/configure-hermes-harness-profiles.sh --apply worker
harnessworker model
cli/harness worker run canary <task-id>
```

The registry and project manifest must both declare a disposable canary, the
repository must be clean, and it must have no remotes. The supervisor retains
the lease capability, heartbeats the task, and launches the separate
`harnessworker` profile with only `mcp-harness` in the isolated worktree. Each write,
verification, commit, and review transition requires its own exact approval.
Any non-review exit preserves the worktree and makes the task recoverable.

## H5 - Optional User Service

After foreground and canary gates:

```bash
scripts/render-hermes-user-service.sh --apply
systemctl --user daemon-reload
systemctl --user start hermes-harness-operator.service
systemctl --user status hermes-harness-operator.service
systemctl --user stop hermes-harness-operator.service
```

The unit has no install target and cannot be enabled by the renderer. Do not
enable linger, fleet, A2A, timers, bridges, or port proxies.
