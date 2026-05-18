# PRD — Central Inventory (Updated: Handover Document Complete)

## Original Problem Statement
Pull code from https://github.com/parth-mygenie/central_inventory.git (main branch), go through all documentation, summarize the project, determine next steps, and create a final system handover document.

## Project Overview
**MyGenie POS — Central Inventory Module**: A multi-level inventory management system for the MyGenie POS platform managing stock movement across a 3-level business hierarchy.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Radix UI + Phosphor Icons (this repo)
- **Local Backend**: FastAPI (Python) as a proxy/support server with MongoDB
- **External Backend**: Laravel PHP API at preprod.mygenie.online
- **Database**: MongoDB (local for verification records), MySQL (remote for MyGenie)

## What's Been Implemented (Jan 2026)
- CR Requirement Planning Document (2,281 lines, 28 sections, 26 modules, 22 workflows, 23 screens)
- 96 owner business decisions captured across 2 rounds of Q&A
- Enterprise-grade gap analysis (Round 2 review)
- Internal API Verification Tool at `/verify` (20 APIs cataloged, 6 groups)
- 22 read APIs verified working against preprod
- Full E2E transfer lifecycle tested (18/19 passed)
- Terminology adapter module (`terminology.js`)
- Design guidelines (dark brutalist UI, IBM Plex Sans + JetBrains Mono)
- Test hierarchy seeded: 2 centrals + 4 franchises under master
- **[NEW] System Handover & Operational Documentation** — 912-line comprehensive document at `/app/memory/central_inventory/SYSTEM_HANDOVER_DOCUMENT.md`

## Deliverables Created This Session
1. **SYSTEM_HANDOVER_DOCUMENT.md** — Complete tech-team handover covering:
   - Hierarchy model with terminology inversion explanation
   - Stock data architecture (segments, aggregates, lineage)
   - Full transfer lifecycle with all status transitions
   - All 10 transfer flow types with rules
   - Stock movement timing and floor policies
   - Dispatch mechanics and source selection
   - Receiving, partial receiving, and resolution types
   - Visibility and access control by role
   - Batch, expiry, and lineage tracking
   - Adjustment, wastage, and reconciliation mechanisms
   - Pending queues and operational workflow
   - Reporting capabilities
   - Franchise push and metadata sync
   - Audit trail and events
   - Current platform status with known issues
   - 11 backend capabilities requiring development
   - Complete API inventory with readiness status
   - Glossary of all domain terms

## Current Blockers
1. Test credentials for multi-role testing
2. 11 items need backend team work
3. Operations Hub KPIs not specified by owner
4. Unit conversion metadata missing in backend DB

## Prioritized Backlog
### P0 — Must Have Phase 1
- Begin Central Inventory UI (23 screens)
- Build terminology adapter module
- Implement role-based UI visibility
- Core screens: Operations Hub, Hierarchy Summary, Store Detail
- Transfer workflows: Request, Approve, Dispatch, Receive, Partial Receive, Reject/Cancel

### P1 — Should Have Phase 1
- Stock adjustment & wastage modules
- Low-stock alerts
- Stock ledger / movement history
- Reports dashboard
- In-app polling notifications

### P2 — Phase 2
- Real-time WebSocket notifications
- External notifications (email/WhatsApp/SMS)
- Configurable role permissions
- Physical stocktake / reconciliation
- Theoretical vs actual consumption reports

## Next Tasks
1. Share handover document with backend team for the 11 required capabilities
2. Resolve backend blocker (unit conversion metadata)
3. Begin UI implementation starting with core screens
4. Coordinate backend development priorities
