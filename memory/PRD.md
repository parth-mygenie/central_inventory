# Central Inventory - PRD

## Overview
Central Inventory management system by MyGenie. Multi-store hierarchy stock management module for the MyGenie POS platform.

**Repo:** `https://github.com/parth-mygenie/central_inventory.git` | **Branch:** `11-07-26`

## Architecture
- **Backend**: FastAPI (Python) — proxy-only layer forwarding to `preprod.mygenie.online/api/v2/vendoremployee`
- **Frontend**: React 19 + Craco + Tailwind CSS + Radix UI / shadcn components
- **Database**: MongoDB (local via Motor async driver — session tokens only)
- **Auth**: Proxied to MyGenie preprod vendor employee login

## What's Been Implemented

### Session: 2026-07-11 — Repo Clone + Gap Adoption Implementation

**Deployed & Running:**
- Backend on port 8001 (FastAPI + uvicorn)
- Frontend on port 3000 (React via Craco)

**CR-037→044 Gap Adoption Batch (8 CRs, 16 files):**

| CR | Title | Status | Files |
|----|-------|--------|-------|
| CR-037 | Unified Stock Ledger (G-005) | IMPLEMENTED | api.js, HistoryLedger, TransferDetail |
| CR-038 | Stock Return Flow + Wastage CRUD (G-006) | IMPLEMENTED | api.js, ReturnStockDialog (NEW), TransferDetail, WastageEntryForm, useWastageReasons |
| CR-039 | Excel/CSV Import (G-015) | IMPLEMENTED | server.py, api.js, AddStockPurchaseForm, PurchaseOrderCreate |
| CR-040 | Invoice Duplicate Check (G-016) | IMPLEMENTED | api.js, PurchaseOrderDetail |
| CR-041 | Segment unit_cost (G-019) | IMPLEMENTED | StockDetailPanel |
| CR-042 | Unit Conversion (G-020) | IMPLEMENTED | IngredientCatalogue |
| CR-043 | Pushed Lock + Policy (G-028/029) | IMPLEMENTED | api.js, apiErrors.js (NEW), ProductCatalogue, SubRecipeMaster, RecipeCatalogue, IngredientCatalogue, StoreManagement |
| CR-044 | Manufactured Recipe (G-030) | IMPLEMENTED | RecipeCatalogue |

## Prioritized Backlog

### P0 — Blocking
- POS preprod test accounts returning "Invalid credentials" — blocks QA/smoke for all items

### P1 — Next
- QA for CR-037→044 (once auth is working)
- QA for BUG-029→036 (IMPLEMENTED, awaiting QA)
- Closure for BUG-038→045 (QA_PASS, awaiting owner signoff)
- Sprint S4 "Gap Adoption" creation decision

### P2 — Later
- G-014 Invoice OCR/AI extraction (backend still OPEN)
- App-wide consumption unit re-unit-ing (v2 follow-up from CR-042)
- WebSocket infrastructure (G-011 still OPEN)
- Daily consumption trend column

## Key Modules
- Operations Hub, Hierarchy Summary, Store Management
- Stock Inventory (FG/RM split), Ingredient/Product/Recipe Catalogues
- Purchase Orders (create/approve/send/receive/close), Vendor Management
- Production Runs, Sub-Recipe Master, Production History
- Wastage Reports, Daily Consumption, Stock Ledger
- Direct Dispatch, Request Stock, Stock Adjustment
- History Ledger, Pending Queues, Transfer Detail (with returns)
