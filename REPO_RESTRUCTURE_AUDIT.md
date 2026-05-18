# REPO_RESTRUCTURE_AUDIT.md

Audit date: 2026-05-18  
Repo: `/home/asyam/dev/Project/aegis-hackathon-kit`  
Scope: Agent orchestration layout, source-of-truth map, safe restructure (no product MVP implementation in kit).

---

# 1. Current Repo Diagnosis

## What is good

- **Runtime stack is documented and wired**: Hermes (`hermes-gateway.service`) → Kiro OpenAI bridge (`127.0.0.1:8787`) → `kiro-cli`. Hivemind shared memory verified via `scripts/verify-hivemind-shared-memory.sh`.
- **Kiro agent graph**: `.kiro/agents/*.json`, `.kiro/steering/`, `.kiro/settings/mcp.json` (Hivemind MCP).
- **Product specifications**: `docs/00-*` through `docs/16-*` with `docs/README.md` describing MVP and demo order.
- **Custom domain skills**: `.skills/` (~26 Aegis RPC skills) with `.skills/registry.json`.
- **Build sequencing**: `ORCHESTRATOR.md`, `tasks/phase-*.md`, `DECISIONS.md`.
- **Research quarantine**: `research/` (opensrc paths, notes) separated from product source.
- **Role prompts**: `agents/*-agent.md` per swarm role.

## What is risky

| Risk | Detail |
|------|--------|
| Dual AGENTS contract | Root `AGENTS.md` concatenated kit workflow + product swarm; duplicated `agents/AGENTS.md`. |
| Skills sprawl | `.skills/`, `skills/`, `.agents/skills/` (~13MB), `.kiro/skills/` (symlinks), `.hermes/skills/` in repo. |
| Broken Cursor rules | Rule file nested at `.cursor/rules/.cursor/rules/karpathy-guidelines.mdc`. |
| No `.gitignore` | `tools/**/node_modules`, `.env` under legacy gateway at commit risk. |
| Context flood | `MASTERPLAN.md` (~2792 lines), `research/source-research-results.md` (~8700 lines). |
| Dual doc trees | `docs/` (product) vs `tools/docs/` (kit playbooks) — merged to `docs/kit/` in Pass 2. |
| Meta at root | `currentPrompt.md` is full restructure spec. |

## What is duplicated

- Root `AGENTS.md` L85+ ≈ `agents/AGENTS.md`.
- Vendor skills in `.agents/skills/` mirrored via `.kiro/skills/` symlinks and `skills/` npx install tree.
- Templates: `templates/templates/`, `templates/aegis_rpc_agentic_workspace/`, swarm markdown bundles.
- Runtime notes in `runtime/`, `systemd/`, `scripts/` (intentional overlap; indexed in READMEs).

## What is stale

- `WORKSPACE_INDEX.md` — generic workspace template; updated in Pass 2.
- `progress.md` — single Codex resume line.
- `AGENTS.md` L73 — said playbooks under `tools/docs/` (now `docs/kit/`).

## What must not be touched

- `tools/kiro-openai-bridge/` (server, Hivemind context injection)
- `tools/real-hermes-mcp/`
- `systemd/user/hermes-gateway.service`, `systemd/user/kiro-openai-bridge.service`
- `scripts/start-aegis-dev.sh`, `scripts/verify-hivemind-shared-memory.sh`, `scripts/providers/kiro-provider.sh`
- **Do not enable** `telegram-kiro-gateway.service`
- **Do not read/edit/commit** `.env` files or secrets
- `research/` content (archive/move only; never delete)
- `currentPrompt.md` content (copy; keep root per user constraint)

---

# 2. Source of Truth Map

| Concept | Current locations | Recommended source of truth | Action | Reason |
|---------|-------------------|----------------------------|--------|--------|
| Product rules | `docs/0*.md`, `agents/AGENTS.md`, `.cursor/rules/00-aegis-product.mdc` | `docs/` + `agents/AGENTS.md` + Cursor rule | Keep / split root AGENTS | Avoid duplicate product block at root |
| Hackathon strategy | `MASTERPLAN.md`, `HACKATHON.md` | Root files | Keep | Reference-only; `.cursorignore` |
| Build phases | `ORCHESTRATOR.md`, `tasks/phase-*.md` | `ORCHESTRATOR.md` + `tasks/` | Keep | Phase control |
| Agent roles | `agents/*-agent.md` | `agents/` (optional `agents/roles/` later) | Keep | Role-specific prompts |
| Cursor rules | `.cursor/rules/*.mdc` | `.cursor/rules/` | Fix path + add 00–06 | Stable IDE instructions |
| Kiro agents | `.kiro/agents/`, `.kiro/steering/` | `.kiro/` | Keep | Kiro CLI config |
| Hermes runtime | `~/.hermes/`, `.agent-plugins/hermes/` | User home + repo plugin | Keep | 24/7 Telegram |
| Kiro OpenAI bridge | `tools/kiro-openai-bridge/` | Same | Keep | Hermes model backend |
| External skills | `.agents/skills/`, `skills/` | `vendor/skills/agents-bundle/` | Move (Pass 2) | Single vendor tree |
| Custom Aegis skills | `.skills/` | `.skills/` + `registry.json` | Keep | Domain skills |
| OpenSrc research | `research/`, `aegis_opensrc_github_setup.sh` | `research/` | Keep | Not product source |
| Templates | `templates/**` | `templates/` + `archive/` for legacy | Archive duplicates (later) | Reduce nesting |
| Systemd | `systemd/user/` | Same | Keep | Active services |
| Old Telegram Kiro gateway | `tools/telegram-kiro-gateway/` | `tools/archive/telegram-kiro-gateway/` | Archive | Forbidden path |
| Product implementation | (future) | `~/dev/Project/Aegis/aegis-protocol-hackathon` | Placeholder `apps/README.md` | Kit ≠ app repo |
| Kit playbooks | `tools/docs/` → | `docs/kit/` | Move (Pass 2) | User chose merge_under_docs |

---

# 3. Recommended Clean Architecture

```text
aegis-hackathon-kit/
├── AGENTS.md                 # Kit workflow only (points to agents/AGENTS.md)
├── ORCHESTRATOR.md
├── DECISIONS.md
├── README.md
├── MASTERPLAN.md
├── HACKATHON.md
├── REPO_RESTRUCTURE_AUDIT.md
├── currentRepo.md
├── progress.md
├── currentPrompt.md          # Preserved at root; copy in prompts/
├── docs/
│   ├── README.md             # Index: product specs vs kit/
│   ├── kit/                  # Hermes, Kiro, lifecycle playbooks (from tools/docs/)
│   ├── 00-vision.md … 16-*   # Product specs (flat or docs/product/ later)
│   └── research/             # Optional mirror of research notes
├── tasks/
│   ├── README.md
│   └── phase-*.md
├── agents/
│   ├── README.md
│   ├── AGENTS.md             # Product swarm contract
│   └── *-agent.md
├── .cursor/rules/            # 00–06 + karpathy (globs)
├── .kiro/
├── .agent-plugins/
├── .skills/                  # Custom Aegis skills
├── vendor/skills/            # External bundles (agents-bundle)
├── runtime/
├── tools/
│   ├── kiro-openai-bridge/
│   ├── real-hermes-mcp/
│   ├── docs/README.md        # Redirect → ../../docs/kit/
│   └── archive/
│       └── telegram-kiro-gateway/  # FORBIDDEN runtime
├── scripts/
├── systemd/user/
├── research/
├── templates/
├── prompts/
├── archive/
└── apps/README.md            # Placeholder for future app repo
```

---

# 4. Migration Plan

## Pass 1 (safe — completed with this audit)

- Create `REPO_RESTRUCTURE_AUDIT.md`
- Add `.gitignore`, `.cursorignore`
- Fix Cursor rules path; add `00-aegis-product.mdc` … `06-hackathon-scope-control.mdc`
- README indexes: `docs/`, `agents/`, `tasks/`, `research/`, `runtime/`, `tools/`, `archive/`, `docs/kit/`
- Pointer in root `AGENTS.md` to `agents/AGENTS.md`

## Pass 2 (structural — completed after audit)

| Step | Risk | Action |
|------|------|--------|
| Merge kit docs | Low | `mv tools/docs/*` → `docs/kit/`; redirect `tools/docs/README.md` |
| Vendor skills | Medium | `mv .agents/skills` → `vendor/skills/agents-bundle`; relink `.kiro/skills` |
| Archive gateway | Low | `mv tools/telegram-kiro-gateway` → `tools/archive/` |
| Split AGENTS | Low | Root kit-only; product in `agents/AGENTS.md` |
| Copy currentPrompt | Low | `cp` → `prompts/repo-restructure-task.md` |
| Update links | Medium | Grep `tools/docs/` → `docs/kit/` in tracked files |

## Files requiring human confirmation (future)

- Flatten `docs/` into `docs/product/` subfolder
- Archive nested `templates/templates/`
- Relocate `skills/` npx tree to reference `vendor/skills/`
- Init git repo / first commit if not yet initialized

---

# 5. Exact Commands

## Pass 1

```bash
cd /home/asyam/dev/Project/aegis-hackathon-kit
mv .cursor/rules/.cursor/rules/karpathy-guidelines.mdc .cursor/rules/karpathy-guidelines.mdc
rmdir -p .cursor/rules/.cursor/rules 2>/dev/null || true
# Create .cursor/rules/00-06 via editor
# Create .gitignore, .cursorignore, README indexes
```

## Pass 2

```bash
cd /home/asyam/dev/Project/aegis-hackathon-kit
mkdir -p docs/kit vendor/skills tools/archive archive apps

# Kit playbooks
mv tools/docs/0*.md tools/docs/README.md tools/docs/templates docs/kit/ 2>/dev/null || true
# Write tools/docs/README.md redirect

# Vendor skills
mv .agents/skills vendor/skills/agents-bundle
# Relink .kiro/skills
for link in .kiro/skills/*; do
  [ -L "$link" ] || continue
  name=$(basename "$link")
  rm "$link"
  ln -s "../../vendor/skills/agents-bundle/$name" ".kiro/skills/$name"
done

# Archive forbidden gateway (preserve .env locally; gitignored)
mv tools/telegram-kiro-gateway tools/archive/telegram-kiro-gateway

# Meta prompt copy
cp currentPrompt.md prompts/repo-restructure-task.md

# Update references
# sed/grep tools/docs → docs/kit in AGENTS.md, README.md, etc.
```

## Verification

```bash
test -f REPO_RESTRUCTURE_AUDIT.md
ls .cursor/rules/*.mdc | wc -l    # expect >= 7
test -d docs/kit && test -f docs/kit/07-memory-architecture.md
test -d vendor/skills/agents-bundle
./scripts/verify-hivemind-shared-memory.sh
systemctl --user is-active hermes-gateway kiro-openai-bridge
```

---

# 6. Cursor Rule Plan

| File | alwaysApply | globs | Summary |
|------|-------------|-------|---------|
| `00-aegis-product.mdc` | true | — | Aegis RPC product; Chainlink adapter only; AI explains, policy decides; 24H MVP scope |
| `01-architecture-boundaries.mdc` | false | `apps/**`, `packages/**`, `docs/**` | API, policy, adapter, AI memo, contracts, dashboard boundaries |
| `02-agentic-workflow.mdc` | true | — | Read AGENTS → ORCHESTRATOR → DECISIONS → tasks; return files, tests, blockers |
| `03-runtime-hermes-kiro.mdc` | false | `tools/kiro-openai-bridge/**`, `systemd/**`, `scripts/**` | Hermes + bridge services; forbid telegram-kiro-gateway |
| `04-testing-and-verification.mdc` | false | `**/*.{test,spec}.ts`, `contracts/**` | vitest, curl, forge, demo checklist |
| `05-security-and-secrets.mdc` | true | — | No .env in commits/prompts; localhost bridge only |
| `06-hackathon-scope-control.mdc` | false | — | MVP vs stretch; cut non-demo work |
| `karpathy-guidelines.mdc` | false | `**/*.{ts,tsx,js}` | Surgical changes, simplicity (was alwaysApply true; set false to reduce flood) |

---

# 7. Final Recommendation

## Cursor

- Root `AGENTS.md` = kit workflow only.
- Always-on rules: `00`, `02`, `05`.
- `.cursorignore`: `research/source-research-results.md`, `MASTERPLAN.md`, `vendor/**/node_modules`, `tools/**/node_modules`.

## Kiro

- `kiro-cli --agent aegis-orchestrator` with `.kiro/agents/` and steering.
- Skills symlinks → `vendor/skills/agents-bundle/`.
- Hivemind via `.kiro/settings/mcp.json`.

## Hermes

- `hermes-gateway.service` only; bridge at `:8787`.
- Plugin: `.agent-plugins/hermes/`.
- Never `telegram-kiro-gateway.service`.

## Claude / Codex

- `CLAUDE.md` at root for behavioral guardrails.
- Product work: `agents/AGENTS.md` + `docs/` + `ORCHESTRATOR.md`.

## Before product coding

1. Run `aegis-dev` / `scripts/verify-hivemind-shared-memory.sh`.
2. Scaffold app repo at `~/dev/Project/Aegis/aegis-protocol-hackathon` (not in kit).
3. Follow `ORCHESTRATOR.md` phase 0 → phase 1 (`/api/rpc` passthrough).
4. Reply **proceed pass 2** only if further template/archive work is needed.

---

*This audit was generated as part of the Aegis Hackathon Kit restructure. Do not delete `research/`, `currentPrompt.md`, or runtime bridge files without reading §1.*
