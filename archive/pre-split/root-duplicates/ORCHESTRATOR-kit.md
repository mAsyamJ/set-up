# ORCHESTRATOR.md — Senior Engineering Plan

## Objective

Coordinate AI coding agents to build Aegis RPC MVP within 24 hours, while keeping architecture extensible for post-hackathon development.

## Execution strategy

Build in vertical slices, not horizontal perfection.

### Slice 1 — RPC passthrough
Goal: prove Aegis behaves like a real RPC gateway.

Output:
- `POST /api/rpc`
- passthrough for `eth_chainId`, `eth_blockNumber`, `eth_getBalance`, `eth_call`
- curl tests

### Slice 2 — Preflight pipeline
Goal: reliable demo path without depending on full raw signed tx parsing.

Output:
- `POST /api/preflight`
- `TxIntent` normalization
- `SAFE/WARN/BLOCK` response shape
- audit event creation

### Slice 3 — Approval blocker
Goal: prove real problem-solving with wallet-drainer pattern.

Output:
- ERC20 `approve(address,uint256)` decoder
- `MaxUint256` detection
- unknown spender policy
- BLOCK verdict

### Slice 4 — Chainlink adapter
Goal: prove live-data adapter layer.

Output:
- `ChainlinkPriceAdapter`
- `latestRoundData()`
- `decimals()`
- freshness check
- USD value calculation signal

### Slice 5 — OpsRisk dashboard
Goal: prove completeness and business surface.

Output:
- dashboard timeline
- verdict badges
- adapter signals table
- AI memo panel

### Slice 6 — Smart contracts
Goal: add Web3-native proof without making contracts the core engine.

Output:
- `AegisPolicyRegistry.sol`
- `ChainlinkFeedConsumer.sol`
- `DemoERC20.sol`
- `DemoSpender.sol`
- Foundry tests if time permits

## Dependency graph

```mermaid
flowchart TD
    A[Repo setup] --> B[/api/rpc passthrough]
    A --> C[Shared types]
    C --> D[TxIntent + decoder]
    D --> E[Policy engine]
    E --> F[Approval blocker]
    E --> G[Adapter layer]
    G --> H[ChainlinkPriceAdapter]
    E --> I[Audit log]
    I --> J[Dashboard]
    F --> J
    H --> J
    E --> K[AI memo]
    A --> L[Contracts]
    L --> M[Registry deploy]
```

## Work allocation for agent swarm

| Agent | First task | Hard acceptance |
|---|---|---|
| Backend RPC | `/api/rpc` | `eth_blockNumber` passes through |
| Decoder | `TxIntent` + approve decode | `approve(MaxUint256)` decoded |
| Policy | `evaluateTransaction()` | BLOCK for unlimited approval |
| Adapter | Chainlink adapter | returns `OK/WARN/BLOCK` signal |
| Dashboard | event timeline | visible SAFE/WARN/BLOCK |
| Contracts | registry + demo ERC20 | compiles |
| QA | curl scripts | one-command demo checklist |
| Pitch | README/demo | 2-minute demo script |

## Hard scope limits

Must not build in MVP:
- Full own RPC node
- Full mempool/private relay
- Universal DeFi router decoder
- Full bytecode decompiler
- Full zero-day AI exploit detector
- Full RWA settlement or NAV oracle
- Multichain support beyond Base Sepolia

## Go / no-go checkpoints

### Hour 4
If `/api/rpc` passthrough is not working, pause all other backend work.

### Hour 8
If preflight cannot parse approve tx, switch to controlled unsigned intent payload for demo.

### Hour 12
If Chainlink feed address causes issues, keep adapter interface and configure fallback signal. Do not make Chainlink the demo blocker.

### Hour 18
If dashboard is not ready, use JSON event log page.

### Hour 22
Freeze code. Record demo video. No new features.
