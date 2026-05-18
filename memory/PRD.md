# PRD — Central Inventory CR Planning + API Verification Tool + Verification Results

## Original Problem Statement
CR Requirement Planning for MyGenie POS Central Inventory Module + Build Internal API Verification Tool + Execute API Verification with real tokens.

## Architecture & Tasks Done
1. **CR Requirement Planning** — `/app/memory/central_inventory/CENTRAL_INVENTORY_CR_REQUIREMENT_PLANNING.md`
2. **Internal API Verification Tool** — Built at `/verify` route
3. **Live API Verification** — 22 APIs tested against preprod.mygenie.online

## Tech Stack
- Frontend: React 19, Tailwind CSS, Phosphor Icons, IBM Plex Sans + JetBrains Mono
- Backend: FastAPI, httpx (proxy), Motor (MongoDB async)
- Database: MongoDB (api_verifications collection)
- External API: preprod.mygenie.online (MyGenie POS Laravel backend)

## What's Been Implemented
- [Jan 2026] CR Requirement Planning Document (28 sections, 50+ owner questions)
- [Jan 2026] Internal API Verification Tool (20 pre-configured APIs, proxy, terminology mapping)
- [Jan 2026] Live API Verification completed:
  - **22 APIs tested** with real master (Business Central) token
  - **18 verified working**, 1 verified with notes, **3 blocked by backend issues**
  - **Terminology mapping CONFIRMED** via live API responses
  - All evidence saved to MongoDB (22 records)
  - Report: `/app/memory/central_inventory/api_evidence/API_VERIFICATION_REPORT.md`

## CRITICAL: Confirmed Terminology Mapping
| Business Term (UI) | Backend API Term | CONFIRMED |
|---|---|---|
| Central / Center (TOP) | master | YES |
| Master Store (MIDDLE) | central | YES |
| Outlet / Unit (BOTTOM) | franchise | YES |

## Blocked APIs (Owner Action Required)
1. **hierarchy-detail** — `unit_id` column missing from inventory_master (migration not run)
2. **hierarchy-report** — Same issue as hierarchy-detail
3. **pending-queues** — `pendingQueues` method not found (code not deployed)

## Prioritized Backlog
### P0 — Owner Must Do
- Run `php artisan migrate` on preprod
- Create test hierarchy (add central + franchise children)
- Provide central/franchise login credentials

### P1 — After Owner Actions
- Re-verify 3 blocked APIs after migration
- End-to-end transfer flow testing with real hierarchy
- Begin frontend UI implementation

### P2 — Frontend Implementation
- Central Inventory module screens (23 planned)
- Terminology adapter module
- Role-based UI visibility

## Next Tasks
1. Owner runs migrations on preprod
2. Owner creates test hierarchy (central + franchise children)
3. Re-verify blocked APIs
4. Start Central Inventory UI implementation
