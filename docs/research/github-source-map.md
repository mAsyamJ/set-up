# Aegis RPC GitHub Source Map

## Rule

Use source code as the truth. Use OpenSrc for npm packages. Use git clone for non-package repositories.

## Priority 0

| Repo/package | Access | Purpose |
|---|---|---|
| ethereum/execution-apis | git clone | JSON-RPC spec and method behavior |
| viem | opensrc | ABI decode, contract reads, eth_call |
| next | opensrc | route handlers |
| @supabase/supabase-js | opensrc | audit log DB |
| @chainlink/contracts | opensrc | AggregatorV3Interface |
| @openzeppelin/contracts | opensrc | ERC20, ownership, registry patterns |

## Priority 1

| Repo/package | Access | Purpose |
|---|---|---|
| flashbots/rpc-endpoint | git clone | wallet-facing RPC endpoint architecture |
| Tenderly/tenderly-rabby-transaction-preview | git clone | transaction preview UX |
| wallet-guard/wallet-guard-extension | git clone | warning UX and simulation language |
| RabbyHub/Rabby | git clone | decoded transaction UX |
| GoPlusSecurity/awesome-goplus-security | git clone | threat intel adapter ideas |

## Priority 2

| Repo/package | Access | Purpose |
|---|---|---|
| permissionless | opensrc | ERC-4337 client |
| eth-infinitism/account-abstraction | git clone | EntryPoint contracts |
| eth-infinitism/bundler-spec | git clone | UserOperation JSON-RPC |
| safe-global/safe-core-sdk | git clone | treasury approval flow |
| OpenZeppelin/openzeppelin-relayer | git clone | managed relayer architecture |
