# Aegis Hackathon Kit Agent Workflow

Default workflow: **Hermes** as 24/7 phone/gateway runtime; **Kiro orchestrator** as primary coding agent.

> **Product swarm contract** (Aegis RPC MVP, policy, adapters): see **[agents/AGENTS.md](agents/AGENTS.md)** — do not duplicate product rules here.

## Runtimes

| System | Role |
|--------|------|
| **Kiro** (`kiro-cli --agent aegis-orchestrator`) | Coding, planning, subagents in repo |
| **Hermes gateway** | Telegram 24/7, skills, `/plan`, memory |
| **Kiro bridge** (`http://127.0.0.1:8787/v1`) | Model backend for Hermes Telegram (not Kiro IDE session) |

## Memory architecture (Hivemind)

**Hivemind** (`hivemind install`) is the shared org memory layer across Cursor, Hermes, and Codex. Kiro uses the same store via **`hivemind` MCP** in [`.kiro/settings/mcp.json`](.kiro/settings/mcp.json).

| Layer | What it is |
|-------|------------|
| **Hivemind / Deeplake** | Cross-agent session capture + `hivemind_search` |
| **Hermes `memory` tool** | Hermes-only durable facts (auxiliary) |
| **Kiro `~/.kiro/sessions/`** | Kiro CLI local transcripts (not auto-shared) |
| **Filesystem** | `AGENTS.md`, `.hermes/plans/`, Kanban — coordination |

Telegram: use **`hermes-gateway`** only (not `telegram-kiro-gateway`). Verify: `scripts/verify-hivemind-shared-memory.sh`. Details: [docs/kit/07-memory-architecture.md](docs/kit/07-memory-architecture.md).

## Kiro agents

Hermes coordinates conceptually; in practice use Kiro subagents:

| Agent | Use |
|-------|-----|
| `aegis-orchestrator` | Default; delegates work |
| `builder` | MVP implementation |
| `security` | Policy / Web3 risk review |
| `pitch` | Narrative and **grill-me** judge Q&A |
| `qa` | Demo blockers + AI collaboration proof |

Details: [docs/kit/03-kiro-agents.md](docs/kit/03-kiro-agents.md)

## Hermes commands

Daily stack: `aegis-dev`  
Slash commands: `/commands`, `/plan`, `/set-home`, `/model`  
Grill me: [docs/kit/02-hermes-24-7.md](docs/kit/02-hermes-24-7.md)

## Hackathon lifecycle

Prep → scaffold → **one commit per MVP module** → grill → production → push.

Full playbook: [docs/kit/04-hackathon-lifecycle.md](docs/kit/04-hackathon-lifecycle.md)  
App checklist template: [docs/kit/templates/HACKATHON.md](docs/kit/templates/HACKATHON.md)

## AI collaboration proof

Every AI-assisted commit: `Co-authored-by` trailers + update `docs/AI_COLLABORATION_LOG.md` in the app repo.

Guide: [docs/kit/05-ai-collaboration.md](docs/kit/05-ai-collaboration.md)

## Rules

- Do not create final product implementation in **this kit repo** before official hackathon build start.
- Do not fake Kiro or AI usage.
- Do not use private keys.
- Avoid Docker unless necessary.
- Do not push or deploy without approval.

## Learned User Preferences

- On Debian/WSL login, run `aegis-dev` (or `scripts/start-aegis-dev.sh`) to smoke-check bridge, gateway, and MCP before coding.
- Use Hermes Telegram for short coordination, `/plan`, and Kanban routing; keep heavy `kiro-cli` install/build work in Kiro CLI, Cursor, or Kanban worker profiles—not one long Telegram message.
- Use `/busy queue` for follow-ups during active Hermes runs instead of interrupting the current task.
- When implementing an attached plan: do not edit the plan file; mark existing todos in progress and complete them without recreating.
- Keep hackathon playbooks under `docs/kit/`; product specs under `docs/`; kit root for orchestration assets.

## Learned Workspace Facts

- Kit repo: `~/dev/Project/aegis-hackathon-kit`; planned app repo: `~/dev/Project/Aegis/aegis-protocol-hackathon` (when scaffolded).
- Hermes Kanban boards: `aegis-kit` (infra), `aegis-hackathon` (MVP modules); assignees use profiles `aegis-orchestrator`, `aegis-builder`, `aegis-security`, `aegis-qa`, `aegis-pitch`.
- Cron jobs: `kanban-orchestrator-tick` (every 30m), `aegis-stack-health` (daily 09:00 via `~/.hermes/scripts/aegis-stack-health.sh`).
- `hermes cron create` expects schedule and prompt before flags; Kanban tasks need `--workspace "dir:<absolute-path>"`.
- Telegram `/set-home` is required for cron delivery to `origin`; WSL 24/7 needs `loginctl enable-linger` and the WSL VM kept running (Windows shutdown stops Telegram).
- 24/7 ops runbook: `.hermes/plans/24-7-multi-agent-environment.md`; extended Hermes guide: [docs/kit/02-hermes-24-7.md](docs/kit/02-hermes-24-7.md).
- Repo layout audit: [REPO_RESTRUCTURE_AUDIT.md](REPO_RESTRUCTURE_AUDIT.md)
