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

## What's Been Implemented (P24 - Jan 2026)
- **P24 FEFO Stock Detail UI** — additive, read-only detail view
  - Row click drilldown from Stock Inventory Summary → `/inventory/:id`
  - Summary section: ingredient name, stock, unit, category, low stock badge
  - Batch Inventory section: FEFO-ordered segments table with batch, qty, expiry, source store
  - Expiry badges: expired (red), expiring soon (amber), healthy (green), no expiry (gray)
  - Reconciliation section: aggregate vs segment totals with mismatch warning
  - Consumption History: date-filtered consumption lines with expandable FEFO allocation details
  - All data-testid attributes for testing
  - 100% test pass rate (21/21 tests: 5 backend + 16 frontend)

## Files Added/Modified (P24)
- NEW: `/app/frontend/src/components/central-inventory/StockDetailPanel.jsx`
- NEW: `/app/frontend/src/hooks/useStockDetail.js`
- MODIFIED: `/app/frontend/src/services/api.js` (added `getStockDetail`)
- MODIFIED: `/app/frontend/src/App.js` (added route `/inventory/:id`)
- MODIFIED: `/app/frontend/src/components/central-inventory/StockInventorySummary.jsx` (clickable rows + chevron)

## Constraints Followed
- No modifications to: Transfer lifecycle (P15/P16/P17), Procurement (P18/P19), Inventory Summary (P20), Consumption Report (P22)
- P24 is purely additive
- Read-only — no stock mutations, no batch edits, no inventory updates

## Backlog
- P0: Wastage report batch enhancement (Phase 3 of P24 plan)
- P1: Source restaurant name resolution (currently shows Store #ID)
- P2: Consumption line pagination for high-volume items
