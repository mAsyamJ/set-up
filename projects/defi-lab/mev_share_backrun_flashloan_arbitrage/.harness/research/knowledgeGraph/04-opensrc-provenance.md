# OpenSrc Provenance & Research Corpus

This file documents exactly what external source code the project studies, why it matters, and the concrete value extracted for the V1 shadow searcher and future gated phases.

## The Canonical Research List

The authoritative list lives in:

`.harness/opensrc-packages.txt`

It was expanded (per user directive) with this exact command:

```bash
opensrc fetch \
  flashbots/simple-blind-arbitrage \
  flashbots/mev-share \
  flashbots/mev-share-client-ts \
  paradigmxyz/mev-share-rs \
  paradigmxyz/artemis \
  Uniswap/v2-core \
  Uniswap/v2-periphery \
  Uniswap/v3-periphery \
  aave/aave-v3-core \
  aave/aave-address-book \
  balancer/balancer-v2-monorepo \
  Haehnchen/uniswap-arbitrage-flash-swap \
  yuyasugano/pancake-bakery-arbitrage \
  kaymen99/aave-flashloan-arbitrage \
  alloy-rs/alloy \
  foundry-rs/foundry \
  catboost/catboost \
  online-ml/river \
  rust-ml/linfa \
  smartcorelib/smartcore \
  pykeio/ort
```

(See also the full expanded section in `docs/0_opensrc_research.md` that the user had open during KG construction.)

## High-Value Repos and Extracted Lessons (as of May 2026 cache)

### MEV-Share & Searcher Frameworks (Core for V1)

| Repo | Local Path (via .path) | Primary Value for This Project |
|------|------------------------|--------------------------------|
| flashbots/simple-blind-arbitrage | Cached | The closest public reference to blind backrun on MEV-Share. On-chain calculation between two v2 pools without seeing the user trade. Directly informs `backrun-v1` detection logic. |
| flashbots/mev-share | Cached | Protocol-level understanding of hints, privacy, bundle construction. |
| flashbots/mev-share-client-ts | Cached | Event shapes and API client patterns. |
| paradigmxyz/mev-share-rs | Cached | Rust-side reference (use as shape inspiration only; we prefer Alloy). |
| paradigmxyz/artemis | **Not yet cloned** (highest priority future clone) | Modular Rust MEV bot framework. Extremely high signal for future strategy plugin architecture (post V1). |

### Practical Flashloan Arbitrage Examples (Innovation Gold for Post-Day-90)

These three repos are **not** to be copied into V1, but are invaluable for understanding real-world flashloan callback patterns, safety guards, and "what actually ships":

- `Haehnchen/uniswap-arbitrage-flash-swap`
- `yuyasugano/pancake-bakery-arbitrage`
- `kaymen99/aave-flashloan-arbitrage`

Key patterns observed across them (will be detailed in future 05-innovation-opportunities):
- Read-only `check()` / `simulate()` before live `start()`
- Strict max block / min profit guards
- Lender callback validation
- Token/route allowlisting
- Final balance verification before repayment

### DEX & Lending Protocol References (Adapter & Math Layer)

- Uniswap v2-core / v2-periphery → Primary for V1 `dex` crate (closed-form U256 math)
- Uniswap v3-periphery → Future v3 adapters (BUILD LATER)
- aave/aave-v3-core + address-book → Flashloan fee modeling + executor patterns (LATER)
- balancer/balancer-v2-monorepo → Alternative flashloan source (0% fee first in V1 model)

### Tooling

- alloy-rs/alloy → Non-negotiable (we chose Alloy over ethers-rs)
- foundry-rs/foundry → Fork testing, Anvil, script patterns (critical for post-Day-60 accurate replay)

### ML / Offline Intelligence (Feature Collection Only in V1)

catboost, river, linfa, smartcore, pykeio/ort — used for understanding what features are realistically extractable today so `ml_features` rows are useful when models are eventually trained (BUILD LATER).

## How This Corpus Is Used in the Agentic Harness

- **OpenSrc Librarian** agent owns the list + the cache script (`scripts/mev-share-backrun-opensrc-cache.sh`)
- All research commands in agents and humans should prefer `$(opensrc path ...)` or the generated `.harness/research/opensrc-paths/*.path` files
- When implementing any crate, the relevant sections of these repos are the first place to look for shapes and anti-patterns

## Current Cache Health (as of last successful run)

15+ repositories have stable local paths. The two missing high-priority ones are tracked in `opensrc-failed.txt` (artemis and sushiswap/v2-periphery).

This provenance file must be kept in sync with changes to `.harness/opensrc-packages.txt`.

---
*Generated during full "do everything" execution of the Knowledge Graph plan, 2026-05-28.*
