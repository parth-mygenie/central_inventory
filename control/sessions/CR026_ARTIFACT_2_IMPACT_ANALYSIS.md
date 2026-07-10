# CR-026 Artifact 2 — Impact Analysis

> **CR ID:** CR-026
> **Title:** P28 — Production Unit Module (Production Run UI + History)
> **Artifact:** 2 (Impact Analysis)
> **Date:** 2026-06-13
> **Author:** E1 agent

---

## 1. API Discovery Results

### 1.1 Confirmed Working APIs

| # | Endpoint | Method | Status | Response Shape |
|---|----------|--------|:------:|----------------|
| A1 | `/inventory/production-run/complete` | POST | ✅ | `{ production_run_id, reference_code, quantity_added, unit_cost, total_cost, output_segment_id }` |
| A2 | `/inventory/production-run/{id}` | GET | ✅ | `{ id, reference_code, restaurant_id, output_inventory_master_id, bom_sub_recipe_id, planned_output_qty, actual_output_qty, output_unit, status, output_batch, output_expiry_date, unit_cost, total_cost, consumed_allocations[] }` |
| A3 | `/recipe/sub-recipes` | GET | ✅ | `{ sub_recipes: [{ recipe_id, name, inventory_id, qty, unit, ingredients[] }] }` |
| A4 | `/inventory/stock-inventory` | GET | ✅ | `{ current_stocks: [{ id, stock_title, cal_quantity, display_qty, display_unit, is_low_stock, ... }] }` |
| A5 | `/inventory/stock-inventory/{id}` | GET | ✅ | `{ summary, segments[], quantity_reconciliation, consumption_summary, consumption_lines[] }` |
| A6 | `/inventory-transfer/operational-settings/get` | POST | ✅ | `{ data: { stored_settings: { production_enabled, allow_negative_stock, ... } } }` |

### 1.2 Backend Gaps Discovered

| Gap ID | Endpoint | Probed Patterns | Result | Priority | Impact |
|--------|----------|----------------|--------|:--------:|--------|
| **G-018** | Production run list/history | `GET /production-run`, `POST /production-run/history`, `GET /production-run/list`, `GET /production-runs` | All 404 (route `GET /production-run/{id}` catches non-numeric paths as ID) | **P0** | History screen shows empty state until backend delivers |
| **G-019** | Segment `unit_cost` in stock-inventory detail | `GET /stock-inventory/{id}` segments[] | Segments return `segment_id, batch, expiry_date, cal_quantity, display_qty, source_restaurant_id` — **NO `unit_cost`** | **P1** | Pre-run cost estimation blocked. Owner confirmed: requesting backend to add immediately |

### 1.3 API Probe Evidence

**Production-run list — 4 probes, all failed:**

| Pattern | HTTP | Result |
|---------|------|--------|
| `GET /inventory/production-run` | 404 | NotFoundHttpException |
| `POST /inventory/production-run/history` | 405 | "POST not supported. Supported: GET, HEAD" → but GET also fails (hits `show()` with "history" as ID) |
| `GET /inventory/production-run/list` | TypeError | `show(): Argument #2 ($id) must be of type int, string given` — "list" parsed as ID |
| `GET /inventory/production-runs` (plural) | 404 | NotFoundHttpException |

**Conclusion:** The Laravel controller `ProductionRunApiController` has only `complete()` and `show(int $id)` methods. No `index()` method. Backend must add a list endpoint.

**Segment cost — confirmed missing:**

Stock-inventory segment fields: `segment_id, batch, expiry_date, cal_quantity, display_qty, source_restaurant_id`
Production-run audit segment fields: `segment_id, batch, expiry_date, qty_cal, qty_display, unit_cost, allocation_line_cost`

`unit_cost` only exists in production-run audit (post-execution). Not in stock-inventory segments. Backend enhancement requested by owner (G-019).

### 1.4 Operational Settings — Confirmed

| Setting | Value (RID 806) | Default | Used For |
|---------|:---------------:|:-------:|----------|
| `production_enabled` | `true` | `false` | Gate: show "Production not enabled" blocked state when false |
| `allow_negative_stock` | `true` | `true` | Gate: hard-block submit when false AND ingredient stock insufficient |
| `fefo_consumption_enabled` | `true` | — | Info: production uses FEFO segment consumption |

---

## 2. File Impact Analysis

### 2.1 New Files Required

| # | File | Purpose | Lines (est.) |
|---|------|---------|:------------:|
| F1 | `components/central-inventory/ProductionRunForm.jsx` | Production run form + pre-production preview + post-production confirmation | ~350-400 |
| F2 | `components/central-inventory/ProductionHistory.jsx` | Production history list (pending backend G-018) + drill-down to audit detail | ~250-300 |
| F3 | `hooks/useProductionRun.js` | Hook: fetch sub-recipes, stock levels, execute production, fetch audit detail | ~80-100 |

### 2.2 Existing Files Modified

| # | File | Change | Risk |
|---|------|--------|:----:|
| M1 | `services/api.js` | Add: `runProduction()`, `getProductionRunDetail()`, `getProductionRunHistory()` (stub for G-018) | LOW |
| M2 | `lib/screenVisibility.js` | Add: `scr-production` screen + nav items for production/new and production/history | LOW |
| M3 | `App.js` | Add routes: `/production/new`, `/production/history`, `/production/:id` | LOW |
| M4 | `components/layout/Sidebar.jsx` | Add icon import for production nav item (e.g., `Factory` from lucide-react) | LOW |
| M5 | `components/central-inventory/OperationsHub.jsx` | Add: production intelligence section (last run, FG stock levels, "produce now" suggestion) | MEDIUM |
| M6 | `hooks/useStockIntelligence.js` | Extend: add FG stock tracking, production-related intelligence signals | MEDIUM |

### 2.3 Existing Files Referenced (Read-Only)

| File | Used For |
|------|----------|
| `hooks/useLoginContext.js` | `isTopLevel`, `isMiddleLevel`, `restaurantId`, `canAccess` |
| `hooks/useWriteAction.js` | Submit pattern with loading/error handling |
| `components/common/PostSubmitConfirmation.jsx` | Reuse for post-production confirmation |
| `components/common/StateDisplays.jsx` | `LoadingState`, `ErrorState`, `EmptyState`, `BlockedAction` |
| `components/common/StockIntelligenceBar.jsx` | Pattern reference for intelligence UI |
| `components/central-inventory/IngredientComposer.jsx` | Pattern reference for ingredient list rendering |
| `lib/formatters.js` | `formatPO()` for reference code display |
| `lib/terminology.js` | `mapRestaurantType()` for store labels |

---

## 3. Integration Points

### 3.1 API Layer (`api.js`)

New methods to add:

```
runProduction({ subRecipeId, quantity, unit, batch, expiryDate })
  → POST /proxy/v2/inventory/production-run/complete

getProductionRunDetail(runId)
  → GET /proxy/v2/inventory/production-run/{id}

getProductionRunHistory({ fromDate, toDate, limit, page })
  → GET /proxy/v2/inventory/production-run/history  [BLOCKED: G-018]
  → Stub: returns empty array until backend delivers
```

Cache strategy:
- `getProductionRunDetail` → `_cached` with TTL.MEDIUM (45s)
- `getProductionRunHistory` → `_cached` with TTL.SHORT (30s)
- `runProduction` → invalidates `getStockInventory:`, `getProductionRunHistory:` caches

### 3.2 Screen Visibility & Navigation

Current nav order:
```
Operations Hub → Stock Inventory → Hierarchy → Store Mgmt → Pending Queues
→ History → Consumption Report → Vendors → Ingredients → Products → Recipes
→ Addon Recipes → Settings
```

New nav order (owner directive: group under operations alongside Vendors, Purchase, Stocks):
```
Operations Hub → Stock Inventory → [NEW: Production] → [NEW: Production History]
→ Hierarchy → Store Mgmt → Pending Queues → History → Consumption Report
→ Vendors → Ingredients → Products → Recipes → Addon Recipes → Settings
```

Screen visibility:
```js
"scr-production": { master: FULL, central: FULL, franchise: HIDDEN }
```

Franchise users: HIDDEN — production is a central kitchen operation.

### 3.3 Operational Settings Gate

When `production_enabled === false`:
- Show `BlockedAction` component (same pattern as `AddStockPurchaseForm` line 144-153 for `VENDOR_PURCHASE_NOT_ALLOWED`)
- Message: "Production is not enabled for your store. Contact your administrator to enable production in Operational Settings."

When `allow_negative_stock === false` AND ingredient stock < required:
- Hard-block the submit button
- Show red warning per insufficient ingredient row
- Message: "Cannot proceed — negative stock is not allowed and {N} ingredients are insufficient."

When `allow_negative_stock === true` AND ingredient stock < required:
- Allow submit (warn but don't block)
- Show amber warning per insufficient ingredient row
- Message: "Warning: {N} ingredients have insufficient stock. Production will result in negative inventory."

### 3.4 Phase 1 Infrastructure (Navigation, Routes, Quick Action)

**CRITICAL:** These items MUST be in Phase 1, not Phase 3. Without them, the production form is unreachable.

| Item | File | Phase |
|------|------|:-----:|
| Route `/production/new` | `App.js` | **1** |
| Route `/production/history` | `App.js` | **1** |
| Route `/production/:id` | `App.js` | **1** |
| Screen `scr-production` | `screenVisibility.js` | **1** |
| Nav items (Production, Production History) | `screenVisibility.js` | **1** |
| Sidebar icon import (`Factory`) | `Sidebar.jsx` | **1** |
| OperationsHub "Run Production" quick action button | `OperationsHub.jsx` | **1** |

### 3.5 Intelligence UI Integration (CR-019/CR-021 Pattern) — Phase 3 Only

Phase 3 adds **smart contextual layers on top** of the working screens. These are enhancements, not navigation.

#### OperationsHub — Intelligence Overlays (Phase 3)
- **"Production" KPI card:** Last production run date, total FG items, FG low-stock count
- **Next-best-action banner:** "2 FG items have low stock at outlets — consider running production" (when FG items in `stocks` have `is_low_stock === true`)

#### ProductionRunForm — Intelligence Layers (Phase 3)
1. **Sub-recipe selector intelligence:** Sort by "most needed" (FG with lowest stock / highest outlet demand first)
2. **Ingredient health strip:** Per-ingredient row shows stock level + expiry proximity
3. **Coverage estimate:** "At current consumption rate, {qty} {FG} covers ~{N} days across {M} stores" (requires consumption report data)
4. **Post-production next-best-action:** "Dispatch to {store} ({stock level}, {pending requests})"

#### ProductionHistory — Intelligence Layers (Phase 3)
1. **Summary KPIs:** Total runs, total FG produced, total material cost
2. **Cost trend:** Average unit cost per FG over time (if history data available)
3. **Staleness indicator:** "Last produced {X} days ago" per sub-recipe

---

## 4. Data Flow

### 4.1 Production Run Execution Flow

```
User selects sub-recipe
  ↓
useProductionRun loads:
  - GET /recipe/sub-recipes → sub-recipe list with ingredients[]
  - GET /stock-inventory → current stocks (for availability check)
  - POST /operational-settings/get → production_enabled, allow_negative_stock
  ↓
User enters: quantity, batch label, expiry date
  ↓
Pre-production preview renders:
  - For each ingredient in sub-recipe:
    - required_qty = ingredient.ingredient_qty × multiplier
    - available_qty = stock matching ingredient_id
    - sufficient = available_qty >= required_qty
    - estimated_cost = required_qty × segment.unit_cost [BLOCKED: G-019]
  ↓
User clicks "Run Production"
  ↓
POST /production-run/complete
  { sub_recipe_id, quantity, unit, batch, expiry_date }
  ↓
Backend response:
  { production_run_id, reference_code, unit_cost, total_cost, output_segment_id }
  ↓
Post-production confirmation:
  - Shows run ID, reference code, FG name, qty, unit cost, total cost
  - "View in Stock" → /inventory/{fg_id}
  - "View Audit" → /production/{run_id}
  - "Run Another" → reset form
  - Next-best-action: "Dispatch to {outlet}" → /dispatch/new
```

### 4.2 Production Audit Flow

```
User navigates to /production/{id} (from history or post-production link)
  ↓
GET /inventory/production-run/{id}
  ↓
Render:
  - Summary card: run ID, reference, date, recipe, qty, unit cost, total cost
  - Consumed allocations table: per-ingredient expandable rows
    - Ingredient name | Total consumed | Total cost
    - Expand → segment: batch, expiry, qty, unit_cost, alloc_cost
  - Output section: FG item, segment ID, batch, expiry, qty created
```

---

## 5. Backend Gap Register (for Owner → Backend Team)

| Gap ID | Title | Endpoint Needed | Priority | Blocker For | Status |
|--------|-------|----------------|:--------:|-------------|--------|
| **G-018** | Production run list/history API | `GET /inventory/production-run?limit=&from_date=` | **P0** | F4 (Production History screen) | **CLOSED** — confirmed working 2026-06-13 |
| **G-019** | Segment `unit_cost` in stock-inventory detail | `unit_cost` in `segments[]` of `GET /inventory/stock-inventory/{id}` | **P1** | F2 (Pre-run cost estimation) | **CLOSED** — confirmed 2026-06-13. Field: `unit_cost` (number, per smallest unit) |

### G-018 — CLOSED (2026-06-13)

Backend delivered the list endpoint. Confirmed via curl:
```
GET /api/v2/vendoremployee/inventory/production-run?limit=20&from_date=2026-06-01
Authorization: Bearer {token}
```
Frontend `api.js` stub to be replaced with real call in CR-026 Phase 3.

### G-018 Suggested API Contract (Original — for reference)

```
GET /v2/vendoremployee/inventory/production-run
Query params: ?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD&limit=50&page=1

Response:
{
  "status": true,
  "data": [
    {
      "id": 10,
      "reference_code": "PRD-2026-0010",
      "bom_sub_recipe_id": 187,
      "recipe_name": "Whole wheat Elachi Cookies",
      "output_inventory_master_id": 17642,
      "output_stock_title": "Whole wheat Elachi Cookies (FG)",
      "planned_output_qty": 930,
      "actual_output_qty": 930,
      "output_unit": "piece",
      "output_batch": "ELACHI-3VENDOR-001",
      "output_expiry_date": "2026-10-20",
      "unit_cost": 2.8041,
      "total_cost": 2607.85,
      "status": "completed",
      "created_at": "2026-06-13T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 10,
    "per_page": 50,
    "current_page": 1,
    "last_page": 1
  }
}
```

### G-019 Suggested Enhancement

Add to each segment in `GET /inventory/stock-inventory/{id}`:
```json
{
  "segment_id": 346,
  "batch": "CT-VA-GSM",
  "expiry_date": "2026-09-30",
  "cal_quantity": 915,
  "display_qty": 0.915,
  "source_restaurant_id": 806,
  "unit_cost_at_intake": 0.18    // ← NEW FIELD
}
```

---

## 6. Risk Analysis

| # | Risk | Severity | Mitigation |
|---|------|:--------:|------------|
| R1 | G-018 (no history API) delays Production History screen | HIGH | Build UI with empty state + "pending backend" notice. History is non-blocking for core production flow. |
| R2 | G-019 (no segment cost) blocks pre-run cost estimation | MEDIUM | Phase 1 shows availability only (qty). Cost estimate added when backend delivers G-019. Post-run cost always available. |
| R3 | `production_enabled` default is `false` — new stores can't produce without admin toggling on | LOW | Blocked state UI with clear instructions to enable. Matches existing pattern (vendor purchase gate). |
| R4 | Sub-recipe data may be empty for test accounts | LOW | Create test sub-recipes during implementation. API shape confirmed from P28 smoke. |
| R5 | Production run with insufficient stock + `allow_negative_stock=false` → backend rejects | MEDIUM | Frontend pre-validates and hard-blocks. Backend error message shown as fallback. |
| R6 | Intelligence UI signals (coverage, demand) require data from multiple APIs | MEDIUM | Progressive enhancement: basic signals in Phase 1, full intelligence in Phase 2. Consumption report + hierarchy data already available. |
| R7 | OperationsHub is already complex (65+ lines of imports, 350+ lines component) — production section adds more | LOW | Production section is additive (1 KPI card + 1 quick action). No existing sections modified. |
| R8 | Multiplier calculation: `base_qty × multiplier` may produce non-integer FG quantities for some units | LOW | Allow decimal quantities. Backend handles rounding. Display warning if qty is non-integer for piece-based items. |

---

## 7. Dependency Matrix

```
CR-026 Production Run Form
  ├── DEPENDS ON (all CLOSED/DONE):
  │   ├── CR-011 (P21 Catalogue) → sub-recipe CRUD, IngredientComposer
  │   ├── CR-009 (P19 Procurement) → ingredients exist in stock
  │   ├── CR-010 (P20 Stock Inventory) → stock level checking
  │   └── CR-024 (API Cache) → cache layer for new API methods
  │
  ├── BLOCKED BY (backend gaps):
  │   ├── G-018 → Production history list API [P0, blocks F4]
  │   └── G-019 → Segment unit_cost [P1, blocks pre-run cost estimate]
  │
  ├── ENHANCES:
  │   ├── OperationsHub → production KPI + quick action + intelligence
  │   └── useStockIntelligence → FG stock tracking
  │
  └── ENHANCED BY (future CRs):
      ├── CR-015 (P24 FEFO Batch Detail) → post-production segment inspection
      └── CR-020 (Daily Intelligence Digest) → production scheduling suggestions
```

---

## 8. Effort Estimate (Revised Post-Discovery)

| Phase | Scope | Files | Est. | Blocked? |
|-------|-------|-------|:----:|:--------:|
| **Phase 1a: Core Production Form + Navigation** | Routes, nav items, sidebar icon, screen visibility, sub-recipe selector, qty/batch/expiry input, pre-production preview (availability only, no cost), execute, post-production confirmation, OperationsHub "Run Production" quick action button | F1, F3, M1, M2, M3, M4, M5 (quick action only) | 5-6h | No |
| **Phase 1b: Settings Gate + Negative Stock Logic** | `production_enabled` blocked state, `allow_negative_stock` gating | F1 (enhance) | 1h | No |
| **Phase 2a: Production Audit Detail** | Drill-down view: consumed allocations with segment breakdown | F2 (partial), M1 | 2-3h | No |
| **Phase 2b: Production History** | List view with date filters, summary KPIs | F2 (complete), M1 | 2h | G-018 (stub until backend delivers) |
| **Phase 2c: Pre-Run Cost Estimation** | Segment cost display in preview, total estimated cost | F1 (enhance), F3 (enhance) | 1-2h | G-019 (add when backend delivers) |
| **Phase 3: Intelligence UI** | OperationsHub production KPI card + next-best-action banners, coverage estimates, staleness indicators, sub-recipe sort-by-demand, post-production next-action suggestions | M5, M6, F1 (enhance), F2 (enhance) | 3-4h | No (progressive) |
| **Total** | | | **~13-17h** | |

---

## 9. Implementation Order Recommendation

```
Phase 1a → Phase 1b → Phase 2a → Phase 3 → Phase 2b (when G-018 ready) → Phase 2c (when G-019 ready)
```

Rationale: Core production flow (1a+1b) is unblocked and delivers immediate value. Audit detail (2a) uses existing API. Intelligence (3) uses existing data sources. History (2b) and cost estimate (2c) depend on backend gaps.
