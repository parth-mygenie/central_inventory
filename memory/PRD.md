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

## Canonical Memory Sync (25 May 2026)
- Synchronized Request Stock E2E test results into canonical files:
  - `api_evidence/API_VERIFICATION_COMPREHENSIVE_FINAL.md` — added pending-queues observations + edge cases
  - `raw_reference/AI/Plans/api_implementation_status.md` — added pending-queues context, edge cases, + full frontend implementation planning notes
  - `raw_reference/AI/curls/full_api_flow_curls.sh` — added master submit curl, cross-branch dispatch curl, sibling catalog browse curl, master pending-queues curl

## Prioritized Backlog
- **P0**: Request Stock frontend migration (replace getHierarchySummary → request-sources, replace getInventoryMaster → request-catalog, implement canonical 3-step flow)
- **P1**: Pending-queues `id: null` handling, cross-branch flag UX integration
- **P2**: ESLint warnings cleanup, source-options ownership workaround for segment picker

## Next Tasks
1. Implement Request Stock frontend migration per planning notes in `api_implementation_status.md`
2. Add `requestSources()` and `requestCatalog()` API methods to frontend service layer
3. Rebuild RequestStockForm with source picker + catalog from source + submit with `source_inventory_master_id`
4. Test pending-queues integration after request submission
