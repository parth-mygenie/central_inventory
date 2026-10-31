# CR-050 — Gate 2: Impact Analysis (Complete)

> **ID:** CR-050
> **Artifact:** 2 — Impact Analysis
> **Role:** PLANNING
> **Date:** 2026-10-18 (initial) / 2026-10-19 (completed with mock findings)
> **Credential used:** owner@mygenietest002.com / Qplazm@10 (RID 828)
> **Code Reality:** PARTIAL — form exists; category grouping, FEFO, burst fix, ceiling fix = NONE
> **Mock Design:** `control/sessions/CR-050_MOCK_DESIGN_REAL_DATA.html`
> **Public URL:** https://central-inventory-11.preview.emergentagent.com/CR-050_MOCK_DESIGN_REAL_DATA.html
> **Feeds:** CR-050_ARTIFACT_3_IMPLEMENTATION_PLAN.md (Gate 3)

---

## Conflict Pre-Check (Step 1)

### L7 File Ownership

| File | Last Modifier | Last Item | Risk |
|------|--------------|-----------|------|
| `DirectDispatchForm.jsx` | BUG-036 (2026-06-15), BUG-033 (2026-06-15) | Consumption normalisation; `?item=` pre-select | ✅ No open item |
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
  "segment_id":           241,
  "batch":                "MAKKHAN-OCT-18",
  "expiry_date":          "2027-01-01",
  "cal_quantity":         2000,
  "display_qty":          2,
  "source_restaurant_id": 828,
  "unit_cost":            80.0
}
```
**RESULT: ✅ CONFIRMED.** `getStockInventory` at `api.js:693` already supports `includeSegments` param — pass `{ includeSegments: true }` from `DirectDispatchForm.jsx`. No new api.js function needed.

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
With 257 rows all rendered at once → 257× `getSourceOptions` fire on page load. Cache key includes `inventoryMasterId` — every item unique → cache never hits. Burst confirmed.

### Probe 4 — initiateTransfer multi-batch (confirmed from intake)
```
POST /inventory-transfer/initiate
Two items with same source_inventory_master_id, different source_selector → ACCEPTED
(Failure was INVALID_HIERARCHY not DUPLICATE_ITEM — multi-batch confirmed supported)
```
✅ CONFIRMED. Flat `items[]` array already supports multiple lines per ingredient.

---

## Data Flow Trace (Step 2)

### Current flow (problematic)
```
Page mount → all 257 DispatchItems rendered with included:true
  → each SourceSelector mounts → fires getSourceOptions() per item
  → ~514 concurrent API calls (257×2 render waves)
     ↓
User sees: flat unsorted 257-row table, no categories, spinner on every row
  → Must manually uncheck 240+ items
  → Must manually click source dropdown on every item
  → Qty suggestions show 26.7 kg instead of 27 kg (2-decimal ceiling)
```

### New flow (CR-050 target)
```
Page mount → getStockInventory({ includeSegments: true })
  → segments_preview mapped to items — ZERO getSourceOptions calls
     ↓
Display:
  Compact health strip (6 OUT · 7 LOW · 58 OK) — replaces 4 KPI tiles
  Category headers: collapse/expand + Select All/Unselect All per category
  Status filter pills: ALL / OUT / LOW
  Searchable category combobox + item text search
     ↓
All rows DEFAULT UNCHECKED — storekeeper reviews suggestions and ticks what to dispatch
Row click (anywhere except interactive elements) → toggles checkbox
     ↓
Storekeeper enters qty → FEFO auto-select (200ms debounce):
  Sort segments by expiry_date ASC → greedy allocate → fill source select
  Tag row with green "FEFO" badge
  If send_qty > single_segment.qty → add second source line, allocate remainder
     ↓
Submit → initiateTransfer flat items[] (payload unchanged)
```

---

## Affected Files (Step 2)

### File 1: `DirectDispatchForm.jsx` — FULL REWRITE (~626 lines)

| Section | Current | Change |
|---------|---------|--------|
| Lines 56–74: data load | `getInventoryMaster()` only | ADD `{ includeSegments: true }` to `getStockInventory()` at line 85 |
| Lines 162, 170: ceiling | `Math.ceil(x * 100) / 100` | → `Math.ceil(x)` |
| Lines ~390–523: item table | Flat 257-row, no categories | Category-grouped table + health strip + filters |
| SourceSelector (line 498) | Mounts per row → burst | Compact `preloadedSegments` prop — no per-item API call |

**New logic blocks:**

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

// 2. Default unchecked (R7)
// rows initialised with included: false
// preserve across re-renders:
const existing = dispatchRows.find(r => r.id === item.id);
included: existing ? existing.included : false

// 3. Row click toggles checkbox (R8)
function handleRowClick(event, id) {
  const tag = event.target.tagName;
  if (['INPUT','SELECT','BUTTON','A','OPTION'].includes(tag)) return;
  updateDispatchRow(id, 'included', !row.included);
}

// 4. FEFO auto-select (200ms debounce)
function fefoAutoSelect(item, sendQty, ownStockItem) {
  const segs = (ownStockItem?.segments_preview || [])
    .filter(s => s.segment_id !== null)
    .filter(s => !s.expiry_date || new Date(s.expiry_date) > new Date())
    .sort((a, b) => new Date(a.expiry_date || '9999') - new Date(b.expiry_date || '9999'));
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

// 5. Un-batched detection (Option B)
function isUnbatchedOnly(ownStockItem) {
  const segs = ownStockItem?.segments_preview || [];
  return segs.length > 0 && segs.every(s => s.segment_id === null);
}

// 6. Ceiling fix
// BEFORE: Math.ceil(x * 100) / 100
// AFTER:  Math.ceil(x)
```

**Key state additions:**
```javascript
const [collapsedCats, setCollapsedCats] = useState({});
const [filterStatus, setFilterStatus]   = useState("all");   // "all" | "out" | "low"
const [searchText,   setSearchText]     = useState("");
const [filterCat,    setFilterCat]      = useState("all");   // drives searchable combobox
```

**Search auto-expand (R11):**
```javascript
// When searchText is non-empty, force-expand any collapsed category that has matches
if (searchText) {
  Object.keys(matchingGroups).forEach(cat => {
    setCollapsedCats(prev => { const n = {...prev}; delete n[cat]; return n; });
  });
}
```

**masterSelect behaviour (R12):**
```javascript
// Master Select All / Unselect All — pure check/uncheck, no collapse side-effect
function handleMasterSelect(select) {
  setDispatchRows(rows => rows.map(r => ({ ...r, included: select })));
  // do NOT touch collapsedCats
}
```

**Per-category Select All / Unselect All collapse (R13):**
```javascript
// Category-level Unselect All → also collapses that section
function handleCategorySelect(cat, select) {
  setDispatchRows(rows => rows.map(r => r.category === cat ? { ...r, included: select } : r));
  if (!select) setCollapsedCats(prev => ({ ...prev, [cat]: true }));
  else setCollapsedCats(prev => { const n = {...prev}; delete n[cat]; return n; });
}
```

**tabindex="-1" on non-tab-target elements (R10):**
All of the following must have `tabIndex={-1}`:
- Category header `<div>` (collapse toggle)
- Per-category "Select All" / "Unselect All" `<button>`
- Master "Select All" / "Unselect All" `<button>` in toolbar
- `+ split across another batch` `<button>` in source cell
- Row checkbox itself (row-click is the primary interaction; explicit checkbox click still works)

Tab order must flow: `qty input → source select → [skip all header buttons] → next row's qty input`

---

### File 2: `SourceSelector.jsx` — EXTEND (add `preloadedSegments` prop)

```javascript
export default function SourceSelector({ ..., preloadedSegments }) {
  if (preloadedSegments !== undefined) {
    return <CompactSegmentSelect segments={preloadedSegments} value={value} onChange={onChange} />;
  }
  // Existing logic — unchanged for all other callers
}
```

**CompactSegmentSelect** renders a single `<select>` with one `<option>` per segment:
```
AME-18OCT26-1423 (4 kg) — exp 2027-02-01
```
No Segment/Bucket toggle buttons. Mode inferred: `segment_id` mode if segment has `segment_id !== null`, else `filter_bucket`.

**Risk:** Additive only — 6+ other screens omit `preloadedSegments` → existing path unchanged.

---

### File 3: `api.js` — call-site change only

| Location | Current | New |
|----------|---------|-----|
| `DirectDispatchForm.jsx` line 85 | `api.getStockInventory()` | `api.getStockInventory({ includeSegments: true })` |

No new function. Cache key `getStockInventory:{includeSegments:true}` is separate from `getStockInventory:{}` — other screens unaffected.

---

### File 4: `RequestStockForm.jsx` — 2-line ceiling fix

| Line | Current | New |
|------|---------|-----|
| 176 | `Math.ceil(value * 100) / 100` | `Math.ceil(value)` |
| 189 | `Math.ceil(value * 100) / 100` | `Math.ceil(value)` |

---

## Mock-Session Refinements (R7–R15)

These were discovered during 10+ mock design iterations and are **required implementation details** for Gate 3:

| # | Finding | Impl impact |
|---|---------|------------|
| R7 | Rows default to `included: false` — storekeeper opts in, not opt out | State init |
| R8 | Row click toggles checkbox; guard: skip INPUT/SELECT/BUTTON/A/OPTION tags | `onClick` on `<tr>` |
| R9 | Category filter = searchable `position:fixed` combobox (not `<select>`) — avoids overflow clip | New sub-component `CategoryCombobox` |
| R10 | `tabIndex={-1}` on cat header, per-cat buttons, master buttons, split button | Props on all those elements |
| R11 | Search active → auto-expand collapsed categories with matches | `useEffect` on `searchText` |
| R12 | `masterSelect(false)` = pure uncheck, no collapse | State setter only |
| R13 | Per-category "Unselect All" = uncheck + collapse that category | State setter + collapsedCats update |
| R14 | `CategoryCombobox` keyboard: Enter = select first, ArrowDown = nav, ArrowUp first → search, Esc = close | `onKeyDown` handlers |
| R15 | `filterCat` state replaces `<select>` value; `getFilteredRows()` reads from state not DOM | Remove DOM read pattern |

---

## Downstream Consumer Check

| Consumer | Impact |
|----------|--------|
| All screens using `SourceSelector` | **SAFE** — `preloadedSegments` opt-in; omitting preserves existing |
| `getStockInventory` cache | **SAFE** — separate cache key; other screens unaffected |
| `initiateTransfer` payload | **UNCHANGED** — flat `items[]` |
| `RequestStockForm.jsx` | 2-line ceiling fix — no side effects |

---

## Risk Register

| # | Risk | Level | Mitigation |
|---|------|:-----:|-----------|
| R1 | `SourceSelector.jsx` change affects 6+ screens | HIGH | `if (preloadedSegments !== undefined)` guard — additive only |
| R2 | FEFO segment data stale if re-fetch not triggered | MEDIUM | Always re-sort from latest `ownStock` state; debounce 200ms |
| R3 | Ceiling fix: integer qty surprises storekeeper | LOW | Integer ceiling ≥ 2-decimal ceiling — never reduces qty |
| R4 | Collapse state lost on dest change | LOW | Reset `collapsedCats` on `selectedDest` change — acceptable |
| R5 | `segments_preview` empty on zero-stock items | LOW | Show "—" in source column; row still visible |
| R6 | Multi-batch `initiateTransfer` same `inventoryMasterId` | MEDIUM | Confirmed API probe: accepted |
| R7 | `CategoryCombobox` uses `position:fixed` — must recalculate on scroll/resize | LOW | Recalculate `getBoundingClientRect()` on each open; close on scroll |
| R8 | Row `onClick` on `<tr>` — must not fire when storekeeper adjusts qty | LOW | Tag guard: skip INPUT/SELECT/BUTTON/A/OPTION |

---

## Open Questions

**None.** All OQs resolved in Intake + Mock sessions.

| Decision | Confirmed |
|----------|-----------|
| Un-batched Option B | Info badge + allow bucket dispatch. No block. |
| Ceiling to integer | `Math.ceil(value)` |
| Burst fix via `include_segments` | Confirmed live; no server cap |
| FEFO auto-fills source | 200ms debounce |
| Multi-batch | API accepted |
| Default row state | `included: false` — storekeeper opts in |
| Row click toggles checkbox | Yes — guard on interactive element tags |
| Category filter as searchable combobox | Yes — `position:fixed`, keyboard nav |

---

## Scope Lock

**Files WILL change:**
1. `frontend/src/components/central-inventory/DirectDispatchForm.jsx` — full rewrite
2. `frontend/src/components/central-inventory/SourceSelector.jsx` — add `preloadedSegments` prop path
3. `frontend/src/components/central-inventory/RequestStockForm.jsx` — 2-line ceiling fix

**New sub-components (in `DirectDispatchForm.jsx` file or split):**
- `CategoryCombobox` — searchable category picker with keyboard nav
- `DispatchRow` — single table row with row-click, FEFO source, allocation status
- `HealthStrip` — compact OUT/LOW/OK counts (replaces 4 KPI tiles)

**Files will NOT touch:**
- `backend/server.py`
- `frontend/src/services/api.js` (call-site change is in DirectDispatchForm, not in api.js itself)
- `frontend/src/lib/terminology.js` (FROZEN)
- `frontend/src/lib/screenVisibility.js` (FROZEN)

---

## Verification Matrix (seeds Gate 6 QA) — 22 checks

| # | Check | How |
|---|-------|-----|
| V1 | Zero `source-options` API calls on page load | Network tab: no `/source-options` requests |
| V2 | Items grouped by category headers | Category name, item count, OUT/LOW badges visible |
| V3 | Collapse/expand per category header | Click header → rows hide/show |
| V4 | Per-category Select All / Unselect All | Unselect All unchecks all rows in category + collapses it |
| V5 | Master Select All / Unselect All (toolbar) | Checks/unchecks ALL rows; does NOT collapse any category |
| V6 | Status filter pills ALL / OUT / LOW | Click OUT → only out-of-stock rows visible |
| V7 | Category searchable combobox | Click trigger → search input + list opens; type "veg" → Enter selects Vegetables & Herbs |
| V8 | Item text search | Type "Tom" → Tomato rows; collapsed cat with match auto-expands |
| V9 | All rows default unchecked on load | Checkboxes all empty; Dispatch button disabled |
| V10 | Row click toggles checkbox | Click item name → row checked; click qty input → checkbox unchanged |
| V11 | Qty suggestion is integer | Tomato suggestion shows `13` not `12.9` |
| V12 | FEFO auto-select on qty entry | Enter qty → source select auto-fills with earliest expiry batch + FEFO badge |
| V13 | FEFO skips expired segments | Segment with past expiry_date not auto-selected |
| V14 | Multi-batch: second source line when qty > segment | Enter qty > single batch qty → second line appears, allocation shows ✓ Exact |
| V15 | Un-batched info badge (Option B) | Item with only `segment_id: null` → info badge, dispatch still allowed |
| V16 | Tab order: qty → source → next row's qty (no headers) | Tab from qty: source select focused; Tab again: next row's qty or checkbox |
| V17 | Keyboard nav in category combobox | ArrowDown navigates list; Enter selects; Escape closes |
| V18 | RequestStockForm ceiling fix | Open Request Stock form → suggestion qty shows integer |
| V19 | SourceSelector unchanged on other screens | PendingQueues, TransferDetail: SourceSelector works as before |
| V20 | Submit dispatches correctly (payload unchanged) | Network: POST `/initiate` with flat `items[]` including segment source_selector |
| V21 | Reset clears all filters and unchecks all rows | Click Reset → all unchecked, search clear, All Categories, coverage = 3d |
| V22 | Dispatch button shows correct count | Check 3 rows → button shows `Dispatch (3 items)` |

---

## Gate 2 Summary

| Field | Value |
|-------|-------|
| Code reality | PARTIAL |
| Conflict | NONE |
| Files WILL change | 3 (DirectDispatchForm, SourceSelector, RequestStockForm) |
| New sub-components | 3 (CategoryCombobox, DispatchRow, HealthStrip) |
| Files NOT touching | api.js structure, server.py, frozen files |
| Risks | 8 (R1 SourceSelector = HIGH monitored; R6 multi-batch = MEDIUM; rest LOW) |
| API probed | `include_segments=true` confirmed; `segments_preview` shape confirmed |
| Mock refinements | 9 (R7–R15) |
| Owner decisions | ALL RESOLVED |
| Verification checks | 22 |

**→ Gate 2 COMPLETE. Ready for Gate 3 (Implementation Plan).**
