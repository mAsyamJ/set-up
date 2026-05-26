#!/usr/bin/env bash
# Harness-friendly verify: no-op until Rust workspace exists.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
MODE="${1:-all}"

no_workspace() {
  echo "arbeyes-defi: No Cargo.toml at repo root yet — docs/planning phase. Skipping Rust checks."
  exit 0
}

[[ -f Cargo.toml ]] || no_workspace

case "$MODE" in
  typecheck) cargo check ;;
  lint) cargo clippy -- -D warnings ;;
  test) cargo test ;;
  smoke) cargo run -p cow-shadow-solver -- --help 2>/dev/null || cargo run -p cow-shadow-solver ;;
  all)
    cargo fmt --check
    cargo clippy -- -D warnings
    cargo test
    ;;
  *) echo "Usage: $0 {typecheck|lint|test|smoke|all}" >&2; exit 2 ;;
esac
