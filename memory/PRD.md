# Central Inventory — PRD

## Problem Statement
End-to-end validation of P30 M0 Production Flow: vendor purchase → manufacture → transfer → receive → cost chain.

## Tech Stack
- **Frontend**: React 19 + Tailwind + craco
- **Backend**: FastAPI proxy → preprod.mygenie.online
- **POS API**: Restaurant 806 (german fluid, master)

## Validation Completed (2026-06-13)

### Phase 1: Setup ✅
- 5-store hierarchy (master + 2 centrals + 2 franchises)
- 44 ingredients, 4 sub-recipes
- 2 vendors purchasing same items at different prices

### Phase 2: Production ✅
- 7 production runs with full FEFO cost tracing
- Unit costs: ₹1.26 – ₹2.78 per piece depending on source batch prices
- Production audit: segment-level allocation per ingredient

### Phase 3: Transfers ✅ (post B1/B2/B3 fixes)
- Direct dispatch: Master→Franchise, Master→Central, Central→Franchise
- Request flow: all lifecycle states (request, approve, partial approve, dispatch, receive, amend, withdraw, modify, reject, cancel remainder)
- Cross-central request (franchise@CA → CB)
- 2-hop chain: Master→Central A→Franchise (batch/expiry preserved)
- Segment creation at destination with source traceability

### Phase 4: Cost Chain
- Layer 1 (Vendor): Purchase prices per kg tracked in stock_item
- Layer 2 (Manufacture): Production costs from FEFO segment prices
- Layer 3 (Transfer): selling_unit_price=NULL (not required by settings)
- Layer 4 (Resale): Central markup not applied (0%)
- Layer 5 (POS Sale): Elachi ₹20/pc + 5% tax via food item 206254

## Remaining Gaps
- Old segments (pre-B3) have null unit_id → can't dispatch from them
- Transfer selling price not populated (settings allow skip)
- filter_bucket mode for direct dispatch still broken
- Consumption test with POS orders deferred (user will confirm stores)

## Full Report
`/app/AI/Plans/P30_M0_PRODUCTION_VALIDATION_REPORT.md`
