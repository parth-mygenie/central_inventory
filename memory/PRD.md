# Central Inventory - PRD

## Problem Statement
Clone and run the Central Inventory module from GitHub repo (parth-mygenie/central_inventory, branch 23_5_26) as-is. Central Inventory module for MyGenie POS — multi-level inventory management across Central → Master → Outlet hierarchy with transfer workflows, stock tracking, and reporting.

## Architecture
- **Backend**: FastAPI (Python) — proxy server forwarding to `preprod.mygenie.online` APIs with seed data enrichment
- **Frontend**: React (CRA + CRACO) with Tailwind CSS, Radix UI, shadcn/ui components
- **Database**: MongoDB (status checks); main data proxied/seeded from Laravel backend
- **Auth**: Proxied to MyGenie preprod auth API

## What's Been Implemented (as cloned from repo)

### Slice 1 — COMPLETE
- Core screens: Login, Operations Hub, Hierarchy Summary, Store Detail, Pending Queues, Transfer Detail
- Role-based UX for Central/Master/Outlet, Terminology mapping

### Slice 2 — COMPLETE + QA 12/12
- Ready to Dispatch tab, Status timeline, Line-level accept/reject, Timestamp formatting, Resolution reasons, Date range picker, Contextual action buttons, Items count, Store name fix, Downward-only hierarchy, Context selector, KPI removed

### Slice 3 — COMPLETE + QA 23/23
- History & Ledger screen at `/history` with Transfer History + Stock Ledger tabs
- Filters, search, role-based visibility, Transfer Detail linkage

### Slice 4 — PLANNING COMPLETE (22 May 2026)
- Write flow planning document created
- 10 must-have + 5 should-have items recommended
- 10/10 write APIs verified_ready (52/52 E2E PASS)
- 8 owner questions pending before implementation
- No backend blockers for Slice 4

## Setup Completed (23 May 2026)
- Cloned from GitHub repo parth-mygenie/central_inventory, branch 23_5_26
- Backend dependencies installed (pip install -r requirements.txt)
- Frontend dependencies installed (yarn install)
- Services running via supervisor (backend: uvicorn port 8001, frontend: craco port 3000)
- All 10 E2E tests passed (100% backend, 100% frontend)

## Seed Data Accounts
- `abhishek@kalabahia.com` / `Qplazm@10` → Central Store (ID=1)
- `owner@democentral1.com` / `Qplazm@10` → Master Store (ID=781)
- `owner@demofranchise1.com` / `Qplazm@10` → Outlet (ID=783)

## Prioritized Backlog

### P0 — Slice 4 (IMPLEMENTED — 23 May 2026)
**Must-have (12/12 DONE):**
- Approve/Reject/Dispatch/Receive/Cancel transfer actions on Transfer Detail (enabled, wired to real API)
- Partial receive with line-level resolution (promoted to must-have)
- "Report Issue" action for destination on dispatched transfers (Q-XFER-006 override)
- Direct Dispatch form at /dispatch/new (Central/Master to child, including Central to Outlet)
- Request Stock form at /request/new (child to parent, promoted to must-have)
- Source selector configurable (segment_id default + filter_bucket with warning)
- Confirmation dialogs for all destructive actions
- Duplicate submission prevention + post-action data refresh via useWriteAction hook

**Should-have (3/4 DONE):**
- Success/error toast notifications (Toaster mounted)
- Quantity validation with UOM awareness (pcs=whole, kg/ltr=2 decimals)
- API error message terminology mapping (mapApiErrorMessage)
- Edit transfer: DEFERRED (API contract unknown)

### P1 — Slice 5 (Future)
- Stock Adjustment, Wastage Entry, Stock Return forms
- Lateral Transfer UI, Partial Dispatch

### P2 — Backlog
- Ops Dashboard KPIs, Reports, Export, Real-time updates, Recipe display

## Next Tasks
1. Slice 4 QA (owner smoke test)
2. Edit Transfer API discovery (deferred from Slice 4)
3. Slice 5 Planning
