# Hermes + Kiro Runtime

This project uses real Nous Hermes Agent as the runtime and a local Kiro OpenAI-compatible bridge as the custom model provider.

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

## Bridge checks

```bash
curl -s http://127.0.0.1:8787/health | jq
curl -s http://127.0.0.1:8787/v1/models | jq
curl -s -X POST http://127.0.0.1:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"kiro-current","messages":[{"role":"user","content":"Say OK"}]}' | jq
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
