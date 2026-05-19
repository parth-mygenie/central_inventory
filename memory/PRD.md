# Central Inventory — PRD

## Original Problem Statement
Build the Central Inventory frontend Phase 1 limited slice — read-only foundation based on completed Business Rule & UX Field Freeze.

## Architecture
- **Frontend**: React 19 + TailwindCSS + shadcn/ui components
- **Backend**: FastAPI proxy to preprod.mygenie.online
- **Database**: MongoDB (for local state/verification data)
- **External API**: preprod.mygenie.online (V1 auth + V2 vendoremployee APIs)

## User Personas
- **Central Store Manager** (backend `master`): TOP-level, manages all stores
- **Master Store Manager** (backend `central`): MIDDLE-level, manages assigned outlets
- **Outlet Manager** (backend `franchise`): BOTTOM-level, manages own outlet only
- **Super Admin**: All access + admin tools

## Core Requirements
- 3-level hierarchy: Central Store → Master Store → Outlet
- Terminology adapter (backend terms inverted from business terms)
- Login context from `restaurant_type_flag`
- Screen visibility per role matrix
- Read-only screens for verified APIs
- All write actions blocked (UNIT_CONVERSION_NOT_DEFINED)

## What's Been Implemented (May 2026)
- Terminology adapter with full mapping
- Login context hook with fallback handling
- Screen visibility matrix (23 screens, 10+ actions)
- API service layer (12 read API methods)
- Backend API proxy (auth + V2 endpoints)
- Real-time hook placeholder
- 6 screens: SCR-00, SCR-01, SCR-02, SCR-03, SCR-05, SCR-09
- Layout: Sidebar, Header, Login page
- Common components: Badges, State displays

## Prioritized Backlog

### P0 (Blocked on backend)
- UNIT_CONVERSION_NOT_DEFINED fix → unblocks all write APIs
- Test credentials with restaurant_type_flag for all 3 levels

### P1 (Next slice)
- SCR-04 Request Stock form shell
- SCR-07 Dispatch Wizard form shell
- SCR-10 Receive Stock form shell
- SCR-20 Reports Dashboard
- Date range filters

### P2 (Future)
- Token masking in API tool (SEC-001)
- Real-time WebSocket integration
- Notifications (polling Phase 1)
- Stock adjustment / wastage screens
- Recipe mapping display
- Physical stocktake

## Next Tasks
1. Owner: Provide test credentials with restaurant_type_flag
2. Owner: Specify Operations Hub KPIs (RPT-003)
3. Backend: Fix UNIT_CONVERSION_NOT_DEFINED
4. Frontend: Slice 2 — write form shells + reports
