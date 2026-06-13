# Central Inventory — PRD

## Problem Statement
Full end-to-end validation: vendor purchase → blended-cost manufacture → transfer → POS sale → consumption report.

## Final Result: ALL FLOWS VERIFIED ✅

### Blended cost production
PRD-2026-0010: 930 Elachi Cookies from 3 GSM segments (VA@₹0.18 + VB@₹0.25), line_cost=₹685.95 = SUM(per-segment alloc_costs). Fix confirmed.

### Transfer chain
Master 806 → Franchise 811: 50pc ELACHI-3VENDOR-001, received as seg 365, batch/expiry preserved.

### POS consumption  
Order 939866 at store 811: 1pc deducted from seg 365 via FEFO. Stock 50→49. Consumption report shows order_id, food_item, ingredient, qty_deducted, opening/closing stock.

### Hierarchy consumption report
Master sees all 6 stores. 85 stock_detail lines: 3 POS orders + all production run sub-recipe deductions. by_restaurant breakdown for RID 806/809/810/811.

## Full Report
`/app/AI/Plans/P30_M0_PRODUCTION_VALIDATION_REPORT.md`
