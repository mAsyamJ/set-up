# Runtime config (repo)

Local Hermes/Kiro **examples** and env templates. Live runtime state lives in `~/.hermes/` and user systemd.

| Path | Purpose |
|------|---------|
| [hermes-kiro/](hermes-kiro/) | Bridge/gateway notes and examples |
| [hermes-hivemind.env.example](hermes-hivemind.env.example) | Example Hivemind-related env vars |

Active services (user):

```bash
systemctl --user status hermes-gateway kiro-openai-bridge
```

Implementation: [tools/kiro-openai-bridge/](../tools/kiro-openai-bridge/), [systemd/user/](../systemd/user/).  
Playbooks: [docs/kit/](../docs/kit/).
