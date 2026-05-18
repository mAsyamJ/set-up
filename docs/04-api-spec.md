# 04 API Specification

## POST /api/rpc

JSON-RPC-compatible gateway.

### Pass-through methods

- `eth_chainId`
- `eth_blockNumber`
- `eth_getBalance`
- `eth_call`
- `eth_getTransactionCount`
- `eth_estimateGas`
- `eth_getCode`

### Intercepted methods

- `eth_sendRawTransaction`
- `aegis_preflight`
- `aegis_sendTransaction`

### Passthrough example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "eth_blockNumber",
  "params": []
}
```

### Blocked response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32090,
    "message": "Aegis BLOCK: unlimited approval to unknown spender",
    "data": {
      "verdict": "BLOCK",
      "reasonCode": "UNLIMITED_APPROVAL_UNKNOWN_SPENDER",
      "broadcasted": false,
      "requestId": "req_abc"
    }
  }
}
```

## POST /api/preflight

Primary hackathon endpoint. Accepts unsigned transaction intent.

```json
{
  "chainId": 84532,
  "from": "0x...",
  "to": "0x...",
  "valueWei": "0",
  "data": "0x095ea7b3...",
  "policyId": "default-wallet-policy"
}
```

Response:

```json
{
  "requestId": "req_abc",
  "verdict": "BLOCK",
  "reasonCode": "UNLIMITED_APPROVAL_UNKNOWN_SPENDER",
  "signals": [],
  "memoStatus": "generating",
  "broadcasted": false
}
```

## POST /api/safe-send

Sends after SAFE, or after WARN override when policy mode allows.

## GET /api/events

Returns latest audit events.

## POST /api/policies

Create or update JSON policy.

## GET /api/adapters/chainlink

Health check for configured Chainlink feed.

## POST /api/ai-memo

Creates or fetches AI memo. It must never modify verdict.
