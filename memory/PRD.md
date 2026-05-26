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
- [2026-05-26] P16 Lifecycle Revalidation Pass — 16 scenarios confirmed working
- [2026-05-26] Dispute Resolution Endpoint Retest — B1/B2 blockers RESOLVED

## P16 Revalidation Summary

### All 4 Phases: READY for Implementation
- Phase 0 (Foundation): ✅ READY
- Phase 1 (Line Rendering): ✅ READY
- Phase 2 (Partial Approve UI): ✅ READY (segment picker mandatory per D1)
- Phase 3 (Cancel-Remainder + Second Wave): ✅ READY
- Phase 4 (Dispute Resolution): ✅ READY (B1 resolved — route was `/receive-dispute/{id}/resolve`)

### Dispute Resolution — Verified Contract
- **Accept:** `POST /receive-dispute/{id}/resolve` with `{"accept": true, "note": "..."}` → `partially_received` or `received`
- **Reject:** `POST /receive-dispute/{id}/resolve` with `{"accept": false, "note": "..."}` → reverts to `dispatched` (franchise re-receives)
- Prior 404 was wrong route (`/resolve-dispute/{id}` instead of `/receive-dispute/{id}/resolve`)

### 9 Contract Deltas (Unchanged)
- D1-D9 documented in `P16_frontend_planning_risk_assessment.md` §19.2

### 0 Remaining Blockers
- B1: RESOLVED — dispute resolve endpoint confirmed
- B2: RESOLVED — response shapes documented

## Prioritized Backlog
- P0: Phase 0+1 implementation (status vocab + line-level rendering)
- P0: Phase 2 ApproveWaveDialog with segment picker
- P1: Phase 3 cancel-remainder + second wave UI
- P1: Phase 4 dispute resolution UI
- P1: Queue counter updates for new statuses

## Next Tasks
- Begin Phase 0 implementation (non-breaking additive changes)
- All P16 API contracts verified — no backend dependencies remaining
