# Central Inventory - PRD

## Original Problem Statement
Central Inventory management app for MyGenie vendors. React 19 frontend + FastAPI backend proxying to MyGenie POS preprod API.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Radix UI, shadcn/ui, React Router DOM 7, Craco, Recharts, date-fns
- **Backend**: Python FastAPI, Motor (async MongoDB), httpx (HTTP proxy to MyGenie POS API)
- **Database**: MongoDB (local)
- **External APIs**: MyGenie POS preprod API (v1 auth, v2 vendor operations)

## Architecture
- Backend proxy to `preprod.mygenie.online` POS API
- Auth: `/api/proxy/auth/login` → POS common-login
- V2: `/api/proxy/v2/{path}` → POS vendor employee API

## What's Been Implemented

### Session 1: Repo clone & setup (May 26)
- Cloned from branch `27_5_26`, running

### Session 2: P15/P16 Lifecycle Stabilization (May 26)
- 7 regressions fixed, 100% test pass

### Session 3: P17 Planning (May 27)
- API investigation, 3 endpoints confirmed, full plan created

### Session 4: P17 Implementation + UAT (May 27)
- Amend, Withdraw, Modification flows implemented
- All tests pass (32/32 backend + 16/16 frontend)
- Operational smoke test: T120-T125 created against live POS API
  - T120: Full lifecycle (requested→approved→dispatched→received)
  - T121: Amend verified (maida→red meat line replacement)
  - T122: Withdraw verified (terminal, Requested→Withdrawn timeline)
  - T123→T124: Modification verified (child created, parent unchanged)
  - T125: Dispute flow (request→approve→dispatch→receive→resolved)
- Browser UAT: All 4 key states screenshot-verified
  - T121: Amend Request + Withdraw buttons visible
  - T122: Withdrawn badge, timeline, no actions
  - T123: Request Modification button visible
  - T124: Parent link "Modification of Transfer #123", Modification type badge
  - History: Withdrawn filter + Modification type badges

## P0 — Implemented
- [x] Full P15/P16 lifecycle (partial approve, hold, cancel-remainder, dispute)
- [x] P17: Amend, Withdraw, Modification flows
- [x] Operations Hub, Hierarchy, Queues, History, Ledger
- [x] Request stock, Direct dispatch, Adjustment, Wastage

## P1 — Remaining
- [ ] Real-time queue polling
- [ ] Parent transfer detail: linked modifications sub-section
- [ ] Cross-store reports

## P2 — Future
- [ ] Batch management UI, Export, Dashboard analytics
