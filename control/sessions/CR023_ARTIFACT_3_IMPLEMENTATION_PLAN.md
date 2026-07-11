# CR-023 Artifact 3 — Implementation Plan

> **Date:** 2026-06-01
> **CR:** CR-023
> **Author:** E1
> **Status:** COMPLETE

---

## 1. Open Questions Resolved

| # | Question | Answer | Source |
|---|----------|--------|--------|
| Q1 | Does login include self restaurant info? | YES — `restaurant_id=1, restaurant_name="My Genie", restaurant_type_flag="master"` | Login API response |
| Q2 | Does hierarchy-summary include self? | NO — only children | curl verified |
| Q3 | Does hierarchy-detail include self? | NO — returns 9 children, not rid=1 | curl verified |
| Q4 | Push-form category diff computable? | YES — `source_entities` vs `child_existing` by category, can count diff | curl verified: 180 source vs 17 child = 163 behind |
| Q5 | Consumption `date_range` shape? | Array: `["2026-05-25", "2026-06-01"]` — compute days from this | curl verified |
| Q6 | Transfer lines have `requested_qty`? | YES — raw `requested_qty` present + normalizer enriches `requestedDisplayQty` | curl verified |
| Q7 | useLoginContext has restaurant_name? | YES — stored from login response | Code verified line 113 |
| Q8 | Recipe cross-ref available? | NO recipes currently (deleted). Will be empty until re-created. Acceptable — column shows "0 recipes" | curl verified |

### Key Decision: Restaurant Name Map Source

The `useRestaurantMap` hook will merge 3 sources:
1. `hierarchy-summary(store_type=franchise)` → franchise stores with names
2. `hierarchy-summary(store_type=central)` → central stores with names
3. Self from `useLoginContext` → `{ restaurantId: name, type }` (rid=1 not in hierarchy responses)

This gives a **complete map** of all 10 stores in one go.

---

## 2. Execution Batches

Implementation is split into **6 batches**. Each batch ends with a test checkpoint.

---

### BATCH 1: Foundation — `useRestaurantMap` + OperationsHub Fix
**Bugs:** A1, B1
**Files:** NEW `useRestaurantMap.js`, MODIFY `OperationsHub.jsx`
**Test after:** Store Health Grid visible with health cards

#### Step 1.1: Create `hooks/useRestaurantMap.js`
```
- Fetch hierarchy-summary (franchise) + hierarchy-summary (central)
- Merge stores[] into map: { rid: { name, type } }
- Add self from useLoginContext (restaurantId, restaurant_name, restaurantType)
- Export: { restaurantMap, loading, error }
- Graceful fallback: if fetch fails, return empty map (screens fall back to "Store #ID")
```

#### Step 1.2: Fix `OperationsHub.jsx`
```
Line 84: Change data?.children || data?.child_stores → data?.stores || []
Lines 76-94: After getting stores, batch-call getHierarchyDetail per store (max 6)
  For each: count items where is_low_stock=true → lowCount
  Count items where display_quantity=0 → outCount
  Count items where !is_low_stock && display_quantity>0 → adequateCount
  Store as: { ...store, out_of_stock_count, low_stock_count, adequate_count, total_items }
Add: import useRestaurantMap, use for activity feed names (todayActivity section)
```

**Test checkpoint:** Login as Central → Hub shows Store Health grid with colored cards

---

### BATCH 2: Restaurant Names — PendingQueues, TransferDetail, HistoryLedger
**Bugs:** B2, B3, B4
**Files:** MODIFY `PendingQueues.jsx`, `TransferDetail.jsx`, `HistoryLedger.jsx`
**Test after:** Store names visible on all 3 screens

#### Step 2.1: Fix `PendingQueues.jsx`
```
Add: import useRestaurantMap
Lines 135-136: Replace item.from_restaurant_name fallback with restaurantMap[item.from_restaurant_id]?.name || "Store #ID"
Line 162: Replace mapRestaurantType(item.from_restaurant_type) with restaurantMap lookup
Line 252: Same pattern
```

#### Step 2.2: Fix `TransferDetail.jsx`
```
Add: import useRestaurantMap
Lines 281-284: Replace from_restaurant_name chain with restaurantMap[data.from_restaurant_id]?.name
```

#### Step 2.3: Fix `HistoryLedger.jsx`
```
Add: import useRestaurantMap
Pass restaurantMap as historyNameMap to deriveLedgerEntries() — replaces the empty map
Line 43: const nameMap = restaurantMap || historyNameMap || {};
(Existing fallback chain in lines 48-51 already handles the map correctly)
```

**Test checkpoint:** Navigate to Pending Queues → see "DemoCentral1" instead of "—". Open a transfer → see real store names. Go to History → see real names in from/to columns.

---

### BATCH 3: TransferDetail Intelligence (biggest feature)
**Bugs:** C1
**Files:** MODIFY `TransferDetail.jsx`
**Test after:** Store Snapshot + Impact Summary visible on requested transfers

#### Step 3.1: Add state + API fetch
```
New state: requesterStock, ownStock, snapshotLoading
New useEffect: when transfer loads + status=requested + isTopLevel:
  - Call getHierarchyDetail(transfer.to_restaurant_id) → set requesterStock from child_stock_summary
  - Call getStockInventory() → set ownStock from current_stocks
```

#### Step 3.2: Render REQUESTER STORE SNAPSHOT section
```
Insert after From/To header card (after ~line 320):
- Section title: "REQUESTER STORE SNAPSHOT — {storeName}"
- Stat cards: Out of Stock (red) | Low Stock (amber) | Adequate | Total Items
- Table: Item | Category | Stock Level | Min Threshold | Status (OUT/LOW/OK badge) | In This Request? (Yes — Xqty / Not requested)
- Footer note: "X out-of-stock items not included in this request" (if applicable)
```

#### Step 3.3: Render APPROVAL IMPACT ON YOUR STOCK section
```
Insert after snapshot:
- Section title: "APPROVAL IMPACT ON YOUR STOCK" (amber left-border)
- Table: Item | Requested | Your Stock | After Approval
- After Approval = Your Stock - Requested (show negative in red)
- Footer: "Approving will reduce your stock as shown above"
```

#### Step 3.4: Gate visibility
```
Only render snapshot + impact when:
  - isTopLevel (Central role)
  - transfer.status in ["requested", "approved", "partially_approved"]
  - requesterStock loaded successfully
If hierarchy-detail fails → silently skip (existing view remains)
```

**Test checkpoint:** Login as Central → Pending Queues → click a request → see Requester Store Snapshot table with OUT/LOW badges + Approval Impact table with your stock projections.

---

### BATCH 4: Consumption Intelligence + DirectDispatch Auto-Detect
**Bugs:** B9, C2
**Files:** MODIFY `DailyConsumptionReport.jsx`, `DirectDispatchForm.jsx`
**Test after:** Consumption has intelligence columns, Dispatch has auto-detect table

#### Step 4.1: Fix `DailyConsumptionReport.jsx`
```
On mount: also fetch getStockInventory() for current stock cross-join
Build cross-join: match stock_summary[].ingredient_name with stock_inventory[].stock_title (lowercase)
Compute per row:
  - current_stock: from stock inventory match
  - date_range_days: diff between date_range[1] and date_range[0]
  - avg_daily: total_consumed / date_range_days (in display units)
  - days_of_cover: current_stock / avg_daily (if avg_daily > 0)
  - trend: tag as "above avg" if total_consumed > 1.5x of avg, "normal" otherwise
Add 3 new table columns: Current Stock | Days of Cover | Trend
Add stat cards: Total Consumed | Items Consumed | Above Avg (amber) | Stores Covered
```

#### Step 4.2: Fix `DirectDispatchForm.jsx`
```
New state: destStock, destLoading
New useEffect: when selectedDest changes:
  - Call getHierarchyDetail(selectedDest) → destStock from child_stock_summary
  - Already have ownStock from existing getStockInventory call
New section after StoreHealthStrip: "WHAT THIS STORE NEEDS"
  - Filter destStock items where display_quantity < min_qty_alert (gap > 0)
  - Table: Item | Their Stock | Min Threshold | Gap | Qty to Send (editable) | Your Stock After
  - "Your Stock After" = own stock - qty_to_send
  - Clicking a row pre-populates the dispatch item row
Gate: Only show when selectedDest is set and destStock loaded
```

**Test checkpoint:** Go to Consumption Report → see Current Stock, Days of Cover, Trend columns. Go to Direct Dispatch → select a destination → see "What This Store Needs" table.

---

### BATCH 5: Dialog Intelligence + HierarchySummary Health
**Bugs:** C3, C4, B5
**Files:** MODIFY `ReceiveDialog.jsx`, `ApproveWaveDialog.jsx`, `HierarchySummary.jsx`
**Test after:** Receive shows comparisons, Approve has FEFO, HierarchySummary has health

#### Step 5.1: Fix `ReceiveDialog.jsx`
```
Per line item: show "Dispatched: X | Requested: Y" with mismatch badge if different
  - Data: line.dispatchedDisplayTotal vs line.requestedDisplayQty (already in normalized data)
  - Badge: "Z less than requested" in amber if dispatched < requested
Footer: "After receiving: Item1 → +X, Item2 → +Y added to your inventory"
  - Needs getStockInventory() for current stock (optional — can just show incoming qty without projection)
```

#### Step 5.2: Fix `ApproveWaveDialog.jsx`
```
In segment picker SelectItem: add expiry badge
  - "Expires in X days" (amber if < 30d)
  - "FEFO Recommended" badge on nearest-expiry segment
Auto-select: when line is included (toggleLine), auto-set segmentId to nearest-expiry segment
Over-approve warning: if approvedQty > segment display_qty, show amber warning
```

#### Step 5.3: Fix `HierarchySummary.jsx`
```
After fetching stores from hierarchy-summary:
  - Batch call getHierarchyDetail per store (max 10, parallel)
  - Compute health: outCount, lowCount, adequateCount from child_stock_summary
  - Store enriched health per restaurant_id
Add 3 columns to table: Out of Stock | Low Stock | Adequate
  - Color-coded: red for out > 0, amber for low > 0
```

**Test checkpoint:** Open a dispatched transfer as Outlet → Receive → see "Dispatched: 5 kg, Requested: 5 kg — Match". Go to Approve dialog → see FEFO badges on segments. Go to Hierarchy Summary → see health columns.

---

### BATCH 6: Catalogues + Polish
**Bugs:** B6, B7, B8, B11, C5, C6
**Files:** MODIFY `ProductCatalogue.jsx`, `RecipeCatalogue.jsx`, `AddonRecipeCatalogue.jsx`, `IngredientCatalogue.jsx`, `HierarchyManagement.jsx`, `DisputeResolutionDialog.jsx`, `SourceSelector.jsx`
**Test after:** All 18 bugs resolved

#### Step 6.1: Fix `IngredientCatalogue.jsx`
```
On mount: fetch getRecipeList() for cross-ref
Build map: ingredient stock_title → count of recipes using it
Add column: "Used in Recipes" (show count, "0" if none)
"Pushed to Stores" — derive from franchise/list children count (approximation)
```

#### Step 6.2: Fix `ProductCatalogue.jsx`
```
On mount: fetch getRecipeList() for cross-ref
Build map: food_name → has_recipe (true if any recipe.food_name matches)
Fix line 103: use cross-ref map instead of f.has_recipe
```

#### Step 6.3: Fix `RecipeCatalogue.jsx` + `AddonRecipeCatalogue.jsx`
```
Derive cost_mapped: recipe has ingredients[] → check if all have non-null/non-zero purchase_price
If no ingredients (current state): show "No ingredients" instead of "—"
```

#### Step 6.4: Fix `HierarchyManagement.jsx`
```
After loading children: batch call getPushForm per child (max visible, parallel)
Compute per child:
  - total_source = sum items across source_entities categories
  - total_child = sum items across child_existing categories
  - items_behind = total_source - total_child
  - push_status = items_behind > 0 ? "Stale" : "Synced"
Add columns: Push Status (Synced/Stale badge) | Items Behind
```

#### Step 6.5: Fix `DisputeResolutionDialog.jsx`
```
Add impact explanation text to Accept/Reject cards:
  Accept: "Acknowledge the damage. {rejected_qty} {unit} {stock_title} written off. No stock returns to sender. Transfer closes as partially received."
  Reject: "Dispute the claim. Transfer reverts to 'dispatched'. Destination must re-receive. Use if damage claim is incorrect."
```

#### Step 6.6: Fix `SourceSelector.jsx`
```
When segment selected + dispatch qty known:
  Show: "Dispatching X from {batch} ({total} avail) → {total - X} remaining"
Note: dispatch qty comes from parent component — need to pass as prop or compute from context
Simpler approach: show "Available: X" for selected segment (already partially there)
Enhanced: if parent passes dispatchQty prop, show remaining calculation
```

**Test checkpoint:** Full regression — every screen validated against preview HTML spec.

---

## 3. Testing Strategy

| After Batch | Test Method | What to Validate |
|:-----------:|-----------|-----------------|
| 1 | Screenshot + curl | Store Health Grid renders with health cards |
| 2 | Screenshot | Real store names on Queues, Transfer, History |
| 3 | Screenshot | Store Snapshot + Impact Summary on TransferDetail |
| 4 | Screenshot | Consumption intelligence columns + Dispatch auto-detect |
| 5 | Screenshot | Receive comparison + FEFO badges + HierarchySummary health |
| 6 | Testing Agent | Full regression — all 18 bugs against Phase 7 spec |

Final testing agent call tests ALL 18 bugs against the preview HTML specifications.

---

## 4. Execution Order — Single File View

| Order | File | Bugs Fixed | Batch |
|:-----:|------|-----------|:-----:|
| 1 | `hooks/useRestaurantMap.js` (NEW) | Foundation for B2,B3,B4 | 1 |
| 2 | `OperationsHub.jsx` | A1, B1 | 1 |
| 3 | `PendingQueues.jsx` | B2 | 2 |
| 4 | `TransferDetail.jsx` | B3, C1 | 2+3 |
| 5 | `HistoryLedger.jsx` | B4 | 2 |
| 6 | `DailyConsumptionReport.jsx` | B9 | 4 |
| 7 | `DirectDispatchForm.jsx` | C2 | 4 |
| 8 | `ReceiveDialog.jsx` | C3 | 5 |
| 9 | `ApproveWaveDialog.jsx` | C4 | 5 |
| 10 | `HierarchySummary.jsx` | B5 | 5 |
| 11 | `IngredientCatalogue.jsx` | B8 | 6 |
| 12 | `ProductCatalogue.jsx` | B6 | 6 |
| 13 | `RecipeCatalogue.jsx` | B7 | 6 |
| 14 | `AddonRecipeCatalogue.jsx` | B7 | 6 |
| 15 | `HierarchyManagement.jsx` | B11 | 6 |
| 16 | `DisputeResolutionDialog.jsx` | C5 | 6 |
| 17 | `SourceSelector.jsx` | C6 | 6 |

**DEFERRED:** `VendorManagement.jsx` (B10) — backend gap G-017

---

## 5. Estimated Time

| Batch | Effort | Cumulative |
|:-----:|:------:|:----------:|
| 1 | 2 hr | 2 hr |
| 2 | 1.5 hr | 3.5 hr |
| 3 | 3 hr | 6.5 hr |
| 4 | 3 hr | 9.5 hr |
| 5 | 2.5 hr | 12 hr |
| 6 | 3 hr | 15 hr |
| Testing | 2 hr | 17 hr |
| **Total** | **~17 hr** | |

---

## 6. Risks & Mitigations

| Risk | Batch | Mitigation |
|------|:-----:|-----------|
| hierarchy-detail N+1 slow | 1, 5 | Max 6-10 stores, Promise.allSettled, graceful degradation |
| Cross-join name mismatch (consumption) | 4 | Normalize both sides to lowercase trim |
| Push-form N+1 for hierarchy mgmt | 6 | Only visible children, paginated |
| ReceiveDialog needs stock-inventory call | 5 | Make optional — show incoming qty without projection if fetch fails |
| TransferDetail snapshot overloads page | 3 | Collapsible section, only for Central viewing requested status |

---

*This Implementation Plan is COMPLETE. Proceed to Artifact 4 (Code Gate) for final review before implementation.*
