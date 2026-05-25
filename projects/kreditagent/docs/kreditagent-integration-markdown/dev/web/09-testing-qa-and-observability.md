# 09 — Testing, QA, and Observability

## Testing goal

The frontend must be reliable enough for a live hackathon demo and safe enough to discuss with lenders/regulators.

Test the product as a trust workflow, not just individual components.

## Test pyramid

| Layer | Tool | Purpose |
|---|---|---|
| Type checks | TypeScript | prevent API/prop drift |
| Schema tests | Zod | validate API payloads and forms |
| Unit tests | Vitest | formatters, guards, adapters |
| Component tests | Testing Library / Storybook | forms, cards, state views |
| E2E tests | Playwright | end-to-end borrower/lender/protocol flow |
| Manual demo QA | checklist | hackathon reliability |

## Critical E2E test: 90-second demo

Test name:

```text
kreditagent-demo-flow.spec.ts
```

Steps:

1. Open landing page.
2. Click start demo.
3. Grant borrower consent.
4. Upload/load sample QRIS data.
5. Upload/load e-commerce data.
6. Generate score.
7. Publish attestation.
8. Switch to lender route.
9. Request audit attestation.
10. Confirm 402 payment UI appears.
11. Pay in mock x402 mode.
12. Verify paid attestation visible.
13. Request validation.
14. Simulate on-time repayment.
15. Check protocol timeline has all required steps.

Assertions:

- score appears;
- `AI explanation only` disclaimer appears;
- evidence hash appears;
- payment terms appear;
- attestation appears only after payment;
- validation status appears;
- repayment event appears;
- no page-level crash.

## Playwright skeleton

```ts
import { test, expect } from "@playwright/test";

test("KreditAgent end-to-end demo flow", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /start demo/i }).click();

  await expect(page.getByTestId("borrower-overview-card")).toBeVisible();

  await page.getByTestId("grant-consent-button").click();
  await expect(page.getByText(/consent active/i)).toBeVisible();

  await page.getByTestId("load-sample-data-button").click();
  await expect(page.getByText(/evidence hash/i)).toBeVisible();

  await page.getByTestId("generate-score-button").click();
  await expect(page.getByTestId("score-hero-card")).toContainText("742");
  await expect(page.getByText(/not a credit decision/i)).toBeVisible();

  await page.getByTestId("publish-attestation-button").click();
  await expect(page.getByText(/attestation anchored/i)).toBeVisible();

  await page.getByRole("link", { name: /lender/i }).click();
  await page.getByTestId("request-audit-attestation-button").click();
  await expect(page.getByText(/payment required/i)).toBeVisible();

  await page.getByTestId("x402-pay-button").click();
  await expect(page.getByTestId("paid-attestation-viewer")).toBeVisible();

  await page.getByTestId("simulate-repayment-button").click();
  await expect(page.getByText(/repayment_on_time/i)).toBeVisible();
});
```

## Component test matrix

| Component | Required tests |
|---|---|
| `ConsentScopeSelector` | required scopes locked, expiry validation, revoke state |
| `DataSourceCard` | ready/warning/failed states, warning count |
| `ScoreHeroCard` | bands, expiry, unavailable score |
| `AiExplanationPanel` | disclaimer always visible |
| `AttestationPublishPanel` | preflight disabled states |
| `X402PaymentCard` | unpaid/paid/invalid/replayed/facilitator-offline |
| `PaidAttestationViewer` | hides audit data until paid |
| `TrustTimeline` | ordered steps, pending/confirmed/failed statuses |
| `ForUIdentityCard` | mock/connect/unavailable modes |

## Contract/API mock tests

Use MSW or local test API to simulate:

- successful consent;
- revoked consent;
- score expired;
- 402 required;
- payment invalid;
- payment replayed;
- validation pending;
- validation failed;
- chain tx pending forever;
- RPC failure;
- ForU API unavailable.

## Accessibility QA

Checklist:

```text
[ ] All interactive elements reachable by keyboard.
[ ] Wallet/payment modals have focus management.
[ ] Score band not color-only.
[ ] Timeline status not color-only.
[ ] Form errors announced and tied to fields.
[ ] Hash copy buttons have accessible labels.
[ ] Tables have headers.
[ ] Charts have text summaries.
[ ] Mobile font sizes remain readable.
```

## Security QA

| Risk | Test |
|---|---|
| raw CSV in localStorage | inspect storage after upload |
| payment address modified by client | tamper network request, expect rejection |
| x402 mock hidden | verify mock badge visible |
| revoked consent still shares score | revoke then request audit attestation, expect blocked |
| expired score still publishable | set expiry past, expect publish disabled |
| agentURI XSS | malicious JSON field renders escaped |
| prompt injection in CSV | warning shown, score unchanged |

## Observability events

Track frontend analytics events:

```ts
export type FrontendEvent =
  | "demo_started"
  | "wallet_connected"
  | "consent_granted"
  | "consent_revoked"
  | "data_uploaded"
  | "score_generated"
  | "attestation_publish_clicked"
  | "attestation_confirmed"
  | "x402_payment_required"
  | "x402_payment_success"
  | "x402_payment_failed"
  | "validation_requested"
  | "validation_passed"
  | "lender_decision_submitted"
  | "repayment_simulated"
  | "dispute_opened";
```

Do not log raw PII or raw transaction rows.

## Error logging policy

Log:

- request ID;
- route;
- error code;
- chain ID;
- mock/live mode;
- browser info;
- timestamp.

Do not log:

- raw CSV content;
- borrower phone/address;
- private keys;
- wallet signatures beyond hash/reference;
- full payment payload if sensitive.

## Performance targets

| Metric | Target |
|---|---:|
| landing LCP | <2.5s |
| borrower dashboard TTI | <3s |
| score generation UI feedback | <500ms |
| route transition | <500ms perceived |
| x402 payment card render after 402 | <1s |
| demo reset | <5s |

## Manual pre-demo QA checklist

```text
[ ] Open landing page in clean browser.
[ ] Start demo works.
[ ] Borrower route loads.
[ ] Consent can be granted.
[ ] Sample data loads.
[ ] Score generates.
[ ] Attestation publishes or mock publishes.
[ ] Lender route loads.
[ ] 402 payment screen appears.
[ ] x402 mock/live payment succeeds.
[ ] Paid attestation appears.
[ ] Validation state updates.
[ ] Repayment event appears.
[ ] Protocol timeline complete.
[ ] Reset demo works.
[ ] Wrong network message works.
[ ] API offline fallback message works.
[ ] Mobile layout is usable.
```

## Demo fallback plan

If live chain fails:

- switch to mock mode;
- show pre-saved tx hash;
- keep trust timeline visible;
- explain “chain worker queued; demo uses cached proof.”

If x402 facilitator fails:

- switch to x402 mock mode;
- show real 402 response shape;
- explain “facilitator unavailable; mock mode preserves protocol flow.”

If API fails:

- use static demo fixture page;
- show screenshots/video;
- use protocol explorer links.

## Release gate

Do not present unless all pass:

```text
[ ] TypeScript passes.
[ ] E2E demo path passes.
[ ] No real secrets in client bundle.
[ ] No raw data persisted in browser storage.
[ ] All high-stakes actions have disclaimers.
[ ] Mock mode clearly labeled.
[ ] Payment and consent failures are visible.
[ ] Protocol timeline tells complete story.
```
