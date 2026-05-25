# Daily setup (Debian / WSL)

Paths assume `~/dev/Project/agent-harness`.

## First time only

```bash
~/dev/Project/agent-harness/scripts/install-systemd-user.sh
~/dev/Project/agent-harness/scripts/setup-shell.sh
source ~/.bashrc
```

`install-systemd-user.sh` links units from `systemd/user/`, enables `aegis-stack.target`, and waits for bridge health.

`setup-shell.sh` adds the `aegis-dev` alias and optional git commit template.

## Every login

```bash
aegis-dev
# or: ~/dev/Project/agent-harness/scripts/start-aegis-dev.sh
```

This starts `aegis-stack.target` (Kiro bridge on **8787**, then Hermes gateway), polls `/health`, and runs smoke checks.

## Start Kiro

```bash
cd ~/dev/Project/agent-harness
kiro-cli --agent aegis-orchestrator
```

Inside Kiro:

```txt
/tools
Call @real-hermes/real_hermes_stack_health and summarize the result.
```

## Key paths

| What | Path |
|------|------|
| Kit repo | `~/dev/Project/agent-harness` |
| Hermes CLI | `~/.local/bin/hermes` |
| Hermes config | `~/.hermes/config.yaml` |
| Kiro agents | `.kiro/agents/` |
| MCP server | `tools/real-hermes-mcp/` |
| systemd units | `systemd/user/` → `~/.config/systemd/user/` |

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/install-systemd-user.sh` | Install and enable systemd stack |
| `scripts/start-aegis-dev.sh` | Daily health check + start stack |
| `scripts/setup-shell.sh` | `aegis-dev` alias + git template |
| `scripts/start-real-hermes-mcp.sh` | Manual MCP stdio test |
| `scripts/real-hermes.sh` | CLI bridge (`status`, `gateway-logs`) |

## MCP (stdio, not HTTP)

Kiro spawns MCP automatically via [.kiro/agents/aegis-orchestrator.json](../../.kiro/agents/aegis-orchestrator.json). Implementation: [real-hermes-mcp/src/server.ts](../real-hermes-mcp/src/server.ts).

Manual test:

```bash
~/dev/Project/agent-harness/scripts/start-real-hermes-mcp.sh
# Ctrl+C if silent
```

## Provider chain (Telegram)

```txt
Telegram → hermes-gateway → http://127.0.0.1:8787/v1
         → kiro-openai-bridge → kiro-provider.sh → kiro-cli
```

Do **not** use `telegram-kiro-gateway` (no Hivemind capture). See [07-memory-architecture.md](07-memory-architecture.md).

## Shared memory (Hivemind)

```bash
hivemind status
~/dev/Project/agent-harness/scripts/verify-hivemind-shared-memory.sh
```

If wiki summaries fail (502 in `~/.hermes/hooks/deeplake-wiki.log`):

```bash
~/dev/Project/agent-harness/scripts/diagnose-hivemind-capture.sh
```

Kiro: use `hivemind_search` via `@hivemind` MCP before claiming no prior context.

## Debug checklist

### `aegis-dev: command not found`

```bash
~/dev/Project/agent-harness/scripts/setup-shell.sh
source ~/.bashrc
```

### Telegram Connection error / retries

```bash
curl -sf http://127.0.0.1:8787/health
journalctl --user -u kiro-openai-bridge -n 30 --no-pager -l
~/dev/Project/agent-harness/scripts/install-systemd-user.sh
aegis-dev
```

Common cause: `env: 'node': No such file or directory` — fixed by repo `systemd/user/kiro-openai-bridge.service` using absolute Node path.

### Kiro MCP not listed

Run from kit root. Ensure `mcpServers` is in `aegis-orchestrator.json` (not only `kiro_default`). See [03-kiro-agents.md](03-kiro-agents.md).

### `npm run start` silent (MCP)

Normal for stdio MCP — waiting for Kiro on stdin.

### Gateway stops when WSL closes

```bash
sudo loginctl enable-linger $USER
```

Keep Debian session running while using Telegram.

### WSL persistence

See [02-hermes-24-7.md](02-hermes-24-7.md) for 24/7 gateway operations.
