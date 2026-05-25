# Agent Harness OS

**Hermes** is the 24/7 orchestrator (Telegram, cron, Kanban dispatch). **Agent Harness OS** is the typed control plane (Tool Gateway, RAG, Obsidian, MCP, A2A, supervisor). **Cursor** and **Kiro** implement work via a local bridge at `127.0.0.1:8787`.

Attach Harness to any codebase with a `.harness/` adapter — no harness code changes required. Product specs live under `projects/<name>/`; the harness root stays generic.

**Default product:** [Aegis RPC](projects/aegis-rpc/) · **Registry:** [projects/registry.json](projects/registry.json)

---

## How it works

End-to-end loop from human intent to verified output:

1. **Human** coordinates via Telegram (Hermes), Cursor IDE (Harness MCP), or `cli/harness`.
2. **Hermes gateway** (systemd) holds skills, cron jobs, Kanban boards, Hivemind MCP, and **Harness MCP** (after `sync-hermes`).
3. **Work** is represented as Hermes Kanban cards (per-project board) plus markdown in `.harness/tasks/{backlog,active,review,done,blocked}/`.
4. **Lane O** (systemd timer ~5m) seeds backlog and opens the dispatch gate; **Lane B** runs Kanban workers through the bridge into `AEGIS_WORKSPACE`.
5. **Tool Gateway** gates every typed action (R0–R5 policy) — no arbitrary shell by default.
6. **RAG + Obsidian** ground agents with citations and trust labels; vault notes are reference-only.
7. **State** lands in SQLite (`harness.sqlite`, `rag.sqlite`) and Obsidian run summaries under `06-Runs/`.

```mermaid
flowchart TB
  subgraph human [Human surfaces]
    TG[Telegram Hermes]
    IDE[Cursor IDE]
    CLI[harness CLI]
  end
  subgraph hermes [Hermes 24/7]
    GW[hermes-gateway]
    KB[Kanban per project]
    CRON[cron Lane A]
    SKILLS[agent-harness-os skill]
    HMCP[harness MCP]
  end
  subgraph harness [Harness OS]
    REG[projects/registry.json]
    SW[switch-project]
    GW2[Tool Gateway R0-R5]
    RAG[RAG index]
    OBS[Obsidian vault]
  end
  subgraph workers [Implementation]
    BR[bridge :8787]
    CUR[Cursor Agent]
    KIR[Kiro CLI]
  end
  TG --> GW
  IDE --> HMCP
  CLI --> GW2
  GW --> SKILLS
  GW --> HMCP
  GW --> KB
  GW --> CRON
  HMCP --> GW2
  SW --> REG
  SW --> BR
  KB -->|"dispatch Lane B"| BR
  BR --> CUR
  BR --> KIR
  GW2 --> RAG
  GW2 --> OBS
```

### What it is (concise)

Agent Harness is **not** a single chatbot. It is an operating system for agent work:

| Concern | Harness answer |
|---------|----------------|
| Where does work live? | `.harness/tasks/` lifecycle + Hermes Kanban (per project) |
| How do agents act safely? | **Tool Gateway** R0–R5 — no raw shell by default |
| How do agents find context? | **RAG** with source priority (task > manifest > repo > vault) |
| How is work audited? | SQLite (`runs`, `traces`, `tool_calls`) + JSONL events |
| How do humans keep notes? | **Obsidian vault** at `~/dev/Project/_vaults/agentic-engineering/` |
| How do IDE agents connect? | **Harness MCP** (stdio) — Cursor and Hermes |
| How do agents delegate? | **A2A server** on `127.0.0.1:8790` |
| Who schedules 24/7 work? | **Hermes** — harness augments, does not replace |

---

## Two-layer model: Hermes vs Harness OS

When asked "what can this stack do?", describe **both layers**. Hermes is the always-on runtime; Harness OS is the project-scoped control plane added on top.

| Capability | Hermes (platform) | Harness OS (control plane) |
|------------|-------------------|----------------------------|
| Chat / Telegram | Yes | Augments via `agent-harness-os` + `harness-mcp` skills |
| Kanban boards | Native CLI + UI | Per-project board in manifest + [registry](projects/registry.json) |
| Cron / 24/7 timers | Yes | `start-hermes-doctor`, PM scripts (Lanes A/O) |
| Models / native tools | Yes | Tool Gateway replaces raw shell for project work |
| Project RAG | No | `index-project`, `harness_rag_search` with citations |
| Obsidian vault | No | `obsidian init/capture/adr/run-summary` |
| Typed task lifecycle | Partial | `.harness/tasks/` + MCP task tools |
| A2A delegation | No | Local server `:8790` (security, qa agents) |
| Multi-project switch | No | `switch-project`, registry, per-board dispatch |
| Policy / audit trail | No | R0–R5, SQLite traces, run reports |

### Memory layers (do not conflate)

| Layer | Scope | Trust |
|-------|-------|-------|
| **Hivemind** | Org-wide cross-agent memory (Deeplake) | Hermes MCP |
| **Harness RAG** | Project-scoped retrieval with citations | Trusted by priority rank |
| **Hermes memory** | Session preferences | Durable via Hermes `memory` tool |
| **Obsidian vault** | Human notes, ADRs, run summaries | **UNTRUSTED_CONTEXT** — reference only, never instructions |

Vault: `~/dev/Project/_vaults/agentic-engineering/` — shared across projects, not in any git repo.

---

## Multi-project operation

Three products are registered today. Each has its own Kanban board, RAG index, Obsidian project note, and manifest.

| Project | Path | Kanban board | Display name |
|---------|------|--------------|--------------|
| Aegis RPC | `projects/aegis-rpc/` | `aegis-hackathon` | Aegis RPC |
| KreditAgent | `projects/kreditagent/` | `kreditagent-hackathon` | KreditAgent |
| RetroPick | `projects/retropick/` | `retropick-v1` | RetroPick |

Registry: [projects/registry.json](projects/registry.json). Kanban workspace must use **absolute paths**: `dir:/home/.../projects/<name>`.

### Switch active project

```bash
cli/harness switch-project kreditagent
# Sets: AEGIS_RPC_ROOT, AEGIS_WORKSPACE, AEGIS_KANBAN_BOARD
# Persists: .harness/state/active-project.env
# Re-merges Hermes harness MCP; restarts bridge with new workspace
```

After switching, verify bridge workspace:

```bash
curl -sf http://127.0.0.1:8787/health | python3 -m json.tool
# "workspace" should match the switched project root
```

### Multi-project wiring scripts

| Script | Purpose |
|--------|---------|
| [scripts/lib/project-manifest.sh](scripts/lib/project-manifest.sh) | `kanban_board_for_project()`, `project_root_from_name()` |
| [scripts/aegis-kanban-dispatch-once.sh](scripts/aegis-kanban-dispatch-once.sh) | Dispatches all registry boards when `AEGIS_KANBAN_BOARD` unset |
| [scripts/harness-validate-all-projects.sh](scripts/harness-validate-all-projects.sh) | Fleet doctor + RAG + Kanban + OpenSrc checks |
| [scripts/import-external-project.sh](scripts/import-external-project.sh) | Copy external repo into `projects/<slug>` |
| [scripts/kanban-init-project-board.sh](scripts/kanban-init-project-board.sh) | Create board + seed smoke task |
| [scripts/kreditagent-opensrc-cache.sh](scripts/kreditagent-opensrc-cache.sh) | OpenSrc paths for KreditAgent study repos (no vendored `external/`) |

Kanban UI (per board):

- Aegis: http://127.0.0.1:9119/kanban?board=aegis-hackathon
- KreditAgent: http://127.0.0.1:9119/kanban?board=kreditagent-hackathon
- RetroPick: http://127.0.0.1:9119/kanban?board=retropick-v1

Create a task (always use absolute workspace):

```bash
hermes kanban --board kreditagent-hackathon create "Implement x402 gate" \
  --workspace "dir:$AGENT_HARNESS_HOME/projects/kreditagent" \
  --assignee aegis-builder
```

Workers must end with `hermes kanban complete t_xxx --summary '...'` or `hermes kanban block t_xxx "reason"`.

Details: [docs/08-hermes-integration.md](docs/08-hermes-integration.md) · [docs/kit/02-hermes-24-7.md](docs/kit/02-hermes-24-7.md)

---

## Hermes orchestration

Hermes remains the **external 24/7 orchestrator**. Harness augments it with skills, MCP, and PM scripts — it does not replace Hermes.

```txt
Telegram → hermes-gateway → bridge :8787 → Cursor/Kiro
                ↓
         ~/.hermes/skills/  (agent-harness-os, harness-mcp, …)
         mcp_servers.hivemind + mcp_servers.harness
         Lanes A / O / B
```

### What Hermes orchestrates

| Surface | Role |
|---------|------|
| **Telegram** | `/plan`, `/provider`, coordination; heavy work via Kanban not long chat |
| **Kanban** | Per-project boards, dispatch, complete/block lifecycle |
| **Cron (Lane A)** | Script-only PM status → Telegram every ~10m (no LLM) |
| **Skills** | `agent-harness-os` (capability map), `harness-mcp` (tool reference) |
| **Harness MCP** | `harness_project_inspect`, `harness_rag_search`, task tools, etc. |
| **Safe CLI** | [scripts/hermes-harness-cli.sh](scripts/hermes-harness-cli.sh) — allowlisted subcommands only |

### Sync harness into Hermes (required after upgrade)

```bash
cli/harness sync-hermes projects/aegis-rpc
systemctl --user restart hermes-gateway
# Telegram: /reset
```

Installs: `~/.hermes/skills/agent-harness-os/`, `harness-mcp/`, `mcp_servers.harness` in config, memory rules.

One-shot post-upgrade: `scripts/post-harness-upgrade-sync.sh projects/aegis-rpc`

### 24/7 lanes

| Lane | Trigger | Script | What it does |
|------|---------|--------|--------------|
| **A** | Hermes cron ~10m | `aegis-pm-tick-10m.sh` | Board stats, bridge/gateway health, secrets check → Telegram (no LLM) |
| **O** | systemd timer ~5m | `aegis-pm-orchestrate-once.sh` | D3 deploy gate (aegis only), seed backlog, multi-board dispatch |
| **B** | Kanban ready work | `aegis-kanban-dispatch-once.sh` | `hermes kanban dispatch --max 2` via bridge when healthy |

Install lanes A + O: `scripts/install-aegis-headless-24-7.sh`

When `AEGIS_KANBAN_BOARD` is unset, dispatch iterates **all registry boards** with ready work.

### Hermes-safe CLI (Telegram path)

When MCP is unavailable, Hermes may call:

```bash
scripts/hermes-harness-cli.sh projects/kreditagent doctor
scripts/hermes-harness-cli.sh projects/kreditagent run-task rag.search '{"query":"x402"}'
scripts/hermes-harness-cli.sh projects/kreditagent obsidian capture "Research note"
```

Allowlist: `doctor`, `status`, `index-project`, `start-hermes-doctor`, read-only `run-task` tools, `obsidian init|capture|run-summary|adr`. No shell, no deploy, no secrets.

### Telegram acceptance test

1. `cli/harness sync-hermes projects/aegis-rpc`
2. Restart `hermes-gateway`
3. Send `/reset` in Telegram
4. Ask: *"What are your harness capabilities?"*
5. **Pass:** response includes MCP, RAG, Obsidian vault, A2A, CLI — not only generic Nous skills

After `/provider cursor` or `/provider kiro`, always send **`/reset`** before the next long task.

---

## Monitoring and health

### Per-project checks

```bash
cli/harness doctor projects/<name>     # manifest, bridge, systemd, project Kanban
cli/harness status projects/<name>       # task folder counts
cli/harness smoke projects/<name>        # stack + doctor + dispatch dry-run
cli/harness start-hermes-doctor <project> # doctor + RAG reindex (cron-friendly)
```

### Fleet-wide checks

```bash
aegis-dev                                    # daily stack smoke
bash scripts/harness-validate-all-projects.sh  # all registry entries
hermes kanban --board aegis-hackathon stats
hermes kanban --board kreditagent-hackathon stats
hermes kanban --board retropick-v1 stats
curl -sf http://127.0.0.1:8787/health       # verify workspace field
systemctl --user is-active hermes-gateway kiro-openai-bridge
```

| Check | Pass criteria |
|-------|---------------|
| `doctor` | 0 errors; Hermes skill + harness MCP present |
| `rag.sqlite` | Exists under `<project>/.harness/state/` after `index-project` |
| Kanban stats | `hermes kanban --board <board> stats` succeeds |
| Bridge | `/health` returns JSON; `workspace` matches active project |
| OpenSrc (kreditagent) | `.harness/research/opensrc-paths/*.path` populated |

Logs:

```bash
journalctl --user -u hermes-gateway -f -l
journalctl --user -u kiro-openai-bridge -f -l
```

---

## Use case walkthroughs

### 1 — Daily login: monitor the entire fleet

```bash
aegis-dev
bash scripts/harness-validate-all-projects.sh
hermes kanban --board aegis-hackathon stats
hermes kanban --board kreditagent-hackathon stats
hermes kanban --board retropick-v1 stats
curl -sf http://127.0.0.1:8787/health | python3 -c "import sys,json; d=json.load(sys.stdin); print('workspace:', d.get('workspace'))"
```

**Pass:** doctor exits 0 for each project; bridge up; each board stats succeeds; workspace matches your intended active project.

---

### 2 — Switch project and implement from Cursor

```bash
cli/harness switch-project kreditagent
cli/harness sync-hermes projects/kreditagent
cli/harness index-project projects/kreditagent
```

In Cursor (Harness MCP connected):

- `harness_project_inspect` — manifest, context, active tasks
- `harness_rag_search` query `"x402 payment gate"` — citations from kreditagent repo

Run supervisor on a backlog task:

```bash
cli/harness new-task projects/kreditagent "Add x402 middleware stub" api --kanban
cli/harness run-task projects/kreditagent .harness/tasks/backlog/add-x402-middleware-stub.md
```

**Outcome:** bridge `workspace` = kreditagent; RAG cites kreditagent manifest; supervisor runs verify commands from manifest.

---

### 3 — Telegram-coordinated Kanban dispatch (Lane B)

```bash
cli/harness switch-project retropick
hermes kanban --board retropick-v1 create "Implement epoch API stub" \
  --workspace "dir:$AEGIS_RPC_ROOT" \
  --assignee aegis-builder

# Dry-run dispatch gate (no workers spawned):
AEGIS_KANBAN_DRY_RUN=1 scripts/aegis-kanban-dispatch-once.sh

# Live dispatch (bridge must be healthy):
scripts/aegis-kanban-dispatch-once.sh
```

Worker (Cursor/Kiro via bridge) completes:

```bash
hermes kanban --board retropick-v1 complete t_abc123 --summary "Epoch stub + tests green"
```

Or blocks: `hermes kanban block t_abc123 "Need API contract sign-off"`

Coordinate from Telegram: create/plan tasks, check board status; use Kanban dispatch for heavy implementation, not long Telegram threads.

---

### 4 — Scheduled doctor + RAG refresh (per project)

Hermes cron spec: [runtime/hermes/schedules/project-doctor.cron.md](runtime/hermes/schedules/project-doctor.cron.md)

```bash
cli/harness start-hermes-doctor projects/aegis-rpc
```

Or via Hermes-safe wrapper:

```bash
scripts/hermes-harness-cli.sh projects/kreditagent start-hermes-doctor
```

Example Hermes cron (every 6h):

```bash
hermes cron create \
  --schedule "0 */6 * * *" \
  --command "bash -lc 'cd \$AGENT_HARNESS_HOME && cli/harness start-hermes-doctor projects/aegis-rpc'" \
  --delivery local
```

**Does:** `harness doctor` then `index-project` — refreshes RAG with tasks, manifest, repo, vault notes.

---

### 5 — Import and wire a new embedded project

```bash
bash scripts/import-external-project.sh myapp ~/dev/Project/MyApp
```

Edit `.harness/project.manifest.json`, `AGENTS.md`, add entry to [projects/registry.json](projects/registry.json).

```bash
bash scripts/kanban-init-project-board.sh myapp
cli/harness link-project projects/myapp
cli/harness sync-hermes projects/myapp
cli/harness obsidian init projects/myapp
cli/harness index-project projects/myapp
cli/harness switch-project myapp
cli/harness doctor projects/myapp
```

**KreditAgent special case:** external study repos are **not** copied. Refresh OpenSrc paths:

```bash
bash scripts/kreditagent-opensrc-cache.sh
ls projects/kreditagent/.harness/research/opensrc-paths/
```

For greenfield (empty tree): `cli/harness init-project projects/my-new-app` instead of import.

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

### Supervisor run flow

`cli/harness run-task <project> <task.md>`:

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

### RAG source priority

```txt
1. Active task files       (.harness/tasks/active/)
2. Manifest + context      (.harness/project.manifest.json, project-context.md)
3. Product repo docs       (paths from manifest)
4. Obsidian vault notes    (UNTRUSTED_CONTEXT)
5. Harness kit docs        (read-only, harness root)
6. Run traces              (audit, lowest priority)
```

---

## Capabilities reference

### Control plane (TypeScript)

- **Tool Gateway** — typed tools (`repo.read`, `task.create`, `rag.search`, `verify.run`, …) behind R0–R5 policy
- **TS Supervisor** — inspect → RAG → verify → review → document
- **HarnessStore** — `<project>/.harness/state/harness.sqlite`
- **Run reports** — structured output from traces and tool calls

### Agent surfaces

| Surface | Port / transport | Purpose |
|---------|------------------|---------|
| **Harness MCP** | stdio | Cursor + Hermes project tools, prompts, resources |
| **A2A server** | `127.0.0.1:8790` | Agent cards, task delegation, artifacts |
| **Kiro bridge** | `127.0.0.1:8787` | OpenAI-compatible → Kiro CLI or Cursor Agent |
| **Hermes gateway** | systemd | Telegram, skills, Kanban, cron |
| **Harness CLI** | bash + tsx | Doctor, tasks, index, obsidian, supervisor |

---

## Repository layout

```txt
agent-harness/
├── cli/harness                 # Unified CLI entrypoint
├── projects/
│   ├── registry.json           # Multi-project registry
│   ├── aegis-rpc/              # Default product
│   ├── kreditagent/
│   └── retropick/
├── core/                       # policy, state, orchestrator
├── rag/                        # ingestion, retrieval, obsidian-source
├── integrations/obsidian/
├── tools/gateway/              # ToolGateway
├── runtime/
│   ├── mcp/harness-mcp-server/
│   ├── a2a/harness-a2a-server/
│   └── hermes/                 # skill-agent-harness-os, skill-harness-mcp
├── agents/                     # Generic personas + registry.json
├── docs/                       # Architecture docs 00–09
├── docs/kit/                   # Hermes/Kiro playbooks
└── scripts/                    # Bridge, PM, Kanban, validation, import
```

**Agent read order:** [AGENTS.md](AGENTS.md) → `.harness/project.manifest.json` → project `AGENTS.md` → active tasks.

---

## Security model (R0–R5)

| Class | Default | Examples |
|-------|---------|----------|
| **R0** | allow | `repo.read`, `git.status`, `project.inspect`, `rag.search` |
| **R1** | allow | `task.create`, `task.move`, `verify.run` |
| **R2** | allow preview / deny apply | `patch.propose` ✓ · `repo.apply_patch` ✗ |
| **R3** | deny | `shell.run` |
| **R4** | deny | `github.push`, deploy |
| **R5** | deny | `.env`, secrets, `secrets.read` |

Bridge `:8787` and A2A `:8790` bind **`127.0.0.1` only** — never expose publicly.

Policy file: [tools/policies/default.tool-policy.json](tools/policies/default.tool-policy.json)

---

## Project adapter

```txt
my-project/
├── .harness/
│   ├── project.manifest.json   # identity, paths, commands, kanban, agents
│   ├── project-context.md
│   ├── obsidian.config.json
│   ├── rag.config.json
│   ├── tasks/{backlog,active,review,done,blocked}/
│   └── state/                  # harness.sqlite, rag.sqlite
├── AGENTS.md
└── HARNESS.md
```

Scaffold: `cli/harness init-project projects/my-app` · Spec: [docs/09-project-adapter.md](docs/09-project-adapter.md)

---

## Prerequisites

- **Debian / WSL2** (tested layout)
- **Node.js** v20+ (v22 recommended) + npm
- **pnpm** (for monorepo products)
- **ripgrep** (`rg`) — RAG fallback
- **Hermes CLI** at `~/.local/bin/hermes`
- **Kiro CLI** (optional) or **Cursor Agent CLI** for bridge
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
export AEGIS_DEFAULT_PROJECT=aegis-rpc
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
scripts/install-systemd-user.sh
scripts/setup-shell.sh
sudo loginctl enable-linger $USER
source ~/.bashrc
```

### 4. Wire default project

```bash
cli/harness link-project projects/aegis-rpc
cli/harness sync-hermes projects/aegis-rpc
cli/harness obsidian init projects/aegis-rpc
cli/harness index-project projects/aegis-rpc
```

Optional — wire additional registry projects the same way for `kreditagent` and `retropick`.

### 5. Hermes Telegram (once per bot/chat)

```txt
/commands
/set-home
```

Bridge endpoint: `http://127.0.0.1:8787/v1` in `~/.hermes/config.yaml`.

### 6. Optional — Cursor as bridge backend

```bash
scripts/setup-cursor-bridge-auth.sh
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
bash scripts/harness-validate-all-projects.sh
cli/harness smoke projects/aegis-rpc
curl -sf http://127.0.0.1:8787/health && echo OK
npm run acceptance
```

After harness upgrades: `cli/harness sync-hermes <project>` + restart `hermes-gateway` + Telegram `/reset`.

---

## Daily operation

Every login:

```bash
aegis-dev
```

| Goal | Command |
|------|---------|
| Stack health | `aegis-dev` |
| Fleet validation | `bash scripts/harness-validate-all-projects.sh` |
| Switch active project | `cli/harness switch-project kreditagent` |
| Project health | `cli/harness doctor projects/<name>` |
| Task queue | `cli/harness status projects/<name>` |
| Bridge + workspace | `curl -sf http://127.0.0.1:8787/health` |
| Switch Kiro ↔ Cursor | `scripts/aegis-model.sh status\|kiro\|cursor` or `/provider` |
| Re-index RAG | `cli/harness index-project projects/<name>` |
| Hermes sync after upgrade | `cli/harness sync-hermes projects/<name>` + restart gateway |
| Scheduled doctor | `cli/harness start-hermes-doctor projects/<name>` |
| Gateway / bridge logs | `journalctl --user -u hermes-gateway -f -l` |
| Restart stack | `systemctl --user restart aegis-stack.target` |
| Kanban UI | `http://127.0.0.1:9119/kanban?board=<board>` |

Source persisted project env: `source "$AGENT_HARNESS_HOME/.harness/state/active-project.env"`

---

## Harness CLI

Entrypoint: `cli/harness`

### Health, status, multi-project

```bash
cli/harness doctor <project>
cli/harness status <project>
cli/harness smoke <project>
cli/harness switch-project <name>       # registry lookup; updates bridge workspace
cli/harness sync-hermes <project>       # skills + harness MCP into Hermes
```

### Tasks and verification

```bash
cli/harness new-task <project> "Title" [phase] [--kanban]
cli/harness verify-task <project> .harness/tasks/active/my-task.md
cli/harness sync-kanban <project>
```

### Tool gateway and supervisor

```bash
cli/harness run-task <project> project.inspect
cli/harness run-task <project> rag.search '{"query":"manifest"}'
cli/harness run-task <project> .harness/tasks/backlog/my-task.md   # full supervisor
cli/harness run-report <project>
```

### Knowledge (RAG + Obsidian)

```bash
cli/harness index-project <project> [--incremental]
cli/harness obsidian init|capture|run-summary|adr <project> [args]
cli/harness start-hermes-doctor <project>
```

### Agent surfaces and scaffolding

```bash
cli/harness start-mcp <project>
cli/harness start-a2a
cli/harness init-project|link-project|sync-cursor|sync-skills <project>
```

### npm scripts

```bash
npm run build && npm test && npm run acceptance
```

---

## MCP integration (Cursor + Hermes)

Server: `runtime/mcp/harness-mcp-server`

**Tools:** `harness_project_inspect`, `harness_task_create`, `harness_task_move`, `harness_verify_run`, `harness_rag_search`, `harness_repo_read`, `harness_patch_propose`

**Prompts:** `implement-task`, `review-diff`, `security-check`

**Resources:** `harness://project/manifest`, `harness://tasks/active`

Sync: `cli/harness sync-cursor <project>` (Cursor) · `cli/harness sync-hermes <project>` (Hermes)

Requires `AEGIS_WORKSPACE` = active project root.

Details: [docs/03-mcp.md](docs/03-mcp.md) · [docs/07-cursor-integration.md](docs/07-cursor-integration.md)

---

## A2A integration

```bash
cli/harness start-a2a
curl -sf http://127.0.0.1:8790/.well-known/agent.json
```

- `GET /.well-known/agent.json` — agent card
- `POST /tasks` — delegate to security/qa agents
- **Trust:** local agents full gateway; remote gets redacted artifacts

Details: [docs/04-a2a.md](docs/04-a2a.md)

---

## Working on a project

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

### Agent read order (inside a project)

1. `.harness/project.manifest.json`
2. `.harness/project-context.md`
3. `AGENTS.md`
4. `ORCHESTRATOR.md` / `DECISIONS.md`
5. `.harness/tasks/active/`

---

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `AGENT_HARNESS_HOME` | repo root | Harness root |
| `AEGIS_PROJECTS_ROOT` | `$AGENT_HARNESS_HOME/projects` | All products |
| `AEGIS_DEFAULT_PROJECT` | `aegis-rpc` | Registry slug (after `switch-project`) |
| `AEGIS_RPC_ROOT` | `.../projects/aegis-rpc` | Active project path |
| `AEGIS_WORKSPACE` | `$AEGIS_RPC_ROOT` | Bridge / MCP / worker cwd |
| `AEGIS_KANBAN_BOARD` | from manifest | PM/dispatch board (set by `switch-project`) |
| `KIRO_BRIDGE_URL` | `http://127.0.0.1:8787` | Bridge base URL |
| `HARNESS_A2A_PORT` | `8790` | A2A server port |
| `CURSOR_BRIDGE_MODE` | `agent` | `agent` \| `ask` \| `plan` |

Persisted state: `.harness/state/active-project.env` (written by `switch-project`).

Secrets go in **`~/.hermes/.env`** or project **gitignored** `.env` — never in repo or chat.

---

## Validation and testing

| Layer | Command | Pass criteria |
|-------|---------|---------------|
| Build | `npm run build` | Zero TS errors |
| Unit | `npm test` | Policy, RAG, Obsidian, A2A trust |
| Per-project | `cli/harness doctor <project>` | 0 errors |
| Fleet | `scripts/harness-validate-all-projects.sh` | All registry projects pass |
| Integration | `scripts/harness-validation.sh <project>` | Doctor, gateway, MCP |
| Full acceptance | `npm run acceptance` | Temp project E2E |
| Smoke | `cli/harness smoke <project>` | Stack + dispatch dry-run |
| Security | Read `.env` via gateway | Denied (R5) |

---

## Key scripts

| Script | Purpose |
|--------|---------|
| [scripts/install-systemd-user.sh](scripts/install-systemd-user.sh) | Bridge + gateway units |
| [scripts/start-aegis-dev.sh](scripts/start-aegis-dev.sh) | Daily smoke (`aegis-dev`) |
| [scripts/aegis-model.sh](scripts/aegis-model.sh) | Switch Kiro ↔ Cursor |
| [scripts/aegis-kanban-dispatch-once.sh](scripts/aegis-kanban-dispatch-once.sh) | Lane B dispatch (multi-board) |
| [scripts/aegis-pm-orchestrate-once.sh](scripts/aegis-pm-orchestrate-once.sh) | Lane O orchestrate |
| [scripts/aegis-pm-tick-10m.sh](scripts/aegis-pm-tick-10m.sh) | Lane A PM status |
| [scripts/harness-validate-all-projects.sh](scripts/harness-validate-all-projects.sh) | Fleet validation |
| [scripts/harness-validation.sh](scripts/harness-validation.sh) | Single-project integration |
| [scripts/import-external-project.sh](scripts/import-external-project.sh) | Embed external repo |
| [scripts/kanban-init-project-board.sh](scripts/kanban-init-project-board.sh) | Create Kanban board + smoke task |
| [scripts/kreditagent-opensrc-cache.sh](scripts/kreditagent-opensrc-cache.sh) | KreditAgent OpenSrc paths |
| [scripts/hermes-harness-cli.sh](scripts/hermes-harness-cli.sh) | Telegram-safe allowlisted CLI |
| [scripts/merge-hermes-harness-mcp.sh](scripts/merge-hermes-harness-mcp.sh) | Wire harness MCP into Hermes |
| [scripts/post-harness-upgrade-sync.sh](scripts/post-harness-upgrade-sync.sh) | One-shot post-upgrade sync |
| [scripts/install-aegis-headless-24-7.sh](scripts/install-aegis-headless-24-7.sh) | PM lanes A + O |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Bridge not reachable | `systemctl --user status kiro-openai-bridge` |
| Wrong workspace edits | `cli/harness switch-project <name>`; check `/health` workspace field |
| MCP fails to start | Set `AEGIS_WORKSPACE` to project root |
| RAG returns nothing | `cli/harness index-project <project>` |
| Hermes unaware of harness | `cli/harness sync-hermes <project>` + restart gateway + `/reset` |
| Telegram stalls | `/reset`; use Kanban for heavy work |
| Provider switch ignored | `/provider cursor` + `/reset` |
| Kanban dispatch skips board | Check `AEGIS_KANBAN_BOARD`; unset to dispatch all registry boards |
| Hivemind verify fails | Optional — does not block harness validation |

More: [docs/kit/02-hermes-24-7.md](docs/kit/02-hermes-24-7.md) · [docs/kit/11-validation-checklist.md](docs/kit/11-validation-checklist.md)

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
| [docs/08-hermes-integration.md](docs/08-hermes-integration.md) | Hermes lanes + sync |
| [docs/09-project-adapter.md](docs/09-project-adapter.md) | `.harness/` adapter |

### Playbooks

| Doc | Contents |
|-----|----------|
| [AGENTS.md](AGENTS.md) | Harness workflow for all agents |
| [docs/kit/01-daily-setup.md](docs/kit/01-daily-setup.md) | Login flow, MCP, provider chain |
| [docs/kit/02-hermes-24-7.md](docs/kit/02-hermes-24-7.md) | Telegram, Kanban, 24/7 lanes |
| [docs/kit/07-memory-architecture.md](docs/kit/07-memory-architecture.md) | Hivemind shared memory |
| [docs/kit/10-portable-workflow-migration.md](docs/kit/10-portable-workflow-migration.md) | Full architecture blueprint |
| [docs/kit/11-validation-checklist.md](docs/kit/11-validation-checklist.md) | Smoke and validation |

---

## Security rules

- **Never** commit `.env`, keys, or seed phrases.
- Bridge and A2A bind **`127.0.0.1` only**.
- Use **`hermes-gateway`** only (not legacy `telegram-kiro-gateway`).
- Obsidian vault content is **`UNTRUSTED_CONTEXT`**.
- **Git push / production deploy** require human approval.

---

## Migration note

Repo renamed from `aegis-hackathon-kit`. If paths are stale:

1. Set `AGENT_HARNESS_HOME=~/dev/Project/agent-harness`
2. Re-run `scripts/install-systemd-user.sh`
3. Re-open Cursor at the new folder
4. `cli/harness sync-hermes projects/aegis-rpc` + restart gateway
