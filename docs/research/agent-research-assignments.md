# Agent Research Assignments

Each agent must read their assigned source before implementing. Use `rg` to search within the paths below.

## backend-rpc

Primary: JSON-RPC spec, viem, Next.js route handlers, flashbots RPC endpoint architecture.

```bash
# JSON-RPC method definitions
rg "eth_sendRawTransaction|eth_call|eth_getBalance|eth_blockNumber" /home/asyam/.opensrc/repos/github.com/ethereum/execution-apis/main

# viem: send, call, parse transaction
rg "sendRawTransaction|parseTransaction|serializeTransaction|publicClient" /home/asyam/.opensrc/repos/github.com/wevm/viem/2.49.3/src

# Next.js route handler patterns
rg "export async function POST|NextRequest|NextResponse" /home/asyam/.opensrc/repos/github.com/vercel/next.js/16.2.6/packages/next/src/server

# flashbots rpc-endpoint: wallet-facing RPC proxy architecture
rg "sendRawTransaction|intercept|forward|relay" /home/asyam/.opensrc/repos/github.com/flashbots/rpc-endpoint/main
```

Key files to read:
- `/home/asyam/.opensrc/repos/github.com/ethereum/execution-apis/main/src/eth/submit.yaml`
- `/home/asyam/.opensrc/repos/github.com/flashbots/rpc-endpoint/main` (top-level structure)

---

## tx-decoder

Primary: viem ABI decode, ERC20 function signatures, OpenZeppelin ERC20 source.

```bash
# viem: decodeFunctionData, parseAbi, ABI types
rg "decodeFunctionData|parseAbi|encodeFunctionData|Abi" /home/asyam/.opensrc/repos/github.com/wevm/viem/2.49.3/src

# OpenZeppelin ERC20: approve, transfer, allowance signatures
rg "function approve|function transfer|function allowance|IERC20" /home/asyam/.opensrc/repos/github.com/OpenZeppelin/openzeppelin-contracts/5.6.1/contracts/token/ERC20

# Rabby: how they decode and classify transactions
rg "decodeFunctionData|functionSelector|calldata|approve|transfer" /home/asyam/.opensrc/repos/github.com/RabbyHub/Rabby/develop/src

# Tenderly: transaction preview decode patterns
rg "decode|selector|calldata|intent" /home/asyam/.opensrc/repos/github.com/Tenderly/tenderly-rabby-transaction-preview/develop
```

Key files:
- `/home/asyam/.opensrc/repos/github.com/OpenZeppelin/openzeppelin-contracts/5.6.1/contracts/token/ERC20/IERC20.sol`
- `/home/asyam/.opensrc/repos/github.com/wevm/viem/2.49.3/src/utils/abi/decodeFunctionData.ts`

---

## policy-engine

Primary: wallet-guard warning logic, Rabby risk UI, OpenZeppelin approval patterns.

```bash
# wallet-guard: approval risk detection, warning conditions
rg "approve|MaxUint256|unlimited|spender|risk|warn|block" /home/asyam/.opensrc/repos/github.com/wallet-guard/wallet-guard-extension/develop/src

# Rabby: risk scoring and policy-like checks
rg "risk|warn|danger|approve|allowance|spender" /home/asyam/.opensrc/repos/github.com/RabbyHub/Rabby/develop/src

# OpenZeppelin: approve/allowance patterns to understand what to block
rg "approve|allowance|type(uint256).max|MAX_UINT" /home/asyam/.opensrc/repos/github.com/OpenZeppelin/openzeppelin-contracts/5.6.1/contracts
```

Key files:
- `/home/asyam/.opensrc/repos/github.com/wallet-guard/wallet-guard-extension/develop` (structure)
- `/home/asyam/.opensrc/repos/github.com/RabbyHub/Rabby/develop/src` (risk module)

---

## adapter

Primary: Chainlink AggregatorV3Interface, OpenZeppelin contracts, wallet-guard simulation patterns.

```bash
# Chainlink: AggregatorV3Interface, latestRoundData, decimals, heartbeat
rg "AggregatorV3Interface|latestRoundData|decimals|updatedAt|heartbeat" /home/asyam/.opensrc/repos/github.com/smartcontractkit/chainlink-evm/1.5.0/contracts/src

# viem: readContract for on-chain feed reads
rg "readContract|getContract|AggregatorV3" /home/asyam/.opensrc/repos/github.com/wevm/viem/2.49.3/src

# wallet-guard: simulation adapter patterns
rg "simulate|simulation|tenderly|preview" /home/asyam/.opensrc/repos/github.com/wallet-guard/wallet-guard-extension/develop/src
```

Key files:
- `/home/asyam/.opensrc/repos/github.com/smartcontractkit/chainlink-evm/1.5.0/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol`

---

## smart-contract

Primary: OpenZeppelin contracts (registry, ownership), Chainlink feed consumer, Foundry workflow.

```bash
# OpenZeppelin: Ownable, registry patterns
rg "Ownable|AccessControl|mapping|registry|policy" /home/asyam/.opensrc/repos/github.com/OpenZeppelin/openzeppelin-contracts/5.6.1/contracts

# Chainlink: feed consumer example
rg "AggregatorV3Interface|latestRoundData|constructor" /home/asyam/.opensrc/repos/github.com/smartcontractkit/chainlink-evm/1.5.0/contracts/src

# Foundry: test and deploy patterns
rg "forge-std|Test|setUp|deploy|Script" /home/asyam/.opensrc/repos/github.com/foundry-rs/foundry/master/testdata
```

Key files:
- `/home/asyam/.opensrc/repos/github.com/OpenZeppelin/openzeppelin-contracts/5.6.1/contracts/access/Ownable.sol`
- `/home/asyam/.opensrc/repos/github.com/foundry-rs/foundry/master` (structure)

---

## frontend

Primary: shadcn/ui components, TanStack Query, Rabby/Tenderly dashboard UX patterns.

```bash
# shadcn/ui: card, badge, table, dialog components
rg "Card|Badge|Table|Dialog|Sheet" /home/asyam/.opensrc/repos/github.com/shadcn-ui/ui/main/apps/www/registry

# TanStack Query: useQuery, refetchInterval for live dashboard
rg "useQuery|refetchInterval|QueryClient|invalidateQueries" /home/asyam/.opensrc/repos/github.com/TanStack/query/main/packages/react-query/src

# Rabby: transaction risk display UX
rg "risk|warn|block|safe|verdict|approve" /home/asyam/.opensrc/repos/github.com/RabbyHub/Rabby/develop/src

# Tenderly: transaction preview UI patterns
rg "preview|decoded|intent|simulation" /home/asyam/.opensrc/repos/github.com/Tenderly/tenderly-rabby-transaction-preview/develop
```

Key files:
- `/home/asyam/.opensrc/repos/github.com/shadcn-ui/ui/main` (component registry)
- `/home/asyam/.opensrc/repos/github.com/RabbyHub/Rabby/develop/src` (risk UI)

---

## database

Primary: Supabase JS client, Next.js route handler patterns for audit log.

```bash
# Supabase: insert, select, createClient patterns
rg "createClient|insert|select|from|eq|order" /home/asyam/.opensrc/repos/github.com/supabase/supabase-js/2.106.0/packages/core/supabase-js/src

# Next.js: server-side data access patterns
rg "unstable_cache|cache|revalidate|cookies" /home/asyam/.opensrc/repos/github.com/vercel/next.js/16.2.6/packages/next/src/server
```

Key files:
- `/home/asyam/.opensrc/repos/github.com/supabase/supabase-js/2.106.0/packages/core/supabase-js/src`

---

## ai-memo

Primary: viem for transaction context, Rabby/wallet-guard for human-readable explanation patterns.

```bash
# Rabby: how they explain decoded transactions to users
rg "explain|description|memo|reason|warning|message" /home/asyam/.opensrc/repos/github.com/RabbyHub/Rabby/develop/src

# wallet-guard: warning message copy and explanation patterns
rg "message|warning|explain|reason|description" /home/asyam/.opensrc/repos/github.com/wallet-guard/wallet-guard-extension/develop/src

# Tenderly: preview explanation language
rg "description|explain|intent|summary" /home/asyam/.opensrc/repos/github.com/Tenderly/tenderly-rabby-transaction-preview/develop
```

---

## qa

Primary: all repos — verify demo scenarios work end-to-end.

```bash
# ethereum/execution-apis: confirm correct JSON-RPC method names and error codes
rg "eth_sendRawTransaction|error|code|message" /home/asyam/.opensrc/repos/github.com/ethereum/execution-apis/main

# viem: test utilities
rg "createTestClient|testActions|anvil|hardhat" /home/asyam/.opensrc/repos/github.com/wevm/viem/2.49.3/src

# wallet-guard: test patterns for approval risk
rg "test|spec|mock|fixture" /home/asyam/.opensrc/repos/github.com/wallet-guard/wallet-guard-extension/develop
```

---

## devops

Primary: Next.js deployment config, Vercel patterns, environment variable conventions.

```bash
# Next.js: vercel.json, env, build config
rg "vercel|env|NEXT_PUBLIC|process.env|output" /home/asyam/.opensrc/repos/github.com/vercel/next.js/16.2.6/packages/next/src

# shadcn/ui: how they structure a deployable Next.js app
rg "package.json|next.config|tsconfig" /home/asyam/.opensrc/repos/github.com/shadcn-ui/ui/main/apps/www
```

---

## orchestrator

Primary: all research docs + agent assignments. No source code to read directly — reads the research outputs from other agents.

```bash
# Read the research index and all agent notes
cat /home/asyam/dev/Project/aegis-hackathon-kit/docs/research/00-source-code-research-index.md
cat /home/asyam/dev/Project/aegis-hackathon-kit/docs/research/agent-research-assignments.md
ls /home/asyam/dev/Project/aegis-hackathon-kit/research/notes/
```

---

## pitch / security

**pitch**: Read Rabby and wallet-guard README/docs for competitive positioning language. Read Tenderly preview for demo narrative inspiration.

**security**: Read OpenZeppelin ERC20 approval patterns, wallet-guard warning conditions, and Chainlink heartbeat/stale detection — then audit the policy engine rules against these.

```bash
# security: stale price detection
rg "updatedAt|heartbeat|stale|freshness" /home/asyam/.opensrc/repos/github.com/smartcontractkit/chainlink-evm/1.5.0/contracts/src

# security: MaxUint256 approval risk
rg "type(uint256).max|MAX_UINT|unlimited|approve" /home/asyam/.opensrc/repos/github.com/OpenZeppelin/openzeppelin-contracts/5.6.1/contracts
```
