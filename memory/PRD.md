# Central Inventory — PRD

## Original Problem Statement
P27 End-to-End Smoke Validation — Pricing, selling prices, shipping, lateral transfers, cost valuation, inward audit, negative tests across complete transfer lifecycle.

## Architecture
- **Frontend**: React 19 + CRACO + Tailwind CSS 3 + Radix UI + shadcn/ui
- **Backend**: FastAPI proxy → preprod.mygenie.online POS API
- **Database**: MongoDB (local session cache only)

## Validation History

| Date | Session | Result |
|------|---------|--------|
| 9 Jun | P26 Initial | G-012 ✅, G-013 🔴 write blocker |
| 9 Jun | P26 Revalidation | G-012 ✅, G-013 ✅ |
| 9 Jun | P26 Impact analysis | History regression documented |
| 10 Jun | P26 Smoke (post-deploy) | 20/20 PASS, history fix confirmed |
| 10 Jun | P26 Frontend blueprint | 11 files, 4 phases planned |
| **10 Jun** | **P27 Smoke** | **Pricing ✅, Lateral 🔴 BLOCKED, price_required ⚠️** |

## P27 Status: 🟡 CONDITIONAL READY
- Core pricing chain: ✅ request→estimate→approve(sell+ship)→dispatch→receive→audit→valuation
- Lateral approval: 🔴 BLOCKED (`pending_lateral_approval` stuck)
- `transfer_selling_price_required`: ⚠️ Not enforced

## Hierarchy Created
- 804 Osaka Central (central, parent=798) — `owner@osakacentral.com`
- 805 Nagoya Central (central, parent=798) — `owner@nagoyacentral.com`

## Backlog
### P0 — Blockers
1. Fix lateral approval path
2. Wire `transfer_selling_price_required` enforcement

### P1 — Frontend (from P26 blueprint)
3. API normalizer (`transfer_id→id`)
4. `reference_code` display
5. Pricing fields display (selling, shipping, estimated)
6. G-012 category grouping

### P2 — Deferred
7. Central re-sell policy validation (needs lateral fix)
8. P24 FEFO batch stock detail panel
