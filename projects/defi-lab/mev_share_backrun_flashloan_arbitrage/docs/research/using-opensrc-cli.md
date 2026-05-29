# opensrc: Getting Started

**opensrc** gives coding agents (and humans) direct access to any package's full source code — across npm, GitHub, crates, PyPI, etc. Use `opensrc path` inside shell commands, `rg`, `grep`, `cat`, `find`, etc. to search, read, or explore real implementations (not just types or docs).

This is the canonical mechanism for the agentic harness research workflow in this project.

## Install

```bash
npm install -g opensrc
```

## Usage

Search a package's source with `rg`, `grep`, or any tool:

```bash
rg "parse" $(opensrc path zod)
```

Read a specific file:

```bash
cat $(opensrc path zod)/src/types.ts
```

Works with any registry (GitHub org/repo, crates:, pypi:, etc.):

```bash
find $(opensrc path pypi:requests) -name "*.py"
ls $(opensrc path crates:serde)/src/
grep -r "Router" $(opensrc path vercel/next.js)/packages/next/src/
```

`opensrc path` fetches on first use, then returns the cached path instantly. Progress goes to stderr, the path to stdout — so `$(opensrc path ...)` works perfectly in subshells and scripts.

## In this project (MEV Share Backrun Flashloan Arbitrage)

- The authoritative list of packages to study lives in [`.harness/opensrc-packages.txt`](../.harness/opensrc-packages.txt) (populated from the expanded `opensrc fetch` command covering MEV-Share, Artemis, flashloan arb examples, DEX math, ML libraries, Alloy, Foundry, etc.).
- Run the project cache wrapper to materialize stable pointers:

  ```bash
  # from the MEV project root
  bash ../../../scripts/mev-share-backrun-opensrc-cache.sh
  ```

- Then use the generated files under `.harness/research/opensrc-paths/` (or call `opensrc path` live) in your research commands.
- See also the main research notes in [docs/0_opensrc_research.md](../0_opensrc_research.md) which contain dozens of ready-to-run `rg $(opensrc path ...)` examples for flashloans, backruns, strategies, and more.
- After research, consult the **Knowledge Graph** (the deep synthesized understanding layer): [`.harness/research/knowledgeGraph/index.md`](../.harness/research/knowledgeGraph/index.md). It contains structured analysis, constraints, innovation opportunities, and provenance for the entire research corpus.

This setup keeps the product tree small while giving every agent (especially the OpenSrc Librarian, Rust Core, and Rust EVM) frictionless access to the real source code that informs the multi-chain shadow searcher and future gated flashloan arbitrage execution.

---

For the global harness-level OpenSrc map and other projects, see the root `docs/research/01-opensrc-package-map.md`.
