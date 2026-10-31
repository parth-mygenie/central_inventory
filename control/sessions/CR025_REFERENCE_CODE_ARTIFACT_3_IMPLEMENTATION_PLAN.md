# CR-025 — Wire `reference_code` as PO Number: Implementation Plan (Artifact #3)

> **Date:** 2026-06-13
> **CR:** CR-025 (sub-task)
> **Author:** E1
> **Status:** COMPLETE

---

## 1. Execution Strategy

**Single batch** — all changes are low-risk, independent at the file level, and can be made in parallel.
No phased rollout needed.

**Estimated effort:** ~30 minutes (9 files, 19 edit points)

---

## 2. Step-by-Step Plan

### Step 1: Modify `formatPO` signature — `frontend/src/lib/formatters.js`

**Line 68-73.** Add optional second parameter.

```js
// BEFORE
export function formatPO(transferId) {
  if (!transferId) return "PO-XXXX";
  const s = String(transferId);
  const tail = s.slice(-4).toUpperCase();
  return `PO-${tail.padStart(4, "0")}`;
}

// AFTER
export function formatPO(transferId, referenceCode) {
  if (referenceCode) return referenceCode;
  if (!transferId) return "PO-XXXX";
  const s = String(transferId);
  const tail = s.slice(-4).toUpperCase();
  return `PO-${tail.padStart(4, "0")}`;
}
```

**Validation:** Backwards compatible — all existing calls with 1 arg still work identically.

---

### Step 2: Update `PendingQueues.jsx` — 2 call sites

**Line 191** (approval card header):
```js
// BEFORE
{formatPO(id)}
// AFTER
{formatPO(id, item.reference_code)}
```

**Line 325** (simple card):
```js
// BEFORE
{formatPO(id)}
// AFTER
{formatPO(id, item.reference_code)}
```

**Context check:** Both `renderApprovalCard(item)` and `renderSimpleCard(item, idx)` have the full `item` object in scope. `item.reference_code` comes from `pending-queues` API response (verified).

---

### Step 3: Update `TransferDetail.jsx` — 1 call site

**Line 353** (page title):
```js
// BEFORE
<h1 className="text-lg font-bold">{formatPO(data.id || id)}</h1>
// AFTER
<h1 className="text-lg font-bold">{formatPO(data.id || id, data?.reference_code)}</h1>
```

**Context check:** `data` is the normalized transfer object set at line 94. Contains `reference_code` from `details/{id}` API.

---

### Step 4: Update `HistoryLedger.jsx` — 3 call sites + 4 derived entry propagations

#### 4a. Propagate `reference_code` into derived ledger entries

Add `reference_code: t.reference_code,` to each `entries.push({...})` in `deriveLedgerEntries()`:

| Entry Type | Approximate Line | Add After |
|------------|:----------------:|-----------|
| Transfer Out | 79 | After `reference_id: t.id,` |
| Transfer In (received) | 106 | After `reference_id: t.id,` |
| Partial receive | 133 | After `reference_id: t.id,` |
| Cancellation reversal | 158 | After `reference_id: t.id,` |

Each addition is one line: `reference_code: t.reference_code,`

**Note:** `deriveWastageEntries()` (line 178-199) does NOT need this — wastage records have no `reference_code`. The `formatPO` fallback handles this correctly (wastage entries use `reference_type: "Wastage"` and the PO link is not rendered for wastage anyway — line 762 checks `e.reference_id` which is `wastage_id`).

#### 4b. Update display call sites

**Line 444** (CSV export):
```js
// BEFORE
rows.push([formatPO(t.id), ...])
// AFTER
rows.push([formatPO(t.id, t.reference_code), ...])
```

**Line 595** (history table row):
```js
// BEFORE
{formatPO(t.id)}
// AFTER
{formatPO(t.id, t.reference_code)}
```

**Line 770** (stock ledger ref link):
```js
// BEFORE
{formatPO(e.reference_id)}
// AFTER
{formatPO(e.reference_id, e.reference_code)}
```

---

### Step 5: Update `OperationsHub.jsx` — 2 call sites

**Line 478** (today's activity):
```js
// BEFORE
{formatPO(t.id)}
// AFTER
{formatPO(t.id, t.reference_code)}
```

**Line 499** (your latest request):
```js
// BEFORE
{formatPO(latestRequest.id)}
// AFTER
{formatPO(latestRequest.id, latestRequest.reference_code)}
```

---

### Step 6: Update `ApproveWaveDialog.jsx` — 1 call site

**Line 129** (dialog title):
```js
// BEFORE
<DialogTitle>Partial Approve — {formatPO(transfer?.id)}</DialogTitle>
// AFTER
<DialogTitle>Partial Approve — {formatPO(transfer?.id, transfer?.reference_code)}</DialogTitle>
```

---

### Step 7: Update `ReceiveDialog.jsx` — 1 call site

**Line 85** (dialog title):
```js
// BEFORE
<DialogTitle>Receive Transfer {formatPO(transfer?.id)}</DialogTitle>
// AFTER
<DialogTitle>Receive Transfer {formatPO(transfer?.id, transfer?.reference_code)}</DialogTitle>
```

---

### Step 8: Update `DisputeResolutionDialog.jsx` — 1 call site

**Line 40** (dialog title):
```js
// BEFORE
<DialogTitle>Resolve Dispute — {formatPO(transfer?.id)}</DialogTitle>
// AFTER
<DialogTitle>Resolve Dispute — {formatPO(transfer?.id, transfer?.reference_code)}</DialogTitle>
```

---

### Step 9: Clean up dead import — `StockInventorySummary.jsx`

**Line 40:**
```js
// BEFORE
import { formatPO } from "@/lib/formatters";
// AFTER
(line removed — formatPO is not used in this file)
```

---

## 3. Files Changed Summary

| # | File | Lines Changed | Change Type |
|---|------|:------------:|-------------|
| 1 | `lib/formatters.js` | 1 | Add parameter + early return |
| 2 | `PendingQueues.jsx` | 2 | Pass `reference_code` to `formatPO` |
| 3 | `TransferDetail.jsx` | 1 | Pass `reference_code` to `formatPO` |
| 4 | `HistoryLedger.jsx` | 7 | 4 propagations + 3 call site updates |
| 5 | `OperationsHub.jsx` | 2 | Pass `reference_code` to `formatPO` |
| 6 | `ApproveWaveDialog.jsx` | 1 | Pass `reference_code` to `formatPO` |
| 7 | `ReceiveDialog.jsx` | 1 | Pass `reference_code` to `formatPO` |
| 8 | `DisputeResolutionDialog.jsx` | 1 | Pass `reference_code` to `formatPO` |
| 9 | `StockInventorySummary.jsx` | 1 | Remove dead import |
| **Total** | **9 files** | **17 edits** | |

---

## 4. Testing Plan

### 4.1 — Automated Verification (post-implementation)

| # | Test | Method | Expected |
|---|------|--------|----------|
| T1 | Login as master (806) → navigate to Pending Queues | Screenshot | PO column shows `TRF-806-2026-XXXX` format |
| T2 | Click a queue card → TransferDetail page title | Screenshot | Title shows `TRF-806-2026-XXXX` |
| T3 | Navigate to History & Ledger | Screenshot | PO/Ref column shows `TRF-806-2026-XXXX` |
| T4 | Navigate to Operations Hub → Today's Activity | Screenshot | Activity rows show `TRF-806-2026-XXXX` |
| T5 | Switch to Stock Ledger tab → click a ref link | Screenshot | Link text shows `TRF-806-2026-XXXX`, navigates to transfer |
| T6 | Export CSV from History | Curl/manual | CSV PO column has `TRF-806-2026-XXXX` values |
| T7 | Login as franchise (809) → navigate to Operations Hub | Screenshot | "Your Latest Request" shows `TRF-...` format |

### 4.2 — Regression Checks

| # | Check | Expected |
|---|-------|----------|
| R1 | No compilation errors | `webpack compiled` with no new errors |
| R2 | `formatPO("123")` still returns `PO-0123` | Backwards compatible |
| R3 | `formatPO(null)` still returns `PO-XXXX` | Null safety preserved |
| R4 | `formatPO("123", "TRF-806-2026-0001")` returns `TRF-806-2026-0001` | New path works |
| R5 | `formatPO("123", null)` returns `PO-0123` | Null reference_code triggers fallback |
| R6 | `formatPO("123", "")` returns `PO-0123` | Empty string triggers fallback |
| R7 | Cache layer untouched — back-navigation still instant | No performance regression |

---

## 5. Governance Updates (post-implementation)

After successful testing:

1. Update `control/registry.json` → CR-025 status to `CLOSED`, artifact 6 → `DONE`
2. Update `control/L9_OPEN_GAPS_REGISTER.md` → G-013 status to `CLOSED`
3. Run `node control/gen_dashboard_data.js`
4. Verify `node control/gen_dashboard_data.js --check`
5. Update `control/L1_CONTROL_DASHBOARD.md` → remove CR-025 from "Owner Signoff Pending"
6. Update `control/L6_SPRINT_STATUS.md` → CR-025 status to CLOSED
7. Update `control/L7_FILE_OWNERSHIP.md` → add `formatters.js` edit note

---

## 6. Rollback Plan

If `reference_code` causes unexpected issues:
- Revert `formatPO` to remove the 2nd parameter
- All call sites with 2 args will silently ignore the extra arg (JS doesn't error on extra args)
- Alternatively: set the `referenceCode` early-return condition to `false` to disable without removing calls

**Rollback effort:** < 2 minutes (single line change in `formatters.js`)

---

*This Implementation Plan is COMPLETE. Proceed to Artifact 4 (Code Gate) for final review before implementation.*
