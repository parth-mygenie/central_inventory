# CR-037 — Unified Stock Ledger Adoption (G-005 + G-002/G-003/G-004)

> **Gates:** 2 (Impact Analysis) + 3 (Implementation Plan) — combined
> **Planned:** 2026-07-11 | **Agent:** PLANNING
> **Source:** `AI/openGaps/gap_validation.md` (2026-07-07 retest — all 4 gaps FULLY RESOLVED)
> **Code Reality:** PARTIAL — `HistoryLedger.jsx` Ledger tab exists but derives entries client-side via N+1 (`getTransferHistory` → `getTransferDetails` per id + `getWastageReport`). No consumer of `qty_before/qty_after`, `*_by_name` from ledger rows.

---

## 1. Impact Analysis (Gate 2)

### What backend now provides

`POST /proxy/v2/inventory-transfer/stock-ledger` (verified 2026-07-07):
- Payload: `{restaurant_id, from_date?, to_date?, source_types?:[], page?, limit?}`
- Row: `source_type` (transfer|grn|production|wastage), direction in/out, `ref` (TRF-*/PRD-*/…), `title`, `qty`, `qty_before`, `qty_after` (ints, actor-relative), stable `ledger_id` (e.g. `transfer:243:line:300`)
- Meta: `{source_types:[...], truncated}` + pagination (140 rows / 14 pages on RID 806)
- G-003 `*_by_name` actor fields + G-004 `from/to_restaurant_type/name` confirmed on transfer APIs

Also G-002: `qty_before`/`qty_after` now populated on `GET /inventory-transfer/details/{id}` lines (post-deploy transfers only; pre-deploy = null).

### Data flow (current → target)

```
CURRENT (Ledger tab): getTransferHistory → ids → getTransferDetails × N (N+1!) → deriveLedgerEntries() + getWastageReport → merged client-side ledger
TARGET:               api.getStockLedger({restaurantId, page, sourceTypes}) → rows render directly (1 call, server-paginated)
```

### Affected files

| File | Where | Risk |
|------|-------|:---:|
| `frontend/src/services/api.js` | New `getStockLedger` after `getTransferHistory` (~line 368); export block ~line 1041; invalidation groups lines 116-135 | MEDIUM (HIGH-RISK file, additive only) |
| `frontend/src/components/central-inventory/HistoryLedger.jsx` | `fetchLedgerData` lines 254-286, ledger tab render ~lines 640-800, `deriveLedgerEntries` (lines ~44-120 becomes dead for ledger tab) | HIGH (core screen rewiring) |
| `frontend/src/components/central-inventory/TransferDetail.jsx` | Lines table header ~line 537-545 + line cells | LOW (additive columns) |

### Downstream consumers
- History tab of HistoryLedger keeps `getTransferHistory` — untouched.
- `MOVEMENT_TYPES` map replaced/extended by `source_type` badges (transfer/grn/production/wastage).
- CSV export in HistoryLedger (Download button) must export new row shape.

### Conflict pre-check
- `api.js`: shared with BUG-029→036 (IMPLEMENTED, awaiting QA) and CR-024 cache layer (CLOSED). Additive methods → **parallel-safe**.
- `HistoryLedger.jsx`: last touched CR-025 (reference_code wiring, CLOSED). No open item touches it → clear.
- `TransferDetail.jsx`: last touched CR-023 (CLOSED). Clear.

### Open Questions (owner)
1. Ledger tab: fully replace client-derived ledger with API (recommended), or keep derived view as fallback toggle? **Recommendation: full replace, no fallback.**
2. Pre-deploy transfer rows have null before/after — display "—" (recommended) or hide columns for old rows?

## 2. Implementation Plan (Gate 3)

### Edits

**Edit 1 — api.js: add method (after line 368, `getTransferHistory` block)**
```js
// CR-037 — G-005 unified stock ledger
function _getStockLedger({ restaurantId, fromDate, toDate, sourceTypes, page, limit } = {}) {
  const payload = {};
  if (restaurantId) payload.restaurant_id = restaurantId;
  if (fromDate) payload.from_date = fromDate;
  if (toDate) payload.to_date = toDate;
  if (sourceTypes?.length) payload.source_types = sourceTypes;
  if (page) payload.page = page;
  if (limit) payload.limit = limit;
  return client.post("/proxy/v2/inventory-transfer/stock-ledger", payload);
}
const getStockLedger = _cached("getStockLedger", TTL.SHORT, _getStockLedger);
```

**Edit 2 — api.js: invalidation.** Add `"getStockLedger:"` to `_invalidateTransferCaches()` (line 117-125) AND `_invalidateStockCaches()` (line 128-135) — ledger includes grn/production/wastage rows.

**Edit 3 — api.js: export.** Add `getStockLedger,` next to `getTransferHistory` in the export object (~line 1041).

**Edit 4 — HistoryLedger.jsx: rewire `fetchLedgerData` (lines 254-286).** Replace history-ids → N×`getTransferDetails` + `getWastageReport` with single `api.getStockLedger({ restaurantId, page, sourceTypes: activeSourceFilter, fromDate, toDate })`. Add `page` state + server pagination controls (`meta.total`, 10/page default; request `limit: 25`).

**Edit 5 — HistoryLedger.jsx: ledger table columns.** Source badge (4 types w/ colors), Ref (reference_code via `formatPO`), Item, Direction, Qty, **Before → After** (`qty_before` / `qty_after`, "—" when null), Actor (`*_by_name`), Store badges (`from/to_restaurant_type` via `StoreTypeBadge` — G-004), Date. Update CSV export to same shape.

**Edit 6 — HistoryLedger.jsx: cleanup.** `deriveLedgerEntries()` and wastage-merge logic become unused by the ledger tab — remove (keep History tab logic intact).

**Edit 7 — TransferDetail.jsx: before/after columns (~line 537+).** In lines table, add "Stock Before"/"Stock After" head + cells rendering `line.qty_before`/`line.qty_after` (null-safe "—"). Render only when at least one line has non-null values.

### Execution sequence
api.js (1→3) → TransferDetail (7) → HistoryLedger (4→6). Compile-check between file groups.

### Scope lock
- **WILL change:** `api.js`, `HistoryLedger.jsx`, `TransferDetail.jsx`
- **Will NOT touch:** `terminology.js`, `screenVisibility.js`, `server.py`, PendingQueues, OperationsHub, any PO screen

### Verification Matrix

| # | File | Change | How to Verify | Automated? |
|---|------|--------|---------------|:---:|
| 1 | api.js | getStockLedger method | curl POST `/api/proxy/v2/inventory-transfer/stock-ledger` `{restaurant_id:806,limit:10}` → 200, rows | YES |
| 2 | api.js | Cache invalidation | dispatch a transfer → ledger refetches (no stale) | NO |
| 3 | HistoryLedger | Single-call ledger | Network tab: 1 ledger call (was 10+), rows render | NO |
| 4 | HistoryLedger | source_type filter | Toggle grn/production/wastage filters → filtered rows | NO |
| 5 | HistoryLedger | Before/After + actor + badges | Browser: columns visible, "—" for pre-deploy rows | NO |
| 6 | TransferDetail | qty_before/after cols | Open post-deploy transfer (e.g. TRF-835-2026-0001 id 243) → 46→41 shown | NO |

### Post-code registry checklist
- [ ] registry.json: CR-037 → IMPLEMENTED, artifact_refs updated
- [ ] L3 row updated · L7 files listed · `// CR-037` markers in all 3 files
- [ ] `node control/gen_dashboard_data.js --check` → PASS
