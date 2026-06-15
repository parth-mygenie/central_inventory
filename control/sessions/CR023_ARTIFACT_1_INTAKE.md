# CR-023 Artifact 1 — Intake: API-Mismatch Bug Fix & Intelligence Completion

> **Date:** 2026-06-01
> **CR:** CR-023
> **Author:** E1
> **Status:** COMPLETE
> **Scope:** 18 bugs across 14 screens

---

## 1. Problem Statement

The Phase 7 Frozen Spec defined intelligence features for 24 screens. The previous implementation
(CR-021) delivered partial intelligence. An audit revealed **18 bugs** where:
- Code accesses API response fields that don't exist
- Intelligence features from the spec were never implemented
- The 55/55 test pass rate only covered the implemented subset

This Intake documents each bug with:
- **Exact code location** (file + line)
- **API evidence** (verified curl response)
- **Classification** — Fixable / Computable / Backend-Gap
- **Severity** — based on user-visible impact

---

## 2. Bug Registry

### CATEGORY A — Wrong Field Name (1 bug)

---

#### BUG-A1: OperationsHub Store Health Grid — wrong response field

| Field | Value |
|-------|-------|
| **Screen** | OperationsHub (A1) |
| **File** | `OperationsHub.jsx` line 84 |
| **Severity** | CRITICAL |
| **Classification** | FIXABLE NOW |

**Code reads:**
```js
const children = data?.children || data?.child_stores || [];
```

**API returns:** `data.stores` (not `children` or `child_stores`)

```
POST /hierarchy-summary → { data: { store_type, from_date, to_date, stores: [...] } }
stores[0] keys: [restaurant_id, restaurant_name, restaurant_type, sent_quantity, received_quantity, transaction_count]
```

**Fix:** Change to `data?.stores || []`

**Note:** Even after field fix, stores lack `out_of_stock_count` / `low_stock_count`. See BUG-B1.

---

### CATEGORY B — API Doesn't Return Expected Fields (13 bugs)

---

#### BUG-B1: OperationsHub Store Health — no stock health counts in hierarchy-summary

| Field | Value |
|-------|-------|
| **Screen** | OperationsHub (A1) |
| **File** | `OperationsHub.jsx` lines 287-289 |
| **Severity** | HIGH |
| **Classification** | COMPUTABLE — via `hierarchy-detail` per store |

**Code expects:** `store.out_of_stock_count`, `store.low_stock_count`  
**API returns:** Only `restaurant_id`, `restaurant_name`, `restaurant_type`, `sent_quantity`, `received_quantity`, `transaction_count`

**Solution available:** `POST /hierarchy-detail` with `store_restaurant_id` returns `child_stock_summary[]` with `is_low_stock` and `display_quantity` per item. Count low/out from there.

**Verified:**
```
Store 781: child_stock_summary = 164 items → low=3, out=162 (computable)
Store 783: child_stock_summary = 4 items → low=2, out=2 (computable)
```

---

#### BUG-B2: PendingQueues — missing restaurant names/types

| Field | Value |
|-------|-------|
| **Screen** | PendingQueues (B2) |
| **File** | `PendingQueues.jsx` lines 135-136, 162, 252 |
| **Severity** | MEDIUM |
| **Classification** | COMPUTABLE — via restaurant name map |

**Code expects:** `item.from_restaurant_name`, `item.to_restaurant_name`, `item.from_restaurant_type`  
**API returns:** Only `from_restaurant_id`, `to_restaurant_id` (no names, no types)

```
Queue item keys: [transfer_id, type, status, from_restaurant_id, to_restaurant_id, line_count, created_at, updated_at]
Has from_restaurant_name? False
Has from_restaurant_type? False
```

**Solution:** Build a restaurant ID→name map from `hierarchy-detail.restaurants[]` (returns 9 entries with `restaurant_id`, `restaurant_name`, `restaurant_type`). Cache once on mount, reuse across screens.

---

#### BUG-B3: TransferDetail — missing restaurant names

| Field | Value |
|-------|-------|
| **Screen** | TransferDetail (B3) |
| **File** | `TransferDetail.jsx` lines 281-283 |
| **Severity** | MEDIUM |
| **Classification** | COMPUTABLE — same restaurant name map as BUG-B2 |

**Code expects:** `data.from_restaurant_name`, `data.from_restaurant?.restaurant_name`  
**API returns:** Only `from_restaurant_id`, `to_restaurant_id`

```
transfer keys: [id, from_restaurant_id, to_restaurant_id, type, ..., dispatched_at, ...]
Has from_restaurant_name? False
Has from_restaurant? False
```

---

#### BUG-B4: HistoryLedger — missing restaurant names

| Field | Value |
|-------|-------|
| **Screen** | HistoryLedger (D3) |
| **File** | `HistoryLedger.jsx` lines 43-51, 295-299 |
| **Severity** | MEDIUM |
| **Classification** | COMPUTABLE — same restaurant name map |

**Code attempts:** Build `nameMap` from `t.from_restaurant_name` in history items, then falls back to `Store #ID`  
**API returns:** History items have NO restaurant names.

```
history item keys: [id, from_restaurant_id, to_restaurant_id, type, ..., created_at, updated_at]
Has from_restaurant_name? False
```

**Result:** All stores display as "Store #1", "Store #781", etc.

---

#### BUG-B5: HierarchySummary — no health data in summary

| Field | Value |
|-------|-------|
| **Screen** | HierarchySummary (E8-related) |
| **File** | `HierarchySummary.jsx` — health column not implemented |
| **Severity** | MEDIUM |
| **Classification** | COMPUTABLE — via `hierarchy-detail` per store (same as BUG-B1) |

**Preview expects:** OUT / LOW / ADEQUATE health column per store  
**API returns:** `hierarchy-summary` only has `transaction_count` — no stock health

**Note:** `HierarchySummary.jsx` correctly uses `data?.stores` (unlike OperationsHub), but simply doesn't display health because the data isn't there.

---

#### BUG-B6: ProductCatalogue — has_recipe field missing

| Field | Value |
|-------|-------|
| **Screen** | ProductCatalogue (E4) |
| **File** | `ProductCatalogue.jsx` line 103 |
| **Severity** | LOW |
| **Classification** | COMPUTABLE — cross-ref recipes client-side |

**Code reads:** `f.has_recipe ? "Yes" : "—"`  
**API returns:** `foods-list` has NO `has_recipe` field

```
food keys: [id, name, category, price, item_type, status, image, ...]
Has has_recipe? False
```

**Solution:** Fetch `/recipe/get-recipe`, build `food_id → has_recipe` map from `recipe.food_name` matching.

---

#### BUG-B7: RecipeCatalogue / AddonRecipeCatalogue — cost_mapped field missing

| Field | Value |
|-------|-------|
| **Screen** | RecipeCatalogue (E5), AddonRecipeCatalogue (E6) |
| **File** | `RecipeCatalogue.jsx`, `AddonRecipeCatalogue.jsx` |
| **Severity** | LOW |
| **Classification** | COMPUTABLE — derive from recipe ingredients |

**Code expects:** `cost_mapped`  
**API returns:** Recipe API has NO `cost_mapped` field

```
recipe keys: [recipe_id, name, food_name, category_name, ..., ingredients]
Has cost_mapped? False
```

**Solution:** A recipe is "cost mapped" if all its `ingredients[]` have purchase prices. Can derive client-side.

---

#### BUG-B8: IngredientCatalogue — cross-ref fields missing

| Field | Value |
|-------|-------|
| **Screen** | IngredientCatalogue (E3) |
| **File** | `IngredientCatalogue.jsx` — columns not implemented |
| **Severity** | MEDIUM |
| **Classification** | COMPUTABLE — cross-ref recipes + franchise/list |

**Preview expects:** "Used in X recipes", "Pushed to X stores" columns  
**API returns:** `inventory-master` has NO cross-ref fields

```
inventory keys: [id, category_id, stock_title, type, unit, small_unit, cal_quantity, ...]
Has recipe_count? False | Has used_in_recipes? False | Has pushed_to_stores? False
```

**Solution:** 
- "Used in X recipes": Fetch recipes, count ingredients matching this inventory item
- "Pushed to X stores": Fetch franchise/list children, check each child's inventory

---

#### BUG-B9: DailyConsumptionReport — intelligence fields missing

| Field | Value |
|-------|-------|
| **Screen** | DailyConsumptionReport (E7) |
| **File** | `DailyConsumptionReport.jsx` |
| **Severity** | HIGH |
| **Classification** | COMPUTABLE — derive from raw consumption + stock data |

**Preview expects:** `days_of_cover`, `trend`, `avg_daily`, `current_stock`  
**API returns:** `stock_summary[].total_consumed`, `closing_stock`, `opening_stock`

```
stock_summary keys: [ingredient_id, ingredient_name, category_id, category_name, total_consumed, closing_stock, opening_stock, restaurant_id]
Has days_of_cover? False | Has trend? False | Has avg_daily? False | Has current_stock? False
```

**Solution:** Compute client-side:
- `avg_daily` = total_consumed / date_range_days
- `current_stock` = from stock-inventory API (join by ingredient_name)
- `days_of_cover` = current_stock / avg_daily
- `trend` = compare current period vs previous period

---

#### BUG-B10: VendorManagement — purchase history fields missing

| Field | Value |
|-------|-------|
| **Screen** | VendorManagement (E2) |
| **File** | `VendorManagement.jsx` |
| **Severity** | LOW |
| **Classification** | BACKEND-GAP — no purchase history API |

**Preview expects:** "Last purchase date", "Avg order value", "Total orders"  
**API returns:** Only `vendor_name`, `contact_person_name`, `contact_number`, `email`, `address`, `vendor_type`, `gst_no`

```
vendor keys: [id, vendor_name, contact_person_name, contact_number, email, address, vendor_type, gst_no]
Has last_purchase_date? False | Has avg_order_value? False | Has total_orders? False | Has created_at? False
```

**No workaround available.** POS API has no purchase history endpoint per vendor. Register as new backend gap **G-017**.

---

#### BUG-B11: HierarchyManagement — push status fields missing

| Field | Value |
|-------|-------|
| **Screen** | HierarchyManagement (E8) |
| **File** | `HierarchyManagement.jsx` |
| **Severity** | MEDIUM |
| **Classification** | COMPUTABLE — via `push-form` per child |

**Preview expects:** "Last Push", "Push Status (Synced/Stale)", "Items behind"  
**API returns:** `franchise/list` has 154 raw fields but NO push-specific fields

```
Has last_push_at? False | Has push_status? False | Has items_count? False | Has items_behind? False
```

**Solution:** `GET /franchise/push-form/{childId}` returns push form with source_entities vs child_existing — can derive sync status. Requires 1 call per child (N+1 pattern).

---

### CATEGORY C — Intelligence Code Never Written (4 bugs)

---

#### BUG-C1: TransferDetail — Requester Store Snapshot + Approval Impact

| Field | Value |
|-------|-------|
| **Screen** | TransferDetail (B3) |
| **File** | `TransferDetail.jsx` — section DOES NOT EXIST |
| **Severity** | CRITICAL |
| **Classification** | NOT IMPLEMENTED — needs new code |
| **Preview** | `B3_transfer_detail.html` |

**Preview shows:**
1. **REQUESTER STORE SNAPSHOT** — full inventory health table (Item / Category / Stock Level / Min Threshold / Status / In This Request?)
2. **APPROVAL IMPACT ON YOUR STOCK** — table (Item / Requested / Your Stock / After Approval)

**Current code has:** Only PO format title + created relative time. Zero snapshot/impact code.

**APIs needed:**
- `getHierarchyDetail(to_restaurant_id)` → requester's stock
- `getStockInventory()` → own stock for impact calculation
- Cross-reference with transfer lines

---

#### BUG-C2: DirectDispatchForm — Destination Needs Auto-Detect

| Field | Value |
|-------|-------|
| **Screen** | DirectDispatchForm (B5) |
| **File** | `DirectDispatchForm.jsx` — section DOES NOT EXIST |
| **Severity** | HIGH |
| **Classification** | NOT IMPLEMENTED — needs new code |
| **Preview** | `B5_direct_dispatch.html` |

**Preview shows:** "WHAT THIS STORE NEEDS (AUTO-DETECTED)" table with their stock, gap to min, FEFO segment badges, YOUR STOCK AFTER projection, duplicate dispatch warning

**Current code has:** StoreHealthStrip for destination (IG-005). No auto-detect, no projections.

**APIs needed:**
- `getHierarchyDetail(destination_rid)` → their stock
- `getStockInventory()` → own stock for projection
- Compare their stock vs min thresholds → compute gaps

---

#### BUG-C3: ReceiveDialog — Dispatched vs Requested + Post-Receive Projection

| Field | Value |
|-------|-------|
| **Screen** | ReceiveDialog (B7) |
| **File** | `ReceiveDialog.jsx` — sections MISSING |
| **Severity** | MEDIUM |
| **Classification** | NOT IMPLEMENTED — needs new code |
| **Preview** | `B6_B7_B8_modals.html` section 2 |

**Preview shows:**
- Per line: "Dispatched: 600 gm, Requested: 800 gm — 200 gm less than requested"
- Footer: "After receiving: Red Meat → 500 gm, Patri → 500 gm, Oil → 5 ltr added to your inventory"

**Current code has:** Dispatch time context badge, partial receive toggle. No comparison, no projection.

**Data available:** Transfer lines have `requestedDisplayQty` and `dispatchedDisplayTotal` — comparison IS possible from existing data. Projection needs `getStockInventory()`.

---

#### BUG-C4: ApproveWaveDialog — FEFO Auto-Select + Warnings

| Field | Value |
|-------|-------|
| **Screen** | ApproveWaveDialog (B7-approve) |
| **File** | `ApproveWaveDialog.jsx` |
| **Severity** | MEDIUM |
| **Classification** | PARTIALLY IMPLEMENTED — needs enhancements |

**Preview shows:** FEFO Recommended badge per segment, auto-select nearest-expiry, over-approve warning, segment exhaustion alert

**Current code has:** Segment picker works, but no FEFO auto-select, no expiry badges, no warnings.

**Data available:** `source-options` returns segments with `expiry_date` — FEFO selection and badges ARE possible.

---

### LOWER-PRIORITY ITEMS (from Category C, captured for completeness)

#### BUG-C5: DisputeResolutionDialog — Impact Cards
- **File:** `DisputeResolutionDialog.jsx`
- **Severity:** LOW
- **Missing:** Detailed "Accept: X written off, no returns" / "Reject: reverts to dispatched" text
- **Fix:** Add static impact explanation text (no API needed)

#### BUG-C6: SourceSelector — Remaining After Selection
- **File:** `SourceSelector.jsx`
- **Severity:** LOW
- **Missing:** "Dispatching X from Segment #Y (Z) → W remaining"
- **Fix:** Compute from segment `display_qty` minus selected quantity (client-side math)

---

## 3. Shared Solution: Restaurant Name Resolver

Bugs B2, B3, B4 all need restaurant ID → name mapping. A **shared resolver** should be built:

**Source:** `POST /hierarchy-detail` → `data.restaurants[]` returns all 9 stores with `{restaurant_id, restaurant_name, restaurant_type}`

**Implementation:**
- New hook: `useRestaurantMap()` — fetches once, caches in React context
- Returns: `{ [restaurant_id]: { name, type } }`
- Used by: PendingQueues, TransferDetail, HistoryLedger, OperationsHub activity feed

---

## 4. Classification Summary

| Classification | Count | Bugs |
|---------------|:-----:|------|
| **FIXABLE NOW** (wrong field name) | 1 | A1 |
| **COMPUTABLE** (API has raw data, need frontend computation) | 13 | B1-B9, B11, C1-C4 |
| **BACKEND-GAP** (API doesn't have data, no workaround) | 1 | B10 |
| **LOWER-PRIORITY** (cosmetic/minor) | 3 | B6, B7, C5, C6 |
| **Total** | **18** | |

---

## 5. Priority Ranking for Implementation

| Priority | Bug(s) | Effort | Impact |
|:--------:|--------|:------:|:------:|
| **P0** | A1 (field name fix) | 5 min | Unblocks store health grid |
| **P0** | B1 (stock health computation) | 2 hr | Store health cards visible |
| **P0** | B2+B3+B4 (restaurant name resolver) | 2 hr | Names visible on 3+ screens |
| **P1** | C1 (TransferDetail snapshot+impact) | 4 hr | Biggest intelligence feature |
| **P1** | B9 (Consumption intelligence) | 3 hr | Days-of-cover, trend |
| **P1** | C2 (DirectDispatch auto-detect) | 3 hr | Key dispatch intelligence |
| **P2** | C3 (ReceiveDialog comparisons) | 1.5 hr | Discrepancy visibility |
| **P2** | C4 (ApproveWaveDialog FEFO) | 1.5 hr | FEFO auto-select |
| **P2** | B5 (HierarchySummary health) | 1.5 hr | Health column |
| **P2** | B8 (IngredientCatalogue cross-ref) | 2 hr | Cross-ref columns |
| **P2** | B11 (HierarchyMgmt push status) | 2 hr | Push sync status |
| **P3** | B6, B7, C5, C6 | 1 hr each | Cosmetic enhancements |
| **DEFER** | B10 (Vendor history) | — | Needs backend API (G-017) |

**Estimated total effort:** ~24 hours

---

## 6. New Backend Gap

| ID | Gap | Priority | Notes |
|----|-----|:--------:|-------|
| **G-017** | Vendor purchase history API (last_purchase_date, avg_order_value, total_orders) | P2 | No workaround — VendorManagement intelligence blocked |

---

*This Intake is COMPLETE. Proceed to Artifact 2 (Impact Analysis) for per-file change mapping.*
