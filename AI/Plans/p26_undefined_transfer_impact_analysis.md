# P26 Backend Change Impact Analysis — `undefined` Transfer Navigation Bug

> **Date:** 9 June 2026
> **Scope:** Analysis only — no code changes
> **Root Cause:** POS API `POST /inventory-transfer/history` response schema changed as part of G-013 backend fix
> **Symptom:** Clicking "View" on History & Ledger navigates to `/transfer/undefined`, shows "Transfer not found"

---

## 1. Root Cause

The POS API backend changes for G-013 (reference codes) **also changed the response schema** for the `/inventory-transfer/history` endpoint.

### Field Rename: `id` → `transfer_id`

**Before (pre-G013):**
```json
{
  "id": 177,
  "type": "dispatch",
  "status": "dispatched",
  "from_restaurant_id": 798,
  "to_restaurant_id": 799,
  "items_count": 1,
  "from_restaurant_name": "Tokyo Garden",
  "to_restaurant_name": "Kyoto Garden",
  "dispatched_at": "2026-06-09 20:11:08",
  "received_at": null,
  ...14+ more fields
}
```

**After (post-G013):**
```json
{
  "transfer_id": 177,
  "reference_code": "TRF-2026-0004",
  "type": "dispatch",
  "status": "dispatched",
  "from_restaurant_id": 798,
  "to_restaurant_id": 799,
  "created_at": "2026-06-09 20:11:08",
  "updated_at": "2026-06-09 20:11:08"
}
```

### Fields Removed (14 fields dropped)

| Field | Was Used By | Impact |
|-------|-------------|--------|
| `id` | Navigation, key, PO display, search, CSV, ledger | 🔴 **CRITICAL** — causes `/transfer/undefined` |
| `items_count` | History table "Items" column | 🟡 Shows "—" for all rows |
| `from_restaurant_name` | Source column, search, CSV, name map | 🟡 Falls back to `restaurantMap` (works if hierarchy loaded) |
| `to_restaurant_name` | Destination column, search, CSV, name map | 🟡 Same fallback |
| `dispatched_at` | todayActivity filter, ledger dates | 🟡 Falls back to `created_at` |
| `received_at` | todayActivity filter, ledger dates | 🟡 Falls back to `created_at`/`updated_at` |
| `cancelled_at` | Ledger dates | 🟡 Falls back to `updated_at` |
| `requested_by` | Ledger | ⚪ Low — not displayed |
| `approved_by` | Ledger | ⚪ Low |
| `dispatched_by` | Ledger | ⚪ Low |
| `received_by` | Ledger | ⚪ Low |
| `cancelled_by` | Ledger | ⚪ Low |
| `resolution_meta` | Ledger derivation | 🟡 Ledger tab won't show entries |
| `lines` | Ledger derivation (if pre-fetched) | 🟡 Ledger tab needs separate detail calls |

### Fields Added (2 new)

| Field | Value Example |
|-------|---------------|
| `reference_code` | `TRF-2026-0004` |
| `transfer_id` | `177` (replaces `id`) |

### Pending-Queues: Same rename

| Field | Before | After |
|-------|--------|-------|
| ID field | `id` | `transfer_id` |
| Item count | `items_count` | `line_count` |
| New | — | `reference_code` |

**Note:** `PendingQueues.jsx` already has `item.id || item.transfer_id` fallback (line 154), so it is **partially protected**. But `items_count` → `line_count` rename is NOT handled.

### Details Endpoint: UNCHANGED

`GET /inventory-transfer/details/{id}` still returns `transfer.id` (not `transfer_id`). No change needed for TransferDetail.jsx.

---

## 2. Affected Components — Line-by-Line Impact

### 🔴 HistoryLedger.jsx (14 broken references)

| Line | Code | Issue | Severity |
|:----:|------|-------|:--------:|
| 79 | `reference_id: t.id` | Ledger entry has `null` reference_id | 🔴 |
| 106 | `reference_id: t.id` | Same | 🔴 |
| 133 | `reference_id: t.id` | Same | 🔴 |
| 158 | `reference_id: t.id` | Same | 🔴 |
| 256 | `historyData.map((t) => t.id).filter(Boolean)` | **ALL ids filtered out** → ledger tab fetches 0 details | 🔴 |
| 263 | `.filter((t) => t.id \|\| t.lines)` | All filtered out — no transfers pass | 🔴 |
| 354 | `String(t.id).includes(q)` | Search by ID broken | 🟡 |
| 444 | `formatPO(t.id)` + `t.items_count` + `t.from_restaurant_name` | CSV export broken | 🟡 |
| 590 | `key={t.id}` | React key is `undefined` — causes rendering bugs | 🔴 |
| 591 | `data-testid={\`history-row-${t.id}\`}` | Test IDs broken | 🟡 |
| **593** | **`navigate(\`/transfer/${t.id}\`)`** | **THE BUG — navigates to `/transfer/undefined`** | 🔴 |
| 595 | `formatPO(t.id)` | PO column shows "PO-XXXX" for all | 🔴 |
| 605 | `formatItemsCount(t.items_count)` | Items column shows "—" | 🟡 |
| 617 | `data-testid={\`view-detail-${t.id}\`}` | Test IDs broken | 🟡 |

### 🔴 OperationsHub.jsx (5 broken references)

| Line | Code | Issue | Severity |
|:----:|------|-------|:--------:|
| 452 | `t.dispatched_at \|\| t.received_at \|\| t.created_at` | Falls back to `created_at` (acceptable) | 🟡 |
| 456 | `key={t.id \|\| idx}` | Falls back to `idx` (works) | ⚪ |
| **459** | **`navigate(\`/transfer/${t.id}\`)`** | **Navigates to `/transfer/undefined`** | 🔴 |
| 478 | `formatPO(t.id)` | Shows "PO-XXXX" | 🔴 |
| **493** | **`navigate(\`/transfer/${latestRequest.id}\`)`** | **Navigates to `/transfer/undefined`** | 🔴 |
| 499 | `formatPO(latestRequest.id)` | Shows "PO-XXXX" | 🔴 |

### 🟢 PendingQueues.jsx (already protected)

| Line | Code | Status |
|:----:|------|:------:|
| 78 | `t.id \|\| t.transfer_id` | ✅ Protected |
| 84 | `approvals[i]?.id \|\| approvals[i]?.transfer_id` | ✅ Protected |
| 154 | `item.id \|\| item.transfer_id` | ✅ Protected |
| 315 | `item.id \|\| item.transfer_id` | ✅ Protected |
| 331 | `formatItemsCount(item.items_count)` | 🟡 Should use `item.line_count` fallback |

### 🟢 TransferDetail.jsx (not affected)

- Gets `id` from URL params (`useParams`)
- Details API still returns `transfer.id`
- Only issue: if navigated with `/transfer/undefined`, API returns 404 (correct)

### 🟡 useStockIntelligence.js (partial impact)

| Line | Code | Issue |
|:----:|------|-------|
| 78 | `t.dispatched_at \|\| t.received_at \|\| t.created_at` | `dispatched_at` and `received_at` now missing — falls back to `created_at`. todayActivity filter for dispatched/received items may miss items or include wrong ones |

### 🟡 api.js normalizeTransfer (line 153)

```js
if (raw.transfer && !raw.status && !raw.id) {
```

This condition checks `!raw.id` — for history items that now lack `id`, this could affect normalization. However, history items don't have `raw.transfer` so this branch isn't triggered. **No impact on history flow**, but worth noting.

---

## 3. Fix Approach (analysis only — no implementation)

### Option A: Frontend normalizer (recommended)

Add an early normalizer in `api.js` `_getTransferHistory` that maps `transfer_id` → `id` and `line_count` → `items_count` before the data reaches components:

```
// Pseudocode
data.forEach(item => {
  if (item.transfer_id && !item.id) item.id = item.transfer_id;
  if (item.line_count != null && item.items_count == null) item.items_count = item.line_count;
});
```

This is the **minimal, lowest-risk fix** — one location, all downstream consumers work.

### Option B: Component-level fallbacks

Add `t.id || t.transfer_id` at every usage site (14+ locations in HistoryLedger, 5 in OperationsHub). Higher risk, more churn.

### Missing fields mitigation

| Missing Field | Mitigation |
|---------------|-----------|
| `from_restaurant_name` / `to_restaurant_name` | Already has `restaurantMap` fallback — works |
| `items_count` | Map from `line_count` in normalizer, or accept "—" |
| `dispatched_at` / `received_at` | Falls back to `created_at` — acceptable |
| `resolution_meta` / actor fields | Ledger tab already fetches full details via `getTransferDetails()` per ID — **BUT line 256 `historyData.map((t) => t.id)` returns all `undefined`**, so 0 details are fetched. Fixing the `id` mapping fixes this too. |

---

## 4. Summary

| Finding | Severity | Affected |
|---------|:--------:|----------|
| `id` renamed to `transfer_id` in history + queues | 🔴 Critical | HistoryLedger, OperationsHub, useStockIntelligence |
| `items_count` removed (now `line_count` in queues, missing in history) | 🟡 Medium | HistoryLedger, PendingQueues |
| 14 fields dropped from history response | 🟡 Medium | Ledger tab, CSV export, search |
| `reference_code` added | ✅ New feature | Can be used for PO display (replace `formatPO`) |
| PendingQueues already protected | ✅ OK | Has `item.id \|\| item.transfer_id` fallback |
| TransferDetail not affected | ✅ OK | Details endpoint unchanged |

### Minimum fix scope

**1 file, 1 function:** Add `transfer_id → id` mapping in `api.js` `_getTransferHistory()` normalizer. This fixes:
- Navigation (no more `/transfer/undefined`)
- PO display (no more "PO-XXXX")
- Ledger tab (detail fetching works again)
- Search by ID
- CSV export
- React keys
- Test IDs

**Optional:** Also map `line_count → items_count` to fix Items column.
