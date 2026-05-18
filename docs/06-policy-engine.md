# 06 Policy Engine

## Rule

AI never decides. The policy engine decides.

## Types

```ts
export type Verdict = "SAFE" | "WARN" | "BLOCK";

export type AegisPolicy = {
  id: string;
  name: string;
  mode: "observe" | "warn" | "enforce";
  template: "wallet" | "agent" | "defi" | "rwa" | "treasury" | "backend";
  chainId: number;
  limits: {
    maxNativeTransferUsd?: number;
    maxSingleAgentActionUsd?: number;
    maxDailyAgentSpendUsd?: number;
    maxSwapDeviationBps?: number;
  };
  rules: {
    blockUnlimitedApproval: boolean;
    requireSpenderAllowlist: boolean;
    blockUnknownContracts: boolean;
    requireFreshPrice: boolean;
    blockSimulationRevert: boolean;
    flagUnknownSelectors: boolean;
  };
  allowlists: {
    agents: `0x${string}`[];
    recipients: `0x${string}`[];
    spenders: `0x${string}`[];
    contracts: `0x${string}`[];
    selectors: string[];
  };
  denylists: {
    addresses: `0x${string}`[];
    selectors: string[];
  };
};
```

## Verdict algorithm

```ts
export function finalizeVerdict(signals, intent, policy) {
  const block = signals.find(s => s.status === "BLOCK");
  if (block) {
    return {
      verdict: policy.mode === "enforce" ? "BLOCK" : "WARN",
      reasonCode: block.reasonCode ?? "ADAPTER_BLOCK",
      needsAiAnalysis: false
    };
  }

  const warn = signals.find(s => s.status === "WARN" || s.status === "ERROR");
  if (warn) {
    return {
      verdict: "WARN",
      reasonCode: warn.reasonCode ?? "WARNING_SIGNAL",
      needsAiAnalysis: intent.isUnknownSelector || signals.length > 2
    };
  }

  if (intent.isUnknownSelector && policy.rules.flagUnknownSelectors) {
    return {
      verdict: "WARN",
      reasonCode: "UNKNOWN_FUNCTION_SELECTOR",
      needsAiAnalysis: true
    };
  }

  return {
    verdict: "SAFE",
    reasonCode: "ALL_CHECKS_PASSED",
    needsAiAnalysis: false
  };
}
```

## Policy templates

| Template | Primary checks |
|---|---|
| Wallet | unlimited approval, unknown spender, high-value transfer |
| Agent | allowed agents, max action USD, allowed targets/selectors |
| DeFi | stale price, approval risk, simulation revert |
| RWA/Treasury | operator allowlist, recipient allowlist, high-value action |
| Backend | keeper allowlist, admin function warnings |
