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

### Session 1: Repo clone & setup (May 26, 2026)
- Cloned from branch `27_5_26`, running

### Session 2: P15/P16 Lifecycle Stabilization (May 26, 2026)
- 7 regressions fixed, 100% test pass

### Session 3: P17 Planning (May 27, 2026)
- API investigation, 3 endpoints confirmed, full plan created

### Session 4: P17 Implementation (May 27, 2026)
- **Amend Request**: `POST /request/{id}/amend` — franchise replaces lines in-place (status=requested, type=request only)
  - ItemEditorDialog with source catalog, seeds from existing lines
  - Action visibility: franchise-side only, status=requested, type=request
- **Withdraw Request**: `POST /request/{id}/withdraw` — terminal status=withdrawn
  - Destructive confirm dialog with warning
  - StatusTimeline withdrawn branch (Ban icon, slate ring)
  - `withdrawn` added to STATUS_CONFIG + terminal status list
- **Modification Request**: `POST /request/{id}/modification` — creates child transfer
  - ItemEditorDialog with catalog, navigates to child on success
  - Parent link rendered: "Modification of Transfer #XXX"
  - `modification_request` type badge in TransferDetail, PendingQueues, HistoryLedger
  - TYPE_LABELS mapping for all transfer types
- **Testing**: 32/32 backend + 16/16 frontend — all pass
- **Files modified**: api.js, terminology.js, transferActions.js, TransferDetail.jsx, StatusTimeline.jsx, PendingQueues.jsx, HistoryLedger.jsx
- **Files created**: ItemEditorDialog.jsx

## P0 — Implemented
- [x] Login, Ops Hub, Hierarchy, Queues, History, Ledger
- [x] Transfer Detail with P16 lifecycle
- [x] Partial approve, hold, cancel-remainder, dispute
- [x] Request stock, Direct dispatch, Adjustment, Wastage
- [x] P17: Amend request (franchise, status=requested)
- [x] P17: Withdraw request (franchise, terminal)
- [x] P17: Modification request (franchise, creates child transfer)
- [x] P17: withdrawn status + modification_request type rendering

## P1 — Remaining
- [ ] Real-time queue polling / WebSocket notifications
- [ ] Cross-store reports for Central Store Manager
- [ ] Parent transfer detail: show linked modifications sub-section

## P2 — Future
- [ ] Batch management UI, Export, Dashboard analytics
