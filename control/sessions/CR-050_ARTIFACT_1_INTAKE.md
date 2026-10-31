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
5. **Un-batched stock dispatched without traceability.** Items with `segment_id: null` in `segments_preview` (legacy un-batched stock) can currently be dispatched without any batch or expiry recording. Owner confirmed Option B. **Final API probe (2026-10-18) returned `LEGACY_SELECTOR_REQUIRED`** — backend explicitly requires `filter_bucket` mode for un-batched stock. You CANNOT dispatch using `segment_id` mode for un-batched segments, even with extra batch fields. See revised scope below.

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
| **Un-batched stock info badge (Option B — revised 2026-10-18)** | Items where `segments_preview` contains only `segment_id: null` entries: show an info badge on the row: *"No batch tracking — dispatching from legacy stock bucket. To track batches, add a purchase with batch details first."* Storekeeper can STILL dispatch via bucket mode (current behaviour preserved). A shortcut link navigates to `/purchase`. **No block, no batch-entry UI** — `LEGACY_SELECTOR_REQUIRED` API error confirms bucket dispatch is required and batch info cannot be injected at dispatch time. G-037 covers the future backend gap. |
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
| Un-batched stock (`segment_id: null`) | **Option B (revised)** — info badge + allow bucket dispatch. No block. `LEGACY_SELECTOR_REQUIRED` confirmed by API probe 2026-10-18. |
| Ceiling to nearest integer? | **Yes** — `Math.ceil(value)` everywhere in dispatch suggestion |
| Multi-batch source? | **Yes** — FEFO auto-splits across batches; storekeeper can add/remove lines |
| Remove KPI tiles? | **Yes** — replace with compact health strip |

---

## Open Questions — ALL RESOLVED (updated 2026-10-18)

### OQ-1 — ANSWERED (G-037 filed)

**`LEGACY_SELECTOR_REQUIRED`** — Live API probe with item 20651 (RID 828, segment 241, `batch: null`) returned:
```json
{ "error_code": "LEGACY_SELECTOR_REQUIRED",
  "message": "Legacy stock without batch/expiry can only be dispatched using an explicit non-batch filter bucket selector." }
```
Backend explicitly requires bucket mode for un-batched segments. There is no way to attach batch/expiry during dispatch. G-037 filed for future "add batch to existing segment" API.

**CR-050 Option B scope is now: show info badge + allow bucket dispatch. No block. No batch-entry UI.**

### G-036 — CLOSED

Re-probed 2026-10-18 with fresh tokens on both RID 807 and RID 828. Both return `stored po_coverage_days: 3` and UPDATE succeeds. Earlier `INVALID_SETTINGS_PAYLOAD` was a backend deployment timing issue. G-036 is closed.

### OQ-2 — CONFIRMED

`GET /stock-inventory?include_segments=true` — no server-side cap on segments returned when `segment_limit` is omitted. Do NOT pass `segment_limit` in CR-050's call.

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
