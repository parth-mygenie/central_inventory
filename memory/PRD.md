# Central Inventory - PRD

## Original Problem Statement
Central Inventory management system for MyGenie — multi-restaurant hierarchy (master → central → franchise) with inventory transfer lifecycle management.

## Architecture
- **Frontend**: React 19 + Craco + TailwindCSS + Radix UI + Recharts
- **Backend**: FastAPI proxy to preprod.mygenie.online POS API (Laravel)
- **Database**: MongoDB (local session/cache), MySQL (POS backend)
- **External APIs**: `preprod.mygenie.online/api/v1` (auth), `preprod.mygenie.online/api/v2/vendoremployee` (all inventory transfer ops)

## What's Been Implemented
- [2026-05-26] Cloned repo from `26_5_26_1` branch, installed all dependencies, services running
- [2026-05-26] P16 Lifecycle Revalidation Pass — live API testing of 14 P16 scenarios

## P16 Revalidation Results (26 May 2026)

### Confirmed Working (16/16 scenarios pass)
- Partial approve with `approval_lines[]` + `segments[]`
- Header status `partially_approved`
- Line-level statuses: `approved`, `on_hold`, `cancelled_remainder`
- `meta_json.approval` fields fully populated
- Second wave approve (accumulates across waves)
- Cancel-remainder (transitions `partially_approved` → `approved`)
- Dispatch on `partially_approved` (approved lines only)
- `receive_dispute_pending` auto-triggered by partial receive
- Legacy full approve `{}` backward compat
- Old transfer without `meta_json.approval` (safe fallback)
- P14 canonical request (no selector)
- Queue counters with mixed statuses
- Stale-transfers endpoint

### Contract Deltas Found (9 items)
- D1: `approval_lines[].segments[]` REQUIRED (not optional) — CRITICAL
- D2: `details/{id}` is GET (not POST) — HIGH
- D3: Dispute auto-triggered by `rejected_qty > 0` (no `dispute: true` flag) — HIGH
- D4: `meta_json` returned as STRING — HIGH
- D5: Line status after dispatch = `pending` (not `dispatched`) — MEDIUM
- D6: `partially_received` new status in queues — MEDIUM
- D7: `my_requests` includes all lifecycle statuses — MEDIUM
- D8: Cancel-remainder edits `requested_qty` — LOW
- D9: `partially_approved` in `approval_pending` (correct behavior) — LOW

### Remaining Blockers (1 critical)
- B1: `resolve-dispute` endpoint NOT FOUND (404) — Phase 4 blocker

### Implementation Readiness
- Phase 0 (Foundation): ✅ READY
- Phase 1 (Line Rendering): ✅ READY
- Phase 2 (Partial Approve UI): ⚠️ READY with caveat (segment picker mandatory)
- Phase 3 (Cancel-Remainder + Second Wave): ✅ READY
- Phase 4 (Dispute Resolution): ❌ BLOCKED (backend route missing)

## Prioritized Backlog
- P0: Phase 0+1 implementation (status vocab + line-level rendering)
- P0: Phase 2 ApproveWaveDialog with segment picker
- P1: Phase 3 cancel-remainder + second wave UI
- P1: Queue counter updates for new statuses
- P2: Phase 4 dispute resolution (blocked on backend)

## Next Tasks
- Confirm dispute resolution endpoint registration with backend team
- Begin Phase 0 implementation (non-breaking additive changes)
