# Agent Harness — ArbEyes DeFi

This folder is wired into **Agent Harness** as registry project `arbeyes-defi`.

## Quick commands (from harness repo root)

- **Switch active project:** `cli/harness switch-project arbeyes-defi`
- **Doctor:** `cli/harness doctor "$AGENT_HARNESS_HOME/projects/defi-lab/arbeyes-defi"`  
  (From another cwd, pass an **absolute** path to the project root.)
- **RAG index:** `cli/harness index-project projects/defi-lab/arbeyes-defi`
- **Kanban UI:** http://127.0.0.1:9119/kanban?board=arbeyes-defi-v1  
  Served by **`hermes dashboard`** on port **9119**, not by `hermes-gateway`. If nothing listens on 9119, the browser shows connection refused or reset.

  **WSL + Windows browser:** start the dashboard bound to all interfaces (or use the harness unit), then use `http://localhost:9119/...` from Edge/Chrome. Example:

  ```bash
  hermes dashboard --no-open --skip-build --host 0.0.0.0 --insecure
  ```

  Optional: install the harness unit `systemd/user/hermes-dashboard.service` into `~/.config/systemd/user/`, then `systemctl --user enable --now hermes-dashboard`. If Windows still cannot reach WSL on `localhost:9119`, run `bash "$AGENT_HARNESS_HOME/scripts/update-wsl-portproxy.sh"` (or `scripts/fix-hermes-kanban-ui.sh`) from the harness repo.

## Board bootstrap (once per machine)

```bash
AGENT_HARNESS_HOME=~/dev/Project/agent-harness \
  bash "$AGENT_HARNESS_HOME/scripts/kanban-init-project-board.sh" arbeyes-defi
```

## Fixtures (CI)

Capture real settled competitions under `tests/fixtures/` (exact subdir in `docs/16-test-plan.md` / `docs/17-cursor-agentic-implementation-prompt.md`). Do not rely on live HTTP in default `cargo test`.

## OpenSrc

Edit `.harness/research/opensrc-paths/github.com__cowprotocol__services.path` if your `cowprotocol/services` clone lives elsewhere.
