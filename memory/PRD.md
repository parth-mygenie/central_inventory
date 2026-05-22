# Central Inventory - PRD

## Problem Statement
Central Inventory module for MyGenie POS — multi-level inventory management across Central → Master → Outlet hierarchy with transfer workflows, stock tracking, and reporting.

## Architecture
- **Backend**: FastAPI (Python) — proxy server forwarding to `preprod.mygenie.online` APIs with seed data enrichment
- **Frontend**: React (CRA + CRACO) with Tailwind CSS, Radix UI, shadcn/ui components
- **Database**: MongoDB (status checks); main data proxied/seeded from Laravel backend
- **Auth**: Proxied to MyGenie preprod auth API

## What's Been Implemented

### Slice 1 — COMPLETE (Jan 2026)
- [x] Core screens: Login, Operations Hub, Hierarchy Summary, Store Detail, Pending Queues, Transfer Detail
- [x] Role-based UX for Central/Master/Outlet
- [x] Terminology mapping infrastructure
- [x] Seed data: 7 stores, 16 items, 12 transfers

### Slice 2 — COMPLETE + QA VALIDATED (20 May 2026)
- [x] 12/12 items: Ready to Dispatch tab, Status timeline, Line-level accept/reject, Timestamp formatting, Resolution reasons, Date range picker, Contextual action buttons, Items count column, Store name fix, Downward-only hierarchy, Context selector in-place, KPI placeholder removed
- [x] QA: Backend 10/10, Frontend 12/12

### Slice 3 — COMPLETE + QA VALIDATED (22 May 2026)
- [x] History & Ledger screen at `/history` with two tabs
- [x] Transfer History tab with 10 columns, all 7 statuses, filtering by status/direction/date/search
- [x] Stock Ledger tab with 12 columns, derived from transfer data, movement type filtering
- [x] Role-based visibility across all 3 levels
- [x] Transfer Detail linkage from both tabs
- [x] Safe empty/loading/error states
- [x] QA: Frontend 15/15 PASS across Central/Master/Outlet roles
- [x] No backend modifications

## Prioritized Backlog

### P0 — Slice 4 (Next)
- Write flow implementation: Dispatch Wizard, Request Stock, Approve/Reject, Receive, Cancel, Partial Receive
- Source selector modal (segment_id mode)
- Confirmation dialogs for destructive actions

### P1 — Future Slices
- Stock Adjustment, Wastage Entry, Stock Return forms
- Lateral Transfer UI, Ops Dashboard KPIs
- Reports, CSV/PDF Export

## Seed Data Accounts
- `abhishek@kalabahia.com` / `Qplazm@10` → Central Store (ID=1)
- `owner@democentral1.com` / `Qplazm@10` → Master Store (ID=781)
- `owner@demofranchise1.com` / `Qplazm@10` → Outlet (ID=783)

## Next Tasks
1. Owner smoke test of Slice 3
2. Slice 4 Write Flow Planning
