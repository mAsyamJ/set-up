# Systematic Debugging Commands

```bash
pnpm build
pnpm test
journalctl --user -u kiro-openai-bridge.service -n 100 --no-pager
journalctl --user -u hermes-gateway.service -n 100 --no-pager
```

