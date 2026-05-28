# Central Inventory - PRD

## Original Problem Statement
Build a Central Inventory module for the MyGenie POS platform managing stock movement across a three-level hierarchy: Central Store (top) → Master Store (middle) → Outlet (bottom). Proxies to MyGenie preprod POS API.

## Architecture
- **Backend**: FastAPI (Python) — API proxy to MyGenie preprod POS APIs (V1 auth + V2 vendoremployee) + MongoDB
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui (Radix) + CRACO build
- **Database**: MongoDB (local — token sessions, status checks only)
- **External APIs**: MyGenie preprod POS API (`preprod.mygenie.online`)
- **Branch**: `28_5_26_ux`

## Core Requirements
- 3-level hierarchy: Central Store (backend=master) → Master Store (backend=central) → Outlet (backend=franchise)
- Terminology adapter: backend terms never shown in UI
- Transfer lifecycle: request → approve → dispatch → receive (full/partial) / cancel / reject
- Role-based access: 3 roles with distinct permissions
- Seed-free operation: all data from real POS API

## What's Been Implemented

### Slice 1-4 (May 2026) — CLOSED
- Read-only foundation (6 screens, role context, terminology adapter)
- UX polish + enterprise transfer visibility (12 items)
- History & Ledger traceability (15 items)
- Transfer write flows (12 MH + 3 SH)
- 52/52 E2E API tests passed

### Slice 5 (24 May 2026) — Implementation Complete, Owner Acceptance Pending
- Stock Adjustment form (Central-only, increase/decrease)
- Wastage Entry form (all roles, own store)
- Wastage Report (role-scoped, date filter)
- Predefined reason categories (5 adj + 6 wastage)
- Hardcoded UI cleanup (no read-only banners)
- GET proxy bugfix

### Seed Shutdown (25 May 2026) — Complete, QA Pending
- All seed dependencies removed from server.py
- Generic V2 proxy handles all endpoints
- Frontend hardcoded IDs replaced with dynamic POS-derived values

### P15/P16: Request-Line Lifecycle (25-26 May 2026) — Implemented, Closure Doc Pending
- ApproveWaveDialog, DisputeResolutionDialog, ItemEditorDialog
- Enhanced StatusTimeline

### P17: Amend/Withdraw/Modification + Operational Settings (27 May 2026) — Implemented, Closure Doc Pending
- Transfer amend, withdraw, modification actions
- OperationalSettings.jsx (218 lines)

### P18: Vendor Management (27 May 2026) — Implemented, Closure Doc Pending
- VendorManagement.jsx + VendorFormDialog.jsx
- Full CRUD via POS API

### P19: Add Stock/Procurement (27 May 2026) — Implemented, Closure Doc Pending
- AddStockPurchaseForm.jsx (346 lines)

### P20: Stock Inventory Summary (27 May 2026) — Implemented, Closure Doc Pending
- StockInventorySummary.jsx (368 lines)
- useStockInventory.js hook
- Hierarchy-aware stock view

### P21: Smart Dispatch/Request Assistance — PLANNING ONLY

## Prioritized Backlog (P0/P1/P2)

### P0 (Documentation/Process — No Code)
- P15-P20 closure documentation
- Seed Shutdown QA
- Combined owner acceptance
- Baseline freeze declaration

### P1 (Deferred Features)
- Edit Transfer (OI-001) — API contract unknown
- Stock Return flow (OI-005) — API unclear
- Lateral Master-to-Master transfers (OI-016)
- Reports screen (OI-006)

### P2 (Future)
- CSV/PDF Export (OI-007)
- KPI Dashboard (OI-008)
- Cost/Value Reporting (OI-009)
- WebSocket notifications (OI-002)
- Batch/Expiry management (OI-013)
- Advanced permissions (OI-015)

## Current Status
- **Consolidation Status**: `consolidation_complete_with_conflicts`
- **Freeze Status**: `freeze_not_ready` (documentation gaps only)
- **Latest Report**: `CENTRAL_INVENTORY_CONSOLIDATED_STATUS_AND_BASELINE_FREEZE_REPORT.md`

## Next Tasks
1. Create P15-P20 closure documentation
2. Execute Seed Shutdown QA
3. Record combined owner acceptance
4. Declare baseline freeze
