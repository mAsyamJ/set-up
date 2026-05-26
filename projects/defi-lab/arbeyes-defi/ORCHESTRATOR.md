# ORCHESTRATOR.md — ArbEyes DeFi Engineering Plan

## Objective

Stand up the **gate-first** Rust shadow solver described in `docs/`, with harness tasks, Kanban (`arbeyes-defi-v1`), and agents that each own a narrow slice.

## Phase map (maps to `docs/15-14-day-build-plan.md`)

| Phase | Focus | Owner agent | Stop condition |
|-------|--------|-------------|----------------|
| P0 | Harness + docs + fixtures plan | Orchestrator | Registry + manifest + backlog tasks exist |
| P1 | Cargo workspace + core telemetry | Rust Core | `cargo run` boots, loads config, exits clean |
| P2 | `cow_client` + models + fixtures | Rust Core + QA Gate | Real `solver_competition` JSON deserializes |
| P3 | Storage + migrations | Rust Core | WAL SQLite, transactional writes per auction |
| P4 | Normalizer + EVM decimals | Rust EVM | Common tokens resolve without duplicate RPC spam |
| P5 | Scorer sell → buy + fees | Rust Core | Bucketed errors on mixed fixtures |
| P6 | **Scorer validation gate** | Rust Core + QA Gate | ≥80% within 1% over 100+ auctions **or** documented kill / fallback |
| P7 | Reporter + daily rollups | Rust Core | Report numbers match SQL aggregates |
| P8 | Routes + quote (post-gate only) | Rust Core + Rust EVM | CoW `/quote` + UniV2 paths only |
| P9 | Compare + EBBO flags | Rust Core | Tags survive manual spot-checks |
| P10 | Metrics + health + optional Telegram | Observability | `/metrics` moves with traffic |
| P11 | VPS + 72h soak | Observability | `docs/14-vps-runbook.md` followed |

**Hard stop between P6 and P8:** no `routes.rs` / `quote.rs` until the gate passes or the team explicitly accepts the documented approximate fallback (`docs/09-scorer-validation-gate.md`).

## Verify commands

```bash
bash scripts/harness-verify.sh all
```

## Kanban

Board **`arbeyes-defi-v1`** — workspace `dir:<absolute path to projects/defi-lab/arbeyes-defi>`.

Bootstrap board (once per machine):

```bash
AGENT_HARNESS_HOME=~/dev/Project/agent-harness \
  bash "$AGENT_HARNESS_HOME/scripts/kanban-init-project-board.sh" arbeyes-defi
```

## OpenSrc

Maintain `.harness/research/opensrc-paths/github.com__cowprotocol__services.path` pointing at your local `cowprotocol/services` clone. Pin the OpenAPI tag in `models.rs` when implemented.
