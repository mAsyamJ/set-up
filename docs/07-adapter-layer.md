# 07 Adapter Layer

## Adapter contract

```ts
export type AdapterStatus = "OK" | "WARN" | "BLOCK" | "ERROR";

export type AdapterSignal = {
  adapter: string;
  status: AdapterStatus;
  reasonCode?: string;
  message: string;
  data?: Record<string, unknown>;
  latencyMs?: number;
};

export interface AegisAdapter {
  name: string;
  supports(intent: TxIntent, policy: AegisPolicy): boolean;
  getSignal(intent: TxIntent, policy: AegisPolicy): Promise<AdapterSignal>;
}
```

## MVP adapters

| Adapter | Purpose |
|---|---|
| ChainlinkPriceAdapter | price and freshness |
| ApprovalRiskAdapter | MaxUint256 and unknown spender |
| ContractCodeAdapter | EOA or contract code check |
| AllowlistAdapter | address and selector allow/deny |
| SimulationAdapter | eth_call preflight |

## Chainlink adapter notes

Chainlink is not the product. It is the first real data adapter.

The adapter should:

1. Read `latestRoundData()`.
2. Read `decimals()`.
3. Check `answer > 0`.
4. Check `updatedAt` freshness.
5. Normalize price.
6. Compute USD value.
7. Return structured `AdapterSignal`.

## Future adapters

- ThreatIntelAdapter
- ProofOfReserveAdapter
- ComplianceAdapter
- ReputationAdapter
- SequencerUptimeAdapter
- PrivateRoutingAdapter
