# Central Inventory - PRD

## Original Problem Statement
Central Inventory management app for MyGenie vendors. React 19 frontend + FastAPI backend proxying to MyGenie POS preprod API. P15/P16 lifecycle implementation for multi-wave partial approve, hold management, dispatch/receive waves, and dispute resolution.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Radix UI, shadcn/ui, React Router DOM 7, Craco, Recharts, date-fns
- **Backend**: Python FastAPI, Motor (async MongoDB), httpx (HTTP proxy to MyGenie POS API)
- **Database**: MongoDB (local)
- **External APIs**: MyGenie POS preprod API (v1 auth, v2 vendor operations)

## Architecture
- Backend acts as a proxy to MyGenie's preprod POS API (`preprod.mygenie.online`)
- Auth proxied through `/api/proxy/auth/login` → POS common-login
- V2 endpoints proxied through `/api/proxy/v2/{path}` → POS vendor employee API
- Frontend is a Central Inventory management app for MyGenie vendors

## User Personas
- **Central Store Manager** (backend: `master`): Full access — approve, dispatch, adjust stock, record wastage
- **Master Store Manager** (backend: `central`): Approve, dispatch, request stock, record wastage
- **Outlet Manager** (backend: `franchise`): Request stock, receive, report issues, record wastage, amend/withdraw requests, request modifications

## Core Requirements
- Multi-wave partial approve lifecycle (P15/P16) — IMPLEMENTED
- Hold management — IMPLEMENTED
- Cancel remainder — IMPLEMENTED
- Dispatch/receive wave continuation — IMPLEMENTED
- Dispute resolution flow — IMPLEMENTED
- Queue management — IMPLEMENTED
- History ledger — IMPLEMENTED
- Amend request flow (P17) — PLANNED
- Withdraw request flow (P17) — PLANNED
- Modification request flow (P17) — PLANNED

## What's Been Implemented

### Session 1: Repo clone & setup (May 26, 2026)
- Cloned repo from branch `27_5_26`, restored env, installed deps, running

### Session 2: P15/P16 Lifecycle Stabilization (May 26, 2026)
- 7 regressions fixed (queue filtering, cancelRemainder line_ids, ledger qty, store names, refresh buttons)
- 100% test pass (20/20 backend + 16/16 frontend)

### Session 3: P17 Planning — Amend/Withdraw/Modification (May 27, 2026)
- **API Investigation**: All 3 endpoints confirmed WORKING on live POS API
  - `POST /request/{id}/amend` — replaces lines in-place (franchise only, status=requested)
  - `POST /request/{id}/withdraw` — terminal status (franchise only, status=requested)
  - `POST /request/{id}/modification` — creates CHILD transfer (franchise only, post-approval)
- **New status discovered**: `withdrawn` (terminal)
- **New type discovered**: `modification_request` (child of parent transfer)
- **Implementation plan**: 4-phase rollback-safe sequence documented in P17 plan
- **Test transfers created**: T116 (withdrawn), T117 (parent), T118 (mod approved), T119 (mod rejected)
- **Files created**:
  - `AI/Plans/phase2/P17_amend_withdraw_modification_plan.md`
  - `AI/Plans/api_implementation_status_p17_addendum.md`
  - `AI/curls/p17_amend_withdraw_modification_curls.sh`

## P0 — Implemented
- [x] Login, Operations Hub, Hierarchy, Queues, History, Ledger
- [x] Transfer Detail with P16 lifecycle (partial approve, hold, cancel-remainder, dispute)
- [x] Request stock (3-step), Direct dispatch, Stock adjustment, Wastage

## P1 — Ready for Implementation (P17)
- [ ] Amend request (franchise, status=requested) — API CONFIRMED
- [ ] Withdraw request (franchise, status=requested) — API CONFIRMED
- [ ] Modification request (franchise, post-approval) — API CONFIRMED
- [ ] `withdrawn` status rendering
- [ ] `modification_request` type rendering + parent link

## P2 — Future
- [ ] Real-time queue polling / WebSocket notifications
- [ ] Cross-store reports for Central Store Manager
- [ ] Batch management UI
- [ ] Export/download capabilities
- [ ] Dashboard analytics / KPIs
