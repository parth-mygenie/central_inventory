# Implementation Plan — BUG-029 through BUG-035

> **Gate:** 3 (Implementation Plan)
> **Agent Role:** PLANNING
> **Date:** 2026-06-15
> **Sprint:** S3
> **Depends on:** Impact Analysis `BUGBATCH_029_035_ARTIFACT_2_IMPACT_ANALYSIS.md`

---

## Scope Lock

**Files WILL change:**
1. `frontend/src/components/central-inventory/IngredientCatalogue.jsx` (BUG-029)
2. `frontend/src/components/central-inventory/PurchaseOrderCreate.jsx` (BUG-030)
3. `frontend/src/components/central-inventory/StockInventorySummary.jsx` (BUG-031, BUG-032, BUG-033)
4. `frontend/src/hooks/useStockInventory.js` (BUG-032)
5. `frontend/src/components/central-inventory/DirectDispatchForm.jsx` (BUG-033)
6. `frontend/src/components/central-inventory/WastageEntryForm.jsx` (BUG-033)
7. `frontend/src/components/central-inventory/SubRecipeMaster.jsx` (BUG-034)
8. `frontend/src/components/central-inventory/ProductionHistory.jsx` (BUG-035)

**Files will NOT touch:** `api.js`, `terminology.js`, `screenVisibility.js`, `server.py`, `App.js`, any frozen file.

---

## Execution Sequence

| # | Bug | File(s) | Summary |
|---|-----|---------|---------|
| 1 | BUG-029 | IngredientCatalogue.jsx | Name-based fallback join for consumption map |
| 2 | BUG-030 | PurchaseOrderCreate.jsx | display_qty, daily-consumption API, rate=0, search |
| 3 | BUG-031 | StockInventorySummary.jsx | Conditional tabs, filter Sub Recipe category |
| 4 | BUG-032 | useStockInventory.js + StockInventorySummary.jsx | Hybrid segment loading (Option C), expiry inline, hide Adjust Stock |
| 5 | BUG-033 | DirectDispatchForm.jsx + WastageEntryForm.jsx | Read ?item= param, pre-select |
| 6 | BUG-034 | SubRecipeMaster.jsx | Delete → active/inactive toggle |
| 7 | BUG-035 | ProductionHistory.jsx | Sum qty from segments, unit normalization |

---

## Edit 1: BUG-029 — IngredientCatalogue.jsx

### Edit 1a: Add name-keyed fallback to consumptionMap builder (lines 419-431)

**Current (lines 418-431):**
```js
      // Aggregate by ingredient_id
      const cMap = {};
      details.forEach((d) => {
        const ingId = d.ingredient_id;
        if (!ingId) return;
        const parsed = parseQtyString(d.quantity_deducted);
        if (!cMap[ingId]) cMap[ingId] = { totalQty: 0, unit: parsed.unit };
        cMap[ingId].totalQty += parsed.value;
      });
      // Convert to daily rate
      const result = {};
      Object.entries(cMap).forEach(([id, data]) => {
        result[id] = { dailyQty: data.totalQty / days, unit: data.unit, totalQty: data.totalQty };
      });
```

**New:**
```js
      // Aggregate by ingredient_id AND ingredient_name (for fallback join)
      const cMap = {};
      const nameMap = {}; // BUG-029: name-based fallback
      details.forEach((d) => {
        const ingId = d.ingredient_id;
        const ingName = (d.ingredient_name || "").toLowerCase().trim();
        if (!ingId && !ingName) return;
        const parsed = parseQtyString(d.quantity_deducted);
        if (ingId) {
          if (!cMap[ingId]) cMap[ingId] = { totalQty: 0, unit: parsed.unit };
          cMap[ingId].totalQty += parsed.value;
        }
        if (ingName) {
          if (!nameMap[ingName]) nameMap[ingName] = { totalQty: 0, unit: parsed.unit };
          nameMap[ingName].totalQty += parsed.value;
        }
      });
      // Convert to daily rate — merge id-keyed + name-keyed
      const result = {};
      Object.entries(cMap).forEach(([id, data]) => {
        result[id] = { dailyQty: data.totalQty / days, unit: data.unit, totalQty: data.totalQty };
      });
      // BUG-029: Add name-keyed entries for fallback lookup
      Object.entries(nameMap).forEach(([name, data]) => {
        result[`name:${name}`] = { dailyQty: data.totalQty / days, unit: data.unit, totalQty: data.totalQty };
      });
```

### Edit 1b: Update lookup in IngredientIntelligence (line 79)

**Current (line 79):**
```js
    const consumption = consumptionMap[item.id] || null;
```

**New:**
```js
    // BUG-029: fallback to name-based lookup when ID doesn't match
    const consumption = consumptionMap[item.id] || consumptionMap[`name:${(item.stock_title || "").toLowerCase().trim()}`] || null;
```

### Verify
- Login as `manager@germanfluid.com`, navigate to Raw Material Master
- Expand any ingredient row (e.g. Whole Wheat Flour)
- Daily Consumption should show a non-zero value instead of "—"

---

## Edit 2: BUG-030 — PurchaseOrderCreate.jsx

### Edit 2a: Add consumption data fetching + state

Add new state and fetch after existing `fetchData`:

**After line 74 (`const [vendorSearch, setVendorSearch] = useState("");`):**
```js
  const [consumptionMap, setConsumptionMap] = useState({}); // BUG-030: real consumption data
```

**After line 99 (`useEffect(() => { fetchData(); }, [fetchData]);`):**
```js
  // BUG-030: Fetch real consumption data from daily-consumption-report
  useEffect(() => {
    const loadConsumption = async () => {
      try {
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 14);
        const resp = await api.getDailyConsumptionReport({
          fromDate: fromDate.toISOString().split("T")[0],
          toDate: toDate.toISOString().split("T")[0],
        });
        const details = resp.data?.stock_details || [];
        const days = 14;
        const cMap = {};
        const nameMap = {};
        details.forEach((d) => {
          const ingId = d.ingredient_id;
          const ingName = (d.ingredient_name || "").toLowerCase().trim();
          const parsed = parseQtyString(d.quantity_deducted);
          if (ingId) { if (!cMap[ingId]) cMap[ingId] = { totalQty: 0, unit: parsed.unit }; cMap[ingId].totalQty += parsed.value; }
          if (ingName) { if (!nameMap[ingName]) nameMap[ingName] = { totalQty: 0, unit: parsed.unit }; nameMap[ingName].totalQty += parsed.value; }
        });
        const result = {};
        Object.entries(cMap).forEach(([id, data]) => { result[id] = { dailyQty: data.totalQty / days, unit: data.unit }; });
        Object.entries(nameMap).forEach(([name, data]) => { result[`name:${name}`] = { dailyQty: data.totalQty / days, unit: data.unit }; });
        setConsumptionMap(result);
      } catch (e) { console.warn("[PO] consumption data:", e); }
    };
    loadConsumption();
  }, []);
```

Add `parseQtyString` helper (copy from IngredientCatalogue) near top of file, after `isSubRecipeItem`:
```js
function parseQtyString(str) {
  if (!str) return { value: 0, unit: "" };
  const parts = String(str).trim().split(/\s+/);
  return { value: parseFloat(parts[0]) || 0, unit: parts[1] || "" };
}
```

### Edit 2b: Fix display_qty + consumption in initVendorLines (lines 127-135)

**Current (lines 127-135):**
```js
      let dailyConsumption = 0;
      if (sortedDates.length >= 2) {
        const days = Math.max(1, (sortedDates[sortedDates.length - 1] - sortedDates[0]) / (1000 * 60 * 60 * 24));
        dailyConsumption = totalPurchased / days;
      }

      const currentQty = Number(item.cal_quantity) || 0;
      const daysOfCover = dailyConsumption > 0 ? Math.floor(currentQty / dailyConsumption) : null;
      const isLow = item.is_low_stock || currentQty === 0;
```

**New:**
```js
      // BUG-030: Use real consumption from daily-consumption-report, display_qty for stock
      const cData = consumptionMap[item.id] || consumptionMap[`name:${(item.stock_title || "").toLowerCase().trim()}`];
      const dailyConsumption = cData ? cData.dailyQty : 0;

      const currentQty = Number(item.display_qty) || 0; // BUG-030: display_qty not cal_quantity
      const daysOfCover = dailyConsumption > 0 ? Math.floor(currentQty / dailyConsumption) : null;
      const isLow = item.is_low_stock || currentQty === 0;
```

Add `consumptionMap` to the dependency scope: `handleSelectVendor` must reference it. Since it's declared inside the component, it's already in scope.

### Edit 2c: Fix display_qty + consumption in initNeedLines (lines 178-192)

**Current (lines 178-192):**
```js
      const qty = Number(item.cal_quantity) || 0;
      const isLow = item.is_low_stock;
      const isEmpty = qty === 0;
      const vendorRates = getCheapestVendor(item.stock_title, item.id, purchaseData, vendors);
      const cheapest = vendorRates[0];
      // Estimate daily consumption from purchase data
      const itemRecords = purchaseData.filter((r) => r.Ingredient_Name === item.stock_title || r.ingredient_id === item.id);
      const sortedDates = itemRecords.map((r) => new Date(r.Purchase_Date)).sort((a, b) => a - b);
      let dailyConsumption = 0;
      const totalPurchasedQty = itemRecords.reduce((s, r) => s + (Number(r.stock_quantity_raw) || 0), 0);
      if (sortedDates.length >= 2) {
        const days = Math.max(1, (sortedDates[sortedDates.length - 1] - sortedDates[0]) / (1000 * 60 * 60 * 24));
        dailyConsumption = totalPurchasedQty / days;
      }
      const daysOfCover = dailyConsumption > 0 ? Math.floor(qty / dailyConsumption) : null;
```

**New:**
```js
      const qty = Number(item.display_qty) || 0; // BUG-030: display_qty not cal_quantity
      const isLow = item.is_low_stock;
      const isEmpty = qty === 0;
      const vendorRates = getCheapestVendor(item.stock_title, item.id, purchaseData, vendors);
      const cheapest = vendorRates[0];
      // BUG-030: Use real consumption from daily-consumption-report
      const cData = consumptionMap[item.id] || consumptionMap[`name:${(item.stock_title || "").toLowerCase().trim()}`];
      const dailyConsumption = cData ? cData.dailyQty : 0;
      const daysOfCover = dailyConsumption > 0 ? Math.floor(qty / dailyConsumption) : null;
```

Add `consumptionMap` to `initNeedLines` dependency: change line 220 `[rawMaterialItems, purchaseData, vendors]` to `[rawMaterialItems, purchaseData, vendors, consumptionMap]`.

### Edit 2d: Fix KPI cal_quantity (lines 264-265)

**Current:**
```js
    const oos = rawMaterialItems.filter((i) => (Number(i.cal_quantity) || 0) === 0).length;
    const low = rawMaterialItems.filter((i) => i.is_low_stock && (Number(i.cal_quantity) || 0) > 0).length;
```

**New:**
```js
    const oos = rawMaterialItems.filter((i) => (Number(i.display_qty) || 0) === 0).length; // BUG-030
    const low = rawMaterialItems.filter((i) => i.is_low_stock && (Number(i.display_qty) || 0) > 0).length; // BUG-030
```

### Edit 2e: Send rate=0 to API (lines 284, 312)

**Line 284: current** `expected_rate: Number(l.expected_rate),`
**New:** `expected_rate: 0, // BUG-030: always send 0 to API`

**Line 312: current** `expected_rate: Number(l.expected_rate),`
**New:** `expected_rate: 0, // BUG-030: always send 0 to API`

### Edit 2f: Add search bar to By Item Need mode

**Before the `<Card>` at line 575, add:**
```jsx
          {/* BUG-030: Search for item-need mode */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input data-testid="po-need-search" placeholder="Search items..." value={needSearch} onChange={(e) => setNeedSearch(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
```

Add state: `const [needSearch, setNeedSearch] = useState("");`

Filter needLines in render: replace `{needLines.map(` with a filtered version:
```js
{needLines.filter((l) => !needSearch.trim() || l.stock_title.toLowerCase().includes(needSearch.toLowerCase())).map(
```

### Verify
- Login, go to Purchase → Create PO
- By Vendor mode: stock column should show display_qty (e.g. 29.87 kg not 29865)
- By Item Need mode: search bar visible, DoC should use real consumption data
- Submit PO → check backend receives expected_rate: 0

---

## Edit 3: BUG-031 — StockInventorySummary.jsx

### Edit 3a: Conditional tabs based on URL type (lines 224-243)

**Current (lines 224-243):** Always renders 3 tabs (all, fg, raw)

**New:** Filter tabs based on `defaultStockType`:
```jsx
      {/* CR-029: Stock type tabs — BUG-031: conditional based on URL type */}
      <div className="flex gap-1 mb-4" data-testid="stock-type-tabs">
        {[
          { value: "all", label: `All (${totalItems})` },
          { value: "fg", label: `Finished Goods (${fgCount})` },
          { value: "raw", label: `Raw Materials (${rawCount})` },
        ].filter((tab) => {
          // BUG-031: When navigated with ?type=raw or ?type=fg, only show that tab
          if (defaultStockType === "raw") return tab.value === "raw";
          if (defaultStockType === "fg") return tab.value === "fg";
          return true; // "all" or no param → show all tabs
        }).map((tab) => (
```

### Edit 3b: Filter "Sub Recipe" from category dropdown (line 96)

**Current (line 96):**
```js
  const categories = useMemo(() => Object.keys(categoryCounts).sort(), [categoryCounts]);
```

**New:**
```js
  // BUG-031: Filter out "Sub Recipe" from category filter
  const categories = useMemo(() => Object.keys(categoryCounts).filter((c) => c.toLowerCase() !== "sub recipe").sort(), [categoryCounts]);
```

### Verify
- Navigate to `/inventory?type=raw` → only Raw Materials tab shown, no "Sub Recipe" in category dropdown
- Navigate to `/inventory` → all 3 tabs visible

---

## Edit 4: BUG-032 — useStockInventory.js + StockInventorySummary.jsx

### Edit 4a: Hybrid segment loading in useStockInventory.js

Add a second fetch (Option C — background segment load):

**After line 48 (`useEffect(() => { fetchInventory(); }, [fetchInventory]);`):**
```js
  // BUG-032 Option C: Background load with segments after initial render
  useEffect(() => {
    if (loading) return; // wait for initial load
    let cancelled = false;
    const loadSegments = async () => {
      try {
        const resp = await api.getStockInventory({ includeSegments: true, segmentLimit: 5, includeConsumption: true });
        if (cancelled) return;
        const data = resp.data;
        setStocks(data.current_stocks || []);
      } catch (e) {
        // silent — segments are enhancement, not critical
        console.warn("[useStockInventory] segment load:", e);
      }
    };
    loadSegments();
    return () => { cancelled = true; };
  }, [loading]); // fires once after initial load completes
```

Note: This will re-set `stocks` with enriched data. The `current_stocks` items will now have `segments_preview` and `consumption_summary` populated.

### Edit 4b: Expiry Risk column — show nearest expiry date (StockInventorySummary.jsx lines 444-449)

**Current:**
```jsx
                  {/* Expiry Risk */}
                  <TableCell className="py-2.5 text-center">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground" data-testid={`expiry-risk-${item.id}`}>
                      View detail
                    </span>
                  </TableCell>
```

**New:**
```jsx
                  {/* Expiry Risk — BUG-032: show nearest expiry date from segments */}
                  <TableCell className="py-2.5 text-center">
                    {(() => {
                      const segs = item.segments_preview || [];
                      const validDates = segs.map(s => s.expiry_date).filter(Boolean).sort();
                      const nearest = validDates[0];
                      if (!nearest) return <span className="text-[10px] text-muted-foreground" data-testid={`expiry-risk-${item.id}`}>—</span>;
                      const daysLeft = Math.ceil((new Date(nearest + "T23:59:59") - new Date()) / 86400000);
                      const isExpired = daysLeft < 0;
                      const isNear = daysLeft >= 0 && daysLeft < 14;
                      return (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${isExpired ? "bg-red-100 text-red-700" : isNear ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`} data-testid={`expiry-risk-${item.id}`}>
                          {isExpired ? `Expired` : `${daysLeft}d`}
                        </span>
                      );
                    })()}
                  </TableCell>
```

### Edit 4c: Hide "Adjust Stock" in ExpandedStockDetail (line 635-637)

**Remove these 3 lines:**
```jsx
            <Button variant="outline" size="sm" className="w-full h-7 text-xs justify-start gap-2" onClick={() => navigate(`/adjustment/new?item=${item.id}`)} data-testid={`action-adjust-${item.id}`}>
              Adjust Stock
            </Button>
```

### Edit 4d: ExpandedStockDetail — segments now come from background load

No code change needed here — `item.segments_preview` will be populated after the background fetch (Edit 4a). The existing code at line 571 already reads `item.segments_preview || []`. Once background load completes, React re-renders with real segment data.

### Verify
- Navigate to Stock Inventory → page loads fast with basic data
- After a few seconds, Expiry Risk column updates from "—" to actual dates
- Expand any row → FEFO segments show (not "No segments")
- "Adjust Stock" button is gone from expanded row

---

## Edit 5: BUG-033 — DirectDispatchForm.jsx + WastageEntryForm.jsx

### Edit 5a: DirectDispatchForm — read ?item= param

**Add import at top (line 2):**
```js
import { useNavigate, useSearchParams } from "react-router-dom";
```

**Add after existing state declarations (around line 51):**
```js
  const [searchParams] = useSearchParams(); // BUG-033
  const preselectedItemId = searchParams.get("item"); // BUG-033
```

The DirectDispatchForm uses a coverage-based dispatch table where items are in `dispatchRows`. The pre-selection should scroll to / highlight the pre-selected item. Since the form auto-populates all items in the dispatch table, the fix is to auto-check the pre-selected item's row.

Implementation: After `dispatchRows` are populated (in the effect that builds them), find the row matching `preselectedItemId` and set it as checked.

### Edit 5b: WastageEntryForm — read ?item= param and pre-select

**Add import (line 2):**
```js
import { useNavigate, useSearchParams } from "react-router-dom";
```

**Add after state declarations (after line 34):**
```js
  const [searchParams] = useSearchParams(); // BUG-033
  const preselectedItemId = searchParams.get("item"); // BUG-033
```

**Add effect to pre-select (after the data load effect):**
```js
  // BUG-033: Pre-select ingredient from URL param
  useEffect(() => {
    if (preselectedItemId && items.length > 0 && !selectedItem) {
      const match = items.find(i => String(i.id) === preselectedItemId);
      if (match) setSelectedItem(String(match.id));
    }
  }, [preselectedItemId, items, selectedItem]);
```

### Verify
- From Stock Inventory expanded row, click "Dispatch" → DirectDispatchForm opens with that ingredient highlighted
- From Stock Inventory expanded row, click "Record Wastage" → WastageEntryForm opens with ingredient pre-selected in dropdown

---

## Edit 6: BUG-034 — SubRecipeMaster.jsx

### Edit 6a: Replace delete button with active/inactive toggle

**Import Switch component (add to line 6 area):**
```js
import { Switch } from "@/components/ui/switch";
```

**Replace the delete button block (line 317-318):**
Current:
```jsx
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive gap-1" onClick={() => setDeleteConfirm(true)} data-testid="delete-subrecipe-btn">
                  <Trash2 className="h-3 w-3" /> Delete
```
New:
```jsx
                <div className="flex items-center gap-2" data-testid="toggle-subrecipe-active">
                  <span className="text-[10px] text-muted-foreground">Active</span>
                  <Switch checked={true} onCheckedChange={() => toast({ title: "Status toggle saved", description: "Backend API pending — will sync when available." })} />
                </div>
```

**Remove delete-related code:**
- Line 173: `const [deleteConfirm, setDeleteConfirm] = useState(false);` → remove
- Lines 249-258: `handleDelete` function → remove
- Lines 429-437: `ConfirmActionDialog` for delete → remove
- Line 13: Remove `Trash2` from import (keep other icons)

### Verify
- Navigate to Sub-Recipe Master → select any sub-recipe
- "Delete" button replaced with Active toggle switch
- Toggling shows toast "Backend API pending — will sync when available"

---

## Edit 7: BUG-035 — ProductionHistory.jsx

### Edit 7a: Compute total qty from segments in AllocationRow (line 134-153)

**Current AllocationRow (lines 134-153):**
```jsx
function AllocationRow({ alloc, allocId, segments, isOpen, onToggle }) {
  return (
    <>
      <tr data-testid={`alloc-row-${allocId}`} className="border-b cursor-pointer hover:bg-accent/30" onClick={segments.length > 0 ? onToggle : undefined}>
        <td className="py-1.5 px-2 w-6">{segments.length > 0 && (isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}</td>
        <td className="py-1.5 px-2 font-medium">{alloc.ingredient_name || `Item #${allocId}`}</td>
        <td className="py-1.5 px-2 text-right tabular-nums">{fmt(alloc.quantity_consumed)}</td>
        <td className="py-1.5 px-2 text-right">{alloc.unit || ""}</td>
        <td className="py-1.5 px-2 text-right tabular-nums font-semibold">₹{fmt(alloc.line_cost)}</td>
      </tr>
```

**New:**
```jsx
function AllocationRow({ alloc, allocId, segments, isOpen, onToggle }) {
  // BUG-035: Compute total qty from segments if ingredient-level qty is missing
  const computedQty = useMemo(() => {
    if (alloc.quantity_consumed != null && alloc.quantity_consumed !== "" && alloc.quantity_consumed !== 0) {
      return { value: alloc.quantity_consumed, unit: alloc.unit || "" };
    }
    if (segments.length === 0) return { value: null, unit: alloc.unit || "" };
    // Sum segment quantities — normalize units if needed
    let total = 0;
    const baseUnit = (segments[0]?.unit || alloc.unit || "").toLowerCase();
    segments.forEach(seg => {
      const segQty = Number(seg.qty_cal || seg.quantity || 0);
      const segUnit = (seg.unit || baseUnit).toLowerCase();
      // BUG-035: Unit normalization
      if (segUnit === "gm" && baseUnit === "kg") total += segQty / 1000;
      else if (segUnit === "kg" && baseUnit === "gm") total += segQty * 1000;
      else if (segUnit === "ml" && baseUnit === "ltr") total += segQty / 1000;
      else if (segUnit === "ltr" && baseUnit === "ml") total += segQty * 1000;
      else total += segQty;
    });
    return { value: total, unit: baseUnit };
  }, [alloc, segments]);

  return (
    <>
      <tr data-testid={`alloc-row-${allocId}`} className="border-b cursor-pointer hover:bg-accent/30" onClick={segments.length > 0 ? onToggle : undefined}>
        <td className="py-1.5 px-2 w-6">{segments.length > 0 && (isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}</td>
        <td className="py-1.5 px-2 font-medium">{alloc.ingredient_name || `Item #${allocId}`}</td>
        <td className="py-1.5 px-2 text-right tabular-nums">{fmt(computedQty.value)}</td>
        <td className="py-1.5 px-2 text-right">{computedQty.unit}</td>
        <td className="py-1.5 px-2 text-right tabular-nums font-semibold">₹{fmt(alloc.line_cost)}</td>
      </tr>
```

**Add `useMemo` to import on line 1:**
```js
import React, { useState, useEffect, useCallback, useMemo } from "react";
```

### Verify
- Navigate to Production History → expand any run
- Ingredient-level Qty column shows total (not "—")
- If ingredient has batches in gm and kg, total is correctly normalized

---

## Verification Matrix

| Edit # | Bug | File | How to Verify | Automated? |
|--------|-----|------|---------------|:---:|
| 1 | BUG-029 | IngredientCatalogue.jsx | Raw Material Master: expand ingredient → Daily Consumption ≠ 0 | NO |
| 2a | BUG-030 | PurchaseOrderCreate.jsx | PO Create: consumption from daily-report API | NO |
| 2b | BUG-030 | PurchaseOrderCreate.jsx | Stock column shows display_qty (e.g. 29.87 not 29865) | NO |
| 2d | BUG-030 | PurchaseOrderCreate.jsx | By Item Need: search bar visible and functional | NO |
| 2e | BUG-030 | PurchaseOrderCreate.jsx | Submit PO: backend receives expected_rate: 0 | YES (curl) |
| 3a | BUG-031 | StockInventorySummary.jsx | `/inventory?type=raw`: only Raw Materials tab shown | NO |
| 3b | BUG-031 | StockInventorySummary.jsx | Category dropdown: no "Sub Recipe" entry | NO |
| 4b | BUG-032 | StockInventorySummary.jsx | Expiry Risk shows date/days, not "View detail" | NO |
| 4c | BUG-032 | StockInventorySummary.jsx | Expanded row: no "Adjust Stock" button | NO |
| 4d | BUG-032 | StockInventorySummary.jsx | Expanded row: FEFO segments appear (after brief load) | NO |
| 5a | BUG-033 | DirectDispatchForm.jsx | Navigate from Stock Inv → Dispatch: item highlighted | NO |
| 5b | BUG-033 | WastageEntryForm.jsx | Navigate from Stock Inv → Wastage: item pre-selected | NO |
| 6 | BUG-034 | SubRecipeMaster.jsx | Active toggle visible, toast on toggle, no Delete button | NO |
| 7 | BUG-035 | ProductionHistory.jsx | Ingredient Qty shows total, not "—" | NO |

---

## Post-Code Registry Checklist (for IMPLEMENTATION agent)

- [ ] registry.json: BUG-029→035 status → IMPLEMENTED, artifact_refs updated
- [ ] L4_BUG_TRACKER.md: rows updated
- [ ] L7_FILE_OWNERSHIP.md: 8 files listed
- [ ] Code markers: `// BUG-029` through `// BUG-035` in every modified file
- [ ] Dashboard drift check: `node control/gen_dashboard_data.js --check` → PASS
