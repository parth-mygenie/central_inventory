# Central Inventory - PRD

## Problem Statement
Central Inventory management system with POS API proxy backend. Cloned from https://github.com/parth-mygenie/central_inventory.git (branch: 30_5_26_1).

## Tech Stack
- **Backend**: Python FastAPI + Motor (async MongoDB) + httpx (proxy to POS API)
- **Frontend**: React 19 + Tailwind CSS + Radix UI + CRACO + Recharts
- **Database**: MongoDB (token sessions, status checks)
- **External API**: preprod.mygenie.online (POS system)

## Architecture
- Backend proxies all V2 requests to MyGenie POS API
- Frontend is a central inventory management dashboard
- Auth via POS API login endpoint

## Core Features Implemented
- P15/P16/P17: Transfer lifecycle (initiate, approve, dispatch, receive, reject, cancel, amend, withdraw, modification)
- P18: Vendor management (CRUD)
- P19: Procurement (add stock purchase)
- P20: Stock Inventory Summary
- P21: Catalogue (ingredients, products, recipes, addon-recipes)
- P22: Daily Consumption Report
- P23: Hierarchy Management
- **P24**: FEFO Stock Detail UI (implemented Jan 2026)
- **P25**: Wastage Report Validation (validated Jan 2026 — API-only, no frontend yet)

## P24 Implementation (Jan 2026)
- Row click drilldown from Stock Inventory Summary → `/inventory/:id`
- Summary, Batch Inventory (FEFO segments), Reconciliation, Consumption History sections
- 100% test pass rate (21/21 tests)

## P25 Validation Findings (Jan 2026)
- Both APIs confirmed working: `GET /inventory/wastage-reasons`, `POST /inventory/wastage-report`
- All filters validated: date range, restaurant_ids, waste_type, food_id, has_batch, include_segments
- P24 batch audit fields confirmed: source_type, segment_allocations, batch, expiry_date
- 1 FEFO-audited record found, 7 legacy records
- segment_snapshot returns live on-hand data (37 segments across hierarchy)
- Full findings in `/app/AI/Plans/api_implementation_status_p25_addendum.md`

## Frontend Gaps Identified (P25)
- G1-G7: WastageReport.jsx missing P24/P25 columns, filters, KPIs
- G8-G9: WastageEntryForm.jsx uses hardcoded reasons instead of API
- G10-G12: api.js missing functions and filter params

## Prioritized Backlog
- **P0**: P25 frontend implementation (wastage report enhancement + reason picker)
- **P1**: Wastage report batch column + source_type badges
- **P1**: Replace hardcoded reasons with API-driven picker
- **P2**: Source restaurant name resolution (Store #ID → name)
- **P2**: Consumption line pagination
