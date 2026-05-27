# Build tasks

Phased checklist for **MEV Share Backrun Flashloan Arbitrage V1** (multi-chain shadow scanner). Sequence and hard gates are owned by [ORCHESTRATOR.md](../../ORCHESTRATOR.md) and `docs/17-14-30-60-90-day-plan.md`. All work respects the V1 contract in `docs/20-agentic-coding-prompt.md` and the three-tier scope tags.

| Phase | File |
|-------|------|
| P0 | [phase-p0-harness-registration-and-verify.md](phase-p0-harness-registration-and-verify.md) |
| P1 | [phase-p1-rust-workspace-and-core-types.md](phase-p1-rust-workspace-and-core-types.md) |
| P2 | [phase-p2-postgres-storage.md](phase-p2-postgres-storage.md) |
| P3 | [phase-p3-dex-registry-state-reader.md](phase-p3-dex-registry-state-reader.md) |
| P4 | [phase-p4-collectors-and-decoder.md](phase-p4-collectors-and-decoder.md) |
| P5 | [phase-p5-backrun-v1-strategy.md](phase-p5-backrun-v1-strategy.md) |
| P6 | [phase-p6-pnl-and-flashloan-fee.md](phase-p6-pnl-and-flashloan-fee.md) |
| P7 | [phase-p7-risk-engine.md](phase-p7-risk-engine.md) |
| P8 | [phase-p8-simulator-and-ml-features.md](phase-p8-simulator-and-ml-features.md) |
| P9 | [phase-p9-metrics-alerts.md](phase-p9-metrics-alerts.md) |
| P10 | [phase-p10-daily-reports-and-vps-soak.md](phase-p10-daily-reports-and-vps-soak.md) |
| P11 | [phase-p11-evidence-review-and-gate.md](phase-p11-evidence-review-and-gate.md) |

Use `tasks/active/` for in-flight slices; move to `tasks/review/` then archive when verified. Never start a phase whose gate depends on an unverified prior phase.
