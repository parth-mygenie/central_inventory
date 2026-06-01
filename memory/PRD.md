# Central Inventory — PRD

## Original Problem Statement
Pull code from GitHub repo `Abhi-mygenie/central-iventory.git` branch `01-june`, deploy, and continue development. Fix 18 API-mismatch bugs (CR-023) identified in UI audit.

## Architecture
- **Frontend:** React 19 + Tailwind + Radix UI + craco (port 3000)
- **Backend:** FastAPI proxy to `preprod.mygenie.online` POS API (port 8001)
- **Database:** MongoDB (local, for token sessions only)
- **Auth:** POS API login with token-based sessions
- **Intelligence:** All computed frontend-side from POS API data

## User Personas
- **Central Store (TOP):** Full admin — approvals, dispatch, settings, hierarchy management
- **Master Store (MID):** Transfer management, stock visibility
- **Outlet (BOTTOM):** Request stock, receive, wastage

## Core Requirements (Static)
- 24 screens with intelligence upgrades per Phase 7 Frozen Spec
- Proxy-only backend (zero business logic)
- Frontend-computed intelligence from POS API data
- Role-based screen visibility (Central/Master/Outlet)

## What's Been Implemented

### 2026-06-01: Code deployed from GitHub
- All 24 screens present in codebase
- 13 screens fully upgraded with intelligence
- 7 screens partially upgraded

### 2026-06-01: Audit & Data Seed
- Identified 18 API-mismatch bugs
- ChocolateHut data seeded (158 items, stock, batches, transfers)
- DELETE proxy bug fixed

### 2026-06-01: CR-023 Complete (17 of 18 bugs fixed)

**Batch 1 (A1, B1):** Store Health Grid
- Created `useRestaurantMap.js` hook
- Fixed OperationsHub: `children` → `stores`, added hierarchy-detail batch calls for health

**Batch 2 (B2, B3, B4):** Restaurant Names
- PendingQueues: real names via restaurantMap
- TransferDetail: FROM/TO names with type badges
- HistoryLedger: merged restaurantMap into historyNameMap

**Batch 3 (C1):** Transfer Detail Intelligence
- Requester Store Snapshot (stat cards + item table with OUT/LOW/OK badges)
- Approval Impact on Your Stock (projection table)

**Batch 4 (B9, C2):** Consumption + Dispatch Intelligence
- DailyConsumptionReport: Current Stock, Days of Cover, Trend columns
- DirectDispatchForm: "What This Store Needs" auto-detect table

**Batch 5 (C3, C4, B5):** Dialogs + Hierarchy Health
- ReceiveDialog: dispatched vs requested comparison + receiving summary
- ApproveWaveDialog: FEFO expiry badges + auto-select nearest expiry + over-approve warning
- HierarchySummary: OUT OF STOCK / LOW STOCK / ADEQUATE health columns

**Batch 6 (B6, B7, B8, B11, C5, C6):** Catalogues + Polish
- IngredientCatalogue: "Recipes" column via cross-ref
- ProductCatalogue: "Has Recipe" from actual recipe data
- RecipeCatalogue + AddonRecipeCatalogue: Cost Mapped from ingredient prices
- HierarchyManagement: real Push Status via push-form API
- DisputeResolutionDialog: impact explanation text
- SourceSelector: "Available: X" for selected segment

## Prioritized Backlog

### P0 — COMPLETE
- All 17 fixable bugs from CR-023 resolved

### DEFERRED
- B10/G-017: Vendor purchase history (no API exists)

### Backend Gaps (External team)
- G-013: PO number generation
- G-014: Invoice OCR endpoint
- G-015: Excel parsing endpoint
- G-017: Vendor purchase history API
