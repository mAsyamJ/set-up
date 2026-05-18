# Aegis Hackathon Kit — Documentation

Kit playbooks for Hermes, Kiro, and hackathon execution. Product specs live in [../](../) (numbered `00-*` … `16-*`).

Legacy path `tools/docs/` redirects here.

Topics: SEABW / Aegis Protocol daily setup, Hermes 24/7, Kiro agents, hackathon lifecycle, AI collaboration proof.

| Doc | Topic |
|-----|--------|
| [01-daily-setup.md](01-daily-setup.md) | Debian login, systemd stack, MCP, debug |
| [02-hermes-24-7.md](02-hermes-24-7.md) | Telegram gateway, slash commands, `/plan`, grill-me |
| [03-kiro-agents.md](03-kiro-agents.md) | Orchestrator, builder, security, pitch, qa |
| [04-hackathon-lifecycle.md](04-hackathon-lifecycle.md) | Prep → build → grill → production → push |
| [05-ai-collaboration.md](05-ai-collaboration.md) | `Co-authored-by`, commit template, collaboration log |
| [06-mvp-and-demo.md](06-mvp-and-demo.md) | Product scope, MVP modules, demo proof |
| [07-memory-architecture.md](07-memory-architecture.md) | Hivemind, Hermes, Kiro bridge, shared memory |

## Templates (copy to hackathon app root)

| Template | Use |
|----------|-----|
| [templates/HACKATHON.md](templates/HACKATHON.md) | Root checklist in your app repo |
| [templates/AI_COLLABORATION_LOG.md](templates/AI_COLLABORATION_LOG.md) | `docs/AI_COLLABORATION_LOG.md` in app repo |
| [templates/git-commit-template.txt](templates/git-commit-template.txt) | Optional `~/.gitmessage` via `scripts/setup-shell.sh` |

Back to [../../README.md](../../README.md).
