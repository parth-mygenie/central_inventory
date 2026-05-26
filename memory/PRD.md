# Central Inventory - PRD

## Original Problem Statement
Central Inventory management system for MyGenie — multi-restaurant hierarchy (master → central → franchise) with inventory transfer lifecycle management. P16 refined request-line lifecycle frontend implementation.

## Architecture
- **Frontend**: React 19 + Craco + TailwindCSS + Radix UI + Recharts
- **Backend**: FastAPI proxy to preprod.mygenie.online POS API (Laravel)
- **Database**: MongoDB (local session/cache), MySQL (POS backend)
- **External APIs**: `preprod.mygenie.online/api/v1` (auth), `preprod.mygenie.online/api/v2/vendoremployee` (all inventory transfer ops)

## What's Been Implemented
- [2026-05-26] Cloned repo from `26_5_26_1` branch
- [2026-05-26] P16 Lifecycle Revalidation — 16 API scenarios verified against live POS
- [2026-05-26] Dispute Resolution Endpoint confirmed (`POST /receive-dispute/{id}/resolve`)
- [2026-05-26] **P16 Frontend Implementation — ALL 4 PHASES COMPLETE (16/16 tests PASS)**

### P16 Implementation Details

**Phase 0 — Foundation:**
- STATUS_CONFIG: added `partially_approved`, `receive_dispute_pending`
- LINE_STATUS_CONFIG: added `on_hold`, `cancelled_remainder`, `pending`
- `api.js`: meta_json parsing in `normalizeTransferLine()`, 3 new API methods
- `transferActions.js`: source/destination action matrix with P16 statuses

**Phase 1 — Line-Level Rendering:**
- `TransferDetail.jsx`: LineStatusBadge, LineQtyBreakdown (Req/Appr/Hold/Cancelled/Dispatched), Approval Waves audit card
- `StatusTimeline.jsx`: partially_approved + receive_dispute_pending steps
- `ReceiveDialog.jsx`: uses `dispatchedDisplayTotal` truth source

**Phase 2 — Partial Approve UI:**
- `ApproveWaveDialog.jsx`: per-line segment picker + qty + remainder policy

**Phase 3 — Dispute Resolution:**
- `DisputeResolutionDialog.jsx`: accept/reject toggle + note field

### Files Modified
- `terminology.js`, `transferActions.js`, `api.js`, `TransferDetail.jsx`, `StatusTimeline.jsx`, `ReceiveDialog.jsx`

### Files Created
- `ApproveWaveDialog.jsx`, `DisputeResolutionDialog.jsx`

## Regression Safety
- Direct Dispatch, Stock Adjustment, Wastage, Hierarchy, Login — all preserved
- Old transfers without meta_json.approval render correctly (graceful fallback)
- Legacy full approve `{}` backward compat maintained

## Prioritized Backlog
- P1: End-to-end UAT with live partial approve → dispatch → receive → dispute flow
- P1: OperationsHub dispute count card (currently no dedicated queue for disputes)
- P2: Approval wave history collapsible audit view per line
- P2: Queue sub-filtering (requested vs partially_approved within approval tab)

## Next Tasks
- UAT with stakeholders on live preprod environment
- Consider adding dispute queue visibility for central users
