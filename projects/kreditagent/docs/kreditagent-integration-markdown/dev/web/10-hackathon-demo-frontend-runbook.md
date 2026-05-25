# 10 — Hackathon Demo Frontend Runbook

## Demo objective

Show that KreditAgent is a working trust/payment frontend, not a static pitch deck.

The demo must prove:

1. borrower consent;
2. evidence hashing;
3. deterministic score;
4. bounded AI explanation;
5. ERC-8004-style attestation;
6. x402 payment required and paid access;
7. validation;
8. repayment reputation update.

## Demo tabs

Open these before presenting:

1. `/borrower?borrower=bu-siti&mode=demo`
2. `/lender?borrower=bu-siti&mode=demo`
3. `/protocol?borrower=bu-siti&mode=demo`
4. `/admin/demo-control`
5. Optional: block explorer tx page.

## Demo mode config

Recommended environment:

```env
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_DEFAULT_BORROWER=bu-siti
NEXT_PUBLIC_DEFAULT_CHAIN=base-sepolia
NEXT_PUBLIC_X402_MODE=mock
NEXT_PUBLIC_ERC8004_MODE=testnet-or-mock
NEXT_PUBLIC_FORU_MODE=mock
```

## 90-second frontend demo

### 0:00–0:10 — Borrower identity

Screen: `/borrower`

Say:

> This is Bu Siti, an MSME owner. She has digital business activity but no portable credit reputation.

Show:

- BorrowerAgent ID;
- ForU AI-DID mock binding;
- no/initial score.

### 0:10–0:20 — Consent

Screen: `/borrower/consent`

Action:

- click `Grant consent`.

Say:

> KreditAgent only uses scoped consent. She controls QRIS and e-commerce data access.

Show:

- active consent;
- expiry;
- revocation CTA.

### 0:20–0:32 — Evidence

Screen: `/borrower/data`

Action:

- click `Load sample QRIS + e-commerce evidence`.

Say:

> Raw rows stay off-chain. The app converts them into features and hashes.

Show:

- records accepted;
- evidence hash;
- warnings if any.

### 0:32–0:45 — Score

Screen: `/borrower/score`

Action:

- click `Generate score`.

Say:

> The score is deterministic. The AI only explains the factors; it cannot approve the loan.

Show:

- score card;
- factor breakdown;
- AI explanation disclaimer.

### 0:45–0:58 — Publish attestation

Screen: `/borrower/attestations`

Action:

- click `Publish attestation`.

Say:

> The score package is anchored to her ERC-8004 BorrowerAgent and issued by KreditAgent.

Show:

- attestation ID;
- tx/proof hash;
- trust timeline update.

### 0:58–1:15 — x402 lender payment

Screen: `/lender/attestations`

Action:

- click `Request audit-grade attestation`;
- show 402 payment card;
- click `Pay with x402`.

Say:

> The lender agent cannot access the audit-grade payload until it pays. x402 turns the attestation into a paid API resource.

Show:

- payment terms;
- paid receipt;
- signed attestation.

### 1:15–1:25 — Validation

Screen: same or `/protocol`

Action:

- click `Request validation` or show prevalidated status.

Say:

> ValidatorAgent confirms the score matches the committed features and scoring version.

Show:

- validation passed;
- validator agent ID;
- validation hash.

### 1:25–1:30 — Repayment reputation

Screen: `/lender/decisions` or `/borrower/reputation`

Action:

- click `Simulate on-time repayment`.

Say:

> Repayment updates her portable reputation, so the next lender sees more than a blank file.

Show:

- repayment_on_time event;
- reputation timeline.

## 5-minute extended demo

Use the 90-second flow plus:

1. Open protocol graph.
2. Open x402 receipt detail.
3. Show consent revocation blocks new attestation.
4. Show prompt-injection-like CSV warning.
5. Show dispute UI for negative reputation.

## Frontend demo control panel

`/admin/demo-control` should include:

- reset state;
- seed Bu Siti;
- seed lender;
- toggle mock/live x402;
- toggle mock/live chain;
- force API offline simulation;
- force validation fail simulation;
- show latest logs;
- copy all proof hashes.

## Judge questions and UI answer

### “Where is ERC-8004?”

Open `/protocol` and show:

- BorrowerAgent;
- KreditAgent issuer;
- LenderAgent;
- ValidatorAgent;
- reputation and validation events.

### “Where is x402?”

Open lender attestation flow and show:

- `402 Payment Required` state;
- payment terms;
- receipt hash;
- paid attestation only after payment.

### “Does AI approve loans?”

Open score page and show:

- deterministic factor table;
- AI explanation disclaimer;
- lender decision form saying lender owns decision.

### “Where is privacy?”

Open evidence hash panel and show:

- raw rows off-chain;
- only hashes/metadata on-chain;
- consent revocation.

### “What if lender reports false default?”

Open reputation page and show:

- dispute button;
- disputed status;
- validator review flow.

## Final frontend checklist

```text
[ ] Demo starts from public landing.
[ ] Borrower dashboard loads in <3s.
[ ] Consent step is obvious.
[ ] Score page clearly says AI is explanation-only.
[ ] x402 payment screen is visually memorable.
[ ] Paid attestation appears after payment.
[ ] Protocol timeline has all steps.
[ ] Mock/live badges are visible.
[ ] Wrong-network state works.
[ ] Reset demo works.
[ ] Backup screenshots recorded.
```

## Backup script if frontend crashes

Say:

> The live frontend is having a runtime issue, so I’ll show the captured protocol flow: consent, evidence hash, score, x402 payment, validation, and repayment reputation.

Then show:

- screenshots;
- API logs;
- contract tx hash;
- compiled demo video.

## Best final line

> KreditAgent makes informal MSME cash flow legible without becoming the lender: borrowers control consent, lenders pay for attestations, and ERC-8004 makes trust portable.
