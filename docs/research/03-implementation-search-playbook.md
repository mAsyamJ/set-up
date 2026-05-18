# Aegis Implementation Search Playbook

## RPC passthrough

```bash
rg "eth_sendRawTransaction|eth_call|eth_getBalance|JSON-RPC" research/repos/ethereum__execution-apis
```

## viem decoder and call

```bash
rg "decodeFunctionData|parseTransaction|serializeTransaction|publicClient.call|readContract" "$(cat research/opensrc-paths/viem.path)"
```

## Chainlink feed reads

```bash
rg "AggregatorV3Interface|latestRoundData|decimals" "$(cat research/opensrc-paths/at_chainlinkcontracts.path)"
```

## OpenZeppelin ERC20 approval

```bash
rg "function approve|allowance|IERC20|Approval" "$(cat research/opensrc-paths/at_openzeppelincontracts.path)"
```

## Wallet risk UX

```bash
rg "approve|allowance|spender|warning|risk|simulation|preview" research/repos/wallet-guard__wallet-guard-extension research/repos/RabbyHub__Rabby research/repos/Tenderly__tenderly-rabby-transaction-preview
```
