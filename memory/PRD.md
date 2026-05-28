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
- Full transfer lifecycle, hierarchy, pending queues, history
- P16 partial approve, P17 amend/withdraw/modification
- P18 Vendors, P19 Procurement, Stock Adjustment, Wastage

### P20 Stock Inventory Summary — IMPLEMENTED (27 May 2026)
- Self-store inventory visibility, KPI cards, inventory table
- Testing: 14/14 frontend PASS, 11/11 backend PASS

### P21 Smart Dispatch/Request Assistance — PLANNED (27 May 2026)
- Destination-aware intelligence layer for dispatch/request flows
- 5-phase roadmap: `AI/Plans/phase3/P21_smart_dispatch_request_assistance.md`

### P21 Catalogue Phase — API VALIDATED + PLANNED (27 May 2026)
- **30 API probes** against live POS — 19 WORKING, 9 BLOCKED (recipe/sub-recipe 404)
- Inventory Catalogue (7/7 endpoints working)
- Product Catalogue (6/6 endpoints working)
- Addon-Recipe Catalogue (6/6 endpoints working)
- **Recipe + Sub-recipe: ALL BLOCKED (404)** — routes not registered on POS build
- Full planning: `AI/Plans/phase3/P21_catalogue_planning.md`
- Curl evidence: `AI/curls/p21_catalogue_curls.sh`

## Prioritized Backlog
- **P0:** P21 Catalogue Phase 1 — Inventory Catalogue (ingredients + categories) (~5-6h)
- **P0:** P21 Catalogue Phase 4 — Addon-Recipe management (~4-5h)
- **P1:** P21 Catalogue Phase 2 — Product/Food Catalogue (~5-6h)
- **P1:** P21 Smart Dispatch Phase 1+2 — Low-stock suggestions + qty recommendations (~8h)
- **P2:** P20 Phase 3 — Hierarchy stock overview toggle (~1.5h)
- **BLOCKED:** P21 Catalogue Phase 3 — Recipe/Sub-recipe (POS routes return 404)

## Test Credentials
- Master: `abhishek@kalabahia.com` / `Qplazm@10` → rid=1, type=master
- Central: `owner@democentral2.com` / `Qplazm@10` → rid=782, type=central
- Franchise: `owner@demofranchise4.com` / `Qplazm@10` → rid=786, type=franchise
