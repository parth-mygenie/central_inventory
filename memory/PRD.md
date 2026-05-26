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
- **Outlet Manager** (backend: `franchise`): Request stock, receive, report issues, record wastage

## Core Requirements
- Multi-wave partial approve lifecycle (P15/P16)
- Hold management — central can approve hold anytime on same transfer
- Cancel remainder — shrink request to approved qty
- Dispatch/receive wave continuation
- Dispute resolution flow
- Queue management with correct status filtering
- History ledger with operational qty derivation

## What's Been Implemented (May 26, 2026)

### Session 1: Repo clone & setup
- Cloned repo from branch `27_5_26`
- Restored `.env` files
- Installed all dependencies
- Both services running

### Session 2: P15/P16 Lifecycle Stabilization
**Fixes applied:**
1. **PendingQueues**: Ready to Dispatch tab now includes `partially_approved` and `partially_received` transfers
2. **OperationsHub**: Ready-to-dispatch count includes `partially_approved`/`partially_received`
3. **cancelRemainder API**: Now accepts `lineIds` for targeted cancel
4. **TransferDetail**: Cancel remainder passes hold line IDs to API
5. **HistoryLedger**: Received qty uses actual `accepted_qty` from line/resolution_meta, not dispatched fallback
6. **HistoryLedger**: Store names never show "Unknown" — fallback to restaurant type mapping
7. **Refresh buttons**: Added to PendingQueues, TransferDetail, and HistoryLedger for stale state handling

**Testing results (100% pass):**
- 20/20 backend pytest tests passed
- 16/16 frontend features verified
- Real live transfers tested: #110 (partially_approved), #101 (receive_dispute_pending)
- All P16 components verified: LineStatusBadge, LineQtyBreakdown, ApproveWaveDialog, DisputeResolutionDialog, StatusTimeline

## P0 — Already Implemented
- [x] Login flow (POS API proxy)
- [x] Operations Hub with queue counters
- [x] Hierarchy Summary/Detail
- [x] Pending Queues (approval, dispatch, receive, my-requests)
- [x] Transfer Detail with full P16 lifecycle rendering
- [x] Partial approve dialog with segment picker
- [x] Cancel remainder with targeted line IDs
- [x] Dispute resolution dialog
- [x] Receive dialog (full + partial)
- [x] Direct dispatch, Request stock, Stock adjustment, Wastage entry/report
- [x] History & Ledger with operational qty derivation
- [x] Status timeline with P16 states
- [x] Action matrix for all lifecycle states

## P1 — Remaining Backlog
- [ ] Amend/Withdraw request (franchise: status=requested)
- [ ] Modification request (franchise: after approve, qty changes need central approval)
- [ ] Real-time queue polling / WebSocket notifications
- [ ] Cross-store reports for Central Store Manager

## P2 — Future
- [ ] Batch management UI for segment selection
- [ ] Export/download capabilities
- [ ] Dashboard analytics / KPIs
