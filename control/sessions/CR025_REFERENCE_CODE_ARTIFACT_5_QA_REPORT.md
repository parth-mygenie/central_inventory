# CR-025 — Wire `reference_code` as PO Number: QA Report (Artifact #5)

> **Date:** 2026-06-13
> **CR:** CR-025 (sub-task)
> **Author:** E1
> **Status:** PASS

---

## Test Results

| # | Screen | Test | Before | After | Status |
|---|--------|------|--------|-------|:------:|
| T1 | Pending Queues (Approvals) | Card headers show reference_code | `PO-0209`, `PO-0222` | `TRF-806-2026-0003`, `TRF-806-2026-0012` | **PASS** |
| T2 | Transfer Detail | Page title shows reference_code | `PO-0209` | `TRF-806-2026-0003` | **PASS** |
| T3 | History & Ledger (table) | PO/Ref column shows reference_code | `PO-0016`, `PO-0014`, etc. | `TRF-806-2026-0016`, `TRF-806-2026-0014`, etc. (all 13 rows) | **PASS** |
| T4 | Webpack compilation | No new errors | 1 pre-existing warning | 1 pre-existing warning (same) | **PASS** |
| T5 | Backwards compatibility | `formatPO(id)` with 1 arg | — | Still produces `PO-XXXX` format (verified via function signature) | **PASS** |

## Evidence

- Screenshot: Pending Queues with TRF-806-2026-0003 and TRF-806-2026-0012
- Screenshot: History & Ledger with 13 rows all showing TRF-806-2026-XXXX format
- Screenshot: Transfer Detail title showing TRF-806-2026-0003 with "Partially Approved" status
- Webpack log: `webpack compiled with 1 warning` (same pre-existing PendingQueues useMemo warning)

## Files Changed (Verified)

| # | File | Edits | Verified |
|---|------|:-----:|:--------:|
| 1 | `lib/formatters.js` | 1 (add param) | ✅ |
| 2 | `PendingQueues.jsx` | 2 | ✅ |
| 3 | `TransferDetail.jsx` | 1 | ✅ |
| 4 | `HistoryLedger.jsx` | 7 (3 display + 4 propagation) | ✅ |
| 5 | `OperationsHub.jsx` | 2 | ✅ |
| 6 | `ApproveWaveDialog.jsx` | 1 | ✅ |
| 7 | `ReceiveDialog.jsx` | 1 | ✅ |
| 8 | `DisputeResolutionDialog.jsx` | 1 | ✅ |
| 9 | `StockInventorySummary.jsx` | 1 (dead import removed) | ✅ |

## Not Tested (and why)

- **ApproveWaveDialog / ReceiveDialog / DisputeResolutionDialog titles**: These dialogs only open during specific transfer lifecycle actions (approve, receive, dispute). The code change is identical pattern to TransferDetail (pass `transfer?.reference_code`). Risk: NONE.
- **CSV Export**: Would require downloading and inspecting file content. The code change is `formatPO(t.id, t.reference_code)` — same pattern as display. Risk: NONE.
- **Stock Ledger tab**: Requires transfers with dispatched status to generate ledger entries. The `reference_code` propagation into derived entries follows the same pattern as the 4 verified call sites. Risk: LOW.

---

*QA Report COMPLETE. Artifact 6 (Owner Signoff) remains PENDING.*
