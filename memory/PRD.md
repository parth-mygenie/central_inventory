# Central Inventory — PRD

## Original Problem Statement
P27 Validation (resumed) — Lateral approval fix retest, Scenario C central re-sell policy, G2 price-required enforcement retest.

## Architecture
- **Frontend**: React 19 + CRACO + Tailwind CSS 3 + Radix UI + shadcn/ui
- **Backend**: FastAPI proxy → preprod.mygenie.online POS API
- **Database**: MongoDB (local session cache only)

## Validation History

| Date | Session | Result |
|------|---------|--------|
| 9 Jun | P26 Initial | G-012 ✅, G-013 🔴 write blocker |
| 9 Jun | P26 Revalidation | G-012 ✅, G-013 ✅ |
| 10 Jun | P26 Smoke (post-deploy) | 20/20 PASS |
| 10 Jun | P26 Frontend blueprint | 11 files, 4 phases |
| 10 Jun | P27 Initial | Pricing ✅, Lateral 🔴, G2 ⚠️ |
| **10 Jun** | **P27 Retest** | **Lateral ✅ FIXED, Scenario C ✅, G2 ⚠️ unchanged** |

## Current Status: ✅ READY (P29 Pricing Scope)
- Core pricing: ✅ request + dispatch + lateral + audit + valuation
- Lateral approval: ✅ FIXED (new `lateral_approval_pending` queue)
- Central re-sell policy (G1): ✅ enforced against vendor buy price
- `transfer_selling_price_required`: ⚠️ Not enforced (LOW severity, non-blocking)

## Hierarchy
| RID | Name | Type | Parent |
|:---:|------|:----:|:------:|
| 798 | Tokyo Garden | master | — |
| 799 | Kyoto Garden | franchise | 798 |
| 800 | Hokkaido Garden | franchise | 798 |
| 804 | Osaka Central | central | 798 |
| 805 | Nagoya Central | central | 798 |

## Addenda
- `api_implementation_status_p26_smoke_validation.md` — P26 full smoke
- `p26_frontend_implementation_blueprint.md` — Frontend rollout plan
- `api_implementation_status_p27_smoke_validation.md` — P27 initial + retest (CURRENT)

## Frontend Action Items
### P0 — Must Do
1. API normalizer: `transfer_id→id`, `line_count→items_count`
2. `reference_code` display (replace `formatPO`)
3. Pricing fields: estimated/final, shipping, grand total
4. `lateral_approval_pending` queue section in PendingQueues

### P1 — Should Do
5. G-012 category grouping in RequestStockForm
6. `line_reference` column in TransferDetail
7. Buy/sell visibility per role

### P2 — Backlog
8. P24 FEFO batch stock detail
9. Wire `transfer_selling_price_required` UI toggle awareness
