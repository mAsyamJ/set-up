# 02 System Architecture

## Full flow

```mermaid
flowchart TD
    A[Wallet / Agent / dApp / Backend] --> B[Aegis RPC Gateway]
    B --> C{RPC Method Router}
    C -->|Read-only| D[Passthrough to Underlying RPC]
    C -->|Transaction| E[Transaction Decoder]
    E --> F[Use Case Classifier]
    F --> G[Adapter Layer]
    G --> G1[ChainlinkPriceAdapter]
    G --> G2[ApprovalRiskAdapter]
    G --> G3[ContractCodeAdapter]
    G --> G4[AllowlistAdapter]
    G --> G5[SimulationAdapter]
    G1 --> H[Policy Engine]
    G2 --> H
    G3 --> H
    G4 --> H
    G5 --> H
    H --> I{SAFE / WARN / BLOCK}
    I -->|SAFE| J[Forward or return for signing]
    I -->|WARN| K[Return warning and optional override]
    I -->|BLOCK| L[Reject before broadcast]
    J --> M[Audit Log DB]
    K --> M
    L --> M
    M --> N[AI Memo and Analysis]
    N --> M
    M --> O[OpsRisk Dashboard]
    H -. verify .-> P[AegisPolicyRegistry on Base Sepolia]
```

## Preflight sequence

```mermaid
sequenceDiagram
    participant App as App/Agent/Wallet
    participant API as /api/preflight
    participant Dec as Decoder
    participant Ad as Adapters
    participant Pol as Policy Engine
    participant DB as Audit DB
    participant AI as AI Memo

    App->>API: unsigned tx intent
    API->>Dec: normalize TxIntent
    Dec-->>API: decoded intent
    API->>Ad: collect deterministic signals
    Ad-->>API: AdapterSignal[]
    API->>Pol: evaluate(intent, policy, signals)
    Pol-->>API: SAFE/WARN/BLOCK
    API->>DB: insert event
    API-->>App: verdict + requestId
    API->>AI: async memo
    AI->>DB: update memo
```

## Component responsibilities

| Component | Responsibility |
|---|---|
| RPC Gateway | JSON-RPC endpoint, pass-through and interception |
| Preflight API | Reliable unsigned tx screening path |
| Decoder | Convert raw calldata into TxIntent |
| Adapter Layer | Collect deterministic external and local signals |
| Policy Engine | Final deterministic verdict |
| Audit DB | Persist every decision |
| AI Memo | Explain after verdict, never decide |
| Dashboard | Show evidence, timeline, signals, memos |
| Contracts | Policy commitment and demo proof |
