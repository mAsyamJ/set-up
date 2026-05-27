# P11 — Evidence review and live-execution gate decision

## Goal

After sustained multi-chain shadow data (weeks), review the accumulated `survives_75` clusters, risk distributions, and (when available) replay accuracy. Make the explicit go / pivot / kill decision for any live canary. No live work begins without this gate passing and documented sign-off.

## Acceptance

- [ ] Comprehensive evidence report (daily reports + ad-hoc queries) showing per-chain/pair/strategy repeatable `survives_75` patterns (or clear absence)
- [ ] If a niche clears replay go/no-go bars (from later accurate simulator phase), a narrow "tiny canary" plan exists (one chain, one strategy, strict loss limits, kill switch)
- [ ] If no coherent edge appears, a documented pivot recommendation (different strategy family, different chains, or sunset) is recorded in `DECISIONS.md`
- [ ] Orchestrator + human explicit approval recorded before any contract, bundle sender, or live path code is written

## Owner

Orchestrator (all agents contribute evidence)
