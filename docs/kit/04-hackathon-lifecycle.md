# Hackathon lifecycle — prep to push

End-to-end playbook for SEABW: from kit prep through production deploy and submission.

## Phase overview

| Phase | When | Tooling | Root deliverable |
|-------|------|---------|------------------|
| **0. Pre-build** | Before official start | Kit repo only | No product code in kit |
| **1. Scaffold** | Build clock starts | `create-next-app`, copy templates | `HACKATHON.md`, `docs/AI_COLLABORATION_LOG.md` |
| **2. Build modules** | Each MVP slice | `aegis-orchestrator` → builder/security | **One commit per module** + log row |
| **3. Plan** | Before big features | `/plan` or orchestrator | `.hermes/plans/` or Kiro notes |
| **4. Grill me** | Pre-demo / pre-submit | Telegram + pitch agent | `docs/GRILL_QA.md` |
| **5. Production** | Demo-ready | Vercel (approval) | Demo URL in `HACKATHON.md` |
| **6. Push / submit** | Final | `git push` (approval) | Clean history + AI proof |

---

## Phase 0 — Pre-build (kit repo)

**Repo:** `~/dev/Project/agent-harness`

Allowed: docs, scripts, `.kiro`, MCP bridge, systemd units.

Not allowed: final Aegis product app, hackathon-specific business logic.

Daily:

```bash
aegis-dev
kiro-cli --agent aegis-orchestrator
```

---

## Phase 1 — Scaffold (app repo)

When official build starts:

```bash
cd ~/dev/Project/Aegis
mkdir -p aegis-protocol-hackathon
cd aegis-protocol-hackathon

npx create-next-app@latest . \
  --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Copy kit assets:

```bash
KIT=~/dev/Project/agent-harness
cp -r "$KIT/.kiro" .
cp "$KIT/AGENTS.md" .
mkdir -p docs
cp "$KIT/docs/kit/templates/HACKATHON.md" ./HACKATHON.md
cp "$KIT/docs/kit/templates/AI_COLLABORATION_LOG.md" ./docs/AI_COLLABORATION_LOG.md
```

Initialize git:

```bash
git init
git branch -M main
git add .
git commit -m "$(cat <<'EOF'
chore: initialize Aegis RPC hackathon workspace

Scaffold Next.js app and copy Kiro/Hermes kit config.

Co-authored-by: Kiro <kiro@aws.dev>
Co-authored-by: Cursor <cursor@cursor.com>
EOF
)"
```

Start orchestrator:

```bash
aegis-dev
kiro-cli --agent aegis-orchestrator
```

Prompt:

```txt
Use the Aegis orchestrator workflow. Follow HACKATHON.md module order. Do not use Docker or private keys. Do not push without asking.
```

---

## Phase 2 — Build modules (one commit each)

Align with [.kiro/steering/aegis-product.md](../../.kiro/steering/aegis-product.md).

| # | Module | Suggested commit subject |
|---|--------|--------------------------|
| 1 | JSON-RPC passthrough | `chore: add rpc passthrough` |
| 2 | POST /api/preflight | `feat: add preflight endpoint` |
| 3 | Tx decoder | `feat: add tx decoder` |
| 4 | Policy engine | `feat: add policy engine` |
| 5 | Adapter layer | `feat: add adapter layer` |
| 6 | Chainlink/mock adapter | `feat: add chainlink adapter` |
| 7 | RiskOps dashboard | `feat: add riskops dashboard` |
| 8 | AI memo panel | `feat: add ai memo panel` |
| 9 | Base Sepolia proof | `chore: add base sepolia demo proof` |

**Per module workflow:**

1. Update `HACKATHON.md` checkbox (plan which module).
2. Optional: `/plan` or orchestrator plan for that module only.
3. Implement via **builder** (or orchestrator delegate).
4. **Security** review if module touches policy/adapters.
5. Commit with `Co-authored-by` — see [05-ai-collaboration.md](05-ai-collaboration.md).
6. Add row to `docs/AI_COLLABORATION_LOG.md`.
7. **QA** smoke check before next module.

---

## Phase 3 — Plan (technical)

Use before modules 4+ or any cross-cutting refactor.

**Hermes (Telegram or CLI):**

```txt
/plan Design policy engine interfaces: inputs, verdict enum, and adapter signal shape. No implementation.
```

**Kiro orchestrator:**

```txt
Plan module 4 only. Output steps and files. Do not implement yet.
```

Plans from Hermes `/plan` → `.hermes/plans/*.md` in workspace.

---

## Phase 4 — Grill me (judge Q&A)

**Goal:** survive judge questions; no overclaiming.

1. Run [02-hermes-24-7.md](02-hermes-24-7.md) grill prompts on Telegram.
2. Run `kiro-cli --agent pitch` for structured FAQ.
3. Save to `docs/GRILL_QA.md` in app repo.

Template sections for `GRILL_QA.md`:

```markdown
# Grill Q&A — Aegis Protocol

## One-liner
## Problem
## Why not just a dashboard / chatbot
## Chainlink role (and limits)
## What BLOCK means (deterministic vs AI)
## Demo limitations / honest scope
## Top 10 judge Q&A
```

---

## Phase 5 — Production

- Deploy to Vercel (or approved host) **only after explicit approval**.
- Record demo URL in `HACKATHON.md`.
- Run **qa** agent on deployed demo paths.

```bash
kiro-cli --agent qa
```

```txt
Verify production URL, /api/preflight, and dashboard demo scenarios from 06-mvp-and-demo.md.
```

---

## Phase 6 — Push / submit

- `git push` only with approval.
- Confirm every module commit has `Co-authored-by`.
- Confirm `docs/AI_COLLABORATION_LOG.md` is complete.
- README in app repo links demo + AI collaboration proof.

Submission checklist:

- [ ] Demo URL live
- [ ] `HACKATHON.md` all phases checked
- [ ] `docs/AI_COLLABORATION_LOG.md` filled
- [ ] `docs/GRILL_QA.md` present
- [ ] Git history shows AI collaboration trailers
- [ ] No secrets in repo

---

## What to copy to every new hackathon app root

| File | Source |
|------|--------|
| `HACKATHON.md` | `docs/kit/templates/HACKATHON.md` |
| `docs/AI_COLLABORATION_LOG.md` | `docs/kit/templates/AI_COLLABORATION_LOG.md` |
| `.kiro/` | kit `.kiro/` |
| `AGENTS.md` | kit `AGENTS.md` |

Optional: `docs/GRILL_QA.md` (created in phase 4).

---

## Related docs

- [05-ai-collaboration.md](05-ai-collaboration.md)
- [06-mvp-and-demo.md](06-mvp-and-demo.md)
- [03-kiro-agents.md](03-kiro-agents.md)
