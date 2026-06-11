# Aegis Provider Switch

## Description

Switch the Hermes Telegram model backend between local Kiro (`kiro-cli`), headless Cursor Agent (`cursor-composer-2` via bridge), and OpenAI Codex (`openai-codex` via the authenticated local Codex CLI) without changing the Hermes gateway URL.

## When to use

- User sends `/provider`, `/provider kiro`, `/provider cursor`, or `/provider codex` in Telegram
- User asks which inference backend Hermes is using
- User wants to move Telegram inference from Kiro to Cursor or back

## When not to use

- Do not change `~/.hermes/config.yaml` provider URL (stays `http://127.0.0.1:8787/v1`)
- Do not expose bridge port `:8787` beyond localhost
- Do not print or commit `CURSOR_API_KEY`

## Install (once)

```bash
mkdir -p ~/.hermes/skills/aegis-provider-switch
cp ~/dev/Project/agent-harness/docs/kit/templates/hermes-provider-switch/SKILL.md \
  ~/.hermes/skills/aegis-provider-switch/SKILL.md
```

Restart Hermes gateway after installing:

```bash
systemctl --user restart hermes-gateway
```

## Slash command behavior

When the user invokes `/provider` with optional argument `kiro`, `cursor`, or `codex`:

### `/provider` (no args)

Run:

```bash
curl -sf http://127.0.0.1:8787/v1/admin/provider
```

Reply with:

- Current `defaultModel` (`kiro-current`, `cursor-composer-2`, or `openai-codex`)
- Whether Cursor is configured (`cursorConfigured`)
- Each available provider and `ready` status

### `/provider kiro`

Run:

```bash
curl -sf -X POST http://127.0.0.1:8787/v1/admin/provider \
  -H "Content-Type: application/json" \
  -d '{"provider":"kiro-current","updatedBy":"telegram"}'
```

Confirm switch to Kiro. Tell the user to run `/reset` for a clean session on the new backend.

### `/provider cursor`

Run:

```bash
curl -sf -X POST http://127.0.0.1:8787/v1/admin/provider \
  -H "Content-Type: application/json" \
  -d '{"provider":"cursor-composer-2","updatedBy":"telegram"}'
```

If the API returns an error about Cursor not being configured, tell the user to run once:

```bash
agent login
systemctl --user restart kiro-openai-bridge
```

Or set `CURSOR_API_KEY` in `~/.hermes/.env` (see `runtime/aegis-model.env.example`).

On success, note that Cursor agent mode can edit files and run shell in the workspace (slower than Kiro). Tell the user to run `/reset`.

### `/provider codex`

Run:

```bash
curl -sf -X POST http://127.0.0.1:8787/v1/admin/provider \
  -H "Content-Type: application/json" \
  -d '{"provider":"openai-codex","updatedBy":"telegram"}'
```

If the API returns an error about Codex not being configured, tell the user to run once:

```bash
codex login
systemctl --user restart kiro-openai-bridge
```

Optional envs live in `runtime/aegis-model.env.example`: `OPENAI_CODEX_MODEL_INTERACTIVE`, `OPENAI_CODEX_REASONING_EFFORT`. Background Responses audit automation separately requires `OPENAI_API_KEY`.

On success, tell the user that Codex is the bridge backend for interactive Hermes chat and long-running audit automation. Tell the user to run `/reset`.

## Notes

- Switching affects all Hermes inference (Telegram + Kanban workers) until switched back.
- Hermes `/model` still shows the custom OpenAI endpoint URL; backend routing is inside the bridge.
- CLI equivalent: `~/dev/Project/agent-harness/scripts/aegis-model.sh status|kiro|cursor|codex`
