# CR-025 — Wire `reference_code` as PO Number: Impact Analysis (Artifact #2)

> **Date:** 2026-06-13
> **CR:** CR-025 (sub-task)
> **Author:** E1
> **Status:** COMPLETE

---

## 1. Change Classification

| Aspect | Value |
|--------|-------|
| **Change type** | Display-layer data wiring (frontend only) |
| **Risk level** | LOW — backwards-compatible function signature change + prop threading |
| **API changes** | NONE — reading existing field |
| **Cache impact** | NONE — no new cache keys, no invalidation changes |
| **Backend changes** | NONE — `server.py` untouched |
| **New dependencies** | NONE |
| **New files** | NONE |
| **Deleted files** | NONE |

---

## 2. File-Level Impact Map

### 2.1 — `frontend/src/lib/formatters.js` (line 68-73)

**Current:**
```js
export function formatPO(transferId) {
  if (!transferId) return "PO-XXXX";
  const s = String(transferId);
  const tail = s.slice(-4).toUpperCase();
  return `PO-${tail.padStart(4, "0")}`;
}
```

**Change:** Add optional second parameter `referenceCode`. If provided and truthy, return it directly. Otherwise fall back to existing logic.

**Risk:** NONE — additive parameter, all 15 existing call sites continue to work without the 2nd arg until updated.

---

### 2.2 — `frontend/src/components/central-inventory/PendingQueues.jsx`

| Call Site | Line | Current | Data Source | Change |
|-----------|:----:|---------|-------------|--------|
| Approval card header | 191 | `formatPO(id)` | `item` from `pending-queues` API → has `item.reference_code` | `formatPO(id, item.reference_code)` |
| Simple card (dispatch/receive) | 325 | `formatPO(id)` | `item` from `pending-queues` API → has `item.reference_code` | `formatPO(id, item.reference_code)` |

**Data flow:** `renderApprovalCard(item)` extracts `id = item.id || item.transfer_id`. The `item` object is the raw queue entry from `approval_pending[]` — confirmed to carry `reference_code`. Similarly, `renderSimpleCard(item, idx)` has the same `item` shape.

**Risk:** LOW — `item.reference_code` is undefined on legacy transfers → falls back gracefully.

---

### 2.3 — `frontend/src/components/central-inventory/TransferDetail.jsx`

| Call Site | Line | Current | Data Source | Change |
|-----------|:----:|---------|-------------|--------|
| Page title | 353 | `formatPO(data.id \|\| id)` | `data` from `getTransferDetails(id)` → normalized transfer object → has `data.reference_code` | `formatPO(data.id \|\| id, data?.reference_code)` |

**Data flow:** `data` is set at line 94: `const transfer = resp.data?.data || resp.data`. Passes through `normalizeTransfer()` which does NOT strip any fields — it only enriches. So `reference_code` survives normalization.

**Risk:** NONE.

---

### 2.4 — `frontend/src/components/central-inventory/HistoryLedger.jsx`

| Call Site | Line | Current | Data Source | Change |
|-----------|:----:|---------|-------------|--------|
| CSV export | 444 | `formatPO(t.id)` | `t` from `getTransferHistory()` → has `t.reference_code` | `formatPO(t.id, t.reference_code)` |
| History table row | 595 | `formatPO(t.id)` | Same `t` | `formatPO(t.id, t.reference_code)` |
| Stock ledger ref link | 770 | `formatPO(e.reference_id)` | `e` is a **derived** ledger entry — does NOT currently carry `reference_code` | Requires propagation (see §2.4.1) |

#### 2.4.1 — Derived Ledger Entry Propagation

The `deriveLedgerEntries(transfers, restaurantId, restaurantMap)` function (lines 28-171) constructs synthetic `e` objects from transfer data. Each `entries.push({...})` call sets:
```js
reference_id: t.id,
```

The parent `t` object (from `getTransferHistory()`) carries `t.reference_code`. But the derived entry does NOT propagate it.

**Fix:** Add `reference_code: t.reference_code` to every `entries.push({...})` call inside `deriveLedgerEntries`:
- Line 79: Transfer Out entry → add `reference_code: t.reference_code`
- Line 106: Transfer In (received) → add `reference_code: t.reference_code`
- Line 133: Partial receive → add `reference_code: t.reference_code`
- Line 158: Cancellation reversal → add `reference_code: t.reference_code`

Then at line 770, change to: `formatPO(e.reference_id, e.reference_code)`

**Wastage entries** (line 178-199, `deriveWastageEntries`) do NOT have `reference_code` — they're wastage records, not transfers. They will get `undefined` for `reference_code`, which correctly falls back to `formatPO(wastage_id)`. No change needed.

**Risk:** LOW — 4 identical additions of one property to the entry object.

---

### 2.5 — `frontend/src/components/central-inventory/OperationsHub.jsx`

| Call Site | Line | Current | Data Source | Change |
|-----------|:----:|---------|-------------|--------|
| Today's Activity row | 478 | `formatPO(t.id)` | `t` from `recentHistory` (history API) → has `t.reference_code` | `formatPO(t.id, t.reference_code)` |
| Your Latest Request | 499 | `formatPO(latestRequest.id)` | `latestRequest` derived from `recentHistory` at line 141-147 → same `t` objects → has `reference_code` | `formatPO(latestRequest.id, latestRequest.reference_code)` |

**Risk:** NONE.

---

### 2.6 — `frontend/src/components/central-inventory/ApproveWaveDialog.jsx`

| Call Site | Line | Current | Data Source | Change |
|-----------|:----:|---------|-------------|--------|
| Dialog title | 129 | `formatPO(transfer?.id)` | `transfer` prop passed from `TransferDetail.jsx` → same normalized object → has `reference_code` | `formatPO(transfer?.id, transfer?.reference_code)` |

**Risk:** NONE.

---

### 2.7 — `frontend/src/components/central-inventory/ReceiveDialog.jsx`

| Call Site | Line | Current | Data Source | Change |
|-----------|:----:|---------|-------------|--------|
| Dialog title | 85 | `formatPO(transfer?.id)` | `transfer` prop from `TransferDetail.jsx` → has `reference_code` | `formatPO(transfer?.id, transfer?.reference_code)` |

**Risk:** NONE.

---

### 2.8 — `frontend/src/components/central-inventory/DisputeResolutionDialog.jsx`

| Call Site | Line | Current | Data Source | Change |
|-----------|:----:|---------|-------------|--------|
| Dialog title | 40 | `formatPO(transfer?.id)` | `transfer` prop from `TransferDetail.jsx` → has `reference_code` | `formatPO(transfer?.id, transfer?.reference_code)` |

**Risk:** NONE.

---

### 2.9 — `frontend/src/components/central-inventory/StockInventorySummary.jsx`

| Change | Line | Current | Fix |
|--------|:----:|---------|-----|
| Dead import cleanup | 40 | `import { formatPO } from "@/lib/formatters"` | Remove unused import |

**Risk:** NONE — `formatPO` is imported but never called in JSX.

---

### 2.10 — `frontend/src/components/common/PostSubmitConfirmation.jsx`

| Decision | Reason |
|----------|--------|
| **NO CHANGE** | Only called from `AddStockPurchaseForm.jsx` (procurement). The component receives `transferId` prop which is not set (procurement has no transfer). `reference_code` is not applicable. Adding a `referenceCode` prop would be dead code. |

---

## 3. Data Flow Diagram

```
API Response                    Frontend Component              Display
─────────────                   ──────────────────              ───────
pending-queues
 └─ item.reference_code ──────► PendingQueues.jsx ──► formatPO(id, reference_code) ──► "TRF-806-2026-0003"

details/{id}
 └─ transfer.reference_code ──► TransferDetail.jsx ──► formatPO(id, reference_code) ──► "TRF-806-2026-0003"
                                  │
                                  ├──► ApproveWaveDialog (prop) ──► formatPO(id, reference_code)
                                  ├──► ReceiveDialog (prop) ──► formatPO(id, reference_code)
                                  └──► DisputeResolutionDialog (prop) ──► formatPO(id, reference_code)

history
 └─ t.reference_code ──────────► HistoryLedger.jsx ──► formatPO(id, reference_code) ──► "TRF-806-2026-0016"
 │                                  │
 │                                  └──► deriveLedgerEntries() ──► e.reference_code ──► formatPO(ref_id, reference_code)
 │
 └─ t.reference_code ──────────► OperationsHub.jsx ──► formatPO(id, reference_code) ──► "TRF-806-2026-0016"


Legacy transfer (reference_code = null/undefined)
 └──────────────────────────────► Any component ──► formatPO(id, undefined) ──► "PO-0209" (fallback)
```

---

## 4. Files NOT Touched (and Why)

| File | Reason |
|------|--------|
| `backend/server.py` | Proxy-only. `reference_code` passes through unmodified. |
| `frontend/src/services/api.js` | `reference_code` already survives normalization. Cache layer unaffected. |
| `frontend/src/lib/terminology.js` | FROZEN. Not relevant to this change. |
| `frontend/src/lib/screenVisibility.js` | FROZEN. Not relevant. |
| `frontend/src/hooks/useLoginContext.js` | No transfer data. |
| `frontend/src/components/common/PostSubmitConfirmation.jsx` | Not used with transfers. |
| `frontend/src/components/central-inventory/RequestStockForm.jsx` | Doesn't display PO numbers. |
| `frontend/src/components/central-inventory/DirectDispatchForm.jsx` | Doesn't display PO numbers. |

---

## 5. Risk Assessment Summary

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|------------|
| `reference_code` missing on legacy transfers | CERTAIN (for pre-existing data) | NONE | Fallback to `PO-XXXX` format in `formatPO` |
| Derived ledger entries miss `reference_code` | WOULD OCCUR if not propagated | LOW (cosmetic) | Explicitly add `reference_code: t.reference_code` to 4 `entries.push()` calls |
| `normalizeTransfer()` strips `reference_code` | IMPOSSIBLE | — | Verified: `normalizeTransfer` only adds fields, never strips |
| Breaking existing call sites | IMPOSSIBLE | — | New param is optional, default `undefined` → triggers fallback |
| Cache stale with old data (no `reference_code`) | LOW | COSMETIC | Cache TTL is 30-60s. Fresh data always has `reference_code`. |

**Overall risk: LOW. Pure display-layer threading of an existing API field.**

---

*This Impact Analysis is COMPLETE. Proceed to Artifact 3 (Implementation Plan).*
