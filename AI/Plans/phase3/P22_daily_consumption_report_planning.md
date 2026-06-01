# P22 — Daily Consumption Report — API Validation + Frontend Planning

> **Status:** PLANNING + API VALIDATION — no code changes
> **Author:** E1 agent, 28 May 2026
> **API validation:** 9 probes against live POS API (preprod.mygenie.online)
> **Depends on:** P20 stock-inventory, P21 catalogue (ingredient context)

---

## 0. API Validation Summary (28 May 2026)

### Endpoint

| Method | Path | Status |
|--------|------|--------|
| POST | `/report/daily-consumption-report` | **WORKING** |

### Probe Results

| # | Actor | Mode | HTTP | stock_summary | stock_details | by_restaurant | Notes |
|---|-------|------|:---:|:---:|:---:|:---:|-------|
| V1 | Master | Legacy (no params) | 200 | 0 | 0 | absent | Master store has no direct consumption |
| V2 | Master | include_hierarchy=true | 200 | **2** | **2** | **1 store** | Data from DemoFranchise2 (rid=784) only |
| V3 | Central | Legacy | 200 | 0 | 0 | absent | C782 has no consumption |
| V4 | Central | include_hierarchy=true | 200 | 2 | 2 | 1 store | Same data (784) — Central scope includes siblings + franchises |
| V5 | Franchise | Legacy | 200 | 0 | 0 | absent | F786 has no consumption in period |
| V6 | Master | restaurant_ids=[784] | 200 | 2 | 2 | **absent** | by_restaurant absent when single store |
| V7 | Franchise | restaurant_ids=[781] | **403** | — | — | — | `{errors: [{code: "invalid_scope"}]}` |
| V8 | Master | Empty body | 200 | 0 | 0 | absent | Valid — defaults to today, actor store |
| V9 | Master | Single day + hierarchy | 200 | 2 | 2 | 1 store | date_range=["2026-05-28","2026-05-28"] |

### Confirmed Response Shape

```json
{
  "stock_summary": [
    {
      "ingredient_id": 16996,
      "ingredient_name": "Cooking Oil",
      "category_id": 1491,
      "category_name": "veggies",
      "total_consumed": "250 ml",
      "closing_stock": "-500 ml",
      "opening_stock": "-250 ml",
      "restaurant_id": 784
    }
  ],
  "stock_details": [
    {
      "consumption_date": "2026-05-28",
      "order_id": 869307,
      "food_id": "202583",
      "food_item": "aloo parantha",
      "order_type": "POS",
      "ingredient_id": 16997,
      "ingredient_name": "maida",
      "category_id": 1491,
      "category_name": "veggies",
      "quantity_deducted": "500 gm",
      "restaurant_id": 784
    }
  ],
  "date_range": ["2026-05-01", "2026-05-28"],
  "restaurant_id": 1,
  "applied_restaurant_ids": [1, 781, 782, 783, 784, 785, 786],
  "hierarchy_scope": [
    {"id": 1, "name": "My Genie", "restaurant_type_flag": "master"}
  ],
  "by_restaurant": [
    {"restaurant_id": 784, "ingredient_rows": 2, "total_consumed_raw": 750}
  ]
}
```

### Key Field Observations

| Field | Type | Notes |
|-------|------|-------|
| `stock_summary[].total_consumed` | **STRING** ("250 ml") | Includes unit — needs parsing for numeric sort |
| `stock_summary[].opening_stock` | **STRING** ("-250 ml") | Can be NEGATIVE — operational reality |
| `stock_summary[].closing_stock` | **STRING** ("-500 ml") | Can be NEGATIVE |
| `stock_summary[].restaurant_id` | number | Present on every row when multi-store |
| `stock_details[].quantity_deducted` | **STRING** ("500 gm") | Includes unit — needs parsing |
| `stock_details[].food_id` | **STRING** ("202583") | Note: string, not number |
| `stock_details[].order_id` | number | |
| `stock_details[].order_type` | string | "POS" observed |
| `date_range` | array[2] | `["YYYY-MM-DD", "YYYY-MM-DD"]` |
| `by_restaurant` | array | **ONLY present when applied_restaurant_ids > 1** |
| `by_restaurant[].total_consumed_raw` | number | Raw numeric (no unit string) — usable for aggregation |
| `hierarchy_scope` | array | **ALWAYS present** regardless of mode |

### Conditional Field Matrix

| Condition | by_restaurant | restaurant_id on rows | hierarchy_scope |
|-----------|:---:|:---:|:---:|
| Legacy (single store) | absent | absent (implicit = actor) | present |
| include_hierarchy=true | **present** | **present** on each row | present |
| restaurant_ids=[single] | **absent** | present on each row | present |
| restaurant_ids=[multi] | **present** | present on each row | present |

### Role-Based Hierarchy Scope

| Actor | Scope Count | Includes Master | Includes Self |
|-------|:-----------:|:---:|:---:|
| Master (rid=1) | 7 | Yes (self) | Yes |
| Central (rid=782) | 6 | **No** | Yes |
| Franchise (rid=786) | 1 | No | Yes (only) |

Matches P20 stock-inventory scope exactly.

### Error Responses

| Code | Trigger | Shape |
|------|---------|-------|
| 403 | restaurant_ids outside hierarchy scope | `{errors: [{code: "invalid_scope", message: "..."}]}` |
| 422 | Validation failure | `{errors: {field: [msgs]}}` (assumed — not triggered in testing) |

---

## 1. Normalization Requirements

### Quantity Parsing

All quantity fields (`total_consumed`, `opening_stock`, `closing_stock`, `quantity_deducted`) are **strings with embedded units** like `"250 ml"`, `"-500 ml"`, `"500 gm"`.

```js
function parseQtyString(str) {
  // "250 ml" → { value: 250, unit: "ml", raw: "250 ml" }
  // "-500 ml" → { value: -500, unit: "ml", raw: "-500 ml" }
  if (!str) return { value: 0, unit: "", raw: str || "" };
  const match = str.match(/^(-?\d+\.?\d*)\s*(.*)$/);
  if (!match) return { value: 0, unit: "", raw: str };
  return { value: parseFloat(match[1]), unit: match[2].trim(), raw: str };
}
```

### food_id Type Coercion

`food_id` is returned as **string** (`"202583"`), not number. Must handle in UI grouping.

### by_restaurant Absent Handling

`by_restaurant` is MISSING (not empty array) when single store. Normalizer must handle:
```js
const byRestaurant = data.by_restaurant || [];
```

---

## 2. Component Architecture

### Route

```js
<Route path="/reports/consumption" element={<DailyConsumptionReport />} />
```

### Component Map

```
/reports/consumption
  └── DailyConsumptionReport.jsx
        ├── ConsumptionFilters          — date range + store picker + hierarchy toggle
        │     ├── DateRangePicker       — reuse existing
        │     └── StoreMultiSelector    — master/central only; from hierarchy_scope
        ├── ConsumptionKPICards         — total consumed, ingredients, stores, date range
        ├── IngredientSummaryTable      — stock_summary with search/sort
        │     └── IngredientRow         — per ingredient: opening → consumed → closing
        ├── ConsumptionDetailsTable     — stock_details expandable/collapsible
        │     └── DetailRow             — per order line: date, food, ingredient, qty
        └── ByStoreRollup              — by_restaurant section (multi-store only)
              └── StoreRollupCard       — per store: ingredient_rows, total_consumed
```

### Hook

```js
// hooks/useConsumptionReport.js
function useConsumptionReport() {
  // State: fromDate, toDate, restaurantIds, includeHierarchy
  // Fetches: POST /report/daily-consumption-report
  // Returns: { summary, details, byRestaurant, scope, dateRange, loading, error, fetch }
  // Normalizes: parseQtyString on all quantity fields
}
```

### API Layer

```js
// api.js addition
function getDailyConsumptionReport({ fromDate, toDate, restaurantIds, includeHierarchy } = {}) {
  const payload = {};
  if (fromDate) payload.from_date = fromDate;
  if (toDate) payload.to_date = toDate;
  if (restaurantIds?.length) payload.restaurant_ids = restaurantIds;
  if (includeHierarchy) payload.include_hierarchy = true;
  return client.post("/proxy/v2/report/daily-consumption-report", payload).then(resp => {
    // Normalize quantity strings
    const d = resp.data;
    if (d.stock_summary) d.stock_summary = d.stock_summary.map(normalizeSummaryItem);
    if (d.stock_details) d.stock_details = d.stock_details.map(normalizeDetailItem);
    d.by_restaurant = d.by_restaurant || [];
    d.hierarchy_scope = d.hierarchy_scope || [];
    return resp;
  });
}
```

---

## 3. UX Design

### 3.1 Filter Bar

```
┌─────────────────────────────────────────────────────────────────┐
│ Daily Consumption Report                                        │
│                                                                 │
│ [May 01 ▾] — [May 28 ▾]   [All Stores ▾]   [☐ All Hierarchy]  │
│                                          (master/central only)  │
│ [Generate Report]                                               │
└─────────────────────────────────────────────────────────────────┘
```

- **Date range:** Two date pickers (from_date, to_date). Default: today.
- **Store selector:** Multi-select from `hierarchy_scope`. Master/central only. Hidden for franchise.
- **Hierarchy toggle:** "Include all stores" checkbox. Master/central only.
- **Generate button:** Explicit fetch (not auto-fetch on filter change — date ranges can be expensive).

### 3.2 KPI Cards

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Total        │ Ingredients  │ Stores       │ Period       │
│ Consumed     │ Tracked      │ Reporting    │              │
│              │              │              │              │
│ 750 (raw)    │ 2            │ 1 of 7       │ May 1-28     │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

- **Total Consumed:** Sum of `by_restaurant[].total_consumed_raw` (for multi) or sum parsed from summary
- **Ingredients Tracked:** `stock_summary.length` (unique ingredient rows)
- **Stores Reporting:** Count of distinct `restaurant_id` in stock_summary
- **Period:** `date_range[0]` — `date_range[1]`

### 3.3 Ingredient Summary Table

```
┌───────────────────────────────────────────────────────────────┐
│ Ingredient Summary                          [Search...]       │
├──────────┬──────────┬──────────┬───────────┬────────────────┤
│ Name     │ Category │ Opening  │ Consumed  │ Closing        │
├──────────┼──────────┼──────────┼───────────┼────────────────┤
│ Cooking  │ veggies  │ -250 ml  │ 250 ml    │ -500 ml        │
│  Oil     │          │          │           │ ⚠ negative     │
├──────────┼──────────┼──────────┼───────────┼────────────────┤
│ maida    │ veggies  │ -500 gm  │ 500 gm    │ -1 kg          │
│          │          │          │           │ ⚠ negative     │
└──────────┴──────────┴──────────┴───────────┴────────────────┘
```

- **Negative closing stock warning:** When closing_stock value < 0, show amber warning indicator
- **Sort:** By consumed qty (descending), name (alpha), category
- **Search:** Filter by ingredient_name or category_name
- **Multi-store:** When `restaurant_id` is on rows, add "Store" column

### 3.4 Consumption Details Table (Expandable)

```
┌─────────────────────────────────────────────────────────────────┐
│ ▼ Consumption Details (2 records)                               │
├──────────┬─────────┬──────────────┬────────────┬───────────────┤
│ Date     │ Order   │ Food Item    │ Ingredient │ Qty Deducted  │
├──────────┼─────────┼──────────────┼────────────┼───────────────┤
│ 28 May   │ #869307 │ aloo parantha│ Cooking Oil│ 250 ml        │
│ 28 May   │ #869307 │ aloo parantha│ maida      │ 500 gm        │
└──────────┴─────────┴──────────────┴────────────┴───────────────┘
```

- **Collapsed by default** (details can be large for long date ranges)
- **Grouped by date** when expanded
- **Sort:** By date (newest first), then order_id
- **Multi-store:** Add "Store" column

### 3.5 By Store Rollup (Multi-Store Only)

```
┌─────────────────────────────────────────────────────────────────┐
│ Consumption by Store                                            │
│                                                                 │
│ ┌── DemoFranchise2 (#784) ──────────────────────────────────── │
│ │ 2 ingredients consumed · Total: 750 (raw units)              │
│ └──────────────────────────────────────────────────────────────│
│                                                                 │
│ 6 stores with no consumption in this period                    │
└─────────────────────────────────────────────────────────────────┘
```

- Only shown when `by_restaurant` is present (multi-store mode)
- Show stores WITH consumption first
- Collapsed section for "X stores with no consumption"

---

## 4. Visibility Rules

| Element | Master | Central | Franchise |
|---------|:------:|:-------:|:---------:|
| Report page | **visible** | **visible** | visible |
| Store multi-selector | **visible** | **visible** | hidden |
| Hierarchy toggle | **visible** | **visible** | hidden |
| By Store rollup | **visible** | **visible** | hidden (single store) |

**Screen visibility:**
```js
"scr-consumption-report": { master: FULL, central: FULL, franchise: FULL }
```

Franchise sees only their own data (backend-enforced). Multi-store controls hidden via role check.

---

## 5. Navigation Integration

Replace "Reports (soon)" with active link:

```js
{
  id: "consumption-report",
  screen: "scr-consumption-report",
  label: "Consumption Report",
  path: "/reports/consumption",
  icon: "BarChart3",
  // Remove comingSoon flag
}
```

---

## 6. Risk Analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Quantity strings with embedded units ("250 ml") need parsing | MEDIUM | `parseQtyString()` normalizer at API layer |
| Negative stock values in opening/closing | LOW | Show as-is with warning indicator (operational reality) |
| Large date ranges → many stock_details rows | MEDIUM | Details section collapsed by default; pagination if >100 |
| `by_restaurant` conditionally absent | LOW | Default to empty array in normalizer |
| `food_id` as string (not number) | LOW | Use string comparison for grouping |
| No consumption data for most stores in test env | LOW | Empty state: "No consumption recorded in this period" |
| Cross-store ingredient_ids differ per store | LOW | Do NOT merge by ingredient_name; show per-store rows |

---

## 7. Implementation Plan

### Phase 1: Core Report (~4-5h)

**Scope:** Date filter + ingredient summary + details + loading/error states
**Files:** `DailyConsumptionReport.jsx`, `useConsumptionReport.js`, api.js addition
**Risk:** ZERO — new page, additive only

### Phase 2: Multi-Store Controls (~2-3h)

**Scope:** Store selector, hierarchy toggle, by_restaurant rollup, store column
**Files:** Enhance `DailyConsumptionReport.jsx` + `ConsumptionFilters`
**Risk:** LOW — UI controls only, backend handles scope enforcement

**Total: ~6-8h, 2 phases.**

---

## 8. Open Questions

1. **Replace Reports "coming soon" or add as child route?** (Recommendation: Replace — the consumption report IS the first real report.)

2. **PDF/CSV export?** (Recommendation: Defer — JSON rendering first. Export is Phase 3.)

3. **Chart visualization?** (Recommendation: Defer — table-first for operational use. Charts are Phase 3.)

4. **Ingredient drill-down to transfers?** (Recommendation: Defer — would need to cross-reference with transfer history.)
