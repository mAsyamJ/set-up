# Aegis RPC — OpenSrc + GitHub Source Research Index

This folder is for source-code evidence used by coding agents.

## Rule

Use source code as truth.

- For npm packages: `opensrc path <package>`
- For GitHub repos: `opensrc path owner/repo`
- If OpenSrc cannot resolve a GitHub repo, use local fallback clone in `research/repos/`.
- Store research notes under `research/notes/`.

## Aegis 24H cut rule

Anything outside these is stretch:

1. `/api/rpc` JSON-RPC passthrough
2. `/api/preflight`
3. transaction decoder
4. ERC20 `approve(spender, MaxUint256)` BLOCK
5. Chainlink price/freshness adapter
6. deterministic SAFE / WARN / BLOCK policy engine
7. audit log
8. RiskOps dashboard
9. Base Sepolia policy registry proof

## Product truth

Aegis RPC is the product.

Chainlink is only the first adapter signal, not the product. AI explains deterministic verdicts; AI does not decide or control funds.
