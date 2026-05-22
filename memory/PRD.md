# Central Inventory - PRD

## Problem Statement
Central Inventory module for MyGenie POS — multi-level inventory management across Central → Master → Outlet hierarchy with transfer workflows, stock tracking, and reporting.

## Architecture
- **Backend**: FastAPI (Python) — proxy server forwarding to `preprod.mygenie.online` APIs with seed data enrichment
- **Frontend**: React (CRA + CRACO) with Tailwind CSS, Radix UI, shadcn/ui components
- **Database**: MongoDB (status checks); main data proxied/seeded from Laravel backend
- **Auth**: Proxied to MyGenie preprod auth API
- **External API**: `https://preprod.mygenie.online/api/v2/vendoremployee`

## Tech Stack
- FastAPI + Motor (async MongoDB) + httpx (HTTP proxy)
- React 19 + React Router 7 + Axios + Recharts + Radix UI
- Tailwind CSS 3 + shadcn/ui component library
- date-fns for timestamp formatting

## What's Been Implemented

### Slice 1 — COMPLETE (Jan 2026)
- [x] GitHub repo cloned (branch: final_for_working_22_5_26)
- [x] Core screens: Login, Operations Hub, Hierarchy Summary, Store Detail, Pending Queues, Transfer Detail
- [x] Role-based UX for Central/Master/Outlet
- [x] Terminology mapping infrastructure (backend master→UI Central Store, etc.)
- [x] Seed data with 7 stores, 16 items, 12 transfers covering all statuses
- [x] API verification tool

### Slice 2 — COMPLETE + QA VALIDATED (20 May 2026)
- [x] 12/12 items: Ready to Dispatch tab, Status timeline, Line-level accept/reject, Timestamp formatting, Resolution reasons, Date range picker, Contextual action buttons, Items count column, Store name fix, Downward-only hierarchy, Context selector in-place, KPI placeholder removed
- [x] Backend: 10/10 pytest PASS
- [x] Frontend: 12/12 Playwright PASS

### Blocker Reconciliation — COMPLETE (22 May 2026)
- [x] Reviewed 15 documents including 3 API verification reports
- [x] Reconciled 14 previous blockers against latest E2E report (52/52 PASS)
- [x] 12 blockers resolved, 2 still blocked (low priority with approved fallbacks), 1 unknown
- [x] Slice 3 confirmed read-only; Slice 4 write flows now unblocked
- [x] Backend follow-up document created

### Slice 3 — PLANNED, OWNER APPROVED (20 May 2026)
- [ ] History & Ledger screen with two tabs (route `/history`)
- [ ] Transfer History tab with filtering
- [ ] Stock Ledger tab (derived from transfers)
- [ ] 10 must-have items approved

## Prioritized Backlog

### P0 — Slice 3 (Next)
- History & Ledger screen implementation (10 must-have items)

### P0 — Slice 4 (After Slice 3)
- Write flow implementation: Dispatch Wizard, Request Stock, Approve/Reject, Receive, Cancel, Partial Receive
- Source selector modal (segment_id mode)
- Confirmation dialogs for destructive actions

### P1 — Future Slices
- Stock Adjustment form (decrease API verified)
- Wastage Entry form (wastage API verified)
- Stock Return form (return initiate API verified)
- Lateral Transfer UI (Master↔Master, API verified)
- Ops Dashboard KPIs (API verified, awaiting owner KPI spec)

### P2 — Backlog
- Reconciliation Summary screen
- Near-expiry Alerts
- Cost Valuation report (FIFO)
- CSV/PDF Export
- Real-time WebSocket updates
- Recipe/consumption display
- Inward Audit screen

## Key API Status (Post-Reconciliation)
- **Read APIs**: 22/22 verified_working
- **Write APIs**: ALL verified_working (52/52 E2E PASS)
- **Phase 2 Ops APIs**: 14/14 verified_working
- **Key insight**: `segment_id` is the only reliable source selector mode

## Seed Data Accounts
- `abhishek@kalabahia.com` / `Qplazm@10` → Central Store (master, ID=1)
- `owner@democentral1.com` / `Qplazm@10` → Master Store (central, ID=781)
- `owner@democentral2.com` / `Qplazm@10` → Master Store (central, ID=782)
- `owner@demofranchise1.com` / `Qplazm@10` → Outlet (franchise, ID=783)
- `owner@demofranchise2.com` / `Qplazm@10` → Outlet (franchise, ID=784)
- `owner@demofranchise3.com` / `Qplazm@10` → Outlet (franchise, ID=785)
- `owner@demofranchise4.com` / `Qplazm@10` → Outlet (franchise, ID=786)

## Next Tasks
1. Slice 3 Implementation Planning Update (incorporate reconciliation findings)
2. Slice 3 Implementation
3. Slice 3 QA
4. Slice 4 Write Flow Planning
