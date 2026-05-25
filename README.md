# Agent Harness OS

A **portable agentic engineering control plane** for running multi-agent workflows 24/7. Attach it to any codebase with a `.harness/` adapter — no harness code changes required.

**Hermes** orchestrates (Telegram, cron, Kanban). **Cursor** and **Kiro** implement via a local bridge. **MCP** and **A2A** expose typed tools and agent-to-agent tasks. **RAG** and **Obsidian** provide layered knowledge with explicit trust boundaries.

**Default product:** [Aegis RPC](projects/aegis-rpc/) — `projects/aegis-rpc/`

---

## What it is

Agent Harness is **not** a single chatbot. It is an operating system for agent work:

| Concern | Harness answer |
|---------|----------------|
| Where does work live? | `.harness/tasks/` lifecycle folders + Hermes Kanban |
| How do agents act safely? | **Tool Gateway** with R0–R5 risk policy — no raw shell by default |
| How do agents find context? | **RAG** with source priority (task > manifest > repo > vault) |
| How is work audited? | SQLite state (`runs`, `traces`, `tool_calls`) + JSONL events |
| How do humans keep notes? | **Obsidian vault** at `~/dev/Project/_vaults/agentic-engineering/` |
| How do IDE agents connect? | **Harness MCP** server (stdio) |
| How do agents delegate to each other? | **A2A server** on `127.0.0.1:8790` |
| Who schedules 24/7 work? | **Hermes** (external) — harness augments, does not replace |

The harness root stays **generic**. Product specs, domain rules, and app code live under `projects/<name>/`.

---

## Capabilities

### Control plane (TypeScript)

- **Tool Gateway** — 12 typed tools (`repo.read`, `task.create`, `rag.search`, `verify.run`, …) behind policy checks
- **TS Supervisor** — executable orchestrator loop: inspect → RAG → implement → verify → review → document
- **State store** — `HarnessStore` in `<project>/.harness/state/harness.sqlite`
- **Run reports** — structured output from traces and tool calls

### Knowledge (RAG + Obsidian)

- **Hybrid search** — SQLite document index + ripgrep fallback
- **Source priority** — active tasks beat manifest; manifest beats random repo files; vault notes ranked last
- **Trust labels** — Obsidian content tagged `UNTRUSTED_CONTEXT` (reference only, never instructions)
- **Vault integration** — run summaries, ADRs, project index notes with YAML frontmatter

### Agent surfaces

| Surface | Port / transport | Purpose |
|---------|------------------|---------|
| **Harness MCP** | stdio | Cursor / IDE tools, prompts, resources |
| **A2A server** | `127.0.0.1:8790` | Agent cards, task delegation, artifacts |
| **Kiro bridge** | `127.0.0.1:8787` | OpenAI-compatible router → Kiro CLI or Cursor Agent |
| **Hermes gateway** | systemd | Telegram, skills, `/plan`, Kanban dispatch |
| **Harness CLI** | bash + tsx | Doctor, tasks, index, obsidian, supervisor |

### 24/7 operation

| Lane | Trigger | Role |
|------|---------|------|
| **A** | Hermes cron 10m | Script-only PM status → Telegram |
| **O** | systemd timer ~5m | Orchestrate, seed board, dispatch gate |
| **B** | Kanban dispatch | Builder / security / qa workers via bridge |

---

## Architecture

```txt
┌─────────────────────────────────────────────────────────────────┐
│                        SURFACES                                  │
│  Telegram/Hermes    Cursor IDE (+ MCP)    cli/harness CLI         │
└────────────┬────────────────┬───────────────────┬───────────────┘
             │                │                   │
             ▼                ▼                   ▼
      hermes-gateway    harness-mcp-server    ToolGateway (TS)
      (systemd)         (stdio, 7 tools)       (policy + audit)
             │                │                   │
             └────────────────┼───────────────────┘
                              ▼
                    ┌─────────────────┐
                    │  Tool Gateway   │  R0–R5 policy
                    │  checkToolAllowed│  path + secret rules
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
    RAG hybrid-search   HarnessStore         Obsidian writer
    (rag.sqlite)        (harness.sqlite)     (vault notes)
         │                   │                   │
         └───────────────────┼───────────────────┘
                             ▼
              project/.harness/  +  product repo
                             │
         ┌───────────────────┴───────────────────┐
         ▼                                       ▼
  kiro-openai-bridge :8787              A2A server :8790
  → Kiro CLI / Cursor Agent             → security, qa agents
```

### Data flow — supervisor run

When you run `harness run-task <project> <task.md>`:

```txt
Load task file
  → project.inspect (manifest + context + active tasks)
  → rag.search (grounding with citations)
  → router picks agent from agents/registry.json
  → gateway tools only (no shell.run)
  → verify.run (manifest commands)
  → parallel review (security + qa via A2A or Kanban hook)
  → task.move to review/done
  → obsidian run-summary → vault 06-Runs/
  → run-report from SQLite traces
```

### Knowledge layers

```txt
Priority (highest first):
  1. Active task files       (.harness/tasks/active/)
  2. Manifest + context      (.harness/project.manifest.json, project-context.md)
  3. Product repo docs       (paths from manifest)
  4. Obsidian vault notes    (UNTRUSTED_CONTEXT)
  5. Harness kit docs        (read-only, harness root)
  6. Run traces              (audit, lowest priority)
```

Vault location: `~/dev/Project/_vaults/agentic-engineering/` — shared across projects, not in any git repo.

---

## Repository layout

```txt
agent-harness/
├── cli/harness                 # Unified CLI entrypoint
├── core/
│   ├── policy/                 # tool-policy.ts, path-policy.ts
│   ├── state/                  # HarnessStore (SQLite)
│   ├── observability/          # run-report, events
│   └── orchestrator/           # planner, router, dispatcher, run-loop, reviewer
├── rag/
│   ├── ingestion/              # repo, task, docs indexers
│   ├── retrieval/              # hybrid-search
│   ├── stores/                 # sqlite-fts (document index)
│   ├── sources/                # obsidian-source
│   └── policies/               # source-priority, source-trust
├── integrations/obsidian/      # vault-config, frontmatter, note-writer
├── tools/
│   ├── gateway/                # ToolGateway, CLI wrappers
│   └── policies/               # default.tool-policy.json (R0–R5)
├── runtime/
│   ├── mcp/harness-mcp-server/ # Cursor MCP (tools + prompts + resources)
│   ├── a2a/harness-a2a-server/ # Local A2A on :8790
│   └── hermes/                 # skill bridge for Hermes MCP
├── agents/                     # Generic personas + registry.json
├── skills/                     # Canonical skill registry
├── docs/                       # Architecture docs 00–09
├── docs/kit/                   # Hermes/Kiro playbooks (deep dives)
├── scripts/                    # Bridge, PM cron, Kanban dispatch, validation
├── systemd/                    # User units (bridge, dispatch timer)
└── projects/
    └── aegis-rpc/              # Default product + .harness adapter
```

**Agent read order:** [AGENTS.md](AGENTS.md) → `.harness/project.manifest.json` → project `AGENTS.md` → active tasks.

---

## Security model (R0–R5)

All agent actions go through the Tool Gateway. Risk classes in `tools/policies/default.tool-policy.json`:

| Class | Default | Examples |
|-------|---------|----------|
| **R0** | allow | `repo.read`, `git.status`, `project.inspect`, `rag.search` |
| **R1** | allow | `task.create`, `task.move`, `verify.run` |
| **R2** | allow preview / deny apply | `patch.propose` ✓ · `repo.apply_patch` ✗ |
| **R3** | deny | `shell.run` |
| **R4** | deny | `github.push`, deploy |
| **R5** | deny | `.env`, secrets, `secrets.read` |

Forbidden argument patterns: `rm -rf`, `curl | sh`, `cat .env`, etc.

**Network binding:** bridge `:8787` and A2A `:8790` bind **`127.0.0.1` only** — never expose publicly.

---

## Project adapter

Any project attaches via `.harness/` — no harness code changes:

```txt
my-project/
├── .harness/
│   ├── project.manifest.json   # identity, paths, commands, agents
│   ├── project-context.md      # domain rules
│   ├── obsidian.config.json    # vault link (optional)
│   ├── rag.config.json         # index globs (optional)
│   ├── tasks/{backlog,active,review,done,blocked}/
│   └── state/                  # harness.sqlite, rag.sqlite, events/
├── .cursor/rules/              # synced from harness templates
├── AGENTS.md                   # product agent contract
└── HARNESS.md                  # project-specific harness notes
```

Scaffold: `cli/harness init-project projects/my-app`

Spec: [docs/09-project-adapter.md](docs/09-project-adapter.md)

---

## Prerequisites

- **Debian / WSL2** (tested layout)
- **Node.js** v20+ (v22 recommended) + npm
- **pnpm** (optional, for workspace packages)
- **ripgrep** (`rg`) — RAG fallback search
- **Hermes CLI** at `~/.local/bin/hermes`
- **Kiro CLI** (optional) or **Cursor Agent CLI** for bridge backend
- **systemd user session** with linger enabled (24/7 on WSL)

---

## First-time setup

### 1. Environment

Add to `~/.bashrc`:

```bash
export AGENT_HARNESS_HOME=~/dev/Project/agent-harness
export AEGIS_PROJECTS_ROOT=$AGENT_HARNESS_HOME/projects
export AEGIS_RPC_ROOT=$AEGIS_PROJECTS_ROOT/aegis-rpc
export AEGIS_WORKSPACE=$AEGIS_RPC_ROOT
```

### 2. Build harness control plane

```bash
cd "$AGENT_HARNESS_HOME"
npm install
npm run build
npm test
```

### 3. Install always-on stack

```bash
scripts/install-systemd-user.sh    # bridge :8787 + Hermes gateway
scripts/setup-shell.sh             # aegis-dev alias
sudo loginctl enable-linger $USER  # survive logout (WSL)
source ~/.bashrc
```

### 4. Wire default project (Aegis RPC)

```bash
cli/harness sync-cursor projects/aegis-rpc
cli/harness sync-skills projects/aegis-rpc
cli/harness obsidian init projects/aegis-rpc
cli/harness index-project projects/aegis-rpc
```

### 5. Hermes Telegram (once per bot/chat)

In Telegram → **Aegis Hermes**:

```txt
/commands
/set-home
```

Bridge must use `http://127.0.0.1:8787/v1` (in `~/.hermes/config.yaml`).

### 6. Optional — Cursor as bridge backend

```bash
scripts/setup-cursor-bridge-auth.sh
# In ~/.hermes/.env: CURSOR_BRIDGE_MODE=agent
systemctl --user restart kiro-openai-bridge
```

Telegram: `/provider cursor` then `/reset`.

### 7. Optional — headless 24/7 PM lanes

```bash
scripts/install-aegis-headless-24-7.sh
```

### 8. Verify

```bash
aegis-dev
cli/harness doctor projects/aegis-rpc
cli/harness status projects/aegis-rpc
curl -sf http://127.0.0.1:8787/health && echo OK
scripts/harness-validation.sh projects/aegis-rpc
```

Full acceptance: `npm run acceptance`

---

## Daily operation

Every login:

```bash
aegis-dev
```

| Goal | Command |
|------|---------|
| Stack health | `aegis-dev` or `scripts/start-aegis-dev.sh` |
| Project health | `cli/harness doctor projects/aegis-rpc` |
| Task queue | `cli/harness status projects/aegis-rpc` |
| Bridge health | `curl -sf http://127.0.0.1:8787/health` |
| Switch Kiro ↔ Cursor | `scripts/aegis-model.sh status\|kiro\|cursor` or Telegram `/provider` |
| Re-index knowledge | `cli/harness index-project projects/aegis-rpc` |
| Scheduled doctor (cron) | `cli/harness start-hermes-doctor projects/aegis-rpc` |
| Gateway logs | `journalctl --user -u hermes-gateway -f -l` |
| Bridge logs | `journalctl --user -u kiro-openai-bridge -f -l` |
| Restart stack | `systemctl --user restart aegis-stack.target` |
| Kanban UI | http://127.0.0.1:9119/kanban?board=aegis-hackathon |

After switching provider in Telegram, always send **`/reset`** before the next long task.

---

## Harness CLI

Entrypoint: `cli/harness` (add `$AGENT_HARNESS_HOME/cli` to PATH or call with full path).

### Health and status

```bash
cli/harness doctor <project>          # manifest, tasks, bridge, systemd, kanban
cli/harness status <project>          # task folder counts
cli/harness smoke <project>           # full stack smoke (Hermes, bridge, MCP)
```

### Tasks and verification

```bash
cli/harness new-task <project> "Title" [phase] [--kanban]
cli/harness verify-task <project> .harness/tasks/active/my-task.md
cli/harness sync-kanban <project>     # sync task files ↔ Kanban board
```

### Tool gateway (single tool call)

```bash
cli/harness run-task <project> <tool> '<json-args>'
# Examples:
cli/harness run-task projects/aegis-rpc project.inspect
cli/harness run-task projects/aegis-rpc rag.search '{"query":"manifest"}'
cli/harness run-task projects/aegis-rpc git.status '{}'
```

### Supervisor loop (full orchestrator)

```bash
cli/harness run-task <project> .harness/tasks/backlog/my-task.md
```

Runs: inspect → RAG → verify → review → task move → obsidian summary → run-report.

### Knowledge (RAG + Obsidian)

```bash
cli/harness index-project <project>              # full reindex
cli/harness index-project <project> --incremental

cli/harness obsidian init <project>              # scaffold vault + project index
cli/harness obsidian capture <project> "Title"   # quick note to inbox
cli/harness obsidian run-summary <project> <run-id>
cli/harness obsidian adr <project> "Decision title"
```

### Observability

```bash
cli/harness run-report <project>                 # latest run
cli/harness run-report <project> <run-id>        # specific run
```

### Agent surfaces

```bash
cli/harness start-mcp                            # Harness MCP (stdio; set AEGIS_WORKSPACE)
cli/harness start-a2a                            # A2A server on 127.0.0.1:8790
cli/harness start-hermes-doctor <project>        # doctor + index-project (for cron)
```

### Project scaffolding

```bash
cli/harness init-project projects/my-app
cli/harness link-project projects/my-app
cli/harness sync-cursor projects/my-app
cli/harness sync-skills projects/my-app
```

### npm scripts

```bash
npm run build          # tsc — compile control plane
npm test               # unit tests (policy, RAG, obsidian, A2A trust)
npm run acceptance     # full doc-10 acceptance on temp project
npm run start-mcp
npm run start-a2a
```

---

## MCP integration (Cursor)

Server: `runtime/mcp/harness-mcp-server`

**Tools:** `harness_project_inspect`, `harness_task_create`, `harness_task_move`, `harness_verify_run`, `harness_rag_search`, `harness_repo_read`, `harness_patch_propose`

**Prompts:** `implement-task`, `review-diff`, `security-check`

**Resources:** `harness://project/manifest`, `harness://tasks/active`

Sync into project: `cli/harness sync-cursor projects/aegis-rpc`

Requires `AEGIS_WORKSPACE` pointing to the active project root.

Details: [docs/03-mcp.md](docs/03-mcp.md) · [docs/07-cursor-integration.md](docs/07-cursor-integration.md)

---

## A2A integration

Local agent-to-agent server on **`127.0.0.1:8790`**:

```bash
cli/harness start-a2a
curl -sf http://127.0.0.1:8790/.well-known/agent.json
```

**Endpoints:**

- `GET /.well-known/agent.json` — agent card from `agents/registry.json`
- `GET /agents/:id/card` — per-agent card
- `POST /tasks` — delegate task to security/qa/architect agents

**Trust model:** `local` agents get full gateway access; `remote` agents receive redacted artifacts (no `.env`, truncated diffs).

Details: [docs/04-a2a.md](docs/04-a2a.md)

---

## Working on a project

### Default project (Aegis RPC)

```bash
cd "$AEGIS_RPC_ROOT"
pnpm dev
pnpm test
bash scripts/verify-backend.sh
```

Project harness doc: [projects/aegis-rpc/HARNESS.md](projects/aegis-rpc/HARNESS.md)

### Agent read order (inside a project)

1. `.harness/project.manifest.json` — paths, commands, enabled agents/skills
2. `.harness/project-context.md` — domain rules
3. `AGENTS.md` — product agent contract
4. `ORCHESTRATOR.md` / `DECISIONS.md` — phase and gates (if present)
5. `.harness/tasks/active/` — current work slice

### Task lifecycle

```txt
DISCOVER → MAP → PLAN → TASK → IMPLEMENT → VERIFY → REVIEW → DOCUMENT → HANDOFF
```

| Folder | Meaning |
|--------|---------|
| `backlog/` | Planned |
| `active/` | In progress |
| `review/` | Awaiting verification |
| `done/` | Completed |
| `blocked/` | Blocked (needs human) |

Details: [core/lifecycle/task-lifecycle.md](core/lifecycle/task-lifecycle.md)

---

## Hermes Kanban

| Board | Workspace | Purpose |
|-------|-----------|---------|
| `aegis-hackathon` | `dir:$AEGIS_RPC_ROOT` | Product MVP tasks |
| `aegis-kit` | `dir:$AGENT_HARNESS_HOME` | Harness infra |

Create tasks with absolute workspace paths:

```bash
hermes kanban create --board aegis-hackathon \
  --workspace "dir:$AEGIS_RPC_ROOT" \
  --title "My task" --assignee aegis-builder
```

Dispatch workers (Lane B):

```bash
scripts/aegis-kanban-dispatch-once.sh
```

Workers must end with `hermes kanban complete` or `hermes kanban block`.

Details: [docs/kit/02-hermes-24-7.md](docs/kit/02-hermes-24-7.md) · [docs/08-hermes-integration.md](docs/08-hermes-integration.md)

---

## Headless 24/7 lanes

| Lane | Trigger | Script |
|------|---------|--------|
| **A** | Hermes cron 10m | `aegis-pm-tick-10m.sh` |
| **O** | systemd timer ~5m | `aegis-pm-orchestrate-once.sh` |
| **B** | Kanban dispatch | `hermes kanban dispatch` |

Install: `scripts/install-aegis-headless-24-7.sh`

---

## Adding a new project

```bash
cd "$AGENT_HARNESS_HOME"
cli/harness init-project projects/my-new-app
```

Edit:

- `.harness/project.manifest.json` — name, commands, agents
- `.harness/project-context.md` — domain rules
- `AGENTS.md` — agent contract

Wire up:

```bash
cli/harness link-project projects/my-new-app
cli/harness sync-cursor projects/my-new-app
cli/harness obsidian init projects/my-new-app
cli/harness index-project projects/my-new-app
cli/harness doctor projects/my-new-app
```

---

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `AGENT_HARNESS_HOME` | repo root | Harness root |
| `AEGIS_PROJECTS_ROOT` | `$AGENT_HARNESS_HOME/projects` | All products |
| `AEGIS_RPC_ROOT` | `.../projects/aegis-rpc` | Default project path |
| `AEGIS_WORKSPACE` | `$AEGIS_RPC_ROOT` | Bridge / MCP / worker cwd |
| `AEGIS_KANBAN_BOARD` | `aegis-hackathon` | PM/dispatch board |
| `KIRO_BRIDGE_URL` | `http://127.0.0.1:8787` | Bridge base URL |
| `HARNESS_A2A_PORT` | `8790` | A2A server port |
| `CURSOR_BRIDGE_MODE` | `agent` | `agent` \| `ask` \| `plan` |

Secrets (`TELEGRAM_BOT_TOKEN`, `CURSOR_API_KEY`, deploy keys) go in **`~/.hermes/.env`** or project **gitignored** `.env` — never in repo or chat.

---

## Validation and testing

| Layer | Command | Pass criteria |
|-------|---------|---------------|
| Build | `npm run build` | Zero TS errors |
| Unit | `npm test` | Policy, RAG priority, Obsidian, A2A trust |
| Integration | `scripts/harness-validation.sh <project>` | Doctor, gateway, MCP |
| Full acceptance | `npm run acceptance` | Temp project E2E |
| RAG | `index-project` + `run-task rag.search` | Citations with source priority |
| A2A | `curl 127.0.0.1:8790/.well-known/agent.json` | Valid agent card |
| Security | Read `.env` via gateway | Denied (R5) |

---

## Key scripts

| Script | Purpose |
|--------|---------|
| [scripts/install-systemd-user.sh](scripts/install-systemd-user.sh) | Bridge + gateway units |
| [scripts/start-aegis-dev.sh](scripts/start-aegis-dev.sh) | Daily smoke (`aegis-dev`) |
| [scripts/aegis-model.sh](scripts/aegis-model.sh) | Switch Kiro ↔ Cursor |
| [scripts/aegis-kanban-dispatch-once.sh](scripts/aegis-kanban-dispatch-once.sh) | Lane B dispatch |
| [scripts/harness-validation.sh](scripts/harness-validation.sh) | Control-plane integration test |
| [scripts/harness-acceptance.sh](scripts/harness-acceptance.sh) | Full doc-10 acceptance |
| [scripts/install-aegis-headless-24-7.sh](scripts/install-aegis-headless-24-7.sh) | PM lanes A + O |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Bridge not reachable | `systemctl --user status kiro-openai-bridge`; unmask if needed |
| MCP fails to start | Set `AEGIS_WORKSPACE` to project root |
| RAG returns nothing | Run `cli/harness index-project <project>` |
| Obsidian init permission error | Vault resolves to `~/dev/Project/_vaults/agentic-engineering` |
| Telegram stalls | Send `/reset`; use Kanban for heavy work |
| Wrong workspace edits | Ensure `AEGIS_WORKSPACE=$AEGIS_RPC_ROOT` in bridge unit |
| Provider switch ignored | `/provider cursor` + `/reset` in Telegram |
| Hivemind verify fails | Optional — does not block harness validation |

More: [docs/kit/02-hermes-24-7.md](docs/kit/02-hermes-24-7.md)

---

## Documentation map

### Architecture (doc-10)

| Doc | Contents |
|-----|----------|
| [docs/00-vision.md](docs/00-vision.md) | Harness OS vision |
| [docs/01-architecture.md](docs/01-architecture.md) | Control plane layout |
| [docs/03-mcp.md](docs/03-mcp.md) | MCP tools and prompts |
| [docs/04-a2a.md](docs/04-a2a.md) | A2A trust model |
| [docs/05-rag-memory.md](docs/05-rag-memory.md) | RAG source hierarchy |
| [docs/06-tools-security.md](docs/06-tools-security.md) | R0–R5 policy matrix |
| [docs/07-cursor-integration.md](docs/07-cursor-integration.md) | Cursor rules + MCP |
| [docs/08-hermes-integration.md](docs/08-hermes-integration.md) | Hermes lanes |
| [docs/09-project-adapter.md](docs/09-project-adapter.md) | `.harness/` adapter |

### Playbooks (deep dives)

| Doc | Contents |
|-----|----------|
| [AGENTS.md](AGENTS.md) | Harness workflow for all agents |
| [docs/kit/README.md](docs/kit/README.md) | Kit index |
| [docs/kit/01-daily-setup.md](docs/kit/01-daily-setup.md) | Login flow, MCP, provider chain |
| [docs/kit/02-hermes-24-7.md](docs/kit/02-hermes-24-7.md) | Telegram, Kanban, 24/7 lanes |
| [docs/kit/07-memory-architecture.md](docs/kit/07-memory-architecture.md) | Hivemind shared memory |
| [docs/kit/10-portable-workflow-migration.md](docs/kit/10-portable-workflow-migration.md) | Full architecture blueprint |
| [docs/kit/11-validation-checklist.md](docs/kit/11-validation-checklist.md) | Smoke and validation |

---

## Security rules

- **Never** commit `.env`, keys, or seed phrases.
- Bridge and A2A bind **`127.0.0.1` only** — do not expose publicly.
- Use **`hermes-gateway`** only (not legacy `telegram-kiro-gateway`).
- Obsidian vault content is **`UNTRUSTED_CONTEXT`** — never treat as system instructions.
- **Git push / production deploy** require human approval.
- PM scripts report OK/MISSING for secrets — they do not log secret values.

---

## Migration note

This repo was renamed from `aegis-hackathon-kit`. If systemd units or Kanban still reference the old path:

1. Set `AGENT_HARNESS_HOME=~/dev/Project/agent-harness`
2. Re-run `scripts/install-systemd-user.sh`
3. Re-open Cursor workspace at the new folder
4. Re-seed Kanban if needed: `scripts/aegis-kanban-seed-planmd-wave.sh`
