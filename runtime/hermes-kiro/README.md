# Hermes + multi-provider bridge

This project uses real Nous Hermes Agent as the runtime and a local OpenAI-compatible bridge (`127.0.0.1:8787`) as the custom model provider.

Default backend: **Kiro** (`kiro-current` via `kiro-cli`). Optional backend: **Cursor** (`cursor-composer-2` via headless Cursor Agent — edits + shell in workspace).

## Correct services

```bash
systemctl --user list-units --type=service | grep -Ei "kiro|hermes|gateway"
```

Expected:

```text
hermes-gateway.service
kiro-openai-bridge.service
```

## Forbidden service

Do not enable:

```text
telegram-kiro-gateway.service
```

That bypasses Hermes and causes Telegram polling conflicts.

## Provider switch

```bash
scripts/aegis-model.sh status
scripts/aegis-model.sh kiro
scripts/aegis-model.sh cursor   # headless agent; auth via setup-cursor-bridge-auth.sh
```

Telegram `/provider` (skill auto-installed by `scripts/install-systemd-user.sh`):

```text
/provider
/provider kiro
/provider cursor
/reset
```

## Cursor auth and mode

```bash
scripts/setup-cursor-bridge-auth.sh   # agent login or verify CURSOR_API_KEY
```

In `~/.hermes/.env` (see `runtime/aegis-model.env.example`):

- `CURSOR_BRIDGE_MODE=agent` (default) — file edits + shell
- `CURSOR_BRIDGE_MODE=ask` — read-only Q&A fallback

Restart bridge after env changes: `systemctl --user restart kiro-openai-bridge`

## Bridge checks

```bash
curl -s http://127.0.0.1:8787/health | jq
curl -s http://127.0.0.1:8787/v1/models | jq
curl -s http://127.0.0.1:8787/v1/admin/provider | jq
curl -s -X POST http://127.0.0.1:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"kiro-current","messages":[{"role":"user","content":"Say OK"}]}' | jq
```

After switching to Cursor:

```bash
scripts/aegis-model.sh cursor
scripts/smoke-cursor-bridge.sh
scripts/aegis-model.sh kiro
```

## Restart

```bash
systemctl --user restart kiro-openai-bridge.service
systemctl --user restart hermes-gateway.service
```

## Logs

```bash
journalctl --user -u kiro-openai-bridge.service -f
journalctl --user -u hermes-gateway.service -f
```
