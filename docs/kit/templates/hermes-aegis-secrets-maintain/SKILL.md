---
name: aegis-secrets-maintain
description: "Maintain ~/.hermes/.env API keys for headless Hermes (authorized; never echo secrets)."
version: 1.0.0
author: Aegis Hackathon Kit
license: MIT
platforms: [linux, macos]
metadata:
  hermes:
    tags: [secrets, credentials, bridge, telegram, headless]
    related_skills: [aegis-provider-switch]
---

# Aegis secrets maintenance (authorized)

Operator authorized Hermes/Kanban to **read/write** `~/.hermes/.env` for headless 24/7 — see `aegis-rpc/DECISIONS.md`.

## Rules

- **Never** print, commit, or Telegram-deliver `TELEGRAM_BOT_TOKEN`, `CURSOR_API_KEY`, or wallet secrets.
- **Never** ask the user to paste API keys in Telegram. Direct them to edit `~/.hermes/.env` locally or run `agent login` in a terminal with a browser.
- Cron/PM status scripts only report `OK` / `MISSING` — not values.

## When to use

- Bridge health shows `configured: false` for Cursor.
- PM tick reports `cursor=MISSING` or `telegram=MISSING`.
- Kanban worker blocked on model 502 / `CURSOR_NOT_CONFIGURED`.

## Commands (kit repo)

```bash
# Read-only one-liner (safe for logs)
~/dev/Project/agent-harness/scripts/aegis-secrets-health.sh

# Repair: restart bridge/gateway, refresh agent session if logged in
~/dev/Project/agent-harness/scripts/aegis-secrets-maintain.sh

# Full stack repair
~/dev/Project/agent-harness/scripts/fix-hermes-telegram-gate.sh
```

## Headless repair path

1. If `CURSOR_API_KEY` is set in `~/.hermes/.env` → run `aegis-secrets-maintain.sh` (restarts `kiro-openai-bridge`).
2. Else if interactive TTY → `scripts/setup-cursor-bridge-auth.sh` (`agent login`).
3. Else → `kanban_block` with reason: set `CURSOR_API_KEY` in `~/.hermes/.env` (authorized); do not paste in chat.

## Env keys (reference)

See `runtime/aegis-model.env.example`: `CURSOR_API_KEY`, `CURSOR_BRIDGE_MODE=agent`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_FALLBACK_IPS`.
