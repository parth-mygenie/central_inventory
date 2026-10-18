# CR-026 Artifact 3 — Implementation Plan

> **CR ID:** CR-026
> **Title:** P28 — Production Unit Module (Production Run UI + History)
> **Artifact:** 3 (Implementation Plan)
> **Date:** 2026-06-13
> **Author:** E1 agent
> **Depends on:** Artifact 2 (Impact Analysis) — API discovery complete, gaps documented

---

## 1. Execution Order

```
Phase 1a (Core Form + Nav)  →  Phase 1b (Settings Gate)  →  Phase 2a (Audit Detail)
     ↓                                                            ↓
Phase 3 (Intelligence UI)  →  Phase 2b (History, when G-018)  →  Phase 2c (Cost, when G-019)
```

---

## 2. Phase 1a — Core Production Form + Navigation (~5-6h)

### 2.1 Step 1: API Layer (`services/api.js`)

Add 3 new methods after the existing P24 Stock Detail section:

```js
// ── P28 Production Run ───────────────────────────────────────────

function runProduction({ subRecipeId, quantity, unit, batch, expiryDate }) {
  return client.post("/proxy/v2/inventory/production-run/complete", {
    sub_recipe_id: subRecipeId,
    quantity,
    unit,
    batch,
    expiry_date: expiryDate,
  }).then(r => {
    _invalidateStockCaches();
    _invalidateCache(["getProductionRunHistory:", "getProductionRunDetail:"]);
    return r;
  });
}

function _getProductionRunDetail(runId) {
  return client.get(`/proxy/v2/inventory/production-run/${runId}`);
}
const getProductionRunDetail = _cached("getProductionRunDetail", TTL.MEDIUM, _getProductionRunDetail);

// G-018 STUB: production-run list endpoint does not exist yet.
// Returns empty until backend delivers GET /inventory/production-run.
// When backend is ready: uncomment the real call and remove the stub.
function _getProductionRunHistory(/* { fromDate, toDate, limit, page } = {} */) {
  // STUB — backend gap G-018
  return Promise.resolve({ data: { data: [], pagination: { total: 0 } } });
  // REAL (uncomment when G-018 is delivered):
  // const payload = {};
  // if (fromDate) params.from_date = fromDate;
  // if (toDate) params.to_date = toDate;
  // if (limit) params.limit = limit;
  // if (page) params.page = page;
  // return client.get("/proxy/v2/inventory/production-run", { params: payload });
}
const getProductionRunHistory = _cached("getProductionRunHistory", TTL.SHORT, _getProductionRunHistory);
```

Add to exports:
```js
const api = {
  // ... existing
  // P28 Production
  runProduction,
  getProductionRunDetail,
  getProductionRunHistory,
};
```

### 2.2 Step 2: Screen Visibility + Nav Items (`lib/screenVisibility.js`)

Add screen:
```js
"scr-production": { master: FULL, central: FULL, franchise: HIDDEN },
```

Add nav items (insert after `stock-inventory`, before `hierarchy`):
```js
{
  id: "production",
  screen: "scr-production",
  label: "Production",
  path: "/production/new",
  icon: "Factory",
},
{
  id: "production-history",
  screen: "scr-production",
  label: "Production History",
  path: "/production/history",
  icon: "ClipboardList",
},
```

### 2.3 Step 3: Sidebar Icon (`components/layout/Sidebar.jsx`)

Add imports:
```js
import { ..., Factory, ClipboardList } from "lucide-react";
```

Add to ICON_MAP:
```js
const ICON_MAP = {
  // ... existing
  Factory,
  ClipboardList,
};
```

### 2.4 Step 4: Routes (`App.js`)

Add imports:
```js
import ProductionRunForm from "@/components/central-inventory/ProductionRunForm";
import ProductionHistory from "@/components/central-inventory/ProductionHistory";
```

Add routes inside protected `<Route element={<AppLayout />}>`:
```jsx
<Route path="/production/new" element={<ProductionRunForm />} />
<Route path="/production/history" element={<ProductionHistory />} />
<Route path="/production/:id" element={<ProductionHistory />} />
```

Note: `/production/:id` renders `ProductionHistory` which internally detects the ID param and renders the audit detail view.

### 2.5 Step 5: Hook (`hooks/useProductionRun.js`)

```js
import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/services/api";
import { useLoginContext } from "@/hooks/useLoginContext";

export function useProductionRun() {
  const { restaurantId } = useLoginContext();
  const [subRecipes, setSubRecipes] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [srResp, stockResp, settResp] = await Promise.allSettled([
        api.getSubRecipeList(),
        api.getStockInventory(),
        api.getOperationalSettings(restaurantId),
      ]);

      if (srResp.status === "fulfilled") {
        setSubRecipes(srResp.value.data || []);
      }
      if (stockResp.status === "fulfilled") {
        setStocks(stockResp.value.data?.current_stocks || []);
      }
      if (settResp.status === "fulfilled") {
        const sd = settResp.value.data?.data || settResp.value.data;
        setSettings(sd?.resolved_settings || sd?.stored_settings || null);
      }
    } catch (e) {
      setError(e?.message || "Failed to load production data");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchData();
    }
  }, [fetchData]);

  // Derived
  const productionEnabled = settings?.production_enabled ?? false;
  const allowNegativeStock = settings?.allow_negative_stock ?? true;

  // Build stock lookup: inventory_master_id → { display_qty, cal_quantity, ... }
  const stockMap = {};
  for (const s of stocks) {
    stockMap[s.id] = s;
  }

  return {
    subRecipes,
    stocks,
    stockMap,
    settings,
    productionEnabled,
    allowNegativeStock,
    loading,
    error,
    refresh: fetchData,
  };
}
```

### 2.6 Step 6: Production Run Form (`components/central-inventory/ProductionRunForm.jsx`)

**Component structure:**
```
ProductionRunForm
  ├── production_enabled gate check → BlockedState if false
  ├── Loading / Error states
  ├── SubRecipeSelector (dropdown)
  │     └── Shows: name, output qty per batch, unit, ingredient count
  ├── QuantityInput
  │     ├── Multiplier mode: "How many batches?" → auto-calc total
  │     └── Absolute mode: "Total quantity" → auto-calc multiplier
  ├── BatchInput (text) + ExpiryInput (date picker)
  ├── PreProductionPreview (table)
  │     └── Per ingredient: name, qty needed, stock available, sufficient ✅/❌
  │     └── Insufficient warning banner (gated by allow_negative_stock)
  ├── SubmitButton ("Run Production")
  │     └── Disabled when: !valid || submitting || (insufficient && !allowNegativeStock)
  └── PostProductionConfirmation
        ├── Run ID, reference code, FG name, qty, unit cost, total cost
        ├── "View in Stock" → /inventory/{fg_id}
        ├── "View Audit" → /production/{run_id}
        └── "Run Another" → reset form
```

**Key behaviors:**

| Behavior | Logic |
|----------|-------|
| Sub-recipe selection | `api.getSubRecipeList()` → dropdown. On select, populate ingredient preview. |
| Multiplier ↔ quantity | `totalQty = subRecipe.qty × multiplier`. User can edit either field. |
| Ingredient qty needed | `ingredient.ingredient_qty × multiplier` per ingredient row |
| Stock matching | Match by `ingredient_id` → `stockMap[ingredient_id]` |
| Sufficient check | `stockMap[id].cal_quantity >= requiredQty` (in smallest unit) |
| Batch label | Free text. Auto-suggest: `{RECIPE_SHORT}-{YYYYMMDD}-{SEQ}` |
| Expiry date | Date picker, min = tomorrow |
| Submit | `api.runProduction({ subRecipeId, quantity, unit, batch, expiryDate })` |

### 2.7 Step 7: OperationsHub Quick Action (`OperationsHub.jsx`)

Add a "Run Production" button in the Quick Actions section (for `isTopLevel || isMiddleLevel` roles):

```jsx
{canDo("action-production") && (
  <Button variant="outline" size="sm" onClick={() => navigate("/production/new")}>
    <Factory className="h-3.5 w-3.5 mr-1.5" /> Run Production
  </Button>
)}
```

Add `action-production` to `ACTION_PERMISSIONS` in `screenVisibility.js`:
```js
"action-production": { master: true, central: true, franchise: false },
```

---

## 3. Phase 1b — Settings Gate + Negative Stock Logic (~1h)

Enhance `ProductionRunForm.jsx`:

### 3.1 `production_enabled` Gate

At top of component render:
```jsx
if (!loading && !productionEnabled) {
  return (
    <div data-testid="production-blocked">
      <ShieldX className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <h2>Production Not Enabled</h2>
      <p>Contact your administrator to enable production in Operational Settings.</p>
    </div>
  );
}
```

Pattern: Same as `AddStockPurchaseForm` lines 144-153.

### 3.2 `allow_negative_stock` Logic

In the PreProductionPreview table:

```
For each ingredient:
  if insufficient AND !allowNegativeStock → RED row, blocked
  if insufficient AND allowNegativeStock  → AMBER row, warning
  if sufficient                           → GREEN indicator
```

Submit button:
```
disabled = submitting
  || !selectedRecipe
  || !quantity
  || !batch
  || !expiryDate
  || (hasInsufficientIngredients && !allowNegativeStock)
```

Banner above submit:
```
if hasInsufficientIngredients && !allowNegativeStock:
  "Cannot proceed — negative stock is not allowed and {N} ingredients are insufficient."

if hasInsufficientIngredients && allowNegativeStock:
  "Warning: {N} ingredients have insufficient stock. Production will result in negative inventory."
```

---

## 4. Phase 2a — Production Audit Detail (~2-3h)

### 4.1 Component: `ProductionHistory.jsx` (Audit Section)

When route is `/production/:id`, detect the `id` param and render audit detail:

```
ProductionHistory
  ├── if (id param) → ProductionAuditDetail
  └── else → ProductionHistoryList
```

### 4.2 ProductionAuditDetail Structure

```
ProductionAuditDetail
  ├── Back button → /production/history
  ├── SummaryCard
  │     ├── Reference code (PRD-2026-0010)
  │     ├── Status badge (completed)
  │     ├── Recipe name + output FG item
  │     ├── Planned qty / Actual qty / Unit
  │     ├── Output batch + expiry date
  │     └── Unit cost (₹2.80) / Total cost (₹2,607.85)
  ├── ConsumedAllocationsTable
  │     └── Per ingredient (expandable):
  │           ├── Header: ingredient name | qty consumed | unit | line cost
  │           └── Expanded: segment rows
  │                 ├── Batch | Expiry | Qty | Unit Cost | Alloc Cost
  │                 └── (color-coded by expiry proximity)
  └── OutputSection
        ├── FG item name + inventory_master_id
        ├── Output segment ID
        ├── Batch + Expiry
        └── "View in Stock" link → /inventory/{fg_id}
```

**API:** `api.getProductionRunDetail(id)` → `GET /production-run/{id}`

**Response fields used:**
- `data.reference_code`, `data.status`, `data.bom_sub_recipe_id`
- `data.planned_output_qty`, `data.actual_output_qty`, `data.output_unit`
- `data.output_batch`, `data.output_expiry_date`
- `data.unit_cost`, `data.total_cost`
- `data.output_inventory_master_id` → cross-ref with stock title
- `data.consumed_allocations[]` → per-ingredient with `segment_allocations[]`

---

## 5. Phase 2b — Production History List (G-018 CLOSED) (~2h)

### 5.1 ProductionHistoryList Structure

```
ProductionHistoryList
  ├── Header: "Production History" + date range filter
  ├── Table
  │     ├── Date | Reference | Recipe | Qty | Unit Cost | Total Cost | Status
  │     └── Click row → /production/{id}
  ├── Empty state (while G-018 is missing):
  │     "Production history is being set up. Run history will appear here once available."
  └── Footer: pagination (when data exists)
```

**API:** `api.getProductionRunHistory({ fromDate, toDate, limit, page })` — currently returns empty stub.

**When G-018 is delivered:**
1. Uncomment the real API call in `api.js`
2. Remove the stub `Promise.resolve`
3. UI is already built — just wire the data

### 5.2 Data Testids

```
data-testid="production-history-page"
data-testid="production-history-table"
data-testid="production-run-row-{id}"
data-testid="history-date-from"
data-testid="history-date-to"
data-testid="history-empty-state"
```

---

## 6. Phase 2c — Pre-Run Cost Estimation (G-019 CLOSED) (~1-2h)

When backend adds `unit_cost_at_intake` to stock-inventory segments:

### 6.1 Hook Enhancement (`useProductionRun.js`)

Add: fetch `getStockDetail(ingredientId)` for each ingredient in selected sub-recipe to get segment-level costs.

### 6.2 PreProductionPreview Enhancement

Add cost column:

| Ingredient | Qty Needed | Stock | Sufficient | Est. Cost |
|-----------|-----------|-------|:----------:|----------:|
| GSM | 3,000 gm | 3,915 gm | ✅ | ₹621.45 |

Cost calculation (FEFO order):
```
For each ingredient:
  segments = sorted by expiry (ascending = FEFO)
  remaining = qty_needed
  total_cost = 0
  for segment in segments:
    alloc = min(remaining, segment.cal_quantity)
    total_cost += alloc × segment.unit_cost_at_intake
    remaining -= alloc
    if remaining <= 0: break
  estimated_cost = total_cost
```

Add total estimated production cost at bottom:
```
Total estimated material cost: ₹2,607.85
Estimated unit cost: ₹2.80 / piece
```

---

## 7. Phase 3 — Intelligence UI (~3-4h)

### 7.1 OperationsHub Intelligence Section (`OperationsHub.jsx`)

Add Production KPI card (for `isTopLevel || isMiddleLevel`):

```jsx
<Card data-testid="kpi-production">
  <CardContent>
    <p className="text-2xl font-bold">{fgLowStockCount}</p>
    <p className="text-xs">FG Items Low Stock</p>
    <p className="text-[10px]">Last produced: {lastProductionAgo}</p>
  </CardContent>
</Card>
```

Next-best-action banner:
```jsx
{fgLowStockCount > 0 && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
    <p>"{fgLowStockCount} finished goods are low on stock — consider running production"</p>
    <Button onClick={() => navigate("/production/new")}>Run Production</Button>
  </div>
)}
```

### 7.2 useStockIntelligence Enhancement (`useStockIntelligence.js`)

Add FG detection:
```js
// FG items = items where is_sub_recipe=true OR subrecipe_id is set
const fgItems = stocks.filter(s => s.is_sub_recipe || s.subrecipe_id);
const fgLowStockItems = fgItems.filter(s => s.is_low_stock);
```

### 7.3 ProductionRunForm Intelligence Layers

**Sub-recipe selector sort:**
```js
// Sort sub-recipes: FG with lowest stock first (most needed)
subRecipes.sort((a, b) => {
  const stockA = stockMap[a.inventory_id]?.cal_quantity || 0;
  const stockB = stockMap[b.inventory_id]?.cal_quantity || 0;
  return stockA - stockB; // lowest stock first
});
```

**Ingredient health strip (per row):**
```
[stock bar: filled % of min_qty_alert] + expiry badge (if segments available)
```

**Coverage estimate (post sub-recipe selection):**
```
// Requires: consumption report data for the FG item
// consumption_per_day = total_consumed / date_range_days
// coverage_days = (current_stock + production_qty) / consumption_per_day
"930 Elachi Cookies covers ~7 days across 3 outlets"
```

**Post-production next-best-action:**
```
// From pending queues + hierarchy data:
// Find outlets with lowest FG stock or pending requests for this FG
"Dispatch to Outlet Direct One (0 in stock, 3 pending requests)"
→ Button navigates to /dispatch/new with pre-filled FG item
```

### 7.4 ProductionHistory Intelligence (when history data available)

**Staleness per sub-recipe:**
```
"Elachi Cookies — last produced 5 days ago"
"Ragi Cookies — last produced 12 days ago" ← amber
"Sesame Cookies — never produced" ← red
```

**Cost trend:**
```
Average unit cost: ₹2.80 (last 5 runs)
Trend: ↑ 3% vs previous (ingredient cost increased)
```

---

## 8. Data Testids (Complete List)

### Phase 1
```
data-testid="production-run-form"
data-testid="production-blocked"
data-testid="sub-recipe-selector"
data-testid="production-multiplier"
data-testid="production-total-qty"
data-testid="production-batch-label"
data-testid="production-expiry-date"
data-testid="pre-production-preview"
data-testid="ingredient-row-{id}"
data-testid="ingredient-sufficient-{id}"
data-testid="ingredient-insufficient-{id}"
data-testid="negative-stock-warning"
data-testid="negative-stock-blocked"
data-testid="run-production-btn"
data-testid="post-production-confirmation"
data-testid="production-run-id"
data-testid="production-unit-cost"
data-testid="production-total-cost"
data-testid="view-in-stock-btn"
data-testid="view-audit-btn"
data-testid="run-another-btn"
data-testid="nav-production"
data-testid="nav-production-history"
```

### Phase 2
```
data-testid="production-audit-detail"
data-testid="audit-summary-card"
data-testid="audit-reference-code"
data-testid="consumed-allocations-table"
data-testid="allocation-row-{ingredient_id}"
data-testid="segment-row-{segment_id}"
data-testid="output-section"
data-testid="production-history-page"
data-testid="production-history-table"
data-testid="production-run-row-{id}"
data-testid="history-date-from"
data-testid="history-date-to"
data-testid="history-empty-state"
```

### Phase 3
```
data-testid="kpi-production"
data-testid="production-nba-banner"
data-testid="coverage-estimate"
data-testid="post-production-nba"
data-testid="ingredient-health-strip-{id}"
data-testid="staleness-indicator-{recipe_id}"
```

---

## 9. File Change Summary

| # | File | Phase | Change Type | Risk |
|---|------|:-----:|------------|:----:|
| **NEW** | `components/central-inventory/ProductionRunForm.jsx` | 1a | Create ~350-400 lines | — |
| **NEW** | `components/central-inventory/ProductionHistory.jsx` | 2a/2b | Create ~250-300 lines | — |
| **NEW** | `hooks/useProductionRun.js` | 1a | Create ~80-100 lines | — |
| M1 | `services/api.js` | 1a | Add 3 methods + cache + exports (~40 lines) | LOW |
| M2 | `lib/screenVisibility.js` | 1a | Add screen + 2 nav items + 1 action permission (~15 lines) | LOW |
| M3 | `App.js` | 1a | Add 2 imports + 3 routes (~5 lines) | LOW |
| M4 | `components/layout/Sidebar.jsx` | 1a | Add 2 icon imports + 2 ICON_MAP entries (~4 lines) | LOW |
| M5 | `components/central-inventory/OperationsHub.jsx` | 1a + 3 | Quick action (1a) + KPI card + NBA banner (3) (~30 lines) | MEDIUM |
| M6 | `hooks/useStockIntelligence.js` | 3 | Add FG detection + production signals (~15 lines) | LOW |

**Total new code: ~700-850 lines across 3 new files + ~110 lines across 6 modified files**

---

## 10. Testing Strategy

### Phase 1 Testing

| # | Test | Method | Expected |
|---|------|--------|----------|
| T1 | Navigate to `/production/new` from sidebar | Screenshot | Form renders with sub-recipe dropdown |
| T2 | Navigate from OperationsHub quick action | Screenshot | Same form |
| T3 | Franchise user — nav item hidden | Screenshot | No "Production" in sidebar |
| T4 | `production_enabled=false` — blocked state | Screenshot | ShieldX icon + message |
| T5 | Select sub-recipe → preview shows ingredients | Screenshot | Ingredients table with qty needed + stock |
| T6 | Enter multiplier → total qty auto-calculates | Screenshot | e.g., 30 × 31 = 930 |
| T7 | Insufficient stock + `allow_negative_stock=false` → blocked | Screenshot | Red rows, submit disabled |
| T8 | Insufficient stock + `allow_negative_stock=true` → warning | Screenshot | Amber rows, submit enabled |
| T9 | Submit → backend returns success | Curl + Screenshot | Post-production confirmation with costs |
| T10 | "View Audit" link from confirmation | Screenshot | Audit detail page |
| T11 | "Run Another" resets form | Screenshot | Clean form state |

### Phase 2 Testing

| # | Test | Method | Expected |
|---|------|--------|----------|
| T12 | `/production/{known_id}` → audit detail | Curl + Screenshot | Summary + consumed allocations |
| T13 | Expand ingredient → segment breakdown | Screenshot | Batch, expiry, unit_cost, alloc_cost |
| T14 | `/production/history` → empty state (G-018 stub) | Screenshot | "History being set up" message |

### Phase 3 Testing

| # | Test | Method | Expected |
|---|------|--------|----------|
| T15 | OperationsHub shows production KPI card | Screenshot | FG low stock count |
| T16 | NBA banner when FG items low | Screenshot | Amber banner with "Run Production" action |
| T17 | Sub-recipe selector sorted by demand | Screenshot | Lowest-stock FG first |

---

## 11. Rollback Plan

All changes are additive. Rollback = revert the new files + undo the small additions to existing files. No existing functionality is modified.

| Risk | Rollback |
|------|----------|
| New routes break existing navigation | Remove 3 routes from App.js |
| New nav items crowd sidebar | Remove 2 entries from screenVisibility.js NAV_ITEMS |
| api.js methods conflict with cache | Remove 3 methods + exports |
| OperationsHub quick action breaks layout | Remove 1 conditional block |

**No existing screens, hooks, or API methods are modified.** All changes are isolated additions.
