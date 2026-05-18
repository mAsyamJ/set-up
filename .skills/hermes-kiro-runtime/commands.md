# Hermes Kiro Runtime Commands

```bash
systemctl --user list-units --type=service | grep -Ei "kiro|hermes|gateway"
curl -s http://127.0.0.1:8787/health | jq
journalctl --user -u kiro-openai-bridge.service -n 100 --no-pager
journalctl --user -u hermes-gateway.service -n 100 --no-pager
```

