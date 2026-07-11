# Session-Start — CR-025 Reference Code Wire (Artifact #0)

> **Date:** 2026-06-13
> **Agent:** E1
> **Sprint:** S3
> **Item ID:** CR-025
> **Item Title:** Coverage-Based Intelligent PO — Wire `reference_code` as PO Number
> **Item Type:** CR (sub-task of CR-025 closure)
> **Branch:** 13-6-26

---

## What I'm Working On

Wire the backend-generated `reference_code` field (e.g. `TRF-806-2026-0003`) into every screen
that currently displays the placeholder `PO-XXXX` format produced by `formatPO(transfer.id)`.
This is the final piece needed to close CR-025 and resolve gap G-013 (PO number in API).

## Files I Expect to Touch

| File | Action | Reason |
|------|--------|--------|
| `frontend/src/lib/formatters.js` | MODIFY | Add `referenceCode` param to `formatPO` |
| `frontend/src/components/central-inventory/PendingQueues.jsx` | MODIFY | Pass `reference_code` at 2 call sites |
| `frontend/src/components/central-inventory/TransferDetail.jsx` | MODIFY | Pass `reference_code` at 1 call site |
| `frontend/src/components/central-inventory/HistoryLedger.jsx` | MODIFY | Pass `reference_code` at 3 call sites + propagate into derived ledger entries |
| `frontend/src/components/central-inventory/OperationsHub.jsx` | MODIFY | Pass `reference_code` at 2 call sites |
| `frontend/src/components/central-inventory/ApproveWaveDialog.jsx` | MODIFY | Pass `reference_code` at 1 call site |
| `frontend/src/components/central-inventory/ReceiveDialog.jsx` | MODIFY | Pass `reference_code` at 1 call site |
| `frontend/src/components/central-inventory/DisputeResolutionDialog.jsx` | MODIFY | Pass `reference_code` at 1 call site |
| `frontend/src/components/central-inventory/StockInventorySummary.jsx` | MODIFY | Remove dead `formatPO` import |
| `frontend/src/components/common/PostSubmitConfirmation.jsx` | NO CHANGE | Only called from AddStockPurchaseForm (procurement, no transfer reference_code) |
| `frontend/src/services/api.js` | NO CHANGE | `reference_code` already passes through — no normalization strips it |
| `backend/server.py` | NO CHANGE | Proxy-only, no business logic |

## Pre-Conditions Verified

- [x] Read `control/L2_HANDOVER_PROTOCOL.md` (via handover doc)
- [x] Read `control/L6_SPRINT_STATUS.md` — S3 active, CR-025 in QA
- [x] Checked `control/registry.json` — CR-025 exists, status QA, artifact 6 PENDING
- [x] Checked `control/L7_FILE_OWNERSHIP.md` — no frozen files in my plan (`formatters.js` is active, `terminology.js` and `screenVisibility.js` not touched)
- [x] Terminology mapping understood (backend `master` = business Central Store)
- [x] API verified: `reference_code` confirmed present in all 3 endpoints (pending-queues, details, history)

## Risks / Concerns

1. **Derived ledger entries** in `HistoryLedger.jsx` construct synthetic `e` objects with `reference_id: t.id`. These don't carry `reference_code`. Must propagate `reference_code` into derived entries.
2. **Legacy transfers** without `reference_code` (null/undefined) must fall back to the existing `PO-XXXX` format. The backwards-compatible function signature handles this.
3. **PostSubmitConfirmation** only receives a `transferId` prop — but it's only used by `AddStockPurchaseForm` (procurement, not a transfer). No change needed.

## Exit Criteria

- Every screen that displays a PO number shows `TRF-XXX-YYYY-ZZZZ` for new transfers
- Legacy transfers without `reference_code` still show `PO-XXXX` format
- CSV export includes `reference_code` values
- No new API calls introduced
- No cache layer changes
- Gap G-013 can be marked CLOSED

---

*After session: update registry.json artifact refs and run the generator.*
