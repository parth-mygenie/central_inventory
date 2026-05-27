# Central Inventory - PRD

## Problem Statement
Central Inventory module for MyGenie POS — multi-level stock management system across 3-tier hierarchy (Central Store → Master Store → Outlet).

## Architecture
- **Backend**: FastAPI (Python) — acts as API proxy to MyGenie POS preprod APIs
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI + Recharts
- **Database**: MongoDB (via Motor async driver) — token sessions, status checks
- **Auth**: Proxied through MyGenie vendor employee login (POS V1 API)
- **Data**: All inventory data sourced from POS V2 API (preprod.mygenie.online)

## Repo
- Source: `https://github.com/parth-mygenie/central_inventory.git`
- Branch: `27_5_26_2`

## What's Been Implemented

### Phase 1 (Slices 1-5): Core Inventory System
- Login via MyGenie vendor account with role detection (master/central/franchise)
- Hierarchy Summary — store list with transfer rollups
- Store Detail — stock summary, batches, transactions
- Operations Hub — KPI cards, quick actions, context selector
- Pending Queues — approval, receive, my-requests
- Transfer Detail — full lifecycle view
- History & Ledger — transfer history with filtering
- Transfer lifecycle: request → approve → dispatch → receive
- P16: Partial approve waves, line-level statuses, cancel-remainder, receive dispute
- P17: Amend, withdraw, modification request
- P17: Operational Settings UI
- P18: Vendor Management CRUD
- P19: Add Stock (Procurement) UI
- Stock Adjustment (decrease) — master only
- Wastage recording + wastage report
- Direct Dispatch with source selector
- Request Stock — canonical 3-step flow

### Phase 2 Planning (27 May 2026)
- P17 Amend/Withdraw/Modification — API validated, planning complete
- P17/P18/P19 Settings/Vendors/Procurement — API validated, planning complete, UI implemented
- **P20 Stock Inventory Summary — API VALIDATED, PLANNING COMPLETE (27 May 2026)**
  - Both endpoints confirmed working across all 3 roles
  - Full frontend implementation plan created
  - 3-phase rollout recommended (~4 hours total)

## P20 Status (27 May 2026)
- API validation: 6/6 tests PASS (2 endpoints × 3 roles)
- Planning document: `AI/Plans/phase2/P20_stock_inventory_summary_plan.md`
- API addendum: `AI/Plans/api_implementation_status_p20_addendum.md`
- Curl evidence: `AI/curls/p20_stock_inventory_curls.sh`
- Implementation: NOT YET — planning only per user request

## Prioritized Backlog
- **P0:** P20 Phase 1 — API layer + hook + KPI cards in OperationsHub (~1 hr)
- **P1:** P20 Phase 2 — Stock Items Table at /inventory (~1.5 hrs)
- **P1:** P20 Phase 3 — Hierarchy Stock Overview with toggle (~1.5 hrs)
- **P2:** Reports screen (currently "Coming Soon" badge)
- **P2:** Real-time notifications (WebSocket/polling — hook placeholder exists)
- **P2:** Historical stock comparison (vs yesterday delta)

## Test Credentials
- Master: `abhishek@kalabahia.com` / `Qplazm@10` → rid=1, type=master
- Central: `owner@democentral2.com` / `Qplazm@10` → rid=782, type=central
- Franchise: `owner@demofranchise4.com` / `Qplazm@10` → rid=786, type=franchise
