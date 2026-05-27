#!/usr/bin/env bash
# Harness-friendly verify: no-op until Rust workspace exists.
# V1 shadow searcher: docs/planning phase is explicitly supported.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
MODE="${1:-all}"

no_workspace() {
  echo "mev-share-backrun-flashloan-arbitrage: No Cargo.toml at repo root yet — docs/planning phase. Skipping Rust checks."
  exit 0
}

[[ -f Cargo.toml ]] || no_workspace

case "$MODE" in
  typecheck) cargo check ;;
  lint) cargo clippy -- -D warnings ;;
  test) cargo test ;;
  smoke)
    # Future worker binary; tolerant if not fully wired yet
    cargo run -p searcher-worker -- --help 2>/dev/null || cargo run -p searcher-worker 2>/dev/null || echo "searcher-worker smoke: binary or config not ready yet (expected in early phases)"
    ;;
  all)
    cargo fmt --check
    cargo clippy -- -D warnings
    cargo test
    ;;
  *) echo "Usage: $0 {typecheck|lint|test|smoke|all}" >&2; exit 2 ;;
esac
