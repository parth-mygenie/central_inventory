
---

## Addendum: P22 Daily Consumption Report — API Investigation (28 May 2026)

> **Source:** Live POS API probing (preprod.mygenie.online) — 9 probes
> **Actors:** Master (rid=1), Central (rid=782), Franchise (rid=786)

### Endpoint Confirmed

| Endpoint | Method | Status |
|----------|--------|--------|
| `POST /report/daily-consumption-report` | POST | **WORKING** |

### Mode Behavior

| Mode | Trigger | by_restaurant | restaurant_id on rows |
|------|---------|:---:|:---:|
| Legacy | No hierarchy params | absent | absent |
| Hierarchy | `include_hierarchy: true` | present | present |
| Specific stores | `restaurant_ids: [784]` (single) | absent | present |
| Specific stores | `restaurant_ids: [784, 786]` (multi) | present | present |

### Scope Enforcement

- Franchise requesting out-of-scope stores → **403** `{errors: [{code: "invalid_scope"}]}`
- Master/Central scope matches P20 stock-inventory scope exactly

### Data Characteristics

- `stock_summary` = per-ingredient rollup (opening/consumed/closing) — **strings with units** ("250 ml")
- `stock_details` = per-order-line consumption log — **strings with units**
- `by_restaurant` = per-store aggregate with `total_consumed_raw` (numeric)
- Negative opening/closing stock values are **operational reality** (not errors)
- `food_id` returned as **string** (not number)
- `hierarchy_scope` always present (store picker data)

### Test Data Found

Only DemoFranchise2 (rid=784) has consumption data: 2 ingredients (Cooking Oil 250ml, maida 500gm) from 1 order (#869307, aloo parantha, POS type) on 2026-05-28.

### Implementation: ~6-8h (2 phases)

Phase 1: Core report with date filter + tables (~4-5h) — **DONE**
Phase 2: Multi-store controls + by_restaurant rollup (~2-3h) — **DONE**

### Implementation Status (29 May 2026)
- Both phases implemented in single pass
- 12/12 frontend tests passed (100%)
- Files: DailyConsumptionReport.jsx, useConsumptionReport.js, api.js, screenVisibility.js, App.js
- Sidebar "Reports (soon)" replaced with active "Consumption Report" link
- Route: /reports/consumption
