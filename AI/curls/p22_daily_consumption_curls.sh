#!/usr/bin/env bash
# P22 — Daily Consumption Report — API Validation Curls (28 May 2026)
BASE_V2="https://preprod.mygenie.online/api/v2/vendoremployee"

echo "=== V1: Master — Legacy single-store ==="
# RESULT: 200, stock_summary:0, stock_details:0, by_restaurant:absent
curl --location "${BASE_V2}/report/daily-consumption-report" \
  -H "Authorization: Bearer ${MASTER_TOKEN}" -H "Content-Type: application/json" \
  -d '{"from_date":"2026-05-01","to_date":"2026-05-28"}'

echo "=== V2: Master — include_hierarchy=true ==="
# RESULT: 200, stock_summary:2, stock_details:2, by_restaurant:[{restaurant_id:784,...}]
# Data from DemoFranchise2 only: Cooking Oil 250ml + maida 500gm, order #869307
curl --location "${BASE_V2}/report/daily-consumption-report" \
  -H "Authorization: Bearer ${MASTER_TOKEN}" -H "Content-Type: application/json" \
  -d '{"from_date":"2026-05-01","to_date":"2026-05-28","include_hierarchy":true}'

echo "=== V3: Central — single store ==="
# RESULT: 200, stock_summary:0, hierarchy_scope:6 stores (no master)

echo "=== V4: Central — include_hierarchy=true ==="
# RESULT: 200, stock_summary:2, by_restaurant:1 store, applied:[782,781,783,784,785,786]

echo "=== V5: Franchise — single store ==="
# RESULT: 200, stock_summary:0, hierarchy_scope:1 (self only)

echo "=== V6: Master — restaurant_ids=[784] ==="
# RESULT: 200, stock_summary:2, by_restaurant:absent (single store → no rollup)

echo "=== V7: Franchise — restaurant_ids=[781] (out of scope) ==="
# RESULT: 403, {errors:[{code:"invalid_scope",message:"..."}]}

echo "=== V8: Master — empty body ==="
# RESULT: 200, stock_summary:0 (defaults to today, actor store)

echo "=== V9: Master — single day + hierarchy ==="
# RESULT: 200, stock_summary:2, date_range:["2026-05-28","2026-05-28"]
