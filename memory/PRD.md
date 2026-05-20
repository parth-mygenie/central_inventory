# Central Inventory - PRD

## Original Problem Statement
Central Inventory management system for MyGenie POS — multi-level stock management across Central Store → Master Store → Outlet hierarchy.

## Architecture
- **Backend**: FastAPI (Python) — API proxy to `preprod.mygenie.online` with local seed data enrichment
- **Frontend**: React 19 + Tailwind CSS + Radix UI + Craco
- **Database**: MongoDB (status checks), main data from seed_data.py
- **Auth**: Proxied to MyGenie preprod auth API

## User Personas
- **Central Store (master)**: Top-level — full access to all screens and actions
- **Master Store (central)**: Mid-level — manages outlets, can approve/dispatch
- **Outlet (franchise)**: Bottom-level — limited, read-only on most screens

## Core Requirements
- Login via MyGenie vendor account
- Operations Hub dashboard with pending counts
- Hierarchy Summary with store listing (Master Stores / Outlets tabs)
- Store Detail with stock summary, batch drilldown, transactions
- Pending Queues (Approval, Ready to Dispatch, Receive, My Requests)
- Transfer Detail (read-only with status timeline and contextual actions)
- Terminology mapping: backend "master"->"Central Store", "central"->"Master Store", "franchise"->"Outlet"

## What's Been Implemented

### Slice 1 (May 19, 2026)
- Full codebase pulled from GitHub branch `19_05_26`
- Backend running with FastAPI proxy + seed data enrichment
- All screens: Login, Operations Hub, Hierarchy Summary, Store Detail, Pending Queues, Transfer Detail
- Role-based UX for 3 login levels
- Terminology mapping infrastructure

### Slice 2 (May 19, 2026) - QA VALIDATED May 20, 2026
12 items implemented and fully validated across all 3 roles:
1. Ready to Dispatch tab in Pending Queues - PASS
2. Status timeline on Transfer Detail - PASS
3. Line-level accept/reject display - PASS
4. Consistent timestamp formatting (date-fns) - PASS
5. Resolution reason display - PASS
6. Date range picker on Hierarchy Summary - PASS
7. Contextual action buttons by role + status - PASS
8. Items count column in queues - PASS
9. Store name fix validated - PASS
10. Downward-only hierarchy visibility - PASS
11. Context selector updates hub data in-place - PASS
12. KPI placeholder removed - PASS

## Key Seed Data
- Restaurants: My Genie (1), DemoCentral1 (781), DemoCentral2 (782), DemoFranchise1-4 (783-786)
- Transfer IDs: 101-112 covering all statuses
- 16 inventory items

### Slice 3 — PLANNING COMPLETE (20 May 2026), OWNER APPROVAL REQUIRED
Scope: Transfer History + Stock Ledger (read-only enterprise traceability)
- Planning document: `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_3_HISTORY_LEDGER_PLANNING.md`
- Handover document: `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_3_PLANNING_HANDOVER.md`
- 10 must-have items planned, 5 should-have items, 11 owner questions
- Screen structure: One "History & Ledger" screen with two tabs
- Status: Awaiting owner approval of scope and answers to 11 questions

## P0/P1/P2 Features Remaining
- **P0**: Write API integration (dispatch, approve, reject, receive, cancel) — blocked by UNIT_CONVERSION
- **P0**: Slice 3 — Transfer History + Stock Ledger (read-only) — planned, pending owner approval
- **P1**: Reports screen (marked "coming soon")
- **P2**: Stock adjustment, wastage recording
- **P2**: Real-time updates
- **P2**: KPI dashboard (owner to specify metrics)

## Backlog / Next Tasks
- Owner approval on Slice 3 scope + answers to 11 questions → implementation
- Enable write operations when backend UNIT_CONVERSION resolution is available
- Build Reports screen with CSV/PDF export
- Confirmation dialogs for destructive actions (when write enabled)
- Backend API & terminology refactoring
