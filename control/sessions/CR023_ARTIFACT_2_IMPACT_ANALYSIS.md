# CR-023 Artifact 2 — Impact Analysis

> **Date:** 2026-06-01
> **CR:** CR-023
> **Author:** E1
> **Status:** COMPLETE

---

## 1. Change Scope Summary

| Metric | Count |
|--------|:-----:|
| **Files modified** | 16 |
| **Files created** | 1 |
| **Files NOT touched** | All ui/ components, layout/, lib/, App.js, index.js |
| **Total lines affected** | ~800 added/modified across all files |
| **API calls added** | 3 new patterns (hierarchy-detail batch, hierarchy-summary merge, stock cross-join) |

---

## 2. New File

### `hooks/useRestaurantMap.js` (NEW — ~50 lines)

**Purpose:** Shared restaurant ID → {name, type} resolver. Solves BUG-B2, B3, B4 simultaneously.

**Data source:** `POST /hierarchy-summary` called twice (store_type=franchise + store_type=central), merge `stores[]` arrays. Each store has `{restaurant_id, restaurant_name, restaurant_type}`.

**Why this source over hierarchy-detail?**
- hierarchy-summary is already called by HierarchySummary and OperationsHub
- Returns all stores (9) across 2 calls → complete map
- hierarchy-detail requires a `store_restaurant_id` param and returns restaurants too, but is more expensive
- Also include the logged-in store (rid=1, from login context) since it's the parent and NOT in hierarchy-summary results

**Shape:**
```js
const { restaurantMap, loading } = useRestaurantMap();
// restaurantMap = { 1: {name: "My Genie", type: "master"}, 781: {name: "DemoCentral1", type: "central"}, ... }
```

**Consumers:** OperationsHub, PendingQueues, TransferDetail, HistoryLedger (4 screens)

**Risk:** LOW — new hook, no existing code affected. If fetch fails, graceful degradation to "Store #ID".

---

## 3. Modified Files — Detailed Change Map

### Priority Group P0 — Quick Wins (3 changes, immediate visibility)

---

#### 3.1 `OperationsHub.jsx` (458 lines → ~510 lines)

| Bug | Change | Lines Affected | Risk |
|-----|--------|:-------------:|:----:|
| A1 | Fix `data?.children \|\| data?.child_stores` → `data?.stores \|\| []` | Line 84 | TRIVIAL |
| B1 | After getting stores, call `getHierarchyDetail` per store (batch, max 6) to compute out/low/adequate counts | Lines 76-94 (rewrite useEffect) | MEDIUM |
| — | Import + use `useRestaurantMap` for activity feed names | Add import + ~3 lines | LOW |

**API Impact:** Adds up to 6 parallel `hierarchy-detail` calls on mount (Central view only). Each returns ~164 items. Batched via `Promise.allSettled`.

**Risk Assessment:**
- Field name fix (A1): TRIVIAL — 1 line change, zero regression risk
- Health computation (B1): MEDIUM — N+1 calls pattern. Mitigated by limiting to 6 stores and only for Central role. If hierarchy-detail is slow, store grid still appears (without health data) via graceful degradation.
- Performance: 6 parallel calls × ~200ms each ≈ 200-400ms total (parallel). Acceptable for dashboard.

**Dependencies:** `useRestaurantMap.js` (for activity feed names)

---

#### 3.2 `PendingQueues.jsx` (397 lines → ~420 lines)

| Bug | Change | Lines Affected | Risk |
|-----|--------|:-------------:|:----:|
| B2 | Import `useRestaurantMap`, replace `item.from_restaurant_name` fallback chain with `restaurantMap[item.from_restaurant_id]?.name` | Lines 135-136, 162, 252 | LOW |

**API Impact:** None — `useRestaurantMap` fetches independently.

**Risk Assessment:** LOW — only changes display strings, not business logic. Fallback preserved ("Store #ID" if map missing).

**Dependencies:** `useRestaurantMap.js`

---

#### 3.3 `TransferDetail.jsx` (661 lines → ~760 lines)

| Bug | Change | Lines Affected | Risk |
|-----|--------|:-------------:|:----:|
| B3 | Import `useRestaurantMap`, use for from/to names | Lines 281-284 | LOW |
| C1 | **NEW SECTION:** Requester Store Snapshot + Approval Impact | Insert ~100 lines after line 320 | HIGH |

**C1 Implementation Detail:**
1. On mount: call `getHierarchyDetail(transfer.to_restaurant_id)` → get requester's `child_stock_summary[]`
2. On mount: call `getStockInventory()` → get own stock
3. Render **REQUESTER STORE SNAPSHOT** table: Item / Stock Level / Min / Status(OUT/LOW/OK) / In This Request?
4. Render **APPROVAL IMPACT ON YOUR STOCK** table: Item / Requested / Your Stock / After Approval
5. Only show for Central user viewing a `requested` status transfer

**API Impact:** +2 API calls on mount (hierarchy-detail + stock-inventory). Both already used elsewhere.

**Risk Assessment:**
- Name resolution (B3): LOW — display only
- Store Snapshot (C1): HIGH — largest new feature. New JSX sections, new state, new API calls. Risk mitigated by:
  - Gating behind `isTopLevel && transfer.status === "requested"` → only shows when relevant
  - Error boundary: if hierarchy-detail fails, snapshot section simply doesn't render
  - No write operations involved

**Dependencies:** `useRestaurantMap.js`, `api.getHierarchyDetail`, `api.getStockInventory`

---

### Priority Group P1 — High-Impact Intelligence (3 changes)

---

#### 3.4 `HistoryLedger.jsx` (794 lines → ~810 lines)

| Bug | Change | Lines Affected | Risk |
|-----|--------|:-------------:|:----:|
| B4 | Import `useRestaurantMap`, pass map to `deriveLedgerEntries` as `historyNameMap` | Lines 43, 48-51, 295-299 | LOW |

**Current behavior:** `deriveLedgerEntries()` tries to build nameMap from history items (which lack names), falls back to "Store #ID".

**Fix:** Pass `restaurantMap` from `useRestaurantMap()` as the `historyNameMap` parameter. The existing fallback chain already handles this pattern — just need a populated map.

**Risk Assessment:** LOW — the `nameMap` parameter already exists in the function signature. We just pass actual data instead of an empty object.

**Dependencies:** `useRestaurantMap.js`

---

#### 3.5 `DailyConsumptionReport.jsx` (655 lines → ~720 lines)

| Bug | Change | Lines Affected | Risk |
|-----|--------|:-------------:|:----:|
| B9 | Add intelligence columns: Avg Daily, Current Stock, Days of Cover, Trend | Modify table header + row render (~40 lines) + add computation (~25 lines) | MEDIUM |

**Computation Logic:**
```
avg_daily = total_consumed / date_range_days
current_stock = join stock_summary[].ingredient_name with stock_inventory[].stock_title
days_of_cover = current_stock / avg_daily
trend = (this_period_consumed / prev_period_consumed) comparison
```

**API Impact:** Needs `getStockInventory()` call on mount (to get current stock for cross-join). Already fetched by useStockIntelligence on Hub — but this screen fetches independently.

**Risk Assessment:** MEDIUM
- Cross-join by `ingredient_name` / `stock_title` is fuzzy matching — could miss items if names differ between consumption API and inventory API
- `date_range_days` computation from API's `date_range[]` array
- Trend computation needs either a 2nd API call for previous period OR just label based on avg

**Dependencies:** `api.getStockInventory`, existing `api.getDailyConsumptionReport`

---

#### 3.6 `DirectDispatchForm.jsx` (213 lines → ~340 lines)

| Bug | Change | Lines Affected | Risk |
|-----|--------|:-------------:|:----:|
| C2 | **NEW SECTION:** "What This Store Needs" auto-detect table | Insert ~120 lines after destination selector | HIGH |

**Implementation Detail:**
1. When `selectedDest` changes: call `getHierarchyDetail(selectedDest)` → get destination's `child_stock_summary[]`
2. Compare each item's `display_quantity` vs `min_qty_alert` → compute gap
3. Also call `getStockInventory()` → get own stock for "Your Stock After" projection
4. Render table: Item / Their Stock / Min Threshold / Gap / Qty to Send / Source Segment / Your Stock After
5. Pre-populate dispatch rows from items with largest gaps

**API Impact:** +1 `hierarchy-detail` call per destination change, +1 `getStockInventory` (can cache from mount).

**Risk Assessment:** HIGH — new feature with interactive table. Mitigated by:
- Only loads when destination is selected (lazy)
- Table is informational — user can still manually add rows
- If hierarchy-detail fails (e.g., permission denied for cross-store), shows StoreHealthStrip only (current behavior)

**Dependencies:** `api.getHierarchyDetail`, `api.getStockInventory`

---

### Priority Group P2 — Medium Impact (5 changes)

---

#### 3.7 `ReceiveDialog.jsx` (212 lines → ~260 lines)

| Bug | Change | Lines Affected | Risk |
|-----|--------|:-------------:|:----:|
| C3 | Add per-line "Dispatched: X, Requested: Y — Z less" comparison | ~20 lines in line item render | LOW |
| C3 | Add footer "After receiving: Item → +Xqty added to inventory" | ~15 lines before submit button | LOW |

**Data available:** Transfer lines already have `requestedDisplayQty` and `dispatchedDisplayTotal` from normalizer. Comparison is pure client-side math. Post-receive projection needs `getStockInventory()`.

**Risk Assessment:** LOW — display additions only, no business logic change. Data already present in props.

---

#### 3.8 `ApproveWaveDialog.jsx` (248 lines → ~290 lines)

| Bug | Change | Lines Affected | Risk |
|-----|--------|:-------------:|:----:|
| C4 | Add FEFO expiry badge per segment in segment picker | ~10 lines per segment option | LOW |
| C4 | Auto-select nearest-expiry segment when line is included | ~8 lines in `toggleLine` | LOW |
| C4 | Add over-approve warning if qty > available | ~5 lines | LOW |

**Data available:** Segments from `source-options` already have `expiry_date` and `display_qty`. FEFO sort and badge are client-side.

**Risk Assessment:** LOW — enhances existing segment picker, doesn't change submission logic.

---

#### 3.9 `HierarchySummary.jsx` (199 lines → ~260 lines)

| Bug | Change | Lines Affected | Risk |
|-----|--------|:-------------:|:----:|
| B5 | Add health column (OUT / LOW / ADEQUATE counts) per store | ~40 lines in table + ~20 lines for computation | MEDIUM |

**Implementation:** After fetching hierarchy-summary stores, call `getHierarchyDetail` per store (batch) to get `child_stock_summary`, count low/out.

**Risk Assessment:** MEDIUM — N+1 API pattern (same as OperationsHub B1). Mitigated by batching and only fetching for visible tab's stores.

**Dependencies:** `api.getHierarchyDetail`

---

#### 3.10 `IngredientCatalogue.jsx` (282 lines → ~330 lines)

| Bug | Change | Lines Affected | Risk |
|-----|--------|:-------------:|:----:|
| B8 | Add "Used in X recipes" column | ~20 lines (fetch recipes, build cross-ref map) | LOW |
| B8 | Add "Pushed to X stores" column | ~20 lines (fetch franchise/list, cross-ref) | MEDIUM |

**Cross-ref computation:**
- "Used in X recipes": Fetch `getRecipeList()`, count how many recipes' `ingredients[]` reference this item's `stock_title`
- "Pushed to X stores": Derive from franchise/list `children[]` count (approximation — exact requires push-form per child)

**Risk Assessment:** LOW-MEDIUM — read-only cross-reference. Recipe fetch is already fast (2 recipes currently, will grow). Franchise/list is already fetched by HierarchyManagement.

---

#### 3.11 `HierarchyManagement.jsx` (697 lines → ~740 lines)

| Bug | Change | Lines Affected | Risk |
|-----|--------|:-------------:|:----:|
| B11 | Add push status column: derive from push-form per child | ~30 lines in table + ~20 lines for async fetch | MEDIUM |

**Implementation:** After loading children, call `getPushForm(childId)` per child. Compare `source_entities` vs `child_existing` to derive "Synced" / "Stale — X items behind". Show "Last Push" from push history.

**Risk Assessment:** MEDIUM — N+1 push-form calls. Mitigated by:
- Only fetching for visible children (paginated)
- Using `Promise.allSettled` for fault tolerance
- If push-form fails for a child, show "—" instead of status

**Dependencies:** `api.getPushForm`, `api.getHierarchyHistory`

---

### Priority Group P3 — Cosmetic / Low Priority (4 changes)

---

#### 3.12 `ProductCatalogue.jsx` (348 lines → ~365 lines)

| Bug | Change | Lines Affected | Risk |
|-----|--------|:-------------:|:----:|
| B6 | Fix "Has Recipe" column: cross-ref with recipes | ~15 lines | LOW |

**Implementation:** Fetch `getRecipeList()`, build `food_name → true` map. Match against product name.

---

#### 3.13 `RecipeCatalogue.jsx` (292 lines) + `AddonRecipeCatalogue.jsx` (176 lines)

| Bug | Change | Lines Affected | Risk |
|-----|--------|:-------------:|:----:|
| B7 | Derive "Cost Mapped" from ingredients having prices | ~10 lines each | LOW |

**Implementation:** A recipe is cost-mapped if all its `ingredients[]` have non-null `purchase_price`. Data is already in the recipe response.

---

#### 3.14 `DisputeResolutionDialog.jsx` (129 lines → ~150 lines)

| Bug | Change | Lines Affected | Risk |
|-----|--------|:-------------:|:----:|
| C5 | Add impact explanation text to Accept/Reject cards | ~15 lines static text | TRIVIAL |

---

#### 3.15 `SourceSelector.jsx` (199 lines → ~215 lines)

| Bug | Change | Lines Affected | Risk |
|-----|--------|:-------------:|:----:|
| C6 | Show "X remaining after dispatching Y" when segment selected | ~10 lines | LOW |

**Implementation:** When a segment is selected, compute `segment.display_qty - dispatch_qty` and display.

---

### DEFERRED (No code change)

#### 3.16 `VendorManagement.jsx` — NOT MODIFIED

| Bug | Change | Risk |
|-----|--------|:----:|
| B10 | BACKEND-GAP G-017. No vendor purchase history API exists. | N/A |

**Action:** Register G-017 in control layer. No frontend workaround possible.

---

## 4. Files NOT Modified (Confirmed Safe)

| File / Directory | Reason |
|-----------------|--------|
| `services/api.js` | All needed API methods already exist. No new endpoints needed. |
| `lib/terminology.js` | No changes to business term mapping |
| `lib/formatters.js` | No changes to formatPO/formatRelativeTime |
| `lib/transferActions.js` | No changes to action gating |
| `lib/screenVisibility.js` | No changes to role visibility |
| `components/ui/*` | No changes to UI primitives |
| `components/layout/*` | No changes to AppLayout, Sidebar, LoginPage |
| `components/common/Badges.jsx` | No changes |
| `components/common/StateDisplays.jsx` | No changes |
| `components/common/StockIntelligenceBar.jsx` | No changes |
| `components/common/StoreHealthStrip.jsx` | No changes |
| `components/common/FulfillmentVerdict.jsx` | No changes |
| `components/common/PostSubmitConfirmation.jsx` | No changes |
| `backend/server.py` | Already fixed (DELETE body proxy). No further changes. |
| `StockAdjustmentForm.jsx` | Already has intelligence (confirmed working) |
| `WastageEntryForm.jsx` | Already has intelligence (confirmed working) |
| `WastageReport.jsx` | Already has Export CSV (confirmed working) |
| `OperationalSettings.jsx` | Already has impact badges (confirmed working) |
| `StatusTimeline.jsx` | Already has relative timestamps (confirmed working) |
| `StockInventorySummary.jsx` | Already has intelligence columns (confirmed working) |
| `StockDetailPanel.jsx` | Already has FEFO badges (confirmed working) |
| `StoreDetail.jsx` | Already has health strip (confirmed working) |

---

## 5. API Call Impact Summary

| Screen | Current API Calls | New API Calls Added | Total After |
|--------|:-----------------:|:-------------------:|:-----------:|
| OperationsHub | 3 (stock, queues, history) | +2 (hierarchy-summary×2 for name map) +6 max (hierarchy-detail per store) | 11 max |
| PendingQueues | 4 (queues, stock, details×N, history) | +0 (uses shared name map) | 4 |
| TransferDetail | 1 (transfer-details) | +2 (hierarchy-detail, stock-inventory) | 3 |
| HistoryLedger | 1 (history) | +0 (uses shared name map) | 1 |
| DirectDispatchForm | 3 (hierarchy-summary×2, inventory-master) | +1 (hierarchy-detail per dest change) | 4 |
| DailyConsumptionReport | 1 (consumption-report) | +1 (stock-inventory for cross-join) | 2 |
| HierarchySummary | 1 (hierarchy-summary) | +N (hierarchy-detail per store for health) | 1+N |
| IngredientCatalogue | 1 (inventory-master) | +1 (recipe-list for cross-ref) | 2 |
| HierarchyManagement | 2 (franchise/list, history) | +N (push-form per child) | 2+N |

**Performance concern:** OperationsHub now makes up to 11 calls. Mitigated by:
- `Promise.allSettled` for parallelism
- hierarchy-detail calls only for Central role
- Max 6 stores (slice)
- All calls are read-only GET/POST with small payloads

---

## 6. Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|-----------|
| hierarchy-detail slow for N stores | MEDIUM | MEDIUM | Limit to 6 stores, parallel calls, graceful degradation |
| Cross-join mismatch (ingredient_name vs stock_title) | LOW | LOW | Normalize both to lowercase for comparison |
| Push-form N+1 calls for HierarchyManagement | MEDIUM | LOW | Paginate, only fetch visible children |
| TransferDetail snapshot shows stale data | LOW | LOW | Show "as of" timestamp, refresh button |
| New sections break mobile layout | MEDIUM | MEDIUM | Use responsive grid, overflow-x-auto wrappers |
| Recipe cross-ref incorrect (name matching) | LOW | LOW | Match by food_name (exact), not fuzzy |

---

## 7. Dependency Graph

```
                    useRestaurantMap.js (NEW)
                   /    |     |      \
                  /     |     |       \
    OperationsHub  PendingQueues  TransferDetail  HistoryLedger
         |                              |
    [hierarchy-detail ×6]     [hierarchy-detail +
                               stock-inventory]

    DirectDispatchForm ──── [hierarchy-detail per dest]
    DailyConsumptionReport ── [stock-inventory cross-join]
    HierarchySummary ──── [hierarchy-detail ×N for health]
    IngredientCatalogue ── [recipe-list cross-ref]
    HierarchyManagement ── [push-form ×N]
```

**Critical path:** `useRestaurantMap.js` must be created FIRST (blocks P0 group).

---

## 8. Rollback Plan

All changes are **additive** (new sections, new computations). If any feature causes issues:
1. Each new intelligence section is wrapped in a conditional render (`isTopLevel &&`, `storeHealth.length > 0 &&`)
2. All new API calls use `Promise.allSettled` — failures don't break existing functionality
3. `useRestaurantMap` has fallback — if it fails, screens show "Store #ID" (current behavior)
4. No database schema changes, no backend logic changes, no API contract changes

---

*This Impact Analysis is COMPLETE. Proceed to Artifact 3 (Implementation Plan) for execution order.*
