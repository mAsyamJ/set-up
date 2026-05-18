# Agent roles

Specialist prompts for the Aegis RPC agent swarm. Give each coding agent **only** its role file plus the relevant `docs/` and `tasks/` slice.

| File | Role | Kiro agent |
|------|------|------------|
| [AGENTS.md](AGENTS.md) | **Product swarm contract** — mission, truths, architecture, coding rules | — |
| [orchestrator-agent.md](orchestrator-agent.md) | Scope, sequencing, dependencies | `kiro-cli --agent aegis-orchestrator` |
| [backend-rpc-agent.md](backend-rpc-agent.md) | `/api/rpc`, passthrough, JSON-RPC | `kiro-cli --agent backend-rpc` |
| [policy-engine-agent.md](policy-engine-agent.md) | Policy schema, verdict engine | `kiro-cli --agent policy-engine` |
| [adapter-agent.md](adapter-agent.md) | Adapter interface, Chainlink, approval risk | `kiro-cli --agent adapter` |
| [transaction-decoder-agent.md](transaction-decoder-agent.md) | Tx decode, ERC20 approve | `kiro-cli --agent tx-decoder` |
| [smart-contract-agent.md](smart-contract-agent.md) | Policy registry, Base Sepolia | `kiro-cli --agent smart-contract` |
| [frontend-dashboard-agent.md](frontend-dashboard-agent.md) | OpsRisk dashboard | `kiro-cli --agent frontend` |
| [database-agent.md](database-agent.md) | Audit log | `kiro-cli --agent database` |
| [ai-memo-agent.md](ai-memo-agent.md) | AI memo (post-policy) | `kiro-cli --agent ai-memo` |
| [qa-agent.md](qa-agent.md) | Tests, smoke, acceptance | `kiro-cli --agent qa` |
| [pitch-agent.md](pitch-agent.md) | Demo script, judge Q&A | `kiro-cli --agent pitch` |
| [devops-agent.md](devops-agent.md) | Deploy, Vercel, env | `kiro-cli --agent devops` |

Generalist agents (cross-cutting work):

| Kiro agent | Use |
|------------|-----|
| `kiro-cli --agent builder` | Multi-module implementation tasks |
| `kiro-cli --agent security` | Policy review, honest security posture |

Kit workflow (Hermes, Kiro, Hivemind): root [AGENTS.md](../AGENTS.md).

## Hermes Kanban assignees

Same swarm, same names — use as `--assignee` in `hermes kanban create`:

`aegis-orchestrator` · `aegis-backend-rpc` · `aegis-policy-engine` · `aegis-adapter` · `aegis-tx-decoder` · `aegis-smart-contract` · `aegis-frontend` · `aegis-database` · `aegis-ai-memo` · `aegis-qa` · `aegis-pitch` · `aegis-devops`
