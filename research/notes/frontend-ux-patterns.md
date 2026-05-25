# Frontend UX patterns (OpenSrc → Aegis)

Captured for the UI/UX overhaul. Sources: `~/.opensrc` clones listed in `research/opensrc-paths/`.

## Rabby (`RabbyHub/Rabby`)

- Verdict-first layout: status color before transaction details.
- Compact rows for `reasonCode`-class labels and spender/target emphasis on approvals.
- **Ported:** `VerdictCard` failed-check stack, `EventTimeline` left verdict rail, `TransactionRiskPanel` spender highlight.

## Tenderly + Rabby preview (`Tenderly/tenderly-rabby-transaction-preview`)

- Preview-before-sign: decoded intent + simulation hint above actions.
- **Ported:** `TransactionRiskPanel` as primary demo column; `LoadingTrace` kept as pipeline animation.

## wallet-guard extension

- Unlimited approval copy: unknown spender + `MaxUint256` pattern.
- **Ported:** wallet demo alert + `UNLIMITED_APPROVAL_UNKNOWN_SPENDER` in hero mono line.

## shadcn/ui + Radix

- `Alert`, `Table`, `Dialog`, `Sheet` (vaul) for consistent surfaces.
- **Ported:** `SurfaceCard`, `EmptyState`, `DemoStepper`, `DESIGN.md`.

## TanStack Query

- `isLoading` skeletons on dashboard KPIs and timeline.
- **Ported:** dashboard empty `EmptyState` + loading placeholders.

## New-user flow (implemented)

1. Landing → **Run agent demo** (primary CTA)
2. `/demo/agent` → 4-step `GuidedAgentDemo`
3. `/dashboard` → timeline with CTA when empty

## Studio Admin shell (next-shadcn-admin-dashboard port)

Reference: `frontend/next-shadcn-admin-dashboard` (collapsible inset sidebar, metric card grid).

- **Ported:** `components/ui/sidebar.tsx`, `breadcrumb`, `scroll-area`, `tooltip`, `skeleton`, `input`; `DashboardShell`, `AppSidebar`, `NavMain`, `DashboardHeader`; `navigation/aegis-sidebar-items.ts`; `OpsRiskMetricCards`; `AdminPageHeader`.
- **Removed:** custom `AppShell`, `Sidebar.tsx`, `MobileNav.tsx`, `TopStatusBar.tsx`.
- **Tokens:** `--sidebar-primary` / `--sidebar-ring` → `--aegis`; `--dashboard-header-height` in `globals.css`.
- **Skipped:** Zustand theme presets, fake account switcher, SearchDialog, recharts on every page.

## Marketing landing port (frontend/landing-p)

Reference: [`frontend/landing-p/page.html`](../../frontend/landing-p/page.html) (visual shell), [`frontend/landing-p/copywrite.md`](../../frontend/landing-p/copywrite.md) (copy).

- **Copy source:** `aegis-rpc/apps/web/src/content/landing-copy.ts`
- **Components:** `src/components/marketing/*` (hero, product flow, 3 proof cards, judge demo stepper, final CTA, nav/footer)
- **Accent:** `--aegis` cyan (not reference orange); verdict colors unchanged
- **Omitted:** fake social proof logos, GA4, Acme quote; wallet connect only in floating nav
- **a11y:** `prefers-reduced-motion` hides particle canvas; hero tilt disabled via `motion-reduce`

## Landing trim (focused funnel)

- **Cut ~70% scroll:** removed pipeline diagram, live KPIs, 6 personas, OpsRisk/bento/adapters/positioning/roadmap/on-chain sections from `/`
- **Kept:** slim hero + mockup, 3-step row, 3 proof cards, horizontal demo stepper, dual CTA; copy in trimmed `landing-copy.ts`

## Landing visual polish (landing-p shell)

- **Beauty pass without section bloat:** spotlight cards, metallic/gradient hero type, conic nav CTA, glass demo panel, bar hover + pop-out mockup — still 5 sections on `/`
