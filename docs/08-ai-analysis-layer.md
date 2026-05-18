# 08 AI Transaction Analysis Layer

## Rule

AI explains and assists. Deterministic policy decides.

## AI roles

| Role | Trigger | Output |
|---|---|---|
| UnknownSelectorAnalyzer | `intent.isUnknownSelector === true` | guess, confidence, reasoning |
| WarnContextSynthesizer | `verdict === WARN` with multiple signals | risk summary |
| MemoGenerator | every verdict | human-readable memo |
| PreSigningAssist | WARN before override | operator-focused explanation |

## Pipeline

```text
Preflight response returns deterministic verdict first.
AI runs after response.
DB event is updated with memo and analysis.
Dashboard polls until memo is ready.
```

## AI safety constraints

- Never modify verdict.
- Never block or allow transactions.
- Never expose secrets.
- Never hallucinate certainty for unknown calldata.
- Use fallback templates when model fails.
- Keep memos short and judge-readable.

## Prompt contract

Every AI prompt must include:

```text
You are the AI explanation service for Aegis RPC.
The deterministic policy already decided the verdict.
You only explain facts from the provided intent, policy, and adapter signals.
Return valid JSON only.
```

## Fallback

Every `reasonCode` needs a deterministic fallback memo. The demo must still work without an AI API key.
