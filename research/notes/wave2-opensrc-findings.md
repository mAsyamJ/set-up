# Wave 2 OpenSrc findings

Generated for OpenSrc Backend Innovation. Evidence from `~/.opensrc` clones (paths in `research/opensrc-paths/`).

## Policy rules (wallet-guard + OZ + product)

| Rule | Source pattern | Aegis `reasonCode` |
|------|----------------|-------------------|
| Unlimited approve + unknown spender | wallet-guard spender warnings, OZ `type(uint256).max` | `UNLIMITED_APPROVAL_UNKNOWN_SPENDER` |
| Unlimited approve + known spender | allowlist | `UNLIMITED_APPROVAL_KNOWN_SPENDER` (WARN) |
| High finite allowance | wallet-guard large allowance UX | `HIGH_ALLOWANCE` (WARN) — `warnHighAllowance` |
| Unknown spender + unlimited composite | wallet-guard extension | `HIGH_RISK_SPENDER` (BLOCK/WARN) |
| Simulation revert | wallet-guard `simulate` / viem `eth_call` | `SIMULATION_REVERT` |

## Selectors (Rabby / Tenderly / execution-apis)

| Selector | Signature | useCase |
|----------|-----------|---------|
| `0xac9650d8` | `multicall(bytes[])` | defi |
| `0x6a761202` | `execTransaction(...)` (Safe) | treasury |
| `0x468721a7` | `setApprovalForAll(address,bool)` | wallet |
| `0xa22cb465` | `setApprovalForAll` (ERC721) | wallet |
| `0x2e1a7d4d` | `withdraw(uint256)` | defi |
| `0x1249c58b` | `mint()` | defi |
| `0x42966c68` | `burn(uint256)` | defi |

## Multicall unwrap algorithm

1. If top selector is `0xac9650d8`, ABI-decode `bytes[]` calls.
2. For each inner payload, take first 4 bytes as selector; decode ERC20 approve/transfer when matched.
3. **Worst-case intent**: any inner unlimited approve → elevate parent intent flags (`innerCalls`, `worstCase`).

## Safe exec unwrap

- Selector `0x6a761202` (`execTransaction(address,uint256,bytes,...)`): decode `to`, `value`, `data` from calldata; screen inner `data` as nested preflight.

## UserOp inner call

- `userOp.callData` → same path as EOA `data` via `decodeCallDataIntent` helper.

## Flashbots RPC (backend-rpc)

- Intercept `eth_sendRawTransaction` before forward; batch JSON-RPC; optional read cache — matches `lib/rpc/middleware/*`.

## Simulation hints

- On revert: `data.simulationHint` = `"eth_call reverted; stateOverride did not clear revert"` (wallet-guard/Tenderly preview vocabulary).

## Out of scope (confirmed)

- Flashbots bundles/MEV, full Rabby metadata DB, OZ Relayer runtime, hosted Tenderly required path.
