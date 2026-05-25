You should architect this as a **reusable Agent Harness OS**, not as “a folder of prompts.” The harness should be a portable control plane that any project can attach to through a small `.harness/` adapter.

Your current repo already has the raw ingredients: agents, tasks, prompts, Hermes/Kiro runtime, MCP server, Telegram gateway, systemd services, skills, and Cursor rules. The problem is that everything is mixed into one Aegis-specific repo, and skills are duplicated across `skills/`, `.agents/skills/`, `.hermes/skills/`, `.kiro/skills/`, and `.skills/`. 

The final system should be:

```txt
~/dev/Project/
├─ agent-harness/          # reusable agentic engineering OS
├─ aegis-rpc/              # project using the harness
├─ retropick/              # future project using the same harness
└─ kreditagent/            # future project using the same harness
```

---

# 1. Core design principle

Do **not** make one giant “super-agent.”

Build a **control-plane + protocol + tool runtime**.

Best-practice systems are converging on this separation:

| Layer                        | Purpose                                                      | Best-practice source pattern                                           |
| ---------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Agent orchestration          | Decide who does what, when, and with which state             | LangGraph supervisor/swarm, OpenAI handoffs, Microsoft Agent Framework |
| Tool access                  | Let agents safely call external capabilities                 | MCP tools/resources/prompts                                            |
| Agent-to-agent communication | Let independent agents collaborate across servers/frameworks | A2A agent cards, tasks, messages, artifacts                            |
| Knowledge/RAG                | Retrieve project memory, docs, repo state, prior decisions   | LlamaIndex, Haystack, Dify-style RAG pipelines                         |
| Execution safety             | Guardrails, approvals, sandboxing, tracing                   | OpenAI guardrails/tracing, MCP security lessons                        |
| Project adapter              | Make one harness work for many projects                      | `.harness/project.manifest.json`                                       |

MCP is for **agent-to-tool** integration. The MCP spec defines a standard way for LLM apps to connect to external data sources and tools, using concepts like tools, resources, prompts, and transports. ([Model Context Protocol][1]) A2A is for **agent-to-agent** interoperability, where agents expose capabilities and exchange tasks/messages/artifacts across boundaries. ([GitHub][2])

So the mental model is:

```txt
MCP = “agent, call this tool/data source safely”
A2A = “agent, collaborate with another agent/service”
RAG = “agent, retrieve relevant memory/context”
Tools = “agent, take controlled actions”
Harness = “policy + orchestration + state + verification around all of it”
```

---

# 2. Recommended architecture

```txt
agent-harness/
├─ core/
│  ├─ orchestrator/
│  ├─ protocols/
│  ├─ state/
│  ├─ policy/
│  ├─ guardrails/
│  └─ observability/
│
├─ agents/
├─ skills/
├─ rag/
├─ tools/
├─ runtime/
├─ cli/
├─ templates/
├─ examples/
└─ docs/
```

The harness should be **framework-agnostic**, but practically I would build your first implementation in **TypeScript/Node** because Cursor, MCP servers, repo scripts, and your current tooling are already Node-heavy. Later, you can add Python workers for LlamaIndex/LangGraph if needed.

---

# 3. The real architecture diagram

```txt
┌─────────────────────────────────────────────────────────────────┐
│                        User / Developer                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Harness CLI                          │
│  harness init | doctor | new-task | run-task | verify | sync     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Harness Control Plane                        │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────────┐   │
│  │ Orchestrator  │  │ Task Engine   │  │ Project Registry   │   │
│  └───────┬───────┘  └───────┬───────┘  └─────────┬──────────┘   │
│          │                  │                    │              │
│          ▼                  ▼                    ▼              │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────────┐   │
│  │ Agent Router  │  │ State Store   │  │ Policy/Guardrails  │   │
│  └───────┬───────┘  └───────┬───────┘  └─────────┬──────────┘   │
│          │                  │                    │              │
└──────────┼──────────────────┼────────────────────┼──────────────┘
           │                  │                    │
           ▼                  ▼                    ▼
┌────────────────┐   ┌────────────────┐   ┌──────────────────────┐
│ MCP Runtime    │   │ RAG Runtime     │   │ A2A Runtime           │
│ tools/resources│   │ docs/code/memory│   │ remote/local agents   │
└───────┬────────┘   └───────┬────────┘   └──────────┬───────────┘
        │                    │                       │
        ▼                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Project Workspace                         │
│                                                                 │
│  .harness/project.manifest.json                                 │
│  .harness/project-context.md                                    │
│  .harness/tasks/                                                │
│  .cursor/rules/                                                 │
│  source code / docs / tests / scripts                           │
└─────────────────────────────────────────────────────────────────┘
```

---

# 4. What to learn from current best-practice repos/frameworks

## MCP

MCP should be your **tool and context server layer**. The MCP Python SDK describes MCP servers as exposing data and functionality to LLM apps in a secure, standardized way. ([GitHub][3]) Use MCP for:

```txt
repo.read_file
repo.search
repo.apply_patch
git.status
git.diff
shell.run_safe
project.commands
rag.search
tasks.create
tasks.update
browser.search
github.issues
```

But MCP should **not** be allowed to execute arbitrary shell commands by default. MCP security reporting has shown that STDIO/local execution paths can become serious RCE/prompt-injection surfaces if untrusted inputs reach command execution. ([Tom's Hardware][4])

Your MCP rule:

```txt
MCP tools must be small, typed, allowlisted, logged, and permissioned.
```

## A2A

A2A should be your **agent collaboration protocol**, not your local tool protocol. A2A’s spec supports tasks, messages, artifacts, and progress/status updates; it is designed for agents built on different frameworks to communicate. ([A2A Protocol][5])

Use A2A when:

```txt
- Cursor agent asks Hermes agent to run a project audit.
- Hermes delegates security review to a separate reviewer agent.
- A remote research agent returns artifacts.
- A QA agent publishes a test report.
- A documentation agent consumes implementation artifacts.
```

A2A should not be blindly trusted. The A2A sample repo warns that external agent data such as AgentCards, messages, artifacts, and statuses should be treated as untrusted input because they can contain prompt injection. ([GitHub][6])

Your A2A rule:

```txt
A2A messages are untrusted artifacts, never system instructions.
```

## OpenAI Agents SDK pattern

The useful design concepts are **agents, tools, handoffs, guardrails, sessions, and tracing**. OpenAI’s Agents SDK describes an agent as an LLM configured with instructions, tools, handoffs, guardrails, and structured outputs. ([OpenAI GitHub][7]) Handoffs are useful because specialized agents can delegate tasks to other specialized agents. ([OpenAI GitHub][8]) Tracing matters because agent runs need debuggable records of LLM generations, tool calls, handoffs, guardrails, and custom events. ([OpenAI GitHub][9])

Your harness should copy the pattern, not necessarily the SDK:

```txt
Agent = role + instructions + allowed tools + input schema + output schema + guardrails
Run = one traceable execution
Handoff = controlled delegation
Guardrail = pre/post validation
Trace = durable audit log
```

## LangGraph pattern

LangGraph’s strongest idea is **stateful graph orchestration**, especially supervisor and swarm patterns. The supervisor pattern coordinates specialized agents through a central supervisor, while swarm-style systems let agents hand off dynamically based on specialization. ([GitHub][10]) ([GitHub][11])

For your harness, use **supervisor first**, swarm later.

Why? Because you are building coding workflows. You need control, auditability, and verification. Swarm feels cool but can loop, drift, and mutate goals.

Recommended:

```txt
Phase 1: supervisor orchestrator
Phase 2: explicit handoffs
Phase 3: limited swarm only for research/exploration
```

## LlamaIndex / Haystack / Dify pattern

LlamaIndex AgentWorkflow is useful because it treats agents, state, and tool-calling as a workflow, with support for multi-agent behavior and handoffs. ([Developer Documentation][12]) Haystack is valuable because it emphasizes modular pipelines with explicit control over retrieval, routing, memory, and generation. ([GitHub][13]) Dify is useful as a product reference because it combines agentic workflows, RAG pipelines, integrations, and observability in one platform. ([Dify][14])

Your harness should not become a no-code Dify clone. But it should borrow this separation:

```txt
workflow builder
RAG pipeline
tool integrations
observability
project-level app/workflow templates
```

## Microsoft Agent Framework pattern

Microsoft’s newer Agent Framework combines multi-agent abstractions with enterprise features like session state, type safety, middleware, telemetry, graph workflows, long-running state, and human-in-the-loop scenarios. ([Microsoft Learn][15])

This is important: for engineering harnesses, **state and telemetry are not optional**. Without state, your agents repeat work. Without telemetry, you cannot debug why they broke your repo.

---

# 5. The architecture you should build

## Layer 0 — Project adapter

Every project gets:

```txt
<project>/
├─ .harness/
│  ├─ project.manifest.json
│  ├─ project-context.md
│  ├─ agents.json
│  ├─ skills.json
│  ├─ tools.policy.json
│  ├─ rag.config.json
│  ├─ tasks/
│  │  ├─ backlog/
│  │  ├─ active/
│  │  ├─ review/
│  │  └─ done/
│  └─ state/
│     ├─ project-map.json
│     ├─ memory.sqlite
│     ├─ traces/
│     └─ indexes/
├─ .cursor/rules/
├─ AGENTS.md
└─ HARNESS.md
```

This is the **only project-specific harness folder**.

---

## Layer 1 — Control plane

```txt
agent-harness/core/
├─ orchestrator/
│  ├─ planner.ts
│  ├─ router.ts
│  ├─ dispatcher.ts
│  ├─ reviewer.ts
│  └─ run-loop.ts
│
├─ state/
│  ├─ state-store.ts
│  ├─ task-store.ts
│  ├─ memory-store.ts
│  └─ trace-store.ts
│
├─ policy/
│  ├─ tool-policy.ts
│  ├─ path-policy.ts
│  ├─ secret-policy.ts
│  ├─ approval-policy.ts
│  └─ project-policy.ts
│
└─ guardrails/
   ├─ input-guardrails.ts
   ├─ output-guardrails.ts
   ├─ patch-guardrails.ts
   └─ prompt-injection-guardrails.ts
```

This is the actual “brain.”

The orchestrator should not directly run shell commands. It should call typed tools through the tool gateway.

---

## Layer 2 — Agent registry

```txt
agent-harness/agents/
├─ registry.json
├─ base.agent.md
├─ orchestrator.agent.md
├─ architect.agent.md
├─ implementer.agent.md
├─ reviewer.agent.md
├─ security.agent.md
├─ qa.agent.md
├─ docs.agent.md
├─ devops.agent.md
├─ research.agent.md
└─ product.agent.md
```

Agent definition format:

```yaml
id: security
name: Security Reviewer
mode: review
description: Reviews code, configs, tool calls, dependencies, secrets, and threat model.
allowed_tools:
  - repo.read
  - repo.search
  - git.diff
  - rag.search
forbidden_tools:
  - shell.run
  - repo.apply_patch
handoffs:
  - qa
  - architect
inputs:
  - task
  - diff
  - project_context
outputs:
  - security_report
  - blocking_issues
  - recommendations
guardrails:
  require_citations: true
  no_secret_output: true
  untrusted_external_data: true
```

This makes roles narrow. Narrow roles are more reliable than “one autonomous coder that does everything.”

---

## Layer 3 — Tool gateway

```txt
agent-harness/tools/
├─ registry.json
├─ gateway/
│  ├─ tool-gateway.ts
│  ├─ permission-checker.ts
│  ├─ schema-validator.ts
│  ├─ audit-logger.ts
│  └─ approval-engine.ts
│
├─ builtin/
│  ├─ repo.tools.ts
│  ├─ git.tools.ts
│  ├─ shell.tools.ts
│  ├─ task.tools.ts
│  ├─ rag.tools.ts
│  ├─ project.tools.ts
│  └─ browser.tools.ts
│
└─ external/
   ├─ github.tools.ts
   ├─ vercel.tools.ts
   ├─ supabase.tools.ts
   └─ docker.tools.ts
```

Tool policy should look like this:

```json
{
  "tool": "shell.run",
  "risk": "high",
  "default": "deny",
  "allowedCommands": [
    "pnpm test",
    "pnpm typecheck",
    "pnpm lint",
    "git status",
    "git diff",
    "find",
    "ls",
    "cat"
  ],
  "requiresApproval": true,
  "forbiddenPatterns": [
    "rm -rf",
    "curl | sh",
    "wget | sh",
    "sudo",
    "chmod 777",
    "cat .env",
    "printenv"
  ]
}
```

This is critical. Your old repo has Telegram gateway `.env` and runtime scripts mixed into the tree.  A proper harness must assume secrets can leak unless the tool gateway blocks them.

---

## Layer 4 — MCP runtime

```txt
agent-harness/runtime/mcp/
├─ harness-mcp-server/
│  ├─ src/
│  │  ├─ server.ts
│  │  ├─ tools/
│  │  ├─ resources/
│  │  ├─ prompts/
│  │  ├─ auth/
│  │  └─ audit/
│  ├─ package.json
│  └─ README.md
│
├─ servers/
│  ├─ filesystem.safe.mcp.json
│  ├─ git.safe.mcp.json
│  ├─ project.safe.mcp.json
│  └─ rag.safe.mcp.json
│
└─ clients/
   ├─ cursor.mcp.example.json
   ├─ claude-desktop.example.json
   └─ hermes.example.json
```

MCP server exposes:

```txt
Tools:
- harness.project.inspect
- harness.task.create
- harness.task.move
- harness.rag.search
- harness.repo.read
- harness.repo.search
- harness.git.status
- harness.git.diff
- harness.verify.run
- harness.patch.propose

Resources:
- harness://project/manifest
- harness://project/context
- harness://tasks/active
- harness://memory/decisions
- harness://repo/map

Prompts:
- harness://prompts/implement-task
- harness://prompts/review-diff
- harness://prompts/security-check
- harness://prompts/write-docs
```

Important distinction:

```txt
repo.apply_patch = medium risk, allow with diff preview
shell.run = high risk, deny by default
secrets.read = never expose
```

---

## Layer 5 — A2A runtime

```txt
agent-harness/runtime/a2a/
├─ server/
│  ├─ agent-card.ts
│  ├─ task-handler.ts
│  ├─ message-handler.ts
│  ├─ artifact-store.ts
│  └─ trust-policy.ts
│
├─ agents/
│  ├─ architect.a2a.json
│  ├─ security.a2a.json
│  ├─ qa.a2a.json
│  ├─ docs.a2a.json
│  └─ research.a2a.json
│
└─ README.md
```

Use A2A for **agent services**, not low-level tools.

Example:

```txt
Cursor asks:
“Security agent, review this diff.”

A2A task:
{
  task_id,
  project,
  input_artifacts: [git_diff, task_file, manifest],
  expected_output: security_report
}

Security agent returns:
{
  status: completed,
  artifacts: [
    security-report.md,
    blocking-issues.json
  ]
}
```

A2A must have trust boundaries:

```txt
local trusted agents        = can read project files
remote untrusted agents     = receive redacted artifacts only
external research agents    = no secrets, no private repo unless explicitly allowed
```

---

## Layer 6 — RAG / memory system

You need **four different memory types**, not one vector DB dumped with everything.

```txt
agent-harness/rag/
├─ ingestion/
│  ├─ repo-indexer.ts
│  ├─ docs-indexer.ts
│  ├─ decision-indexer.ts
│  ├─ task-indexer.ts
│  └─ external-source-indexer.ts
│
├─ retrieval/
│  ├─ hybrid-search.ts
│  ├─ reranker.ts
│  ├─ context-compressor.ts
│  └─ citation-builder.ts
│
├─ stores/
│  ├─ sqlite/
│  ├─ vector/
│  ├─ graph/
│  └─ artifact/
│
└─ policies/
   ├─ freshness-policy.ts
   ├─ source-trust-policy.ts
   ├─ privacy-policy.ts
   └─ context-budget-policy.ts
```

Memory categories:

| Memory          | Storage           | Purpose                                    |
| --------------- | ----------------- | ------------------------------------------ |
| Working memory  | run state / trace | Current task, temporary plan, tool results |
| Project memory  | SQLite + markdown | Decisions, architecture, conventions       |
| Semantic memory | vector index      | Search docs/code/tasks by meaning          |
| Episodic memory | traces/artifacts  | What happened in previous runs             |

RAG must follow a source hierarchy:

```txt
1. Current task file
2. Project manifest
3. Project context
4. AGENTS.md / HARNESS.md
5. Relevant docs
6. Relevant source files
7. Prior decisions
8. External web/research
```

Never let random semantic matches override the current task.

---

# 6. Orchestration patterns to support

## Pattern A — Supervisor

Best default.

```txt
User task
  ↓
Orchestrator
  ↓
Architect → Implementer → QA → Reviewer → Docs
```

Use for coding.

## Pattern B — Research-review-write

```txt
Research Agent
  ↓
Architect Agent
  ↓
Reviewer Agent
  ↓
Writer Agent
```

Use for planning, repo audits, strategy docs.

## Pattern C — Parallel review

```txt
                 ┌─ Security Agent
Diff / PR ───────┼─ QA Agent
                 ├─ Architecture Agent
                 └─ Docs Agent
```

Use before marking task done.

## Pattern D — Swarm

Only use for exploration:

```txt
Research agent ↔ Product agent ↔ Architect agent ↔ Reviewer agent
```

Do not use swarm for repo mutation.

---

# 7. Your strict design decisions

## Decision 1 — Use file-based task state

Do not start with a database-heavy task system. Use markdown files first.

```txt
project/.harness/tasks/
├─ backlog/
├─ active/
├─ review/
├─ done/
└─ blocked/
```

Each task file is the contract.

```md
# Task: Add Auth Middleware

## Objective
...

## Scope
...

## Owned paths
...

## Acceptance criteria
...

## Verification commands
...

## Tool permissions
...

## Result
...
```

## Decision 2 — Use SQLite for local state

Use SQLite for:

```txt
runs
tool_calls
traces
memory_entries
artifacts
project_indexes
approvals
```

Do not use Postgres early. SQLite is enough for local harness.

## Decision 3 — Use vector DB later

Start with:

```txt
ripgrep + file manifest + SQLite FTS
```

Then add vector search:

```txt
LanceDB or Qdrant
```

Do not overbuild RAG before your task and tool policy are stable.

## Decision 4 — Tool risk classes

```txt
R0 read-only:
  repo.read, repo.search, git.status

R1 safe write:
  task.create, docs.write, patch.propose

R2 project mutation:
  repo.apply_patch, package.install

R3 command execution:
  shell.run, docker.run

R4 external mutation:
  github.push, vercel.deploy, supabase.migrate

R5 secrets/credentials:
  denied by default
```

No agent gets R3+ without approval.

## Decision 5 — No autonomous push/deploy

Early harness must not auto-push, auto-deploy, or auto-run destructive shell. It may propose commands and run allowlisted verification.

---

# 8. Final repo architecture

```txt
agent-harness/
├─ README.md
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.json
│
├─ core/
│  ├─ orchestrator/
│  │  ├─ planner.ts
│  │  ├─ router.ts
│  │  ├─ dispatcher.ts
│  │  ├─ run-loop.ts
│  │  └─ reviewer.ts
│  │
│  ├─ protocols/
│  │  ├─ mcp/
│  │  │  ├─ mcp-server.ts
│  │  │  ├─ mcp-tools.ts
│  │  │  ├─ mcp-resources.ts
│  │  │  └─ mcp-prompts.ts
│  │  │
│  │  └─ a2a/
│  │     ├─ agent-card.ts
│  │     ├─ task.ts
│  │     ├─ message.ts
│  │     ├─ artifact.ts
│  │     └─ trust-policy.ts
│  │
│  ├─ policy/
│  │  ├─ tool-policy.ts
│  │  ├─ path-policy.ts
│  │  ├─ secret-policy.ts
│  │  ├─ approval-policy.ts
│  │  └─ network-policy.ts
│  │
│  ├─ state/
│  │  ├─ sqlite.ts
│  │  ├─ task-store.ts
│  │  ├─ trace-store.ts
│  │  ├─ memory-store.ts
│  │  └─ artifact-store.ts
│  │
│  ├─ rag/
│  │  ├─ ingest.ts
│  │  ├─ retrieve.ts
│  │  ├─ rerank.ts
│  │  ├─ compress.ts
│  │  └─ cite.ts
│  │
│  └─ observability/
│     ├─ trace.ts
│     ├─ events.ts
│     ├─ run-report.ts
│     └─ metrics.ts
│
├─ agents/
│  ├─ registry.json
│  ├─ orchestrator.agent.md
│  ├─ architect.agent.md
│  ├─ implementer.agent.md
│  ├─ reviewer.agent.md
│  ├─ security.agent.md
│  ├─ qa.agent.md
│  ├─ docs.agent.md
│  ├─ devops.agent.md
│  └─ research.agent.md
│
├─ skills/
│  ├─ registry.json
│  ├─ repo-restructure/
│  ├─ systematic-debugging/
│  ├─ tdd/
│  ├─ frontend-design/
│  ├─ backend-api/
│  ├─ web3-infra/
│  ├─ smart-contracts/
│  ├─ security-review/
│  ├─ docs-writing/
│  ├─ rag/
│  ├─ mcp-builder/
│  └─ a2a-builder/
│
├─ tools/
│  ├─ registry.json
│  ├─ builtin/
│  │  ├─ repo.ts
│  │  ├─ git.ts
│  │  ├─ shell.ts
│  │  ├─ tasks.ts
│  │  ├─ project.ts
│  │  └─ rag.ts
│  │
│  └─ policies/
│     ├─ default.tool-policy.json
│     ├─ safe-shell.allowlist.json
│     └─ dangerous-patterns.json
│
├─ runtime/
│  ├─ mcp/
│  │  ├─ harness-mcp-server/
│  │  └─ cursor-mcp.example.json
│  │
│  ├─ a2a/
│  │  ├─ harness-a2a-server/
│  │  └─ agent-cards/
│  │
│  ├─ hermes/
│  │  ├─ prompts/
│  │  ├─ memory-rules/
│  │  └─ schedules/
│  │
│  ├─ bridges/
│  │  ├─ cursor/
│  │  ├─ kiro/
│  │  └─ telegram/
│  │
│  └─ systemd/
│
├─ cli/
│  ├─ harness
│  └─ commands/
│     ├─ init-project.ts
│     ├─ link-project.ts
│     ├─ doctor.ts
│     ├─ status.ts
│     ├─ new-task.ts
│     ├─ run-task.ts
│     ├─ verify-task.ts
│     ├─ index-project.ts
│     ├─ sync-cursor.ts
│     ├─ start-mcp.ts
│     ├─ start-a2a.ts
│     └─ start-hermes.ts
│
├─ templates/
│  ├─ project/
│  ├─ cursor-rules/
│  ├─ tasks/
│  ├─ agents/
│  └─ skills/
│
├─ docs/
│  ├─ 00-vision.md
│  ├─ 01-architecture.md
│  ├─ 02-control-plane.md
│  ├─ 03-mcp.md
│  ├─ 04-a2a.md
│  ├─ 05-rag-memory.md
│  ├─ 06-tools-security.md
│  ├─ 07-cursor-integration.md
│  ├─ 08-hermes-integration.md
│  └─ 09-project-adapter.md
│
└─ examples/
   ├─ generic-nextjs/
   ├─ web3-infra/
   ├─ solana-anchor/
   └─ python-fastapi/
```

---

# 9. Project adapter architecture

Every project has:

```txt
project/.harness/
├─ project.manifest.json
├─ project-context.md
├─ agents.json
├─ skills.json
├─ tools.policy.json
├─ rag.config.json
├─ tasks/
│  ├─ backlog/
│  ├─ active/
│  ├─ review/
│  ├─ done/
│  └─ blocked/
└─ state/
```

Example manifest:

```json
{
  "schema": "agent-harness.project.v1",
  "project": {
    "name": "aegis-rpc",
    "type": "web3-infra",
    "root": ".",
    "description": "Programmable RPC gateway for transaction screening."
  },
  "harness": {
    "mode": "external",
    "harnessRootEnv": "AGENT_HARNESS_HOME",
    "defaultHarnessRoot": "../agent-harness"
  },
  "paths": {
    "source": ["apps", "packages", "contracts"],
    "docs": ["docs"],
    "scripts": ["scripts"],
    "tests": ["tests"],
    "tasks": ".harness/tasks",
    "state": ".harness/state"
  },
  "commands": {
    "install": "pnpm install",
    "dev": "pnpm dev",
    "typecheck": "pnpm typecheck",
    "lint": "pnpm lint",
    "test": "pnpm test",
    "smoke": "pnpm smoke"
  },
  "agents": {
    "enabled": ["architect", "implementer", "security", "qa", "docs"]
  },
  "skills": {
    "enabled": ["repo-restructure", "tdd", "web3-infra", "security-review"]
  },
  "rules": {
    "requireTaskFile": true,
    "requireVerification": true,
    "archiveBeforeDelete": true,
    "noSecrets": true
  }
}
```

---

# 10. How Cursor connects

Cursor should not contain the whole harness. Cursor gets thin rules:

```txt
project/.cursor/rules/
├─ 00-harness.mdc
├─ 01-project-boundaries.mdc
├─ 02-verification.mdc
└─ 03-security.mdc
```

Cursor reads:

```txt
project/.harness/project.manifest.json
project/.harness/project-context.md
project/AGENTS.md
$AGENT_HARNESS_HOME/core/orchestrator/ORCHESTRATOR.md
```

Cursor calls:

```txt
MCP server:
- harness.task.create
- harness.rag.search
- harness.project.inspect
- harness.verify.run
- harness.patch.propose
```

Cursor is the **interactive coder**. Hermes is the **long-running orchestrator**. A2A is for **agent collaboration**. MCP is for **tool access**.

---

# 11. The harness run loop

```txt
1. Read project manifest
2. Load project context
3. Load current task
4. Retrieve relevant docs/code/decisions
5. Select agent
6. Select allowed tools
7. Create execution plan
8. Ask for approval if risky
9. Execute small step
10. Trace tool calls and outputs
11. Verify
12. Review
13. Update task state
14. Write run report
```

Pseudo-flow:

```txt
Task enters active/
  ↓
planner creates plan
  ↓
router picks agent
  ↓
rag retrieves context
  ↓
tool gateway grants limited tools
  ↓
agent proposes patch
  ↓
guardrails inspect patch
  ↓
verification commands run
  ↓
review agents inspect
  ↓
task moves review/ or done/
```

---

# 12. Minimum viable build order

Do not build everything at once.

## Phase 1 — Harness skeleton

Build:

```txt
agent-harness/
project/.harness/
CLI commands
task templates
Cursor rules templates
project manifest spec
```

Commands:

```bash
harness init-project <path>
harness doctor <path>
harness new-task <path> "title"
harness status <path>
```

## Phase 2 — Tool gateway

Build typed tools:

```txt
repo.read
repo.search
git.status
git.diff
task.create
task.move
verify.run
```

No arbitrary shell yet.

## Phase 3 — RAG

Build:

```txt
repo index
docs index
task index
decision memory
hybrid retrieval
```

Start with SQLite FTS + ripgrep.

## Phase 4 — MCP server

Expose harness tools/resources/prompts to Cursor/Hermes.

## Phase 5 — Agent registry

Add:

```txt
architect
implementer
reviewer
security
qa
docs
```

## Phase 6 — A2A server

Expose agents as A2A-compatible services.

## Phase 7 — Observability

Add:

```txt
trace logs
run reports
tool-call audit
failure analysis
```

## Phase 8 — Hermes runtime

Connect Hermes as scheduled/local orchestrator.

---

# 13. What your current repo should become

From your uploaded tree, split like this:

## Move into `agent-harness`

```txt
.agent-plugins/
.agents/skills/
.hermes/
.kiro/                       # generic parts only
.skills/
skills/
tools/real-hermes-mcp/
tools/kiro-openai-bridge/
tools/telegram-kiro-gateway/
runtime/
systemd/
generic prompts/
generic task templates/
generic scripts/
```

## Move into `aegis-rpc`

```txt
apps/
packages/
contracts/
supabase/
docker/
Aegis docs
Aegis tasks
Aegis scripts
Aegis product decisions
Aegis README
```

## Archive

```txt
hackathon-only docs
duplicated skill copies
old nested .cursor/rules/.cursor/rules/
old Aegis-specific generated templates
one-off prompt dumps
```

---

# 14. Strict architectural verdict

Build this as:

```txt
agent-harness = reusable agentic control plane
project/.harness = adapter/state
MCP = tools/resources/prompts
A2A = agent-to-agent task/artifact collaboration
RAG = memory/context retrieval
Cursor = IDE client
Hermes = long-running orchestrator
```

Do **not** build:

```txt
one giant prompt repo
one giant autonomous agent
Aegis-only harness
uncontrolled shell runner
duplicated skill folders
agents that can edit everything
RAG that dumps random context into every prompt
```

---

# 15. Cursor prompt to architect/build this

Copy this into Cursor:

````md
You are my senior agentic systems architect.

I want to transform my current messy agent setup into a reusable project-agnostic Agent Harness OS.

This must NOT be tailored only to Aegis RPC. Aegis RPC is only the first project using the harness.

Final root layout:

```txt
~/dev/Project/
├─ agent-harness/
└─ aegis-rpc/
````

## Goal

Build `agent-harness` as a reusable engineering control plane that supports:

* MCP for agent-to-tool access
* A2A for agent-to-agent communication
* RAG for project/docs/code/task memory
* typed tools with risk policies
* project manifests
* task lifecycle
* agent registry
* skills registry
* Cursor integration
* Hermes integration
* trace/audit logs
* verification gates

Each project should only have a thin adapter:

```txt
<project>/.harness/
├─ project.manifest.json
├─ project-context.md
├─ agents.json
├─ skills.json
├─ tools.policy.json
├─ rag.config.json
├─ tasks/
└─ state/
```

## Hard rules

1. Do not make `agent-harness` depend on Aegis.
2. Do not put Aegis-specific docs/prompts/skills into the generic harness.
3. MCP is for tools/resources/prompts.
4. A2A is for agent-to-agent tasks/messages/artifacts.
5. RAG is for retrieval, not for dumping all context into prompts.
6. All tools must be typed and permissioned.
7. No arbitrary shell execution by default.
8. No secrets may be read or printed.
9. Every run must produce trace/audit logs.
10. Every task must have acceptance criteria and verification commands.
11. Every project must declare commands in `.harness/project.manifest.json`.
12. Cursor rules must be thin and generated from templates.
13. Hermes runtime belongs in `agent-harness/runtime/hermes`.
14. A project stores only project state/tasks/config.
15. Prefer TypeScript/Node for the first implementation.

## Build target structure

Create this:

```txt
agent-harness/
├─ README.md
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.json
│
├─ core/
│  ├─ orchestrator/
│  │  ├─ planner.ts
│  │  ├─ router.ts
│  │  ├─ dispatcher.ts
│  │  ├─ run-loop.ts
│  │  └─ reviewer.ts
│  │
│  ├─ protocols/
│  │  ├─ mcp/
│  │  │  ├─ mcp-server.ts
│  │  │  ├─ mcp-tools.ts
│  │  │  ├─ mcp-resources.ts
│  │  │  └─ mcp-prompts.ts
│  │  │
│  │  └─ a2a/
│  │     ├─ agent-card.ts
│  │     ├─ task.ts
│  │     ├─ message.ts
│  │     ├─ artifact.ts
│  │     └─ trust-policy.ts
│  │
│  ├─ policy/
│  │  ├─ tool-policy.ts
│  │  ├─ path-policy.ts
│  │  ├─ secret-policy.ts
│  │  ├─ approval-policy.ts
│  │  └─ network-policy.ts
│  │
│  ├─ state/
│  │  ├─ sqlite.ts
│  │  ├─ task-store.ts
│  │  ├─ trace-store.ts
│  │  ├─ memory-store.ts
│  │  └─ artifact-store.ts
│  │
│  ├─ rag/
│  │  ├─ ingest.ts
│  │  ├─ retrieve.ts
│  │  ├─ rerank.ts
│  │  ├─ compress.ts
│  │  └─ cite.ts
│  │
│  └─ observability/
│     ├─ trace.ts
│     ├─ events.ts
│     ├─ run-report.ts
│     └─ metrics.ts
│
├─ agents/
│  ├─ registry.json
│  ├─ orchestrator.agent.md
│  ├─ architect.agent.md
│  ├─ implementer.agent.md
│  ├─ reviewer.agent.md
│  ├─ security.agent.md
│  ├─ qa.agent.md
│  ├─ docs.agent.md
│  ├─ devops.agent.md
│  └─ research.agent.md
│
├─ skills/
│  ├─ registry.json
│  ├─ repo-restructure/
│  ├─ systematic-debugging/
│  ├─ tdd/
│  ├─ frontend-design/
│  ├─ backend-api/
│  ├─ web3-infra/
│  ├─ smart-contracts/
│  ├─ security-review/
│  ├─ docs-writing/
│  ├─ rag/
│  ├─ mcp-builder/
│  └─ a2a-builder/
│
├─ tools/
│  ├─ registry.json
│  ├─ builtin/
│  │  ├─ repo.ts
│  │  ├─ git.ts
│  │  ├─ shell.ts
│  │  ├─ tasks.ts
│  │  ├─ project.ts
│  │  └─ rag.ts
│  │
│  └─ policies/
│     ├─ default.tool-policy.json
│     ├─ safe-shell.allowlist.json
│     └─ dangerous-patterns.json
│
├─ runtime/
│  ├─ mcp/
│  │  ├─ harness-mcp-server/
│  │  └─ cursor-mcp.example.json
│  │
│  ├─ a2a/
│  │  ├─ harness-a2a-server/
│  │  └─ agent-cards/
│  │
│  ├─ hermes/
│  │  ├─ prompts/
│  │  ├─ memory-rules/
│  │  └─ schedules/
│  │
│  ├─ bridges/
│  │  ├─ cursor/
│  │  ├─ kiro/
│  │  └─ telegram/
│  │
│  └─ systemd/
│
├─ cli/
│  ├─ harness
│  └─ commands/
│     ├─ init-project.ts
│     ├─ link-project.ts
│     ├─ doctor.ts
│     ├─ status.ts
│     ├─ new-task.ts
│     ├─ run-task.ts
│     ├─ verify-task.ts
│     ├─ index-project.ts
│     ├─ sync-cursor.ts
│     ├─ start-mcp.ts
│     ├─ start-a2a.ts
│     └─ start-hermes.ts
│
├─ templates/
│  ├─ project/
│  ├─ cursor-rules/
│  ├─ tasks/
│  ├─ agents/
│  └─ skills/
│
├─ docs/
│  ├─ 00-vision.md
│  ├─ 01-architecture.md
│  ├─ 02-control-plane.md
│  ├─ 03-mcp.md
│  ├─ 04-a2a.md
│  ├─ 05-rag-memory.md
│  ├─ 06-tools-security.md
│  ├─ 07-cursor-integration.md
│  ├─ 08-hermes-integration.md
│  └─ 09-project-adapter.md
│
└─ examples/
   ├─ generic-nextjs/
   ├─ web3-infra/
   ├─ solana-anchor/
   └─ python-fastapi/
```

## MVP implementation order

### Phase 1

Create skeleton, README, docs, project manifest spec, task templates, agent registry, skill registry.

### Phase 2

Implement CLI:

```bash
harness init-project <path>
harness doctor <path>
harness status <path>
harness new-task <path> "<title>"
harness verify-task <path> <task-file>
harness sync-cursor <path>
```

### Phase 3

Implement tool gateway with these typed tools only:

```txt
repo.read
repo.search
git.status
git.diff
task.create
task.move
project.inspect
verify.run
rag.search
```

No arbitrary shell execution except allowlisted verification commands.

### Phase 4

Implement local state with SQLite:

```txt
runs
tool_calls
tasks
memory_entries
artifacts
approvals
```

### Phase 5

Implement RAG first with ripgrep + SQLite FTS. Add vector DB later.

### Phase 6

Implement MCP server exposing tools/resources/prompts.

### Phase 7

Implement A2A-compatible agent server with agent cards, tasks, messages, artifacts, and trust policy.

### Phase 8

Add Hermes runtime integration and scheduled project doctor.

## Required docs

Write these docs:

```txt
docs/00-vision.md
docs/01-architecture.md
docs/03-mcp.md
docs/04-a2a.md
docs/05-rag-memory.md
docs/06-tools-security.md
docs/07-cursor-integration.md
docs/08-hermes-integration.md
```

## Required security model

Implement policy docs and starter code for:

```txt
R0 read-only tools
R1 safe write tools
R2 project mutation tools
R3 shell command tools
R4 external mutation tools
R5 secrets/credentials tools
```

Default:

* R0 allowed
* R1 allowed with trace
* R2 requires task file
* R3 requires approval and allowlist
* R4 requires explicit approval
* R5 denied

## Final acceptance criteria

The result is acceptable only if I can run:

```bash
cd ~/dev/Project
cd agent-harness
pnpm install
pnpm build

./cli/harness init-project ../aegis-rpc
./cli/harness doctor ../aegis-rpc
./cli/harness new-task ../aegis-rpc "Audit project architecture"
./cli/harness sync-cursor ../aegis-rpc
```

And the project gets:

```txt
aegis-rpc/.harness/
aegis-rpc/.cursor/rules/
aegis-rpc/AGENTS.md
aegis-rpc/HARNESS.md
```

without hardcoded Aegis assumptions inside the generic harness.

````

---

# Bottom line

The best architecture for you is:

```txt
Reusable Agent Harness OS
  ├─ MCP tool gateway
  ├─ A2A agent collaboration
  ├─ RAG memory/context layer
  ├─ typed tool policy
  ├─ task lifecycle
  ├─ trace/audit logs
  ├─ Cursor adapter
  ├─ Hermes runtime
  └─ project adapters
````

This makes the harness usable for Aegis RPC, RetroPick, KreditAgent, DeFi searcher, or any future repo. It also fixes the biggest problem in your current setup: duplicated agent/skill/runtime context scattered across one Aegis-specific hackathon workspace.

[1]: https://modelcontextprotocol.io/specification/2025-11-25?utm_source=chatgpt.com "Specification"
[2]: https://github.com/a2aproject/A2A?utm_source=chatgpt.com "a2aproject/A2A: Agent2Agent (A2A) is an open protocol ..."
[3]: https://github.com/modelcontextprotocol/python-sdk?utm_source=chatgpt.com "MCP Python SDK"
[4]: https://www.tomshardware.com/tech-industry/artificial-intelligence/anthropics-model-context-protocol-has-critical-security-flaw-exposed?utm_source=chatgpt.com "Anthropic's Model Context Protocol includes a critical remote code execution vulnerability - newly discovered exploit puts 200,000 AI servers at risk"
[5]: https://a2a-protocol.org/latest/specification/?utm_source=chatgpt.com "Agent2Agent (A2A) Protocol Specification"
[6]: https://github.com/a2aproject/a2a-samples?utm_source=chatgpt.com "Samples using the Agent2Agent (A2A) Protocol"
[7]: https://openai.github.io/openai-agents-python/agents/?utm_source=chatgpt.com "OpenAI Agents SDK"
[8]: https://openai.github.io/openai-agents-python/handoffs/?utm_source=chatgpt.com "Handoffs - OpenAI Agents SDK"
[9]: https://openai.github.io/openai-agents-python/tracing/?utm_source=chatgpt.com "Tracing - OpenAI Agents SDK"
[10]: https://github.com/langchain-ai/langgraph-supervisor-py?utm_source=chatgpt.com "langchain-ai/langgraph-supervisor-py"
[11]: https://github.com/langchain-ai/langgraph-swarm-py?utm_source=chatgpt.com "langchain-ai/langgraph-swarm-py: For your multi-agent ..."
[12]: https://developers.llamaindex.ai/python/framework/understanding/agent/multi_agent/?utm_source=chatgpt.com "Multi-agent patterns in LlamaIndex | Developer Documentation"
[13]: https://github.com/deepset-ai/haystack?utm_source=chatgpt.com "deepset-ai/haystack: Open-source AI orchestration ..."
[14]: https://dify.ai/?utm_source=chatgpt.com "Dify: Leading Agentic Workflow Builder"
[15]: https://learn.microsoft.com/en-us/agent-framework/overview/?utm_source=chatgpt.com "Microsoft Agent Framework Overview"


Yes — **add Obsidian vault as a first-class layer**, but not as the source of truth for execution. Treat it as your **human knowledge layer / second brain / decision memory**, while the project repo remains the source of truth for code, tasks, tests, and machine-executable state.

Obsidian is a very good fit because its vault is just a local folder of Markdown files, and Obsidian automatically refreshes when external tools edit those files. That means your harness can safely write/read notes without needing a complex database integration. ([Obsidian][1])

The corrected architecture becomes:

```txt
agent-harness     = reusable agentic engineering OS
project/.harness  = project adapter, task state, machine config
obsidian vault    = human-readable knowledge graph, decisions, research, reflections
MCP               = tool access layer
A2A               = agent-to-agent communication layer
RAG               = retrieval layer across repo + vault + docs + traces
Cursor            = interactive coding agent
Hermes            = long-running orchestrator/memory/scheduled agent
```

---

# Where Obsidian fits

Do **not** put Obsidian inside every project repo.

Use one main vault:

```txt
~/Documents/Obsidian/Agentic-Engineering-Vault/
```

or inside your project workspace:

```txt
~/dev/Project/_vaults/agentic-engineering/
```

Then every project links to it through config:

```txt
aegis-rpc/.harness/obsidian.config.json
retropick/.harness/obsidian.config.json
kreditagent/.harness/obsidian.config.json
```

This gives you one cross-project knowledge layer.

---

# Final architecture with Obsidian

```txt
~/dev/Project/
├─ agent-harness/
│  ├─ core/
│  ├─ agents/
│  ├─ skills/
│  ├─ tools/
│  ├─ rag/
│  ├─ runtime/
│  │  ├─ mcp/
│  │  ├─ a2a/
│  │  ├─ hermes/
│  │  └─ obsidian/
│  └─ cli/
│
├─ aegis-rpc/
│  ├─ .harness/
│  │  ├─ project.manifest.json
│  │  ├─ obsidian.config.json
│  │  ├─ tasks/
│  │  └─ state/
│  └─ source code...
│
├─ retropick/
│  ├─ .harness/
│  │  ├─ project.manifest.json
│  │  ├─ obsidian.config.json
│  │  └─ tasks/
│  └─ source code...
│
└─ _vaults/
   └─ agentic-engineering/
      ├─ 00-Inbox/
      ├─ 01-Projects/
      ├─ 02-Agents/
      ├─ 03-Skills/
      ├─ 04-Research/
      ├─ 05-Decisions/
      ├─ 06-Runs/
      ├─ 07-Patterns/
      ├─ 08-Templates/
      └─ 99-Archive/
```

---

# What Obsidian should store

Use Obsidian for **knowledge**, not executable truth.

## Good things to store in Obsidian

```txt
project briefs
architecture decisions
research notes
meeting notes
agent run summaries
Claude/Cursor/Hermes review notes
strategy notes
cross-project lessons
mental models
agent playbooks
debugging stories
daily logs
retrospectives
```

## Do not store only in Obsidian

```txt
source code
actual task state
test results as the only copy
tool permissions
MCP config secrets
project manifests
deployment config
.env files
database migrations
```

Those belong in the project repo or harness runtime.

---

# The correct source-of-truth split

| Data               | Source of truth                          | Obsidian role                                                    |
| ------------------ | ---------------------------------------- | ---------------------------------------------------------------- |
| Code               | Project repo                             | Can link/summarize                                               |
| Tasks              | `project/.harness/tasks/`                | Human dashboard / reflection                                     |
| Project config     | `project/.harness/project.manifest.json` | Explanation only                                                 |
| Agent configs      | `agent-harness/agents/`                  | Playbook summaries                                               |
| Skills             | `agent-harness/skills/`                  | Learning notes                                                   |
| Decisions          | Repo `docs/decisions/` + Obsidian        | Obsidian can be primary for thinking, repo stores finalized ADRs |
| Research           | Obsidian                                 | Can export final version to repo docs                            |
| Run traces         | SQLite / JSONL                           | Obsidian stores readable summaries                               |
| Long-term learning | Obsidian + vector index                  | Main human memory                                                |

Strict rule:

```txt
Repo = executable truth
Obsidian = thinking truth
RAG = retrieval bridge between both
```

---

# Obsidian vault structure

Use this:

```txt
Agentic-Engineering-Vault/
├─ 00-Inbox/
│  ├─ quick-captures/
│  └─ unsorted/
│
├─ 01-Projects/
│  ├─ Aegis RPC/
│  │  ├─ _index.md
│  │  ├─ Product Brief.md
│  │  ├─ Architecture Map.md
│  │  ├─ Open Questions.md
│  │  ├─ Decisions.md
│  │  ├─ Runs/
│  │  ├─ Research/
│  │  └─ Retrospectives/
│  │
│  ├─ RetroPick/
│  ├─ KreditAgent/
│  └─ DeFi Searcher/
│
├─ 02-Agents/
│  ├─ Orchestrator Agent.md
│  ├─ Architect Agent.md
│  ├─ Implementer Agent.md
│  ├─ Reviewer Agent.md
│  ├─ Security Agent.md
│  └─ QA Agent.md
│
├─ 03-Skills/
│  ├─ Repo Restructure.md
│  ├─ MCP Builder.md
│  ├─ A2A Builder.md
│  ├─ RAG Design.md
│  ├─ Security Review.md
│  └─ Systematic Debugging.md
│
├─ 04-Research/
│  ├─ MCP/
│  ├─ A2A/
│  ├─ Agent Frameworks/
│  ├─ RAG/
│  ├─ Cursor/
│  ├─ Hermes/
│  └─ Web3 Infra/
│
├─ 05-Decisions/
│  ├─ ADR-0001-Agent-Harness-Separation.md
│  ├─ ADR-0002-MCP-vs-A2A-Boundary.md
│  ├─ ADR-0003-Obsidian-as-Knowledge-Layer.md
│  └─ ADR-0004-Tool-Risk-Model.md
│
├─ 06-Runs/
│  ├─ 2026-05/
│  │  ├─ 2026-05-25-aegis-repo-split.md
│  │  └─ 2026-05-25-harness-architecture-review.md
│
├─ 07-Patterns/
│  ├─ Supervisor Pattern.md
│  ├─ Research Review Write Pattern.md
│  ├─ Parallel Review Pattern.md
│  ├─ Tool Gateway Pattern.md
│  └─ Human Approval Pattern.md
│
├─ 08-Templates/
│  ├─ Project Note Template.md
│  ├─ Agent Run Template.md
│  ├─ ADR Template.md
│  ├─ Research Note Template.md
│  ├─ Debugging Log Template.md
│  └─ Weekly Review Template.md
│
└─ 99-Archive/
```

---

# Add Obsidian as a harness layer

In `agent-harness`, add:

```txt
agent-harness/
├─ integrations/
│  └─ obsidian/
│     ├─ README.md
│     ├─ obsidian-adapter.ts
│     ├─ vault-indexer.ts
│     ├─ note-writer.ts
│     ├─ link-resolver.ts
│     ├─ frontmatter.ts
│     ├─ templates/
│     └─ policies/
│
├─ runtime/
│  └─ obsidian/
│     ├─ local-rest-api.md
│     ├─ mcp-server.md
│     └─ uri-automation.md
│
└─ rag/
   ├─ sources/
   │  ├─ repo-source.ts
   │  ├─ obsidian-source.ts
   │  ├─ task-source.ts
   │  └─ trace-source.ts
```

Add CLI commands:

```bash
harness obsidian init <project>
harness obsidian sync <project>
harness obsidian capture <project> "<title>"
harness obsidian run-summary <project> <run-id>
harness obsidian adr <project> "<decision title>"
harness obsidian index <vault>
```

---

# Three integration modes

You should support three modes.

## Mode 1 — File-based direct access

This is the safest and simplest. Since an Obsidian vault is just a local folder of Markdown files, the harness can directly read/write `.md` files. ([Obsidian][1])

Use for:

```txt
write run summaries
write ADRs
write research notes
read project notes
index vault for RAG
```

Recommended first.

## Mode 2 — Obsidian URI

Obsidian supports `obsidian://` URIs for opening or creating notes, useful for automation and cross-app workflows. ([Obsidian][2])

Use for:

```txt
open note in Obsidian after harness writes it
create quick notes from CLI
jump from terminal/Cursor to vault note
```

Example concept:

```txt
obsidian://open?vault=Agentic-Engineering-Vault&file=01-Projects/Aegis%20RPC/_index
```

## Mode 3 — Local REST API / MCP

The Local REST API plugin exposes REST and MCP-style access to an Obsidian vault, giving scripts and AI agents a more direct authenticated interface. ([GitHub][3]) There are also existing MCP servers that connect to Obsidian through the Local REST API plugin. ([GitHub][4])

Use only after file-based integration works.

Best use:

```txt
agent queries vault live
agent updates notes through API
agent opens daily note
agent searches vault from MCP client
```

---

# My recommendation

Start with:

```txt
Phase 1: direct Markdown file integration
Phase 2: RAG index over vault
Phase 3: Obsidian URI open/create support
Phase 4: optional Local REST API/MCP integration
```

Do **not** start with a plugin-heavy setup. Your harness should still work if Obsidian is closed.

---

# Obsidian config per project

Create this in every project:

```json
{
  "enabled": true,
  "vaultPath": "../_vaults/agentic-engineering",
  "projectNotePath": "01-Projects/Aegis RPC/_index.md",
  "projectSlug": "aegis-rpc",
  "projectDisplayName": "Aegis RPC",
  "writePolicy": {
    "allowCreateNotes": true,
    "allowUpdateIndex": true,
    "allowModifyExistingNotes": false,
    "requireFrontmatter": true
  },
  "sync": {
    "runSummaries": true,
    "decisions": true,
    "research": true,
    "tasks": "summary-only",
    "traces": "summary-only"
  },
  "rag": {
    "includeInProjectRetrieval": true,
    "includeFolders": [
      "01-Projects/Aegis RPC",
      "02-Agents",
      "03-Skills",
      "04-Research/MCP",
      "04-Research/A2A",
      "07-Patterns"
    ],
    "excludeFolders": [
      "99-Archive",
      "00-Inbox/unsorted"
    ]
  }
}
```

---

# Note schema

Use YAML/properties at the top of every generated note. Obsidian properties are metadata fields stored in the note and are useful for organizing/querying notes. ([Kev's Robots][5])

Example run note:

```md
---
type: agent-run
project: aegis-rpc
date: 2026-05-25
agent: orchestrator
status: completed
source: agent-harness
task: repo-split
tags:
  - agent-harness
  - run
  - aegis-rpc
---

# Agent Run — Aegis Repo Split

## Goal
Split reusable harness from Aegis-specific project code.

## Summary
...

## Files changed
...

## Decisions
...

## Failures
...

## Next actions
...

## Links
- Project: [[Aegis RPC]]
- Decision: [[ADR-0003-Obsidian-as-Knowledge-Layer]]
```

Example ADR:

```md
---
type: adr
status: accepted
project: agent-harness
date: 2026-05-25
tags:
  - architecture
  - obsidian
  - memory
---

# ADR-0003 — Obsidian as Knowledge Layer

## Context
The harness needs long-term human-readable memory across projects.

## Decision
Use Obsidian as the human knowledge layer, while keeping executable truth in repos.

## Consequences
- Better cross-project learning.
- Easier review and reflection.
- Must avoid making Obsidian the only source of task/config truth.
```

---

# How Obsidian interacts with RAG

Your RAG should index multiple sources:

```txt
repo source       = code, README, docs
task source       = .harness/tasks
trace source      = run logs
obsidian source   = project notes, research, decisions, patterns
external source   = docs/web/GitHub research
```

Retrieval priority should be:

```txt
1. Current task file
2. Project manifest
3. Project repo docs
4. Project Obsidian notes
5. Harness docs
6. Cross-project Obsidian patterns
7. External research
8. Archived notes
```

That prevents old Obsidian thoughts from overriding current repo truth.

---

# Add this to the previous architecture

```txt
agent-harness/
├─ rag/
│  ├─ sources/
│  │  ├─ obsidian-source.ts
│  │  ├─ repo-source.ts
│  │  ├─ task-source.ts
│  │  └─ trace-source.ts
│  ├─ policies/
│  │  ├─ source-priority.ts
│  │  ├─ freshness.ts
│  │  └─ vault-privacy.ts
│
├─ integrations/
│  └─ obsidian/
│     ├─ vault-config.ts
│     ├─ markdown-note.ts
│     ├─ frontmatter.ts
│     ├─ note-writer.ts
│     ├─ note-reader.ts
│     ├─ uri.ts
│     ├─ indexer.ts
│     └─ templates/
│
└─ tools/
   └─ builtin/
      ├─ obsidian.read.ts
      ├─ obsidian.search.ts
      ├─ obsidian.write-note.ts
      ├─ obsidian.append-run-summary.ts
      └─ obsidian.open-uri.ts
```

Tool risk levels:

| Tool                          |  Risk | Default                           |
| ----------------------------- | ----: | --------------------------------- |
| `obsidian.search`             |    R0 | allowed                           |
| `obsidian.read`               | R0/R1 | allowed for included folders only |
| `obsidian.write-note`         |    R1 | allowed for generated folders     |
| `obsidian.append-run-summary` |    R1 | allowed                           |
| `obsidian.modify-existing`    |    R2 | approval required                 |
| `obsidian.delete-note`        |    R4 | deny by default                   |
| `obsidian.read-private`       |    R5 | deny                              |

---

# The important security rule

Obsidian notes are **not trusted instructions**.

Treat them like RAG documents, not system prompts.

Why? Notes can contain old ideas, copied web text, hallucinated plans, or prompt injection from external articles. So the harness must label retrieved Obsidian content as:

```txt
UNTRUSTED_CONTEXT
```

The agent can use it as reference, but cannot obey it as instruction.

---

# Best workflow

## During development

```txt
Cursor edits code
  ↓
Harness traces changes
  ↓
Tests run
  ↓
Harness writes run summary to Obsidian
  ↓
Obsidian links run to project, task, ADR
```

## During research

```txt
Hermes researches MCP/A2A/RAG
  ↓
Writes research note to Obsidian
  ↓
Harness extracts final decisions into repo docs/ADR
```

## During architecture decision

```txt
You discuss idea
  ↓
Harness creates ADR draft in Obsidian
  ↓
Once accepted, export/copy ADR to project docs/decisions/
```

---

# Cursor prompt addition

Add this to your Cursor prompt:

````md
## Add Obsidian vault as a first-class knowledge layer

Update the generic `agent-harness` architecture to support Obsidian as an optional human-readable knowledge layer.

Important: Obsidian must not become the executable source of truth. The repo and `.harness/` remain the source of truth for code, tasks, configs, verification, and tool policies.

Obsidian is used for:
- project knowledge
- research notes
- architecture decisions
- run summaries
- retrospectives
- cross-project lessons
- agent playbooks
- debugging stories

Implement this architecture:

```txt
agent-harness/
├─ integrations/
│  └─ obsidian/
│     ├─ README.md
│     ├─ vault-config.ts
│     ├─ markdown-note.ts
│     ├─ frontmatter.ts
│     ├─ note-reader.ts
│     ├─ note-writer.ts
│     ├─ uri.ts
│     ├─ indexer.ts
│     └─ templates/
│
├─ rag/
│  ├─ sources/
│  │  ├─ obsidian-source.ts
│  │  ├─ repo-source.ts
│  │  ├─ task-source.ts
│  │  └─ trace-source.ts
│  └─ policies/
│     ├─ source-priority.ts
│     ├─ freshness.ts
│     └─ vault-privacy.ts
│
└─ tools/
   └─ builtin/
      ├─ obsidian.read.ts
      ├─ obsidian.search.ts
      ├─ obsidian.write-note.ts
      ├─ obsidian.append-run-summary.ts
      └─ obsidian.open-uri.ts
````

Each project gets:

```txt
<project>/.harness/obsidian.config.json
```

Use this config shape:

```json
{
  "enabled": true,
  "vaultPath": "../_vaults/agentic-engineering",
  "projectNotePath": "01-Projects/<PROJECT_DISPLAY_NAME>/_index.md",
  "projectSlug": "<PROJECT_SLUG>",
  "projectDisplayName": "<PROJECT_DISPLAY_NAME>",
  "writePolicy": {
    "allowCreateNotes": true,
    "allowUpdateIndex": true,
    "allowModifyExistingNotes": false,
    "requireFrontmatter": true
  },
  "sync": {
    "runSummaries": true,
    "decisions": true,
    "research": true,
    "tasks": "summary-only",
    "traces": "summary-only"
  },
  "rag": {
    "includeInProjectRetrieval": true,
    "includeFolders": [
      "01-Projects/<PROJECT_DISPLAY_NAME>",
      "02-Agents",
      "03-Skills",
      "04-Research",
      "05-Decisions",
      "07-Patterns"
    ],
    "excludeFolders": [
      "99-Archive",
      "00-Inbox/unsorted"
    ]
  }
}
```

Add CLI commands:

```bash
harness obsidian init <project>
harness obsidian sync <project>
harness obsidian capture <project> "<title>"
harness obsidian run-summary <project> <run-id>
harness obsidian adr <project> "<decision title>"
harness obsidian index <vault>
```

Implement in phases:

1. Direct Markdown file read/write only.
2. RAG indexing over vault notes.
3. Obsidian URI open/create support.
4. Optional Local REST API / MCP integration later.

Security rules:

* Obsidian notes are untrusted RAG context, not system instructions.
* Do not read excluded/private folders.
* Do not modify existing notes unless explicitly allowed.
* Do not delete notes.
* Do not store secrets in notes.
* Generated notes must include YAML frontmatter.
* Run summaries are summary-only, not raw traces with secrets.

Vault target structure:

```txt
_vaults/agentic-engineering/
├─ 00-Inbox/
├─ 01-Projects/
├─ 02-Agents/
├─ 03-Skills/
├─ 04-Research/
├─ 05-Decisions/
├─ 06-Runs/
├─ 07-Patterns/
├─ 08-Templates/
└─ 99-Archive/
```

Acceptance criteria:

* Harness can initialize Obsidian config for a project.
* Harness can create a project index note.
* Harness can write a run summary note.
* Harness can create an ADR note.
* Harness can index selected vault folders for RAG.
* Harness never treats Obsidian notes as executable instructions.
* Harness still works if Obsidian app is closed.

````

---

# Final verdict

Yes, add Obsidian — but as a **knowledge graph layer**, not as the harness core.

The clean model is:

```txt
Repo/.harness = machine state
Obsidian = human memory
RAG = bridge
MCP = tools
A2A = agents
Hermes = long-running orchestrator
Cursor = coding interface
````

This is very strong for you because you work across many projects: Aegis RPC, RetroPick, KreditAgent, DeFi searcher, hackathon docs, and academic tasks. Obsidian becomes your cross-project memory system, while the harness keeps execution disciplined.

[1]: https://obsidian.md/help/data-storage?utm_source=chatgpt.com "How Obsidian stores data"
[2]: https://obsidian.md/help/uri?utm_source=chatgpt.com "Obsidian URI - Obsidian Help"
[3]: https://github.com/coddingtonbear/obsidian-local-rest-api?utm_source=chatgpt.com "Local REST API & MCP Server"
[4]: https://github.com/MarkusPfundstein/mcp-obsidian?utm_source=chatgpt.com "MarkusPfundstein/mcp-obsidian: MCP server that interacts ..."
[5]: https://www.kevsrobots.com/learn/obsidian/09_properties.html?utm_source=chatgpt.com "Properties in Obsidian"

