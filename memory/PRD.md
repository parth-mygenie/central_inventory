# Central Inventory — PRD

## Problem Statement
Central Inventory management app for MyGenie POS — multi-store hierarchy (Master > Central > Franchise) with inventory transfers, stock management, catalogue, and reporting.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS 3, Radix UI, Recharts, React Router v7, craco, Lucide icons, Axios
- **Backend**: Python FastAPI proxy to `preprod.mygenie.online` POS API
- **Database**: MongoDB (local, session storage only)

## What's Been Implemented

### P22 Daily Consumption Report (May 29, 2026)
- Full report page, 12/12 tests passed

### P23 Hierarchy Management (May 29, 2026)
- List + Create + Bundle Push + History, 12/12 tests passed

### P24 FEFO Stock Detail — Planning Complete (May 29, 2026)
- **19 API probes** against live POS API — new detail endpoint + wastage extensions validated
- Created: `AI/Plans/phase3/P24_fefo_batch_stock_planning.md`
- Created: `AI/Plans/api_implementation_status_p24_addendum.md`
- Created: `AI/curls/p24_fefo_stock_detail_curls.sh`
- FEFO scenario validated: killua→DemoFranchise3 transfer batches visible
- Key finding: fefo_consumption_enabled appears OFF at DemoFranchise2 (consumption lacks batch allocations)

## Backlog

### P0 — P24 Implementation
- Phase 1: Stock detail panel + FEFO segments + reconciliation (~5-6h)
- Phase 2: Consumption section with date filter + batch allocations (~3-4h)
- Phase 3: Wastage report batch column + segment snapshot (~2-3h)

### P1
- Multi-outlet batch push UI
- Child deletion/deactivation

### P2
- PDF/CSV export for reports
- Chart visualizations
