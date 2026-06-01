# Central Inventory — PRD

## Original Problem Statement
Pull code from GitHub repo `Abhi-mygenie/central-iventory.git` branch `02-june`, deploy, and build/run the app. Systematic screen-by-screen audit to fix gaps between live app and frozen preview HTML specs.

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

### 2026-06-01 (Session 1): Code deployed from GitHub (02-june branch)
- All 24 screens present in codebase
- CR-023 bug fixes already in code (17 of 18 bugs fixed)
- ChocolateHut data seeded (158 items, stock, batches, transfers)

### 2026-06-01 (Session 2): Screen-by-Screen Audit & Fixes
**Problem found:** Despite CR-023 code being present, live screens had issues:
- Operations Hub stuck on skeleton loaders (15+ seconds before rendering)
- Transfer Detail "Requester Store Snapshot" stuck on "Loading..."
- Missing preview features: Reject/Partial Approve buttons, FROM/TO labels, insufficient stock warnings

**Fixes applied:**

1. **OperationsHub — Progressive Loading**
   - Removed full-page skeleton gate behind `loading` state
   - Shows greeting, KPI cards (0 while loading), Quick Actions immediately
   - "Loading intelligence data..." and "Computing store health..." indicators
   - Full data renders progressively as APIs respond (~15s)

2. **PendingQueues — Missing Preview Features**
   - Added **Reject** button (red styled) on each approval card
   - Added **Partial Approve** button (for multi-item transfers)
   - Renamed "Approve" to **"Approve All"**
   - Added **insufficient stock warning** in card footer
   - Added **(has X)** annotations on QTY REQUESTED column for items requester already has

3. **TransferDetail — FROM/TO Labels + Snapshot Fix**
   - FROM card now shows **(Source — You)** when viewer is source
   - TO card now shows **(Requester)** or **(You)** based on context
   - Requester Store Snapshot loading indicator moved above metadata card
   - Snapshot renders with 4 stat cards + item table + OK/OUT/LOW badges
   - "X out-of-stock items not in this request" warning working
   - Approval Impact table with Requested / Your Stock / After Approval

**Test Results:** 11/11 features PASS (iteration_34)

## Prioritized Backlog

### P0 — COMPLETE
- All 17 fixable CR-023 bugs resolved
- Screen-by-screen audit fixes applied

### DEFERRED
- B10/G-017: Vendor purchase history (no API exists)

### Performance Optimization (P1)
- N+1 API calls for store health grid (6 hierarchy-detail calls per store)
- stock-inventory API queued behind other calls causing 15s delay
- Consider: API response caching, parallel batching, or summary endpoint

### Remaining Preview Gaps (P2)
- PendingQueues: Requester store health mini-bar per card (3 out / 1 low / 0 adequate)
- PendingQueues: "X out-of-stock items not in this request" cross-ref warning
- Direct Dispatch: "WHAT THIS STORE NEEDS" auto-detect table verification needed
- ReceiveDialog: dispatched vs requested comparison
- ApproveWaveDialog: FEFO auto-select + expiry badges
- Consumption Report: Days of Cover / Trend columns
- Catalogues: Has Recipe / Cost Mapped from cross-ref

### Backend Gaps (External team)
- G-013: PO number generation
- G-014: Invoice OCR endpoint
- G-015: Excel parsing endpoint
- G-017: Vendor purchase history API

### Future CRs
- CR-015: FEFO Batch Stock Detail Panel (P0)
- CR-016: Stock Inventory Hierarchy Toggle (P1)
- CR-017: Smart Dispatch/Request Assistance (P1)
- CR-018: Wastage Report Enhancements (P2)
- CR-020: Daily Intelligence Digest (Future)
