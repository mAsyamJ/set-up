# Agent Harness

Agent Harness is a local control plane for typed agent tools, project
registration, task lifecycle, audit evidence, retrieval, approvals, and
isolated worktrees.

Cursor is the primary interactive coding environment. Hermes Agent is an
optional operator with its own provider and model configuration. Cursor and
Hermes are separate agent and model control planes; neither is a model backend
for the other.

## Safety State

The repository is under staged hardening. These capabilities remain disabled
until their documented gates pass:

- Hermes write tools and task execution
- asynchronous workers and fleet execution
- A2A, legacy bridge, timers, and port proxies
- automatic merge, push, deployment, or permission response
- persistent service enablement

Do not run historical bootstrap, fleet, bridge, or 24/7 automation scripts.
Their source remains only for migration analysis and must fail closed.

## Local Layout

- Source: this Git repository
- Project registry:
  `${XDG_CONFIG_HOME:-$HOME/.config}/agent-harness/projects.json`
- Runtime state:
  `${XDG_STATE_HOME:-$HOME/.local/state}/agent-harness/`
- Product repositories: independent Git repositories outside this repository
- Secrets: provider-specific stores outside Git

The committed [registry example](projects/registry.example.json) contains no
machine paths. Missing product repositories are optional and must not make
Harness diagnostics fail.

## Development Baseline

Requirements:

- Ubuntu-D on WSL2
- Node.js 24
- npm 11
- Python 3.11 or newer
- repository stored on the Linux filesystem

Keep this repository under `/home` in Ubuntu-D. Do not relocate it to `/mnt/d`;
the WSL virtual disk is already physically stored on D:, while `/home` retains
native Linux filesystem semantics and performance.

Before dependency installation, `doctor --dependency-install` resolves and
checks the repository, npm cache, Node temporary directory, and Linux root
filesystems. Each required filesystem must have at least 10 GB free and remain
below 95% utilization. A low-space `/mnt/c` is reported prominently as Windows
system-health risk, but blocks installation only when a required write path
actually resolves there.

```bash
cli/harness doctor
cli/harness doctor --dependency-install
npm ci --ignore-scripts --no-audit --no-fund
npm rebuild better-sqlite3 esbuild
npm run lint
npm run typecheck
npm run build
npm test
npm run acceptance
git diff --check
```

`npm ci` is the only supported root dependency installation path in CI and
verification environments. The committed lockfile is authoritative.
Dependency lifecycle scripts remain disabled during installation; only the
reviewed `better-sqlite3` and `esbuild` build steps are run explicitly.

## Architecture

```text
User -> Cursor -> restricted Harness MCP -> typed Tool Gateway
User -> Hermes operator -> read-only Harness MCP -> typed Tool Gateway
Approved task -> isolated worker -> lease-bound Harness MCP -> worktree
```

The Tool Gateway, not prompts, owns identity, authorization, approval
consumption, filesystem confinement, trusted command execution, and audit
evidence.

See:

- [Agent Harness v1 architecture](docs/architecture/agent-harness-v1.md)
- [Current hardening baseline](docs/audit/2026-07-23-baseline.md)
- [Recovery runbook](docs/runbooks/recovery.md)

Historical product and Hermes-first material is under `docs/archive/` and is
not operational guidance.
