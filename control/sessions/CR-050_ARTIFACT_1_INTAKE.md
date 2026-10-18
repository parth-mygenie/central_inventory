# CR-050 — Intake Artifact (Gate 1)

> **ID:** CR-050
> **Type:** CR
> **Registered:** 2026-10-18
> **Agent Role:** INTAKE
> **Severity:** P1 — HIGH (owner-confirmed)
> **Source:** INVESTIGATION sessions (dispatch_v2_mockup.html, dispatch_fefo_mockup.html, 2026-10-17/18)

---

## Problem Statement

`DirectDispatchForm.jsx` has four compounding problems that make the daily dispatch workflow slow and error-prone:

1. **No category grouping.** All 257 items appear in a flat list with no visual organisation. Storekeeper cannot collapse a category they've already handled.
2. **No FEFO auto-select.** SourceSelector has no auto-selection logic. For every one of 257 rows the storekeeper must manually open a dropdown and pick a batch — even when there is only one eligible batch. Result: ~500 source-options API calls on every page load (see #4).
3. **Suggested qty not ceiled to integer.** Dispatch uses `Math.ceil(value * 100) / 100` (2-decimal ceiling). PO Create already uses correct `Math.ceil(value)` (integer ceiling). A storekeeper sees "26.7 kg" instead of "27 kg".
4. **source-options burst (~500 API calls / visit).** All 257 rows start with `included: true`. Each mounts `SourceSelector` which immediately fires `api.getSourceOptions()`. Since every item has a unique `inventoryMasterId`, the cache never helps — 257 calls fire simultaneously. A second render wave (when `destConsumption` resolves) can double this to ~514. The fix is already available: `GET /stock-inventory?include_segments=true` returns `segments_preview` containing identical segment data (verified via live API probe), eliminating the need for any per-item source-options call.
5. **Un-batched stock dispatched without traceability.** Items with `segment_id: null` in `segments_preview` (legacy un-batched stock) can currently be dispatched without any batch or expiry recording. Owner has confirmed: **these items should prompt the storekeeper to add batch info before dispatch is allowed.**

---

## Scope

| Area | Change |
|------|--------|
| **Remove KPI tiles** | 4 large stat cards (257 / 0 / 0 / 0) → compact health strip (5 OUT · 18 LOW · 240 OK) |
| **Category grouping** | Items grouped by `category_name`. Each category header: collapse/expand toggle, item count, OUT/LOW badges, per-category Select All / Unselect All |
| **Collapse on Unselect All** | Clicking "Unselect All" on a category auto-collapses its rows. "Select All" auto-expands. |
| **Dual search** | Category dropdown filter + item name text search |
| **Status filter pills** | OUT / LOW / All — toggle any combination |
| **Suggested qty ceiling** | `Math.ceil(value * 100) / 100` → `Math.ceil(value)` — integer ceiling everywhere in dispatch suggestion logic (lines 162 + 170 of `DirectDispatchForm.jsx`) |
| **FEFO auto-select** | On qty entry (200ms debounce): sort eligible segments by expiry ASC, allocate greedily. Auto-fill source select with FEFO result. Tag auto-filled rows with "FEFO" badge. Expired segments skipped + warning shown. |
| **Multi-batch source widget** | When send qty > single batch avail, add second source line automatically. Each line: batch select + qty. `+ split across another batch` link for manual addition. Allocation status: ✓ exact / ⚠ short / ⚠ over. |
| **Compact SourceSelector** | Single `<select>` in table cell (no Segment/Bucket toggle buttons). Mode inferred from API response. Deferred load: source fetched on row focus, not on mount — eliminates ~500 burst calls. |
| **Un-batched stock prompt (Option B)** | Items where all `segments_preview` entries have `segment_id: null`: show "Add batch details before dispatching" prompt. Storekeeper enters batch name + expiry before source can be confirmed. (See Open Questions — backend gap may apply.) |
| **source-options burst fix** | Pass `includeSegments: true` to existing `getStockInventory()` call in `DirectDispatchForm.jsx` line 85. Map `segments_preview` as `preloadedSegments` prop into `SourceSelector`. Skip `getSourceOptions` API call when `preloadedSegments` is provided. |
| **Manual rows** | Integrate into same table (below dashed separator). Use `ItemSearchCombobox` from CR-047. Source loads after item is picked. |
| **Keyboard flow** | Tab: Qty → Source → next row. Enter: advance on complete row. |
| **Ceiling for RequestStockForm** | Same `Math.ceil` fix applies to `RequestStockForm.jsx` lines 176 + 189 — **subsumed inline** |

---

## Evidence

- **Screenshot (owner-provided):** Current dispatch screen at `inventory.mygenie.online/dispatch/new` — 257 flat items, spinner inputs, SourceSelector widget per row, no category headers
- **Mockups (interactive):**
  - `control/sessions/dispatch_v2_mockup.html` — category grouping + search + Select All (v2)
  - `control/sessions/dispatch_fefo_mockup.html` — FEFO auto-select + multi-batch + ceiling values (v3, latest)
- **API probes (2026-10-18):**
  - `GET /stock-inventory?include_segments=true` → `segments_preview` confirmed: `segment_id`, `batch`, `expiry_date`, `display_qty` identical to `source-options`. Coverage: 100% of items with `display_qty > 0`
  - `POST /inventory-transfer/initiate` with two lines, same `source_inventory_master_id`, different `source_selector` → **accepted** (failure was `INVALID_HIERARCHY` not `DUPLICATE_ITEM` — multi-batch confirmed supported)
  - `SourceSelector.jsx` line 33–65: no auto-select logic, no FEFO, no default selection
  - `DirectDispatchForm.jsx` line 162: `Math.ceil((projected - dest) * 100) / 100` ← 2-decimal bug
  - `DirectDispatchForm.jsx` line 85: `api.getStockInventory()` — no `includeSegments` flag passed
- **Source:** OWNER-REPORTED (UX) + AGENT-DISCOVERED (burst, ceiling, include_segments opportunity)
- **Confidence:** CONFIRMED (all probed live)

---

## Code Reality

**PARTIAL** — `DirectDispatchForm.jsx` (626 lines) exists with a basic table. `SourceSelector.jsx` (214 lines) exists. The following are confirmed **NOT in the code**: category grouping, collapse/expand, FEFO auto-select, multi-batch widget, compact SourceSelector, ceiling fix, burst fix, un-batched stock prompt.

---

## Duplicate Check

| Item | Result |
|------|--------|
| CR-047 (Add Stock spreadsheet UX) | **DISTINCT** — different form (`AddStockPurchaseForm.jsx`), different API endpoint (`add-purchase`). Shared components go into CR-047, reused here. |
| CR-048 (PO Create spreadsheet UX) | **DISTINCT** — different form (`PurchaseOrderCreate.jsx`) |
| CR-049 (PO Receive spreadsheet UX) | **DISTINCT** — different form (`PurchaseOrderDetail.jsx`) |
| P21 (Smart Dispatch Intelligence Panel) | **RELATED** — same screen (`DirectDispatchForm.jsx`) but different scope. P21 adds a destination intel sidebar. CR-050 rewrites the input table. Execution order: CR-050 first (input table), P21 second (sidebar). |

**Duplicate check: DISTINCT. Related to CR-047/048/049 (shared components), RELATED to P21 (same file, different scope).**

---

## Blast Radius

```bash
grep -rn "DirectDispatchForm\|SourceSelector\|getSourceOptions\|getStockInventory" \
  frontend/src/ --include="*.jsx" --include="*.js" | wc -l
```

- `DirectDispatchForm.jsx` — full rewrite (~626 lines)
- `SourceSelector.jsx` — add `preloadedSegments` prop + compact render path (~50 lines added)
- `api.js` — modify `getStockInventory()` call in `DirectDispatchForm` + update `initiateTransfer` to accept multi-batch items (flat `items[]` array, already supports it)
- `RequestStockForm.jsx` — 2-line ceiling fix (lines 176 + 189)
- Estimated scope: **LARGE** (~4-5 days implementation)
- Hotspot files: YES — `api.js` (HIGH-RISK per CI-R5), `SourceSelector.jsx` (touches every transfer flow)

---

## Severity Classification

**P1 — HIGH**

- source-options burst (~500 calls per visit) is a live performance issue affecting the production app today
- Dispatch is a core daily storekeeper workflow
- No category grouping + no keyboard flow = storekeeper must click 257 rows individually
- Un-batched stock dispatching without batch tracking = traceability gap

Owner confirmed P1. Owner confirmed Option B for un-batched stock.

---

## Owner Decisions — ALL RESOLVED

| Question | Answer |
|----------|--------|
| Un-batched stock (`segment_id: null`) | **Option B** — prompt to add batch info (batch name + expiry) before dispatch is allowed |
| Ceiling to nearest integer? | **Yes** — `Math.ceil(value)` everywhere in dispatch suggestion |
| Multi-batch source? | **Yes** — FEFO auto-splits across batches; storekeeper can add/remove lines |
| Remove KPI tiles? | **Yes** — replace with compact health strip |

---

## Open Questions

### OQ-1 — Backend support for adding batch info to un-batched segments

When `segments_preview` returns `segment_id: null` (un-batched stock), Option B requires the storekeeper to add batch name + expiry before dispatching. Two possible implementations:

**Option B-i (preferred):** A POS API endpoint exists to update/split an existing un-batched segment with batch/expiry info. This would create a proper segment record → dispatch uses that `segment_id`.

**Option B-ii (fallback):** No such API exists. Frontend sends dispatch with `segment_id: null` but also passes `batch` + `expiry_date` in the `source_selector`. Backend may or may not accept these extra fields.

**Status: UNPROBED.** Investigation confirmed `segments_preview` returns `segment_id: null` for un-batched items and `source-options` returns `is_fallback: true` for the same items. Whether the backend allows adding batch metadata to these fallback segments needs a dedicated API probe **before PLANNING**.

**Action for PLANNING agent:** Probe `POST /inventory-transfer/source-options` response for a fallback item, then attempt a test dispatch with `source_selector: { mode: "segment_id", segment_id: null, batch: "TEST", expiry_date: "2027-01-01" }` to see if the API accepts it. If rejected → file G-037 (backend gap).

### OQ-2 — `segment_limit` default

`GET /stock-inventory?include_segments=true` has an optional `segment_limit` param. When omitted, ALL segments are returned (verified for an item with 2 segments). This should NOT be passed in CR-050's call so all batches are included. Confirm with backend team that the default is unlimited (no server-side cap).

---

## Dependencies

| Dependency | Status | Notes |
|------------|:------:|-------|
| CR-047 (shared components: `KeyboardRowHandler`, `ItemSearchCombobox`, table CSS) | Gate 1 ✅ | CR-050 can be PLANNED now; IMPLEMENTATION must wait for CR-047 to ship OR be built in parallel and merged |
| `GET /stock-inventory?include_segments=true` | Live ✅ | Already works in production, `segments_preview` confirmed |
| Multi-batch `initiateTransfer` | Live ✅ | Two items same `source_inventory_master_id`, different `source_selector` — accepted |
| G-036 (`po_coverage_days`) | OPEN | Does NOT affect CR-050 |
| OQ-1 (un-batched segment API) | **UNRESOLVED** | Must probe before PLANNING finalises Option B scope |

---

## Next Step

→ PLANNING agent: Impact Analysis (Gate 2) + Implementation Plan (Gate 3)
→ **Resolve OQ-1 first** — probe whether backend allows adding batch info to un-batched segments. If not → file G-037 and scope Option B as "show warning + block dispatch" only.
→ Dependency: Can plan now. Implementation after CR-047 ships (or parallel, merging shared components).
