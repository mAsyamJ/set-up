# 05 Transaction Decoder

## Goal

Normalize transaction inputs into `TxIntent`.

## TxIntent

```ts
export type TxIntent = {
  requestId: string;
  chainId: number;
  method: "eth_sendRawTransaction" | "aegis_preflight" | "aegis_sendTransaction";
  from?: `0x${string}`;
  to?: `0x${string}`;
  valueWei: bigint;
  data: `0x${string}`;
  rawTx?: `0x${string}`;
  selector?: string;
  decodedFunction?: string;
  decodedArgs?: Record<string, unknown>;
  useCase?: "wallet" | "agent" | "defi" | "rwa" | "treasury" | "backend" | "unknown";
  isUnknownSelector: boolean;
  calldataLength: number;
};
```

## Known selectors

| Selector | Function |
|---|---|
| `0x095ea7b3` | `approve(address,uint256)` |
| `0xa9059cbb` | `transfer(address,uint256)` |
| `0x23b872dd` | `transferFrom(address,address,uint256)` |

## Pseudocode

```ts
export function decodeTxIntent(input: PreflightRequest): TxIntent {
  const intent = normalizeBaseFields(input);
  intent.selector = intent.data?.length >= 10 ? intent.data.slice(0, 10).toLowerCase() : undefined;

  if (intent.selector === "0x095ea7b3") return decodeApprove(intent);
  if (intent.selector === "0xa9059cbb") return decodeTransfer(intent);
  if (intent.selector === "0x23b872dd") return decodeTransferFrom(intent);

  if (!intent.data || intent.data === "0x") {
    intent.decodedFunction = "native_transfer";
    intent.isUnknownSelector = false;
    return intent;
  }

  intent.decodedFunction = `unknown(${intent.selector})`;
  intent.isUnknownSelector = true;
  return intent;
}
```

## Acceptance tests

- Native transfer decodes.
- ERC20 approve decodes spender and amount.
- `MaxUint256` approval is detected.
- Unknown selector sets `isUnknownSelector = true`.
