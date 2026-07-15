
---

## Addendum: P20 Stock Inventory Summary — API Investigation (27 May 2026)

> **Source:** Live POS API probing (preprod.mygenie.online)
> **Actors tested:** Master (rid=1), Central C782, Franchise F786
> **Curl evidence:** `AI/curls/p20_stock_inventory_curls.sh`

### P20 Stock Inventory — Endpoints Confirmed

| Endpoint | Method | Query Param | Status |
|----------|--------|-------------|--------|
| `GET /inventory/stock-inventory` | GET | none | **WORKING** |
| `GET /inventory/stock-inventory?include_hierarchy=true` | GET | `include_hierarchy=true` | **WORKING** |

### Response Shapes

#### Default (no hierarchy)

```json
{
  "current_stocks": [
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
  ]
}
```

#### With hierarchy (additive fields only)

```json
{
  "current_stocks": [ /* ... IDENTICAL to default ... */ ],
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

### Role-Based Scope Verification

| Actor | Default Response | Hierarchy Scope | Master Visible |
|-------|-----------------|-----------------|---------------|
| Master (rid=1) | own 4 items | 7 stores (all) | Yes (self) |
| Central (rid=782) | own 4 items | 6 stores (no master) | **No** |
| Franchise (rid=786) | own 4 items | 1 store (self only) | No |

### Key Findings

1. **Backward compatible:** `current_stocks[]` IDENTICAL between default and hierarchy calls
2. **Purely additive:** hierarchy flag adds only `hierarchy_context` + `hierarchy_summary`
3. **POS-computed low stock:** `is_low_stock` boolean per item — no frontend recomputation
4. **String quantities:** `cal_quantity`, `display_qty`, `quantity`, `min_qty_alert` are strings — need `parseFloat()`
5. **Numeric hierarchy aggregates:** `by_store[].total_cal_quantity` and `total_display_qty` are numbers
6. **Mixed-unit warning:** `total_display_qty` sums across units (kg+ltr) — not directly displayable as single unit
7. **Franchise hierarchy = self-only:** toggle has no added value for franchise users
8. **Central sees siblings + franchises, NOT master** — consistent with hierarchy-summary/detail scoping
9. **No backend changes needed:** generic V2 proxy handles GET + query params

### Per-Store Hierarchy Data (Master actor)

| Store | Type | stock_rows | low_stock_rows | total_cal_quantity | total_display_qty |
|-------|------|-----------|----------------|-------------------|------------------|
| DemoCentral1 (781) | central | 4 | 3 | 1,250 | 1.25 |
| DemoCentral2 (782) | central | 4 | 2 | 1,000 | 1.00 |
| DemoFranchise1 (783) | franchise | 4 | 2 | 6,500 | 6.50 |
| DemoFranchise2 (784) | franchise | 4 | **4** | **0** | **0** |
| DemoFranchise3 (785) | franchise | 4 | 2 | 6,000 | 6.00 |
| DemoFranchise4 (786) | franchise | 4 | 0 | 5,800 | 5.80 |
| My Genie / Master (1) | master | 4 | 0 | 178,800 | 178.80 |

**Notable:** DemoFranchise2 (784) has ALL items at zero — 4/4 low stock. Good test case for "empty store" UX.

### Test Artifacts

| Action | Details | Notes |
|--------|---------|-------|
| Master default call | 200 OK, 4 items | Cooking Oil 24.82 ltr, maida 108.15 kg, patri 13.83 kg, red meat 32.00 kg |
| Master hierarchy call | 200 OK, 7 stores, 13 low-stock | by_store[] includes all 7 with aggregates |
| Central default call | 200 OK, 4 items | maida + patri both 0 qty (is_low_stock=true) |
| Central hierarchy call | 200 OK, 6 stores, 13 low-stock | Excludes master from scope |
| Franchise default call | 200 OK, 4 items | All items above threshold |
| Franchise hierarchy call | 200 OK, 1 store (self) | Hierarchy toggle adds no value |

### Frontend Planning

See `AI/Plans/phase2/P20_stock_inventory_summary_plan.md` for full implementation plan.
