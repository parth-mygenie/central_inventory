# Central Inventory - PRD

> **Last Updated:** 23 May 2026
> **Status:** Slices 1-4 complete, repo pulled and running on Emergent platform

## Problem Statement

Central Inventory module for MyGenie POS — multi-level inventory management across Central Store → Master Store → Outlet hierarchy with transfer workflows, stock tracking, and reporting.

## Architecture

- **Backend**: FastAPI (Python) — proxy server forwarding to `preprod.mygenie.online` APIs with seed data enrichment
- **Frontend**: React (CRA + CRACO) with Tailwind CSS, Radix UI, shadcn/ui components
- **Database**: MongoDB (status checks); main data proxied/seeded from Laravel backend
- **Auth**: Proxied to MyGenie preprod auth API
- **Source**: GitHub `parth-mygenie/central_inventory`, branch `23_5_26_work_1`

## What's Been Implemented (Slices 1-4)

### Slice 1 — Read-Only Foundation
- Context Selector, Operations Hub, Hierarchy Summary, Store Detail, Pending Queues, Transfer Detail
- Role-based Central/Master/Outlet UX via terminology adapter
- Seed data (7 restaurants, 16 inventory items, 12 transfers)

### Slice 2 — UX Polish + Enterprise Transfer Visibility
- Ready to Dispatch tab, Transfer Detail timeline, Date range picker, Action buttons

### Slice 3 — Read-Only History & Ledger Traceability
- Transfer History tab, Stock Ledger tab, Status/movement/direction filters

### Slice 4 — Transfer Write Flows
- Approve/Reject/Dispatch/Receive/Cancel transfers, Direct Dispatch, Request Stock forms

## Setup Completed on Emergent

- Pulled from GitHub: `parth-mygenie/central_inventory` branch `23_5_26_work_1`
- Created `.env` files for backend (MONGO_URL, DB_NAME, PREPROD APIs) and frontend (REACT_APP_BACKEND_URL)
- Installed dependencies: `pip install -r requirements.txt`, `yarn install`
- Backend running on port 8001, Frontend on port 3000 (supervisor-managed)
- **Testing: 24/24 backend tests PASS, 10/10 frontend features PASS**

## Key Routes

| Route | Screen |
|-------|--------|
| `/login` | Login page |
| `/` | Operations Hub (SCR-01) |
| `/hierarchy` | Hierarchy Summary (SCR-02) |
| `/store/:id` | Store Detail (SCR-03) |
| `/queues` | Pending Queues (SCR-05) |
| `/history` | History & Ledger |
| `/dispatch/new` | Direct Dispatch Form |
| `/request/new` | Request Stock Form |
| `/transfer/:id` | Transfer Detail (SCR-09) |

## Deferred / Open Items

1. Edit Transfer API discovery (P1)
2. Stock Adjustment/Wastage/Stock Return write flows (P1)
3. Real-time WebSocket notifications (P2)
4. Reports screen, CSV/PDF export, KPI dashboard (P2)
5. Lateral Master-to-Master transfers (P1)

## Next Action Items
- Owner manual Slice 4 smoke test pending
- Slice 5 candidates: Edit Transfer, Stock Adjustment, Wastage, Stock Return, Lateral transfers
