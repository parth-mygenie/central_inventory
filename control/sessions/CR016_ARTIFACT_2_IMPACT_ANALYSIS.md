# CR-016 Artifact 2 — Impact Analysis

> **CR ID:** CR-016
> **Title:** P20-Phase2 — Stock Inventory Hierarchy Toggle
> **Artifact:** 2 (Impact Analysis)
> **Date:** 2026-06-13
> **Author:** E1 agent
> **Validation source:** Section 15 of `AI/Plans/phase2/P20_stock_inventory_summary_plan.md`

---

## 1. API Validation

### 1.1 Confirmed Endpoints

| # | Endpoint | Method | Status | Notes |
|---|----------|--------|:------:|-------|
| A1 | `/inventory/stock-inventory` | GET | ✅ | Default — own-store `current_stocks[]` |
| A2 | `/inventory/stock-inventory?include_hierarchy=true` | GET | ✅ | Adds `hierarchy_context` + `hierarchy_summary` |
| A3 | `/inventory-transfer/operational-settings/get` | POST | ✅ | For future gating if needed |

### 1.2 Hierarchy Response Shape (Additive)

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
      { "restaurant_id": 781, "name": "DemoCentral1", "restaurant_type_flag": "central", "parent_restaurant_id": 1 }
    ],
    "by_store": [
      { "restaurant_id": 781, "name": "DemoCentral1", "restaurant_type_flag": "central", "stock_rows": 4, "low_stock_rows": 3, "total_cal_quantity": 1250, "total_display_qty": 1.25 }
    ]
  }
}
```

### 1.3 Role-Based Scope

| Role | Stores in Scope | Toggle Shown |
|------|:---------------:|:------------:|
| Master (rid=1) | 7 (all) | ✅ Yes |
| Central (rid=782) | 6 (no master) | ✅ Yes |
| Franchise (rid=786) | 1 (self only) | ❌ Hidden |

### 1.4 Backend Gaps

**None.** API is fully functional. No backend changes required. Backend proxy in `server.py` forwards query params (lines 138-140).

---

## 2. Dependency Validation (All Confirmed ✅)

| # | Dependency | Evidence |
|---|-----------|---------|
| 1 | `useLoginContext.isTopLevel / isMiddleLevel` | Lines 48-49, exported at 173-174 |
| 2 | `mapRestaurantType()` in terminology.js | Line 45, exported |
| 3 | `getStoreTypeBadge()` in terminology.js | Line 133, exported |
| 4 | `HIERARCHY_LEVEL` mapping | Lines 37-41 |
| 5 | `Switch` UI component | `ui/switch.jsx` exists, used in 5 components |
| 6 | `Progress` UI component | `ui/progress.jsx` exists |
| 7 | Backend proxy forwards query params | `server.py` lines 138-140 |
| 8 | `_invalidateStockCaches()` covers `getStockInventory:` | api.js line 130 |
| 9 | `LoadingState` / `ErrorState` / `EmptyState` | StateDisplays.jsx |
| 10 | `scr-stock-inventory` registered | screenVisibility.js line 37 |
| 11 | `/inventory` route exists | App.js line 74 |
| 12 | Phase 1 (own-store view) fully built | StockInventorySummary.jsx 422 lines |

---

## 3. File Impact

### 3.1 Files Modified (3 files total — no new files)

| # | File | Change | Lines Added | Risk |
|---|------|--------|:-----------:|:----:|
| M1 | `services/api.js` | Update `_getStockInventory()` to accept `{ includeHierarchy }` param | ~5 | LOW |
| M2 | `hooks/useStockInventory.js` | Add hierarchy state, toggle, role gate, import `useLoginContext` | ~30 | LOW |
| M3 | `components/central-inventory/StockInventorySummary.jsx` | Add toggle switch, 4th KPI card, alert banner, store heatmap grid | ~120 | LOW |

**No new files. No backend changes. No route changes. No new nav items.**

### 3.2 Files Referenced (Read-Only)

| File | Used For |
|------|----------|
| `hooks/useLoginContext.js` | `isTopLevel`, `isMiddleLevel` for role gate |
| `lib/terminology.js` | `mapRestaurantType()`, `getStoreTypeBadge()` for heatmap labels |
| `components/ui/switch.jsx` | Toggle component |
| `components/ui/progress.jsx` | Heatmap ratio bar |

---

## 4. Gaps & Deviations from Original Plan

### GAP-1: CR-024 Cache Layer

**Original plan:** `getStockInventory({ includeHierarchy })` takes a param.
**Reality:** `_getStockInventory()` is wrapped by `_cached("getStockInventory", TTL.LONG, ...)` with zero args.
**Fix:** Update function signature to accept `{ includeHierarchy } = {}`. The `_cached` wrapper uses `JSON.stringify(args)` for key differentiation — `getStockInventory:[]` (no hierarchy) vs `getStockInventory:[{"includeHierarchy":true}]` (with hierarchy). `_invalidateStockCaches()` invalidates by prefix — covers both.
**Risk:** LOW — backward compatible (default `{}` preserves existing callers).

### GAP-2: OperationsHub Dual-Fetch

`useStockIntelligence.js` already calls `getStockInventory()` (no hierarchy) on OperationsHub load. If user navigates Hub → `/inventory` and toggles ON, there will be two separate cache entries. The 60s TTL dedup handles this correctly.
**Risk:** ZERO — no code change needed.

### GAP-3: `useRestaurantMap` Available (CR-023)

Not in original plan. Available as fallback if store names are missing from `by_store[]`. Not needed — `by_store[].name` is embedded in hierarchy response.
**Impact:** None — don't add as dependency.

### GAP-4: `StoreHealthStrip` Visual Pattern

Cannot directly reuse (different data shape: `outCount/lowCount/adequateCount` vs `low_stock_rows/stock_rows`). Build heatmap cards inline. Follow same color conventions for consistency.

### GAP-5: `total_display_qty` Mixed Units

`by_store[].total_display_qty` sums mixed units (kg + ltr). **Must NOT display as a quantity.** Use `low_stock_rows / stock_rows` ratio only for heatmap bars.

---

## 5. Risk Analysis

| # | Risk | Severity | Mitigation |
|---|------|:--------:|------------|
| R1 | Cache key collision on hierarchy toggle | LOW | `_cached` wrapper auto-differentiates by args |
| R2 | Dual-fetch on Hub → /inventory | LOW | TTL cache dedup (60s) |
| R3 | Mixed-unit `total_display_qty` displayed as quantity | MEDIUM | Only use `low_stock_rows / stock_rows` ratio — enforced in implementation |
| R4 | Franchise users confused by hidden toggle | LOW | Don't show toggle at all — `!canToggleHierarchy` gate |
| R5 | `by_store[]` empty for franchise | LOW | Toggle hidden for franchise — never reached |
| R6 | Hierarchy fetch slow (7+ stores) | LOW | Own-store table stays visible during fetch; hierarchy section shows skeleton |

---

## 6. Estimated Effort

**Revised: ~2.5h** (down from 3-4h — Phase 1 complete, `useRestaurantMap` available)

| Step | Task | Est. |
|------|------|:----:|
| 1 | Update `_getStockInventory` in api.js | 15 min |
| 2 | Update `useStockInventory` hook | 30 min |
| 3 | Add toggle + heatmap + alert banner + KPI card to StockInventorySummary | 1.5h |
| 4 | Loading/error states for hierarchy section | 15 min |
| **Total** | | **~2.5h** |
