# CR-025 — Wire `reference_code` as PO Number: Intake (Artifact #1)

> **Date:** 2026-06-13
> **CR:** CR-025 (sub-task — final piece before closure)
> **Author:** E1
> **Status:** COMPLETE

---

## 1. Problem Statement

The backend POS API now generates a unique `reference_code` per transfer (e.g. `TRF-806-2026-0003`).
The frontend still uses `formatPO(transfer.id)` which produces a placeholder `PO-0209` derived from
the numeric database ID. This must be replaced with the real `reference_code` everywhere PO numbers
are displayed.

**Owner confirmed:** `reference_code` is the canonical PO identifier. This replaces gap G-013.

## 2. Scope

### In Scope
- Modify `formatPO()` to accept an optional `referenceCode` parameter (backwards compatible)
- Update all 15 call sites across 8 component files to pass `reference_code`
- Propagate `reference_code` into derived stock ledger entries in `HistoryLedger.jsx`
- Clean up dead import in `StockInventorySummary.jsx`

### Out of Scope
- `PostSubmitConfirmation.jsx` — only used by `AddStockPurchaseForm` (procurement, not a transfer)
- `backend/server.py` — proxy-only, no changes
- `api.js` — `reference_code` already passes through unmodified
- Any new API calls or cache changes

## 3. Requirements

| # | Requirement | Priority |
|---|-------------|----------|
| R1 | New transfers display `TRF-XXX-YYYY-ZZZZ` format from API `reference_code` | P0 |
| R2 | Legacy transfers (null `reference_code`) fall back to `PO-XXXX` format | P0 |
| R3 | CSV export uses `reference_code` when available | P1 |
| R4 | Stock ledger clickable links show `reference_code` instead of `PO-XXXX` | P1 |
| R5 | Dialog titles (Approve, Receive, Dispute) show `reference_code` | P1 |
| R6 | No new API calls introduced | P0 |
| R7 | No breaking changes to `formatPO` function signature | P0 |

## 4. API Evidence

### Pending Queues (`POST /proxy/v2/inventory-transfer/pending-queues`)
```json
{
  "transfer_id": 209,
  "reference_code": "TRF-806-2026-0003",
  "status": "partially_approved",
  "from_restaurant_id": 806,
  ...
}
```

### Transfer Details (`GET /proxy/v2/inventory-transfer/details/209`)
```json
{
  "id": 209,
  "reference_code": "TRF-806-2026-0003",
  "status": "partially_approved",
  ...
}
```

### Transfer History (`POST /proxy/v2/inventory-transfer/history`)
```json
{
  "id": 226,
  "transfer_id": 226,
  "reference_code": "TRF-806-2026-0016",
  "status": "received",
  ...
}
```

All 3 API endpoints confirmed to return `reference_code` on every transfer object (tested 2026-06-13).

---

*This Intake document is COMPLETE. Proceed to Artifact 2 (Impact Analysis).*
