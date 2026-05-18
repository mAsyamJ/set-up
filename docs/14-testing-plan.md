# 14 Testing Plan

## Unit tests

- Decoder native transfer.
- Decoder ERC20 approve.
- MaxUint256 detection.
- Policy engine SAFE.
- Policy engine WARN.
- Policy engine BLOCK.
- Chainlink adapter stale feed.
- Approval adapter unknown spender.
- AI fallback memo.

## API tests

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}'
```

```bash
curl -X POST http://localhost:3000/api/preflight \
  -H "Content-Type: application/json" \
  -d '{"chainId":84532,"from":"0x...","to":"0x...","valueWei":"0","data":"0x095ea7b3...","policyId":"default-wallet-policy"}'
```

## Contract tests

```bash
cd contracts
forge test -vvv
```

## Demo acceptance

- `eth_blockNumber` works.
- Unlimited approval returns BLOCK.
- Chainlink signal appears.
- Event appears in dashboard.
- AI memo appears or fallback appears.
- Policy registry address is displayed.
