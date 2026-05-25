# Central Inventory - PRD

## Original Problem Statement
Central Inventory app — frontend-to-real-POS-API contract stabilization after seed shutdown. All flows now use real POS APIs only via backend proxy. Multiple UI/API failures were diagnosed and fixed.

## Architecture & Tech Stack
- **Frontend**: React 19 with CRACO, Tailwind CSS, Radix UI components
- **Backend**: FastAPI (Python) — proxy to POS API at preprod.mygenie.online
- **Database**: MongoDB (token sessions only)
- **External API**: V1 auth, V2 all inventory/transfer operations

## What's Been Implemented

### Session 1 (25 May 2026) — Repo Setup
- Cloned repo from branch `25_5_26_AJ`, set up environment, services running

### Session 2 (25 May 2026) — Full UI/API Diagnosis
- 14 distinct integration failures identified across 11 screens
- Full diagnosis report created

### Session 3 (25 May 2026) — Contract Stabilization (10 fixes)
All fixes implemented in shared API service layer (`api.js`) + minimal component changes:

| # | Fix | Type | Files Changed |
|---|-----|------|---------------|
| 1 | `hierarchy-summary` mandatory `store_type` | Missing payload field | api.js, DirectDispatchForm, RequestStockForm |
| 2 | `add-stock` route: `/inventory/add-stock/{id}` (ID in URL) | Wrong path | api.js |
| 3 | `record-wastage` route: `/inventory-transfer/record-wastage` | Wrong path | api.js |
| 4 | `source-options` fields: `source_inventory_master_id` + `from_restaurant_id` | Field name mismatch | api.js |
| 5 | `decrease-adjustment` missing `restaurant_id` | Missing payload field | api.js, StockAdjustmentForm |
| 6 | Transfer detail response: `{transfer, lines}` → flat object | Response unwrap | api.js (normalizer) |
| 7 | `resolution_meta` JSON string → parsed object | Serialization | api.js (normalizer) |
| 8 | hierarchy-detail stock: `total_quantity`→`cal_quantity` | Field mapping | api.js (normalizer) |
| 9 | Wastage report: object→`wastage_records` array | Response unwrap | api.js (normalizer) |
| 10 | Wastage record fields: `waste_reason`, `wastage_quantity`, `waste_date` | Field mapping | WastageReport, HistoryLedger |

**Testing: 11/11 backend API tests passed (100%). Frontend compiles clean.**

## Remaining Known Gaps (P2 — Not Blocking)
- Transfer history items lack `from_restaurant_name` / `to_restaurant_name` (POS doesn't return them in list)
- `items_count` not in POS transfer list response
- `add-stock` POS API requires `vendor_id` — currently mapped from `restaurantId`; may need separate vendor lookup
- Login test credentials (hisoka@phantom.com) returning 401 — POS-side credential issue

## Files Modified in Session 3
- `/app/frontend/src/services/api.js` — route paths, payload builders, response normalizers
- `/app/frontend/src/components/central-inventory/DirectDispatchForm.jsx` — dual hierarchy fetch
- `/app/frontend/src/components/central-inventory/RequestStockForm.jsx` — dual hierarchy fetch
- `/app/frontend/src/components/central-inventory/StockAdjustmentForm.jsx` — pass restaurantId
- `/app/frontend/src/components/central-inventory/WastageEntryForm.jsx` — pass restaurantId
- `/app/frontend/src/components/central-inventory/WastageReport.jsx` — field name fallbacks
- `/app/frontend/src/components/central-inventory/HistoryLedger.jsx` — wastage entry mapping
