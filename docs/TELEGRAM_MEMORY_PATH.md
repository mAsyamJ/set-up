# Telegram memory path (verification)

**Use:** native `hermes-gateway` only (systemd). **Do not** use `telegram-kiro-gateway`.

| Check | Expected |
|-------|----------|
| `systemctl --user is-active hermes-gateway` | `active` |
| `systemctl --user is-active telegram-kiro-gateway` | `inactive` |
| Telegram bot | Hermes gateway bot (see `hermes gateway status`) |
| Home channel | `/set-home` in Telegram (see `TELEGRAM_HOME_CHANNEL` in `~/.hermes/config.yaml`) |

Provider chain:

```text
Telegram → hermes-gateway → http://127.0.0.1:8787/v1 → kiro-openai-bridge → kiro-cli
```

Shared org memory: **Hivemind** (Deeplake). See [docs/kit/07-memory-architecture.md](kit/07-memory-architecture.md).
