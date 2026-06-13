# Central Inventory — PRD

## Problem Statement
Validate blended segment cost model after code fix: production runs consuming from multiple vendor segments must compute line_cost as SUM(per-segment unit_cost × qty), not flat-rate.

## Key Result: BLENDED COST VERIFIED ✅
PRD-2026-0010 (930 Elachi, 30× batch): GSM consumed from 3 segments (VA@₹0.18/gm + VB@₹0.25/gm). `line_cost = ₹685.95 = SUM(alloc_costs)`, not ₹540 (old flat rate). 4 cross-segment ingredients all verified: sum == line_cost, diff=₹0.00.

## Fresh GRN forward test ✅
New segments from bills 6018/6019 have `unit_cost_at_intake` set by code at GRN time — no backfill dependency.

## Transfer + receive ✅
50 blended-cost cookies dispatched Master→Franchise 811, received, segment 365 created with batch/expiry preserved.

## Full Report
`/app/AI/Plans/P30_M0_PRODUCTION_VALIDATION_REPORT.md`
