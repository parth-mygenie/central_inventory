# P20 — Stock Inventory Summary — Frontend Implementation Plan

> **Status:** PLANNING ONLY — no code changes
> **Author:** E1 agent, 27 May 2026
> **Depends on:** P15/P16/P17 lifecycle (all implemented), existing OperationsHub, HierarchySummary
> **API validation:** Both endpoints confirmed WORKING on live POS API (preprod) across all 3 roles
> **Endpoint owner:** `GET /inventory/stock-inventory` (POS V2 vendoremployee)

---

## 0. API Investigation Summary (27 May 2026)

### Endpoints Tested

| Endpoint | Method | Query Param | Status |
|----------|--------|-------------|--------|
| `/inventory/stock-inventory` | GET | none | **WORKING** (all roles) |
| `/inventory/stock-inventory?include_hierarchy=true` | GET | `include_hierarchy=true` | **WORKING** (all roles) |

### Role-Based Response Behavior

| Actor | Default Response | Hierarchy Opt-In | Scope |
|-------|-----------------|-------------------|-------|
| Master (rid=1) | `current_stocks[]` — 4 items, own store | + `hierarchy_context` + `hierarchy_summary` (7 stores) | All centrals + all franchises + self |
| Central (rid=782) | `current_stocks[]` — 4 items, own store | + `hierarchy_context` + `hierarchy_summary` (6 stores) | Self + sibling centrals + all franchises (NOT master) |
| Franchise (rid=786) | `current_stocks[]` — 4 items, own store | + `hierarchy_context` + `hierarchy_summary` (1 store — self only) | Self only |

### KEY FINDING: `current_stocks` is IDENTICAL between default and hierarchy calls

This confirms the P20 plan note: "`current_stocks` shape stays unchanged. Opt-in request adds only: `hierarchy_context`, `hierarchy_summary`."

**Backward compatibility: VERIFIED.** Default call returns exactly the same `current_stocks` array regardless of hierarchy flag.

### Default Response Shape (`current_stocks[]` per item)

```json
{
  "id": 16980,
  "category_id": 1483,
  "stock_title": "Cooking Oil",
  "unit": "ltr",
  "small_unit": "ml",
  "type": "inventory",
  "recipe_id": null,
  "subrecipe_id": null,
  "is_sub_recipe": false,
  "is_low_stock": false,
  "cal_quantity": "24820.00",
  "quantity": "24.820",
  "display_unit": "ltr",
  "display_qty": "24.82",
  "min_qty_alert": "200.00",
  "min_unit_alert": "ml",
  "status": "1",
  "physical_qty": "",
  "category_name": "veggies",
  "vendor_id": 16,
  "vendor_name": "Test Shop"
}
```

**Key per-item fields for UI:**
- `stock_title` — ingredient name (display)
- `display_qty` + `display_unit` — human-readable quantity ("24.82 ltr")
- `cal_quantity` — smallest-unit quantity (string — "24820.00" = 24820 ml)
- `is_low_stock` — **boolean** — POS-computed low-stock flag (compares `cal_quantity` vs `min_qty_alert`)
- `min_qty_alert` + `min_unit_alert` — threshold for low-stock (e.g., "200 ml")
- `category_name` — item category ("veggies", "non veg")
- `vendor_id` + `vendor_name` — default vendor (null for stores without vendor setup)
- `quantity` — display-unit quantity as string ("24.820")
- `unit` — base unit string ("ltr", "kg")

### Hierarchy Response Shape (additive fields)

```json
{
  "hierarchy_context": {
    "enabled": true,
    "actor_restaurant_id": 1,
    "scope_restaurant_ids": [1, 781, 782, 783, 784, 785, 786]
  },
  "hierarchy_summary": {
    "total_stores_in_scope": 7,
    "totals": {
      "stock_rows": 28,
      "low_stock_rows": 13
    },
    "stores": [
      {
        "restaurant_id": 781,
        "name": "DemoCentral1",
        "restaurant_type_flag": "central",
        "parent_restaurant_id": 1
      }
    ],
    "by_store": [
      {
        "restaurant_id": 781,
        "name": "DemoCentral1",
        "restaurant_type_flag": "central",
        "stock_rows": 4,
        "low_stock_rows": 3,
        "total_cal_quantity": 1250,
        "total_display_qty": 1.25
      }
    ]
  }
}
```

**Key hierarchy fields for UI:**
- `hierarchy_context.enabled` — boolean, true when `include_hierarchy=true`
- `hierarchy_context.scope_restaurant_ids[]` — full list of stores in scope
- `hierarchy_summary.totals.stock_rows` — total inventory lines across all in-scope stores
- `hierarchy_summary.totals.low_stock_rows` — total low-stock items across all in-scope stores
- `hierarchy_summary.stores[]` — store metadata (id, name, type, parent_id) — for store selectors
- `hierarchy_summary.by_store[]` — per-store aggregates:
  - `stock_rows` — number of inventory items at that store
  - `low_stock_rows` — number of low-stock items
  - `total_cal_quantity` — sum of all `cal_quantity` values (in smallest unit)
  - `total_display_qty` — sum of all `display_qty` values (MIXED UNITS — not directly comparable)

### Scope Visibility Verification

| Actor | `scope_restaurant_ids` | `total_stores_in_scope` | Self Included | Master Included |
|-------|----------------------|------------------------|--------------|-----------------|
| Master (rid=1) | [1, 781, 782, 783, 784, 785, 786] | 7 | Yes | Yes (self) |
| Central (rid=782) | [782, 781, 783, 784, 785, 786] | 6 | Yes | **No** |
| Franchise (rid=786) | [786] | 1 | Yes | No |

**Observation:** Central sees siblings and their franchises, consistent with `hierarchy-summary`/`hierarchy-detail` scoping rules. Franchise sees only self — hierarchy toggle has **minimal operational value** for franchise users.

### Low-Stock Detection Verification

| Store | Items | `low_stock_rows` | Example |
|-------|-------|------------------|---------|
| Master (rid=1) | 4 | 0 | All items above threshold |
| Central (rid=782) | 4 | 2 | maida=0.00 (threshold 500gm), patri=0.00 (threshold 100gm) |
| Franchise (rid=786) | 4 | 0 | All items above threshold |
| DemoFranchise2 (rid=784) | 4 | 4 | All items 0 qty (empty store) |

`is_low_stock` on each item is a POS-computed boolean. No frontend recomputation needed.

### Quantity Data Type Observations

- `cal_quantity`: STRING ("24820.00") — needs `parseFloat()` for arithmetic
- `display_qty`: STRING ("24.82") — needs `parseFloat()` for display
- `quantity`: STRING ("24.820") — display-unit quantity, same as `display_qty` but with more decimals
- `min_qty_alert`: STRING ("200.00") — threshold in `min_unit_alert` units
- `total_cal_quantity` (hierarchy `by_store`): NUMBER (1250) — already numeric
- `total_display_qty` (hierarchy `by_store`): NUMBER (1.25) — already numeric

**CAUTION:** `total_display_qty` in `by_store[]` sums display quantities across MIXED UNITS (kg + ltr). This number is an aggregate indicator of "total stock level" but is NOT unit-safe for display as "X kg". Use as heatmap/relative indicator only.

---

## 1. Separation of Concerns — CRITICAL GUARDRAIL

### What P20 stock-inventory IS FOR

- Logged-in store's own inventory summary (snapshot of current stock)
- Hierarchy-wide stock overview (additive context for operational awareness)
- Low-stock detection and alerting
- Stock KPI dashboard cards
- Operational readiness view ("what do I have right now?")

### What P20 stock-inventory is NOT FOR

| Misuse | Correct Endpoint |
|--------|-----------------|
| Source catalog for request flow | `POST /inventory-transfer/request-catalog` with `source_restaurant_id` |
| Transfer sourcing or allocation | `POST /inventory-transfer/source-options` |
| Batch/segment-level stock detail | `POST /inventory-transfer/hierarchy-detail` with `selected_stock_title` |
| Cross-store stock comparison (precision) | `POST /inventory-transfer/hierarchy-summary` + `hierarchy-detail` |
| Procurement SKU selection | `GET /inventory/get-inventory-master` (own store) |
| Vendor-linked stock view | VendorManagement + getVendors() (P18) |

### Enforcement

- `getStockInventory()` API method MUST NOT be called from RequestStockForm, DirectDispatchForm, SourceSelector, or AddStockPurchaseForm
- Code review: grep for `stock-inventory` usage in transfer/request/dispatch components = 0 results expected

---

## 2. Frontend Component Map

```
/inventory (or embed in OperationsHub)
  └── StockInventorySummary.jsx        ← main container
        ├── StockKPICards               ← headline metrics (total items, low stock %, value indicator)
        ├── StockItemsTable             ← current_stocks table with search, sort, category filter
        │     └── LowStockBadge         ← per-row low-stock indicator
        ├── HierarchyStockOverview      ← hierarchy_summary rendering (toggle-gated)
        │     ├── HierarchyScopeInfo    ← "Viewing X stores" context banner
        │     ├── StoreStockHeatmap     ← per-store mini-cards (low_stock_rows/stock_rows ratio)
        │     └── LowStockAlertBanner   ← cross-hierarchy low-stock callout
        └── RefreshButton               ← manual refresh + last-fetched timestamp
```

### Component Responsibilities

| Component | Data Source | Visibility |
|-----------|------------|------------|
| `StockKPICards` | `current_stocks[]` (own store) | All roles |
| `StockItemsTable` | `current_stocks[]` | All roles |
| `LowStockBadge` | `item.is_low_stock` | All roles |
| `HierarchyStockOverview` | `hierarchy_summary` (opt-in) | Master: full, Central: scoped, Franchise: hidden (self-only = no added value) |
| `StoreStockHeatmap` | `hierarchy_summary.by_store[]` | Master + Central only |
| `LowStockAlertBanner` | `hierarchy_summary.totals.low_stock_rows` | Master + Central only |

---

## 3. Integration Options

### Option A: New dedicated route `/inventory`

```js
// App.js
<Route path="/inventory" element={<StockInventorySummary />} />
```

**Pros:** Clean separation, dedicated URL, bookmarkable
**Cons:** Yet another nav item, may feel redundant alongside Hierarchy Summary

### Option B: Embed in OperationsHub (recommended)

Add a new **"My Inventory" section** in OperationsHub between KPI cards and Quick Actions.

```
Operations Hub
  ├── Context Selector
  ├── KPI Cards (pending approvals, ready to dispatch, etc.)  ← existing
  ├── ── NEW: Stock Inventory Summary Section ──
  │     ├── StockKPICards (total items, low stock count, "last refreshed X min ago")
  │     ├── StockItemsTable (collapsed by default, expandable)
  │     └── HierarchyStockOverview (behind toggle, master/central only)
  ├── Quick Actions (dispatch, request, adjust, etc.)  ← existing
  └── Procurement Actions  ← existing
```

**Pros:** Operational context in one place, no new route, avoids nav bloat
**Cons:** OperationsHub grows in complexity

### Option C: Hybrid — OperationsHub summary + dedicated detail page

- OperationsHub shows `StockKPICards` (compact: 2 cards — total items, low stock) + "View Inventory" link
- `/inventory` page shows full `StockItemsTable` + `HierarchyStockOverview`

**Recommended: Option C (Hybrid)** — best balance of operational density and detail access.

---

## 4. API Layer Additions

### api.js — New Methods

```js
// ── P20 Stock Inventory Summary ──────────────────────────────────

/**
 * Get logged-in store's stock inventory summary.
 * CAUTION: This is for summary/dashboard only.
 * Do NOT use for request flow source catalog (use requestCatalog instead).
 *
 * @param {boolean} includeHierarchy - When true, adds hierarchy_context + hierarchy_summary
 * @returns {Promise} - { current_stocks[], hierarchy_context?, hierarchy_summary? }
 */
function getStockInventory({ includeHierarchy = false } = {}) {
  const params = includeHierarchy ? "?include_hierarchy=true" : "";
  return client.get(`/proxy/v2/inventory/stock-inventory${params}`).then((resp) => {
    const data = resp.data;
    // Normalize current_stocks: parse string quantities to numbers
    if (data?.current_stocks) {
      data.current_stocks = data.current_stocks.map(normalizeStockItem);
    }
    return resp;
  });
}
```

### api.js — New Normalizer

```js
/**
 * Normalize stock-inventory item.
 * POS returns quantities as strings; parse to floats for sorting/comparison.
 */
function normalizeStockItem(item) {
  if (!item) return item;
  return {
    ...item,
    cal_quantity: parseFloat(item.cal_quantity) || 0,
    display_qty: parseFloat(item.display_qty) || 0,
    quantity: parseFloat(item.quantity) || 0,
    min_qty_alert: parseFloat(item.min_qty_alert) || 0,
  };
}
```

### Export Addition

```js
const api = {
  // ... existing exports
  getStockInventory,         // P20
};
```

### Backend — No Changes Needed

The generic V2 proxy in `server.py` already handles `GET /proxy/v2/inventory/stock-inventory` (and forwards query params). No backend code changes required.

---

## 5. Hook: `useStockInventory`

```js
// hooks/useStockInventory.js

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/services/api";
import { useLoginContext } from "@/hooks/useLoginContext";

/**
 * P20: Fetches stock inventory for logged-in store.
 *
 * @param {Object} options
 * @param {boolean} options.includeHierarchy - Fetch hierarchy context (default: auto based on role)
 * @param {number} options.staleAfterMs - Stale threshold in ms (default: 5 min)
 * @returns {{ stocks, hierarchySummary, hierarchyContext, loading, error, refresh, lastFetched, isStale }}
 */
export function useStockInventory({ includeHierarchy, staleAfterMs = 5 * 60 * 1000 } = {}) {
  const { isTopLevel, isMiddleLevel, isBottomLevel } = useLoginContext();

  // Auto-determine hierarchy: master/central get hierarchy, franchise doesn't (self-only = no added value)
  const shouldIncludeHierarchy = includeHierarchy ?? (isTopLevel || isMiddleLevel);

  const [stocks, setStocks] = useState([]);
  const [hierarchySummary, setHierarchySummary] = useState(null);
  const [hierarchyContext, setHierarchyContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const fetchIdRef = useRef(0);

  const fetch = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const resp = await api.getStockInventory({ includeHierarchy: shouldIncludeHierarchy });
      if (id !== fetchIdRef.current) return; // stale request
      const data = resp.data;
      setStocks(data.current_stocks || []);
      setHierarchySummary(data.hierarchy_summary || null);
      setHierarchyContext(data.hierarchy_context || null);
      setLastFetched(Date.now());
    } catch (err) {
      if (id !== fetchIdRef.current) return;
      setError(err?.response?.data?.message || "Failed to load stock inventory");
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, [shouldIncludeHierarchy]);

  useEffect(() => { fetch(); }, [fetch]);

  // Derived: stale check
  const isStale = lastFetched ? (Date.now() - lastFetched > staleAfterMs) : false;

  return {
    stocks,
    hierarchySummary,
    hierarchyContext,
    loading,
    error,
    refresh: fetch,
    lastFetched,
    isStale,
    // Derived KPIs
    totalItems: stocks.length,
    lowStockItems: stocks.filter(s => s.is_low_stock),
    lowStockCount: stocks.filter(s => s.is_low_stock).length,
    categoryCounts: deriveCategoryCounts(stocks),
  };
}

function deriveCategoryCounts(stocks) {
  const counts = {};
  for (const s of stocks) {
    const cat = s.category_name || "Uncategorized";
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts;
}
```

---

## 6. Screen Visibility & Permissions

### screenVisibility.js Addition

```js
"scr-stock-inventory": { master: FULL, central: FULL, franchise: FULL },
```

No new ACTION_PERMISSIONS needed — this is a read-only summary screen.

### NAV_ITEMS Addition (if Option A or C)

```js
{
  id: "stock-inventory",
  screen: "scr-stock-inventory",
  label: "Stock Inventory",
  path: "/inventory",
  icon: "Package",
},
```

**Insert position:** After "Operations Hub", before "Hierarchy Summary" — conceptual flow: overview → my stock → all stores stock.

### Hierarchy Toggle Visibility

| Role | Hierarchy toggle shown | Hierarchy data fetched |
|------|----------------------|----------------------|
| Master | Yes | Yes (7 stores) |
| Central | Yes | Yes (6 stores, no master) |
| Franchise | **No** (hidden) | No (self-only = redundant) |

---

## 7. UX Recommendations

### 7.1 Stock KPI Cards Layout

```
┌──────────────────┬──────────────────┬──────────────────┐
│  📦 Total Items  │  ⚠ Low Stock     │  🏪 Stores       │
│       4          │     2 items      │   7 in scope     │
│  in your store   │  below threshold │  (hierarchy)     │
└──────────────────┴──────────────────┴──────────────────┘
```

- Card 1: Total stock items (from `current_stocks.length`) — always visible
- Card 2: Low stock count (from `lowStockCount` or `hierarchy_summary.totals.low_stock_rows` for hierarchy) — **red accent when > 0**
- Card 3: Stores in scope (from `hierarchy_summary.total_stores_in_scope`) — master/central only

### 7.2 Stock Items Table

| Column | Source | Sortable | Notes |
|--------|--------|----------|-------|
| Ingredient | `stock_title` | Yes (alpha) | Bold when `is_low_stock` |
| Category | `category_name` | Yes | Filter dropdown |
| Quantity | `display_qty` + `display_unit` | Yes (numeric) | Red text when `is_low_stock` |
| Min Alert | `min_qty_alert` + `min_unit_alert` | No | Tooltip: "Threshold for low-stock alert" |
| Status | `is_low_stock` | Yes | Badge: "Low" (red) or "OK" (green) |
| Vendor | `vendor_name` | No | Null-safe: show "—" when null |

**Default sort:** Low-stock items first, then alphabetical by `stock_title`.

**Search:** Filter `stock_title` by text input (debounced, 300ms).

**Category filter:** Dropdown from distinct `category_name` values + "All".

### 7.3 Hierarchy Toggle UX

**Switch control** (not a page reload):
```
[Own Store] ──── toggle ──── [+ Hierarchy View]
```

- Default: OFF (own store only — fast, default endpoint)
- Toggle ON: Fetches with `include_hierarchy=true` — shows hierarchy overview below own-store table
- **Toggle label changes:** "Show all stores" / "Show my store only"
- **First toggle ON triggers a new fetch** — not cached from initial load (to keep default path fast)
- **Loading state during hierarchy fetch:** Skeleton shimmer on hierarchy section only; own-store table stays visible

### 7.4 Hierarchy Store Heatmap (master/central)

Per-store mini-cards arranged in a responsive grid:

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ DemoCentral1    │ │ DemoCentral2    │ │ DemoFranchise1  │
│ Master Store    │ │ Master Store    │ │ Outlet          │
│ ████████░░ 3/4  │ │ █████░░░░░ 2/4  │ │ █████░░░░░ 2/4  │
│ 3 low stock     │ │ 2 low stock     │ │ 2 low stock     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ DemoFranchise2  │ │ DemoFranchise3  │ │ DemoFranchise4  │
│ Outlet          │ │ Outlet          │ │ Outlet          │
│ ██████████ 4/4  │ │ █████░░░░░ 2/4  │ │ ░░░░░░░░░░ 0/4  │
│ 4 low stock !!  │ │ 2 low stock     │ │ All stocked     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

- **Bar:** `low_stock_rows / stock_rows` ratio
- **Color scale:** 0 low = green, 1-50% = amber, >50% = red
- **Click:** Navigate to `/hierarchy` or `/store/{restaurant_id}` for that store
- **Restaurant names:** MUST use terminology mapping (`central` → "Master Store", `franchise` → "Outlet")
- **Sort:** Most low-stock first (highest `low_stock_rows` ratio)

### 7.5 Low-Stock Emphasis

| Indicator | Where | Visual |
|-----------|-------|--------|
| `is_low_stock` per item | Stock table row | Red text on quantity + "Low" badge |
| `low_stock_rows` count | KPI card | Red accent card when > 0 |
| Hierarchy low-stock ratio | Store heatmap card | Color-coded bar (green/amber/red) |
| Cross-hierarchy alert | Banner above hierarchy section | "X stores have low stock items" (master/central only) |

### 7.6 Stale-State Handling

- **Last refreshed indicator:** "Updated 2 min ago" timestamp below KPI cards
- **Stale threshold:** 5 minutes — after which show "Data may be outdated" subtle warning + auto-highlight refresh button
- **Manual refresh:** Explicit button with spinning icon during fetch
- **No auto-polling:** This is a snapshot view, not real-time. Manual refresh is operationally appropriate.
- **On page focus (visibility change):** If stale, show subtle prompt: "Stock may have changed. [Refresh]"

### 7.7 Loading & Error States

| State | Rendering |
|-------|-----------|
| Initial load | Skeleton shimmer: 3 KPI card skeletons + 4 table row skeletons |
| Hierarchy toggle loading | Own-store stays visible; hierarchy section shows skeleton |
| Error (own store) | Full error state with retry button (reuse `ErrorState` component) |
| Error (hierarchy only) | Own-store data visible; hierarchy section shows inline error with retry |
| Empty `current_stocks` | "No inventory items configured for your store." + link to procurement |

---

## 8. Architecture Constraints (Enforced)

| Constraint | Enforcement |
|-----------|------------|
| Do NOT use `stock-inventory` for request flow source catalog | `getStockInventory` is NOT exported to RequestStockForm; code review |
| Do NOT use `stock-inventory` for transfer sourcing | SourceSelector continues using `source-options` |
| Preserve existing request lifecycle system | No changes to RequestStockForm, request-sources, request-catalog |
| Procurement separation | AddStockPurchaseForm uses `get-inventory-master` and `add-stock` — NOT stock-inventory |
| Transfer separation | DirectDispatchForm uses `source-options` — NOT stock-inventory |
| No inventory duplication assumptions | `current_stocks` is own-store only; hierarchy is additive aggregate (not per-item) |
| Terminology mapping | All `restaurant_type_flag` values MUST pass through `mapRestaurantType()` before display |

---

## 9. Phased Implementation Recommendation

### Phase 1: API Layer + Hook + KPI Cards (OperationsHub embed)

**Files:**
- `frontend/src/services/api.js` — add `getStockInventory()`, `normalizeStockItem()`
- `frontend/src/hooks/useStockInventory.js` — new hook
- `frontend/src/components/central-inventory/OperationsHub.jsx` — add StockKPICards section

**Risk:** ZERO — additive only, no existing flow modified
**Effort:** ~1 hour
**Value:** Immediate visibility into own-store stock health on the main dashboard

### Phase 2: Stock Items Table (dedicated /inventory page)

**Files:**
- `frontend/src/components/central-inventory/StockInventorySummary.jsx` — new page
- `frontend/src/App.js` — add route
- `frontend/src/lib/screenVisibility.js` — add `scr-stock-inventory`

**Risk:** ZERO — new route, additive only
**Effort:** ~1.5 hours
**Value:** Full stock detail view with search, sort, category filter

### Phase 3: Hierarchy Stock Overview (toggle, master/central only)

**Files:**
- `frontend/src/components/central-inventory/StockInventorySummary.jsx` — add hierarchy section
- `frontend/src/components/central-inventory/StoreStockHeatmap.jsx` — new component (optional extraction)

**Risk:** ZERO — read-only additive feature behind toggle
**Effort:** ~1.5 hours
**Value:** Cross-store stock visibility for operational decision-making

**Total: ~4 hours, 3 phases, each independently deployable.**

---

## 10. Reusable Component Opportunities

| Component | Reused from | Notes |
|-----------|-------------|-------|
| `LoadingState` / `ErrorState` | `common/StateDisplays.jsx` | Already used throughout |
| `Card` / `CardContent` | `ui/card.jsx` | Radix/shadcn pattern |
| `Badge` | `common/Badges.jsx` | Status badges |
| `mapRestaurantType()` | `lib/terminology.js` | MUST use for store type display |
| `mapRestaurantTypeShort()` | `lib/terminology.js` | For compact heatmap cards |
| `getStoreTypeBadge()` | `lib/terminology.js` | Color-coded store type badges |
| `ContextSelector` | Existing in OperationsHub | NOT reused here — P20 has its own scope (logged-in store, not context-switched) |

---

## 11. Data Comparison: stock-inventory vs hierarchy-detail

| Aspect | `GET stock-inventory` (P20) | `POST hierarchy-detail` (existing) |
|--------|---------------------------|-------------------------------------|
| Scope | Own store (logged-in) | Any store in scope (passed as `store_restaurant_id`) |
| Stock data | `current_stocks[]` — full item list with quantities | `child_stock_summary[]` — similar but different field names |
| Batch detail | None | `child_stock_batches[]` (when stock+unit selected) |
| Transactions | None | `transactions[]` (when dates set) |
| Hierarchy | Opt-in additive (aggregate per store) | Embedded (picker + detail for selected store) |
| Low stock | `is_low_stock` boolean per item | Low-stock sorted first, but no boolean flag |
| Use case | "What's my stock right now?" (dashboard) | "Deep dive into one store's stock, batches, transactions" |

**Complementary, not competing.** P20 is the lightweight summary; hierarchy-detail is the drill-down.

---

## 12. Risk Analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Misuse as source catalog for request flow | HIGH | API method isolation; code review checklist; JSDoc warning |
| Mixed-unit `total_display_qty` displayed as single unit | MEDIUM | Do NOT display as "X kg"; use as relative indicator only or convert to common base |
| String-to-number parsing inconsistency | LOW | Normalize in `normalizeStockItem()` at API layer |
| Franchise users confused by hidden hierarchy toggle | LOW | Don't show toggle at all for franchise — avoid confusion |
| Stale data after stock adjustment | MEDIUM | Show "last refreshed" timestamp; manual refresh after own adjustments |
| N+1 rendering if hierarchy data is large | LOW | `by_store[]` is aggregate (1 row per store), not per-item. Max ~50 stores in practice. |
| P15/P16/P17 lifecycle regression | ZERO | No shared code modified. New API method, new hook, new components only. |

---

## 13. API Contract Mapping (Complete)

### P20 Stock Inventory

| Frontend Method | HTTP | Path | Query | Body |
|----------------|------|------|-------|------|
| `getStockInventory()` | GET | `/proxy/v2/inventory/stock-inventory` | — | — |
| `getStockInventory({ includeHierarchy: true })` | GET | `/proxy/v2/inventory/stock-inventory` | `?include_hierarchy=true` | — |

### Existing Endpoints NOT Modified

| Method | Purpose | P20 Interaction |
|--------|---------|----------------|
| `getInventoryMaster()` | Own store SKU list for forms | None — separate use case |
| `getHierarchySummary()` | Transfer rollup reporting | None — different data shape |
| `getHierarchyDetail()` | Store drill-down with batches | Complementary — P20 is summary, this is detail |
| `requestCatalog()` | Source store catalog for requests | None — P20 MUST NOT replace this |

---

## 14. Open Questions

1. **Nav placement:** Should "Stock Inventory" be its own sidebar item or a sub-tab inside Operations Hub? (Recommendation: Hybrid — KPI in Hub, full page at `/inventory`)

2. **Category grouping:** Should stock table group by `category_name` with collapsible sections? (Recommendation: Skip for Phase 2 MVP — use category dropdown filter instead. Group later if >20 items.)

3. **Historical comparison:** Should we show "vs yesterday" delta for stock quantities? (Recommendation: Defer — requires a separate time-series endpoint or local caching. Not available from `stock-inventory`.)

4. **Hierarchy drill-down from heatmap:** Should clicking a store in the heatmap navigate to `/store/{id}` (existing StoreDetail) or show inline expansion? (Recommendation: Navigate to `/store/{id}` — reuses existing component, no new code.)

5. **Refresh after own stock change:** Should OperationsHub auto-refresh P20 data after a transfer receive, stock adjustment, or wastage entry? (Recommendation: Yes via `useStockInventory.refresh()` call from write-action success handlers. Phase 2+.)
