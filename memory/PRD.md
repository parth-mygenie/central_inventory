# Central Inventory - PRD

## Problem Statement
Central Inventory module for MyGenie POS — multi-level inventory management across Central → Master → Outlet hierarchy with transfer workflows, stock tracking, and reporting.

## Architecture
- **Backend**: FastAPI (Python) — proxy server forwarding to `preprod.mygenie.online` APIs with seed data enrichment
- **Frontend**: React (CRA + CRACO) with Tailwind CSS, Radix UI, shadcn/ui components
- **Database**: MongoDB (status checks); main data proxied/seeded from Laravel backend
- **Auth**: Proxied to MyGenie preprod auth API

## What's Been Implemented

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

## Prioritized Backlog

### P0 — Slice 4 (Next — awaiting owner answers)
- Approve/Reject/Dispatch/Receive/Cancel transfer actions
- Direct Dispatch form + Source selector
- Confirmation dialogs, duplicate prevention, post-action refresh

### P1 — Slice 5 (Future)
- Stock Adjustment, Wastage Entry, Stock Return forms
- Lateral Transfer UI, Partial Dispatch

### P2 — Backlog
- Ops Dashboard KPIs, Reports, Export, Real-time updates, Recipe display

## Seed Data Accounts
- `abhishek@kalabahia.com` / `Qplazm@10` → Central Store (ID=1)
- `owner@democentral1.com` / `Qplazm@10` → Master Store (ID=781)
- `owner@demofranchise1.com` / `Qplazm@10` → Outlet (ID=783)

## Next Tasks
1. Owner answers Q-S4-001 through Q-S4-008
2. Slice 4 Implementation Planning
3. Slice 4 Implementation
