# Central Inventory - PRD

## Original Problem Statement
Central Inventory app — full operational validation after seed shutdown and API contract stabilization.

## Architecture
- **Frontend**: React 19 + CRACO + Tailwind + Radix UI
- **Backend**: FastAPI proxy → preprod.mygenie.online POS API
- **Auth**: POS V1 login + profile enrichment → token in MongoDB

## What's Been Implemented

### Session 1 — Repo Setup (25 May)
- Cloned branch `25_5_26_AJ`, services running

### Session 2 — Full Diagnosis (25 May)
- 14 integration failures identified across 11 screens

### Session 3 — Contract Stabilization (25 May)
- 10 API contract fixes in shared service layer
- 11/11 backend API tests passing

### Session 4 — Full E2E Operational Testing (25 May)
- **18/18 frontend E2E tests PASSED**
- Fixed auth token race condition (eager localStorage restore in api.js)
- All screens tested with real POS API data

## E2E Test Results — All Screens

| Screen | Route | Status | Details |
|--------|-------|--------|---------|
| Operations Hub | `/` | PASS | KPI cards, context selector, quick actions all working |
| Hierarchy Summary | `/hierarchy` | PASS | Both Master Stores (2) and Outlets (4) tabs working |
| Pending Queues | `/queues` | PASS | All 4 tabs, Ready to Dispatch badge (1) |
| History & Ledger | `/history` | PASS | 16 transfers, status filters, direction toggle |
| Transfer Detail | `/transfer/:id` | PASS | Status timeline, resolution details, line items |
| Direct Dispatch | `/dispatch/new` | PASS | 6 destinations, 4 items, source selector |
| Request Stock | `/request/new` | PASS | Parent store resolution, items, source selector |
| Stock Adjustment | `/adjustment/new` | PASS | Increase/Decrease toggle, items, reasons |
| Wastage Entry | `/wastage/new` | PASS | Items, source selector, reasons |
| Wastage Report | `/wastage/report` | PASS | 6 entries with dates, items, quantities |
| Store Detail | `/store/:id` | PASS | 6 child stores, 4 stock items with quantities |

## Known P2 Issues (Not Blocking)
1. Transfer history Source/Destination show "—" (POS list doesn't include restaurant names)
2. Store Detail header shows "Store #1 / Unknown" (POS hierarchy-detail missing `store_restaurant_name`)
3. Transfer Detail From/To show "—" (POS doesn't include nested restaurant objects)
4. `items_count` missing from POS transfer list response
5. Login credentials (hisoka@phantom.com) returning 401 — POS-side issue

## Files Modified (Contract Stabilization + E2E Fixes)
- `/app/frontend/src/services/api.js` — route paths, normalizers, eager token restore
- `/app/frontend/src/components/central-inventory/DirectDispatchForm.jsx`
- `/app/frontend/src/components/central-inventory/RequestStockForm.jsx`
- `/app/frontend/src/components/central-inventory/StockAdjustmentForm.jsx`
- `/app/frontend/src/components/central-inventory/WastageEntryForm.jsx`
- `/app/frontend/src/components/central-inventory/WastageReport.jsx`
- `/app/frontend/src/components/central-inventory/HistoryLedger.jsx`
