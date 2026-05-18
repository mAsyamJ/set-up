# OpenSrc Package Map

## Core commands

```bash
opensrc path viem
rg "decodeFunctionData" "$(opensrc path viem)"
cat "$(opensrc path zod)"/src/types.ts
opensrc fetch viem zod next
opensrc list
```

## MVP packages

| Package | Aegis purpose | Search terms |
|---|---|---|
| `viem` | ABI decode, call, readContract, transaction helpers | `decodeFunctionData`, `readContract`, `publicClient.call`, `sendRawTransaction` |
| `zod` | request validation | `safeParse`, `ZodError` |
| `next` | API route handlers | `export async function POST`, `Route Handler` |
| `@chainlink/contracts` | AggregatorV3Interface | `AggregatorV3Interface`, `latestRoundData`, `decimals` |
| `@openzeppelin/contracts` | ERC20 approval patterns | `IERC20`, `approve`, `allowance`, `Ownable` |
| `@supabase/supabase-js` | audit log storage | `createClient`, `insert`, `select` |
| `@tanstack/react-query` | dashboard refresh | `useQuery`, `refetchInterval` |
