# Central Inventory - PRD

## Original Problem Statement
Clone central_inventory repo (branch: 15-6-implementation-v1), run it, execute QA, then investigate consumption display bug.

## Architecture
- **Backend**: FastAPI proxy-only layer → preprod.mygenie.online POS API
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI + React Router v7
- **Database**: MongoDB (local, token sessions only)

## What's Been Done

### Session 1 (June 15, 2026) — Deployment
- Cloned repo, installed deps, services running

### Session 2 (June 15, 2026) — QA Gate 6
- 50/50 tests passed for Sprint S3 batch

### Session 3 (June 15, 2026) — INVESTIGATION: Consumption Unit Mismatch
- **Found 4 bug classes across 8 files, 6 screens:**
  - Bug Class 1: Display precision (.toFixed(1) truncation) — IngredientCatalogue, StockInventorySummary
  - Bug Class 2: Unit mismatch gm→kg (CRITICAL) — PurchaseOrderCreate causes 1000x over-ordering
  - Bug Class 3: Unit stripping parseFloat/Number NaN — DirectDispatchForm, RequestStockForm, useProductionRun
  - Bug Class 4: Ambiguous unit scale — StockInventorySummary expanded row
- Full report: `control/sessions/INVESTIGATION_CONSUMPTION_UNIT_MISMATCH.md`

## Prioritized Backlog
- **P0**: PurchaseOrderCreate unit mismatch fix (prevents 1000x over-ordering)
- **P1**: useProductionRun Number() NaN fix (consumption data lost)
- **P1**: DirectDispatchForm / RequestStockForm unit normalization
- **P2**: IngredientCatalogue / StockInventorySummary display precision (3 decimals + Option A fallback)

## Next Tasks
- PLANNING or IMPLEMENTATION for consumption unit mismatch fix across 8 files
