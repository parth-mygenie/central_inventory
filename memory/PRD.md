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
- Login via MyGenie vendor account with role detection
- Hierarchy Summary, Store Detail, Operations Hub, Pending Queues
- Transfer lifecycle: request → approve → dispatch → receive
- P16: Partial approve, line-level statuses, cancel-remainder, receive dispute
- P17: Amend, withdraw, modification, operational settings
- P18: Vendor Management CRUD
- P19: Add Stock (Procurement) UI
- Stock Adjustment, Wastage recording + reporting
- Direct Dispatch with source selector
- Request Stock — canonical 3-step flow

### P20 Stock Inventory Summary — IMPLEMENTED (27 May 2026)
- Self-store inventory visibility with KPI cards + inventory table
- Testing: 14/14 frontend PASS, 11/11 backend PASS

### P21 Smart Dispatch/Request Assistance — PLANNED (27 May 2026)
- Destination-aware intelligence layer for dispatch/request flows
- 5-phase roadmap (suggestions → quantities → history → consumption → optimization)
- Full planning doc: `AI/Plans/phase3/P21_smart_dispatch_request_assistance.md`

## Prioritized Backlog
- **P0:** P21 Phase 1 — Low-stock suggestions in dispatch + request forms (~4-5h)
- **P1:** P21 Phase 2 — Recommended quantities + source confidence (~3-4h)
- **P1:** P20 Phase 3 — Hierarchy stock overview toggle (~1.5h)
- **P2:** P21 Phase 3 — Transfer history context + pending request awareness (~3-4h)
- **P2:** Reports screen implementation
- **P3:** P21 Phase 4 — Consumption-aware intelligence (future)

## Test Credentials
- Master: `abhishek@kalabahia.com` / `Qplazm@10` → rid=1, type=master
- Central: `owner@democentral2.com` / `Qplazm@10` → rid=782, type=central
- Franchise: `owner@demofranchise4.com` / `Qplazm@10` → rid=786, type=franchise
