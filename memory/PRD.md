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
- [2026-05-26] P16 Frontend Implementation — ALL 4 PHASES COMPLETE (16/16 tests PASS)
- [2026-05-26] **P16 Re-approve lifecycle rendering bug FIXED** — 3 issues resolved

### Bug Fix: Re-approve Lifecycle Rendering (26 May 2026)

**Root cause:** POS API returns `line.status = "approved"` even when `holdDisplayQty > 0`. Frontend treated this as finalized.

**3 fixes applied:**
1. **`api.js` normalization**: Derives `lineStatus = "partially_approved"` when POS says `approved` but `holdDisplayQty > 0`. Computes `remainingApprovableQty = requested - approved - cancelled`.
2. **`terminology.js`**: Added `partially_approved` to `LINE_STATUS_CONFIG` (sky blue badge).
3. **`ApproveWaveDialog.jsx`**: Uses `remainingApprovableQty` for available ceiling, shows "X already approved" badge, includes `partially_approved` lines in eligibility filter.

**Also fixed:** Floating-point noise in hold/cancelled qty display (rounded to 4 decimals).

## Files Modified (cumulative)
- `terminology.js`, `transferActions.js`, `api.js`, `TransferDetail.jsx`, `StatusTimeline.jsx`, `ReceiveDialog.jsx`, `ApproveWaveDialog.jsx`

## Files Created
- `ApproveWaveDialog.jsx`, `DisputeResolutionDialog.jsx`

## Prioritized Backlog
- P1: End-to-end UAT with live partial approve → dispatch → receive → dispute flow
- P1: OperationsHub dispute count card
- P2: Approval wave history collapsible audit view per line
- P2: Queue sub-filtering (requested vs partially_approved within approval tab)

## Next Tasks
- UAT with stakeholders on live preprod environment
- Consider adding dispute queue visibility for central users
