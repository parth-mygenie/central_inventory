# CR-050 — Gate 2: Impact Analysis

> **ID:** CR-050
> **Artifact:** 2 — Impact Analysis
> **Role:** PLANNING
> **Date:** 2026-10-18
> **Credential used:** owner@mygenietest002.com / Qplazm@10 (RID 828)
> **Code Reality:** PARTIAL — form exists; category grouping, FEFO, burst fix, ceiling fix = NONE
> **Mock Design:** `control/sessions/CR-050_MOCK_DESIGN_REAL_DATA.html`
> **Feeds:** CR-050_ARTIFACT_3_IMPLEMENTATION_PLAN.md (Gate 3)

---

## Conflict Pre-Check (Step 1)

### L7 File Ownership

| File | Last Modifier | Last Item | Risk |
|------|--------------|-----------|------|
| `DirectDispatchForm.jsx` | BUG-036 (2026-06-15), BUG-033 (2026-06-15) | Consumption normalisation; ?item= pre-select | ✅ No open item |
| `SourceSelector.jsx` | CR-023 (2026-06-04) | Source segment picker | ✅ No open item |
| `api.js` | BUG-047 (2026-07-24) | HIGH-RISK file | ✅ No open item |
| `RequestStockForm.jsx` | BUG-036 (2026-06-15) | Consumption normalisation | ✅ No open item |

**Conflict:** NONE. All files last touched June–July 2026. Safe to plan.

**HIGH-RISK flag:** `api.js` + `SourceSelector.jsx` — extra verification required after every edit.

---

## API Probes (Step 1b)

### Probe 1 — stock-inventory?include_segments=true (burst fix key)
```
GET /api/proxy/v2/inventory/stock-inventory?include_segments=true
RID 828 → 75 items
segments_preview present on items with stock > 0

Confirmed segment shape:
{
  "segment_id":         241,
  "batch":              "MAKKHAN-OCT-18",
  "expiry_date":        "2027-01-01",
  "cal_quantity":       2000,
  "display_qty":        2,
  "source_restaurant_id": 828,
  "unit_cost":          80.0
}
```
**RESULT: ✅ CONFIRMED.** `getStockInventory` at `api.js:693` already supports `includeSegments` param — just pass `{ includeSegments: true }` from `DirectDispatchForm.jsx`. No new api.js function needed.

### Probe 2 — getStockInventory signature in api.js
```javascript
// api.js line 693
function _getStockInventory({ includeHierarchy, includeSegments, segmentLimit, includeConsumption } = {}) {
  ...
  if (includeSegments) { params.include_segments = true; if (segmentLimit) params.segment_limit = segmentLimit; }
  ...
}
```
✅ **Already supports `includeSegments`.** The fix in `DirectDispatchForm.jsx` is a 1-word change on the existing call.

### Probe 3 — SourceSelector burst confirmed
```javascript
// SourceSelector.jsx line 33-64
useEffect(() => {
  api.getSourceOptions({ restaurantId, inventoryMasterId })  // fires on every mount
  ...
}, [fromRestaurantId, inventoryMasterId]);
```
With 257 rows all rendered at once, this fires 257× `getSourceOptions` on page load. Cache key includes `inventoryMasterId` — every item is unique → cache never hits. Confirmed burst.

### Probe 4 — initiateTransfer multi-batch (confirmed from intake)
```
POST /inventory-transfer/initiate
Two items with same source_inventory_master_id, different source_selector → accepted
(Failure was INVALID_HIERARCHY not DUPLICATE_ITEM — confirmed multi-batch supported)
```
✅ CONFIRMED. Flat `items[]` array in payload already supports multiple lines per ingredient.

---

## Data Flow Trace (Step 2)

### Current flow (problematic)

```
Page mount → all 257 DispatchItems rendered with included:true
  → each SourceSelector mounts → fires getSourceOptions() per item
  → ~514 concurrent API calls (257×2 render waves)
     ↓
User sees: flat unsorted 257-row table, no categories, spinner on every row
  → Must manually uncheck 240+ items they don't need
  → Must manually click source dropdown on every item
  → Qty suggestions not ceiled to integer (shows 26.7 kg instead of 27 kg)
```

### New flow (CR-050 target)

```
Page mount → getStockInventory({ includeSegments: true }) fetches segments_preview
  → segments_preview mapped to items — NO per-item getSourceOptions calls
  → ZERO burst
     ↓
Display:
  Compact health strip (5 OUT · 18 LOW · 240 OK) instead of 4 big KPI tiles
  Category headers: collapse/expand + Select All / Unselect All
  Status filter pills: ALL / OUT / LOW
  Dual search: category dropdown + item text
     ↓
Storekeeper enters qty in a row (200ms debounce):
  → autoBatch("Tomato") computes FEFO: sort segments by expiry_date ASC
  → auto-fills SourceSelector with earliest non-expired segment
  → tags row with "FEFO" badge
  → if send_qty > single_segment.qty: adds second source line, allocates remainder
     ↓
Submit → initiateTransfer flat items[] (unchanged)
```

---

## Affected Files (Step 2)

### File 1: `DirectDispatchForm.jsx` — FULL REWRITE (~626 lines)

| Section | Current | Change |
|---------|---------|--------|
| Lines 56–74: Initial data load | `getInventoryMaster()` only | ADD `{ includeSegments: true }` to `getStockInventory()` call at line 85 |
| Lines 162, 170: Ceiling | `Math.ceil(x * 100) / 100` | → `Math.ceil(x)` (integer ceiling) |
| Lines ~390–523: Item table | Flat 257-row table, no categories | REPLACE with category-grouped table + health strip + filters |
| SourceSelector usage (line 498) | Mounts on every row → burst | REPLACE with compact `preloadedSegments` prop — no per-item API call |

**New logic blocks (internal to component):**

```javascript
// 1. Category grouping
const grouped = useMemo(() => {
  const g = {};
  dispatchRows.forEach(row => {
    const cat = row.category || "Other";
    (g[cat] = g[cat] || []).push(row);
  });
  return g;
}, [dispatchRows]);

// 2. FEFO auto-select (200ms debounce)
function fefoAutoSelect(item, sendQty, ownStockItem) {
  const segs = (ownStockItem?.segments_preview || [])
    .filter(s => s.segment_id !== null)              // skip un-batched
    .filter(s => !s.expiry_date || new Date(s.expiry_date) > new Date())  // skip expired
    .sort((a, b) => new Date(a.expiry_date || '9999') - new Date(b.expiry_date || '9999'));
  // Greedy allocation across segments
  let remaining = sendQty;
  const allocations = [];
  for (const seg of segs) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Number(seg.display_qty));
    allocations.push({ segment_id: seg.segment_id, qty: take, batch: seg.batch, expiry: seg.expiry_date });
    remaining -= take;
  }
  return { allocations, short: remaining > 0 };
}

// 3. Un-batched detection (Option B)
function isUnbatchedOnly(ownStockItem) {
  const segs = ownStockItem?.segments_preview || [];
  return segs.length > 0 && segs.every(s => s.segment_id === null);
}

// 4. Ceiling fix
// BEFORE: Math.ceil(x * 100) / 100
// AFTER:  Math.ceil(x)
```

**Key state additions:**
```javascript
const [collapsedCats, setCollapsedCats] = useState({});    // category → boolean
const [filterStatus, setFilterStatus] = useState("all");    // "all" | "out" | "low"
const [searchText, setSearchText] = useState("");
const [filterCat, setFilterCat] = useState("all");
```

### File 2: `SourceSelector.jsx` — EXTEND (add `preloadedSegments` prop)

Current: fires `getSourceOptions()` on every mount (burst).

New: when `preloadedSegments` prop is provided, skip the API call entirely and render a compact `<select>` directly.

```javascript
export default function SourceSelector({ ..., preloadedSegments }) {
  // If preloadedSegments provided: skip useEffect, render compact select
  if (preloadedSegments !== undefined) {
    return <CompactSegmentSelect segments={preloadedSegments} value={value} onChange={onChange} />;
  }
  // Otherwise: existing logic (for manual rows where segments not pre-loaded)
  ...
}
```

**Risk:** `SourceSelector` is used across 6+ screens. Adding an opt-in `preloadedSegments` prop is additive — existing screens pass no prop → existing behaviour preserved exactly.

### File 3: `api.js`

**Change at ONE location only:**

| Location | Current | New |
|----------|---------|-----|
| `DirectDispatchForm.jsx` call site (line 85) | `api.getStockInventory()` | `api.getStockInventory({ includeSegments: true })` |

No new api.js function needed. `_getStockInventory` already handles the param.

**Risk:** LOW. `getStockInventory` is cached separately per args — the new call with `{ includeSegments: true }` gets its own cache key and does NOT evict the existing no-segments cache used by other screens.

### File 4: `RequestStockForm.jsx` — 2-line ceiling fix

| Line | Current | New |
|------|---------|-----|
| 176 | `Math.ceil(value * 100) / 100` | `Math.ceil(value)` |
| 189 | `Math.ceil(value * 100) / 100` | `Math.ceil(value)` |

**Blast radius check:** `grep -n "Math.ceil.*100.*100" frontend/src/` → only these 2 files. Fix is contained.

---

## Downstream Consumer Check

| Consumer | Impact |
|----------|--------|
| All screens using `SourceSelector` | **SAFE** — `preloadedSegments` is opt-in; omitting it preserves existing behaviour |
| `getStockInventory` cache | **SAFE** — `{ includeSegments: true }` has separate cache key; other screens unaffected |
| `initiateTransfer` payload | **UNCHANGED** — still flat `items[]` array |
| `RequestStockForm.jsx` | 2-line ceiling fix — no side effects |

---

## Risk Register

| # | Risk | Level | Mitigation |
|---|------|:-----:|-----------|
| R1 | `SourceSelector.jsx` change affects 6+ screens if `preloadedSegments` path has a bug | HIGH | Add `if (preloadedSegments !== undefined)` guard — existing screens that don't pass prop take the existing path |
| R2 | FEFO auto-select fires on qty field changes — if segment data stale, wrong batch selected | MEDIUM | Debounce 200ms; always re-sort live `segments_preview` from latest `ownStock` state |
| R3 | Ceiling fix from 2-decimal to integer may alarm storekeepers seeing qty change | LOW | Integer ceiling is always ≥ 2-decimal ceiling — never reduces qty, only rounds up |
| R4 | Category collapse state lost on dest change (re-fetch resets rows) | LOW | Reset `collapsedCats` state on `selectedDest` change — acceptable behaviour |
| R5 | `segments_preview` empty on items with zero stock — FEFO returns no allocation | LOW | Show "—" in source column; row still visible, storekeeper can manually enter |
| R6 | Multi-batch allocation: when `initiateTransfer` receives 2 lines same `inventoryMasterId` | MEDIUM | Confirmed supported by API probe (OQ-2 resolved). Same item 2× with different `source_selector` accepted. |

---

## Open Questions

**None.** All OQs resolved in Intake (2026-10-18).

| Decision | Confirmed |
|----------|-----------|
| Un-batched Option B | Show info badge + allow bucket dispatch. No block. |
| Ceiling to integer | Yes — `Math.ceil(value)` |
| Burst fix via `include_segments` | Yes — confirmed OQ-2: no server-side cap |
| FEFO auto-fills source select | Yes — 200ms debounce |
| Multi-batch lines in one dispatch | Yes — API accepted |

---

## Scope Lock

**Files WILL change:**
1. `frontend/src/components/central-inventory/DirectDispatchForm.jsx` — full rewrite
2. `frontend/src/components/central-inventory/SourceSelector.jsx` — add `preloadedSegments` prop path
3. `frontend/src/components/central-inventory/RequestStockForm.jsx` — 2-line ceiling fix

**Files will NOT touch:**
- `backend/server.py`
- `frontend/src/services/api.js` — no new function; change is in call site only (in DirectDispatchForm.jsx)
- `frontend/src/lib/terminology.js` (FROZEN)
- `frontend/src/lib/screenVisibility.js` (FROZEN)

---

## Verification Matrix (seeds Gate 6 QA)

| # | Check | How |
|---|-------|-----|
| V1 | Page loads with ZERO `source-options` API calls | Network tab: no calls to `/source-options` on page mount |
| V2 | Items grouped by category with collapse/expand headers | Browser: category headers visible; clicking collapses/expands rows |
| V3 | Select All / Unselect All per category | Browser: "Unselect All" unchecks all rows in category + collapses it |
| V4 | Status filter pills (OUT / LOW / ALL) | Browser: click OUT → only out-of-stock rows visible |
| V5 | Dual search: category filter + text search | Browser: select Vegetables & Herbs + type "Tom" → Tomato rows only |
| V6 | Qty suggestion is integer (not 26.7) | Browser: Tomato suggestion shows `27` not `26.7` |
| V7 | FEFO auto-select fires 200ms after qty entry | Browser: enter qty → source select auto-fills with earliest batch |
| V8 | FEFO badge shown on auto-filled rows | Browser: FEFO auto-filled row shows green "FEFO" badge |
| V9 | Multi-batch: second source line when qty > segment | Browser: enter qty > single batch → second source line appears |
| V10 | Un-batched info badge (Option B) | Browser: item with only `segment_id: null` → info badge, no block |
| V11 | RequestStockForm ceiling fix | Browser: suggestion qty shows integer not 2-decimal |
| V12 | SourceSelector unchanged on other screens | Browser: check TransferDetail, PendingQueues — SourceSelector works as before |
| V13 | Submit dispatches correctly (initiateTransfer unchanged) | Network tab: POST to `/initiate` with flat items[] |

---

## Gate 2 Summary

| Field | Value |
|-------|-------|
| Code reality | PARTIAL |
| Conflict | NONE |
| Files WILL change | 3 (DirectDispatchForm, SourceSelector, RequestStockForm) |
| Files NOT touching | api.js structure, server.py, frozen files |
| Risks | 6 (R1 SourceSelector additive change = HIGH monitored; R6 multi-batch = MEDIUM; rest LOW) |
| API probed | `include_segments=true` confirmed live; `segments_preview` shape confirmed |
| Owner decisions | NONE |
| Verification checks | 13 |

**→ Gate 2 COMPLETE. Mock design built with real RID 828 data.**
