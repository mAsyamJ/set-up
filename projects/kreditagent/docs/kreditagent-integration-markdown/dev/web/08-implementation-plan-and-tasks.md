# 08 — Implementation Plan and Tasks

## Implementation principle

Build the frontend in vertical slices. Do not build every screen shell first. Each slice should prove one part of the end-to-end trust/payment loop.

## Phase 0 — Project foundation

### Goal

Create a stable Next.js frontend base with wallet, styling, API client, typed schemas, and demo fixtures.

### Tasks

```text
[ ] Create Next.js App Router app with TypeScript.
[ ] Add Tailwind CSS.
[ ] Install shadcn/ui.
[ ] Add shared layout and route groups.
[ ] Add TanStack Query provider.
[ ] Add RainbowKit/wagmi/viem provider.
[ ] Add Zod schemas.
[ ] Add API client wrapper.
[ ] Add mock fixture data.
[ ] Add environment badge.
[ ] Add global error/loading states.
```

### Suggested install

```bash
pnpm create next-app apps/web --ts --tailwind --eslint --app --src-dir
cd apps/web
pnpm dlx shadcn@latest init
pnpm add @tanstack/react-query zod react-hook-form @hookform/resolvers
pnpm add wagmi viem @rainbow-me/rainbowkit
pnpm add lucide-react recharts sonner date-fns clsx tailwind-merge
pnpm add -D @playwright/test
```

## Phase 1 — Borrower demo path

### Goal

User can go from borrower dashboard to generated score.

### Tasks

```text
[ ] Build borrower dashboard.
[ ] Build consent page.
[ ] Build consent scope selector.
[ ] Build consent receipt card.
[ ] Build data source upload cards.
[ ] Build data quality warning UI.
[ ] Build score generation page.
[ ] Build score hero card.
[ ] Build factor breakdown.
[ ] Build AI explanation panel.
[ ] Connect to mock/local API.
```

### Acceptance

- Bu Siti profile loads.
- Consent can be granted and revoked.
- QRIS/e-commerce sample data can be uploaded or marked as uploaded.
- Score can be generated.
- Score UI shows hashes and explanation.
- Revoked consent blocks new score generation.

## Phase 2 — Attestation publication path

### Goal

Borrower can publish attestation and see protocol proof.

### Tasks

```text
[ ] Build attestation preflight checklist.
[ ] Add wallet connect UI.
[ ] Add chain switch UI.
[ ] Add contract write or backend-relay action.
[ ] Add tx pending/confirmed/failed states.
[ ] Add attestation detail page.
[ ] Add proof hash table.
[ ] Add protocol trust timeline.
```

### Acceptance

- Publish button disabled until preflight passes.
- Wrong network produces clear error.
- Successful publish shows tx hash.
- Attestation detail links borrower agent and issuer agent.

## Phase 3 — Lender x402 path

### Goal

Lender sees 402 payment requirement, pays, and receives attestation.

### Tasks

```text
[ ] Build lender dashboard.
[ ] Build borrower lookup / sample selector.
[ ] Build x402 payment terms card.
[ ] Implement paidFetch wrapper.
[ ] Add mock x402 mode.
[ ] Add live x402 feature flag.
[ ] Build paid attestation viewer.
[ ] Build payment receipt detail page.
[ ] Add payment error states.
```

### Acceptance

- First audit attestation request returns payment-required UI.
- Payment card shows price/network/payee/resource.
- Mock payment unlocks attestation.
- Paid attestation displays validation status and hashes.
- Receipt hash appears in protocol timeline.

## Phase 4 — Validation and reputation path

### Goal

Validator and repayment flows are visible and understandable.

### Tasks

```text
[ ] Build validation status component.
[ ] Build validation request action.
[ ] Build validation result detail page.
[ ] Build lender decision form.
[ ] Build repayment simulator.
[ ] Build borrower reputation timeline.
[ ] Build dispute UI skeleton.
[ ] Add reputation event cards.
```

### Acceptance

- Validation can be requested and shown as pending.
- Validation result updates attestation status.
- Lender decision form requires reason codes.
- Repayment simulator posts reputation event.
- Borrower reputation timeline updates.
- Negative event can be marked disputed in UI.

## Phase 5 — ForU identity surface

### Goal

Represent ForU AI-DID/Identifi integration without depending on unavailable API.

### Tasks

```text
[ ] Build ForU identity card.
[ ] Add mock DID binding.
[ ] Add Identifi component display.
[ ] Add privacy/data minimization copy.
[ ] Add integration unavailable state.
[ ] Add agentURI ForU field renderer.
```

### Acceptance

- Borrower profile shows ForU DID status.
- agentURI preview includes ForU DID field.
- UI clearly says official API is mocked if not configured.
- Raw evidence is not shown as shared with ForU.

## Phase 6 — Protocol explorer and demo polish

### Goal

Judges can inspect the whole trust graph.

### Tasks

```text
[ ] Build protocol overview.
[ ] Build AgentIdentityCard.
[ ] Build TrustTimeline.
[ ] Build ProtocolGraph.
[ ] Build HashEvidenceTable.
[ ] Build admin demo control.
[ ] Build demo log stream.
[ ] Add reset/seed demo action.
[ ] Add 90-second guided mode.
```

### Acceptance

- One page shows complete trust/payment flow.
- Demo can be reset without database surgery.
- Guided mode highlights each step.
- Protocol objects link to details.

## Phase 7 — QA and production readiness

### Goal

Make the frontend reliable enough for live demo and pilot discussions.

### Tasks

```text
[ ] Add Playwright end-to-end demo test.
[ ] Add component tests for forms/states.
[ ] Add schema contract tests.
[ ] Add accessibility pass.
[ ] Add mobile pass.
[ ] Add Sentry or console-safe error logging.
[ ] Add analytics events.
[ ] Add performance budget.
[ ] Add final demo checklist.
```

## Recommended file tree

```text
apps/web/src/
├── app/
│   ├── (marketing)/page.tsx
│   ├── (app)/borrower/page.tsx
│   ├── (app)/borrower/consent/page.tsx
│   ├── (app)/borrower/data/page.tsx
│   ├── (app)/borrower/score/page.tsx
│   ├── (app)/borrower/attestations/page.tsx
│   ├── (app)/borrower/reputation/page.tsx
│   ├── (app)/lender/page.tsx
│   ├── (app)/lender/attestations/page.tsx
│   ├── (app)/lender/decisions/page.tsx
│   ├── (app)/protocol/page.tsx
│   └── (app)/admin/demo-control/page.tsx
├── components/
│   ├── borrower/
│   ├── lender/
│   ├── protocol/
│   ├── x402/
│   ├── foru/
│   ├── status/
│   └── ui/
├── features/
│   ├── borrower/
│   ├── consent/
│   ├── scoring/
│   ├── attestation/
│   ├── lender/
│   ├── reputation/
│   ├── x402/
│   ├── erc8004/
│   └── foru/
├── hooks/
├── lib/
│   ├── api/
│   ├── chain/
│   ├── schemas/
│   ├── demo/
│   └── formatting/
└── test/
```

## Milestone sequence for hackathon

| Day | Build target |
|---|---|
| Day 1 | App shell, borrower dashboard, demo fixtures |
| Day 2 | Consent + data upload + score UI |
| Day 3 | Attestation publish + protocol timeline |
| Day 4 | Lender x402 paid request flow |
| Day 5 | Validation + repayment reputation |
| Day 6 | ForU DID mock + demo control + polish |
| Day 7 | Testing, backup video, presentation rehearsal |

## Definition of done

A frontend feature is done when it has:

- functional happy path;
- error states;
- loading states;
- mobile layout;
- typed API contract;
- copy reviewed for compliance language;
- Playwright or component test;
- visible event in trust timeline if protocol-relevant.

## Highest-risk frontend work

| Risk | Mitigation |
|---|---|
| x402 SDK changes | wrap behind `paidFetch` adapter |
| wallet/network failures | mock mode + clear fallback |
| chain confirmation slow | show pending state + pre-saved tx fallback |
| too much information | progressive disclosure |
| judge confusion | guided demo mode |
| ForU API unavailable | mock DID binding with explicit label |
| regulatory wording risk | fixed copy library, no “approved by KreditAgent” language |
