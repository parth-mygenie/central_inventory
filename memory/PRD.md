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
- P15/P16/P17: Transfer lifecycle
- P18: Vendor management
- P19: Procurement
- P20: Stock Inventory Summary
- P21: Catalogue (ingredients, products, recipes, addon-recipes)
- P22: Daily Consumption Report
- P23: Hierarchy Management
- **P24**: FEFO Stock Detail UI (Jan 2026) — 21/21 tests passed
- **P25**: Wastage Report Enhancement (Jan 2026) — 23/23 tests passed

## P24 Implementation (Jan 2026)
- Row click drilldown from Stock Inventory Summary → `/inventory/:id`
- Summary, Batch Inventory (FEFO segments), Reconciliation, Consumption History sections

## P25 Implementation (Jan 2026)
- **api.js**: Added `getWastageReasons()`, extended `getWastageReport()` with P25 filters (wasteType, foodId, hasBatch, includeSegments), fixed normalizer to preserve full response
- **useWastageReasons.js**: New hook fetching API-driven reasons with fallback to hardcoded list
- **WastageReport.jsx**: Full rewrite with KPI cards (total records, net wastage, batch audited, physical count), filters (waste type dropdown, has-batch toggle), enhanced table (date, item, type badge, qty, unit, reason, batch, expiry, source type badge), expandable FEFO allocation details, summary footer
- **WastageEntryForm.jsx**: Replaced hardcoded WASTAGE_REASONS with API-driven picker via useWastageReasons hook
- Removed dead `recorded_by` column

## Files Added/Modified
### P24
- NEW: `StockDetailPanel.jsx`, `useStockDetail.js`
- MOD: `api.js`, `App.js`, `StockInventorySummary.jsx`

### P25
- NEW: `useWastageReasons.js`
- REWRITE: `WastageReport.jsx`, `WastageEntryForm.jsx`
- MOD: `api.js` (getWastageReasons, extended getWastageReport)

## Prioritized Backlog
- **P1**: Wastage report segment_snapshot dashboard panel (include_segments toggle)
- **P1**: Source restaurant name resolution (Store #ID → name)
- **P2**: Consumption line pagination for high-volume items
- **P2**: by_restaurant breakdown section in wastage report
