# Final Implementation Decision

```
Build Now:
  rust-searcher-lab/ with ONE app (apps/cow-shadow-solver) + three crates
  (crates/core, crates/evm, crates/storage) + this docs pack. A read-only CoW
  shadow solver. Nothing else exists on day one.

First Coding Milestone:
  cow_client.rs (get_solver_competition_latest / get_solver_competition) +
  models.rs + storage, leading directly to the scorer validation gate. The first
  real fetch is a SETTLED solver competition, because the gate depends only on
  that public endpoint — never on the permissioned /auction endpoint.

Scorer Validation Gate (the project's core):
  Recompute the WINNING settlement's score from public data and match the
  API-reported score within 1% on >=80% of 100+ settled auctions, with failures
  explained by a coherent bucket (buy orders / partial fills / multi-pair).
  Reproducibility limit: the CIP-67 fair-combinatorial FILTERING cannot be
  reproduced publicly, so the later comparison is framed as "my score vs the
  winner's score," NOT "would have won." If exact reproduction is impossible after
  honest effort, drop to the documented rank-correlation fallback gate and label
  everything approximate.

Do Not Build Until Gate Passes:
  routes.rs, quote.rs, compare.rs, ebbo.rs/risk. No route generation on an
  unproven scorer. (Monitoring/health can be wired in parallel; routing cannot.)

VPS Deployment Target:
  One Ubuntu/Debian VPS, 1-2 vCPU / 1-2 GB / 20-50 GB, ~$10-$30/month. Single
  systemd service, one SQLite file (WAL), tracing->journald, Prometheus /metrics on
  127.0.0.1, nightly sqlite .backup via timer, optional Telegram alerts. Public/paid
  RPC; no self-hosted node. Dev on Windows + WSL2 (identical userland).

14-Day Product 1 Success Criteria:
  (1) Gate passes (>=80% within 1% over 100+ auctions) OR a clear documented reason
  it cannot — both are valid, cheap results. (2) Post-gate: per-pair win-rate and
  p50/p95 score-gap characterized over several hundred settled auctions. (3) 72h
  unattended VPS soak without crash/leak.

If CoW Gate Blocks PnL:
  The bond ($500K + 1.5M COW full; $50K->$100K + 500K->1M COW reduced) is
  prohibitive for a solo dev. If the shadow win-rate is uncompelling (e.g. <2% of
  1000+ auctions beaten), do NOT pursue onboarding. Keep the shadow solver as a
  portfolio/credential artifact and pivot PnL effort to Product 2 (OEV/SVR via
  permissionless Atlas bidding — no bond). Consider a CoW DAO Grant only if a
  specific token-pair niche shows a 5-15% win-rate.

Flashloan:
  Deferred to Product 4 (Flashloan Arbitrage Feasibility Engine). Documented in
  18-do-not-build-yet.md and roadmap only. NOT merged into Product 1, which never
  executes on-chain.

Next Action (not another plan):
  Run the Cursor prompt in 17-cursor-agentic-implementation-prompt.md. Capture 20+
  real settled-competition fixtures first. Stop at the gate result for review before
  any route code.

Next Cursor Prompt:
  See 17-cursor-agentic-implementation-prompt.md (full, paste-ready).
```

## File index for this pack

```
docs/cow-shadow-solver/
  00-decision.md
  01-research-sources.md
  02-product-scope.md
  03-rust-workspace-architecture.md
  04-cow-protocol-method.md
  05-orderbook-api-spec.md
  06-data-models.md
  07-cow-client-spec.md
  08-normalizer-spec.md
  09-scorer-validation-gate.md          <- the most important file
  10-route-generator-spec.md            <- post-gate only
  11-ebbo-and-risk-checks.md
  12-storage-schema.md
  13-live-monitoring-spec.md
  14-vps-runbook.md
  15-14-day-build-plan.md
  16-test-plan.md
  17-cursor-agentic-implementation-prompt.md
  18-do-not-build-yet.md
  tech-decisions.md
  source-learning.md
  final-implementation-decision.md
```
