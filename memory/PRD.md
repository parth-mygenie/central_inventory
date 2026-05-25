# Central Inventory - PRD

## Original Problem Statement
Central Inventory management system for MyGenie POS — multi-level hierarchy (Master → Central → Franchise) with inventory transfers, request stock flows, dispatch, receive, and reporting.

## Architecture
- **Backend**: FastAPI (Python) - Proxy to MyGenie POS API (preprod.mygenie.online)
- **Frontend**: React 19 + Tailwind CSS + Radix UI + shadcn/ui + craco
- **Database**: MongoDB (local, motor async driver) — session/token caching only
- **Auth**: Proxied login via MyGenie vendor employee API
- **POS API**: preprod.mygenie.online (V1 auth, V2 vendoremployee endpoints)

## What's Been Implemented
- Full app deployed from GitHub branch `25_5_26_2` (25 May 2026)
- Backend proxy (FastAPI) for auth + V2 POS API pass-through
- Frontend with 11 screens: Login, Operations Hub, Hierarchy Summary, Store Detail, Pending Queues, History Ledger, Direct Dispatch, Request Stock, Stock Adjustment, Wastage Entry, Wastage Report, Transfer Detail
- Slices 1-5 complete (hierarchy, transfers, queues, history, ops settings)

## Request Stock Frontend Migration (25 May 2026)
### Completed
- **Migrated RequestStockForm.jsx** from old `getHierarchySummary` + `getInventoryMaster` approach to canonical 3-step flow:
  - Step 1: `POST /request-sources` → source picker with `can_submit_request` gating
  - Step 2: `POST /request-catalog` → source store's items with `source_inventory_master_id`
  - Step 3: `POST /request` → submit with correct payload (source_inventory_master_id, source_selector, optional from_restaurant_id)
- **Added** `requestSources()` and `requestCatalog()` to `api.js`
- **Updated** `requestStock()` to accept optional `fromRestaurantId`
- **Updated** `useWriteAction.js` 403 handler to surface API error message (for INVALID_HIERARCHY)
- **Source picker** shows relation labels (Direct Parent, Upstream Central, Sibling) with blocked indicator
- **Uses** `filter_bucket` as safe default source_selector (child cannot call source-options on parent)
- **Sends** `from_restaurant_id` only for non-default-parent sources
- **Tested**: 100% backend (10/10) + 100% frontend (16/16) against real POS APIs

### Files Changed
- `frontend/src/components/central-inventory/RequestStockForm.jsx` — complete rewrite
- `frontend/src/services/api.js` — added requestSources, requestCatalog, updated requestStock
- `frontend/src/hooks/useWriteAction.js` — enhanced 403 error handling

### Canonical Memory Sync (25 May 2026)
- Synchronized Request Stock E2E test results into canonical files
- All 3 canonical files updated with test results, edge cases, and frontend planning notes

## Prioritized Backlog
- **P0**: None (Request Stock migration complete)
- **P1**: Test cross-branch enable/disable flow in UI (operational-settings toggle + source picker refresh)
- **P2**: ESLint warnings cleanup, segment_id selector support for advanced users

## Next Tasks
1. Validate pending-queues screen integration after request submission
2. Test INVALID_HIERARCHY error display when cross-flag toggled off mid-session
3. Consider segment_id selector option for users who know exact segments
