#!/usr/bin/env bash
# P24 — FEFO Consumption + Batch-Accurate Stock Summary — API Validation Curls (29 May 2026)
# Actors: Master/killua (rid=1), DemoFranchise3 (rid=785), DemoFranchise2 (rid=784)

API_URL="https://api-sync-staging.preview.emergentagent.com/api"

# ══════════════════════════════════════════════════════════════════
# STOCK INVENTORY LIST (unchanged) — GET /inventory/stock-inventory
# ══════════════════════════════════════════════════════════════════

echo "=== F1: Master (killua) — stock list ==="
# RESULT: 200, 4 items: Cooking Oil (24820 ltr), maida (118150 kg), patri (9830 kg), red meat (32000 kg)
curl -s "${API_URL}/proxy/v2/inventory/stock-inventory" \
  -H "Authorization: Bearer ${KILLUA_TOKEN}"

echo "=== F2: DemoFranchise3 (785) — stock list ==="
# RESULT: 200, 4 items: Cooking Oil (0 ltr), maida (2000 kg), patri (3950 kg), red meat (250 kg)
curl -s "${API_URL}/proxy/v2/inventory/stock-inventory" \
  -H "Authorization: Bearer ${F3_TOKEN}"

# ══════════════════════════════════════════════════════════════════
# STOCK DETAIL (NEW) — GET /inventory/stock-inventory/{id}
# ══════════════════════════════════════════════════════════════════

echo "=== F3: F3 maida (17001) — segments present, FEFO ordered ==="
# RESULT: 200, segments:[{seg=22, batch=MAIDA-BATCH-01, exp=2026-12-31, qty=1000, src=782},
#                        {seg=33, batch=MAIDA-BATCH-01, exp=2026-12-31, qty=1000, src=782}]
# reconciliation: {aggregate:2000, segment_total:2000, unsegmented:0}
# consumption_lines: [] (no orders at this franchise in period)
curl -s "${API_URL}/proxy/v2/inventory/stock-inventory/17001?consumption_from=2026-05-01&consumption_to=2026-05-29" \
  -H "Authorization: Bearer ${F3_TOKEN}"

echo "=== F4: F3 Cooking Oil (17000) — no segments, qty=0 ==="
# RESULT: 200, segments:[], reconciliation: {aggregate:0, segment:0, unsegmented:0}
curl -s "${API_URL}/proxy/v2/inventory/stock-inventory/17000?consumption_from=2026-05-01&consumption_to=2026-05-29" \
  -H "Authorization: Bearer ${F3_TOKEN}"

echo "=== F5: Master maida (16981) — segments + unsegmented remainder ==="
# RESULT: 200, segments:[{seg=14, batch=MAIDA-BATCH-01, exp=2026-12-31, qty=28000},
#                        {seg=25, batch=FINAL-MAIDA-01, exp=2026-12-31, qty=20000},
#                        {seg=40, batch=None, exp=None, qty=60150}]
# reconciliation: {aggregate:118150, segment_total:108150, unsegmented:10000}
# NOTE: unsegmented_remainder > 0 → legacy data not yet fully backfilled
curl -s "${API_URL}/proxy/v2/inventory/stock-inventory/16981?consumption_from=2026-05-01&consumption_to=2026-05-29" \
  -H "Authorization: Bearer ${KILLUA_TOKEN}"

echo "=== F6: Master Cooking Oil (16980) — segments, reconciled ==="
# RESULT: 200, 4 segments (OIL-BATCH-01, FINAL-OIL-01, 2 test batches)
# reconciliation: {aggregate:24820, segment_total:24820, unsegmented:0}
curl -s "${API_URL}/proxy/v2/inventory/stock-inventory/16980?consumption_from=2026-05-01&consumption_to=2026-05-29" \
  -H "Authorization: Bearer ${KILLUA_TOKEN}"

echo "=== F7: F3 red meat (17003) — segments present, reconciliation MISMATCH ==="
# RESULT: 200, segments:[{seg=19, MEAT-BATCH-01, exp=2026-06-30, qty=2000},
#                        {seg=30, MEAT-BATCH-01, exp=2026-06-30, qty=2000}]
# reconciliation: {aggregate:250, segment_total:4000, unsegmented:0}
# NOTE: aggregate(250) ≠ segment_total(4000) → 3750 discrepancy
curl -s "${API_URL}/proxy/v2/inventory/stock-inventory/17003?consumption_from=2026-05-01&consumption_to=2026-05-29" \
  -H "Authorization: Bearer ${F3_TOKEN}"

echo "=== F9: F2 Cooking Oil (16996) — negative stock, consumption lines present ==="
# RESULT: 200, cal_quantity: -500, segments: []
# consumption_lines: [
#   {date:2026-05-29, order:869321, food:aloo parantha, qty:250, segment_allocations:[], batch:null},
#   {date:2026-05-28, order:869307, food:aloo parantha, qty:250, segment_allocations:[], batch:null}
# ]
# NOTE: consumption happened WITHOUT FEFO segments (legacy path — fefo_consumption_enabled=false?)
curl -s "${API_URL}/proxy/v2/inventory/stock-inventory/16996?consumption_from=2026-05-01&consumption_to=2026-05-29" \
  -H "Authorization: Bearer ${F2_TOKEN}"

echo "=== F10: F2 maida (16997) — negative stock, consumption lines present ==="
# RESULT: 200, cal_quantity: -1000, segments: [], consumption_summary: {total_consumed: 1000}
# consumption_lines: 2 entries from orders 869321 + 869307, segment_allocations: []
curl -s "${API_URL}/proxy/v2/inventory/stock-inventory/16997?consumption_from=2026-05-01&consumption_to=2026-05-29" \
  -H "Authorization: Bearer ${F2_TOKEN}"

echo "=== F16: Invalid ID → 404 ==="
# RESULT: 404, {status:false, errors:[{code:"not_found", message:"Stock item not found."}]}
curl -s "${API_URL}/proxy/v2/inventory/stock-inventory/99999" \
  -H "Authorization: Bearer ${KILLUA_TOKEN}"

echo "=== F17: Cross-store access → 404 ==="
# RESULT: 404 — Master can't see F2's items via detail endpoint (scoped to own restaurant)
curl -s "${API_URL}/proxy/v2/inventory/stock-inventory/16996" \
  -H "Authorization: Bearer ${KILLUA_TOKEN}"

echo "=== F18: No date params → defaults to last 7 days ==="
# RESULT: 200, consumption_summary: {from_date: 7-days-ago, to_date: today}
curl -s "${API_URL}/proxy/v2/inventory/stock-inventory/16980" \
  -H "Authorization: Bearer ${KILLUA_TOKEN}"

# ══════════════════════════════════════════════════════════════════
# WASTAGE REPORT (EXTENDED) — POST /inventory/wastage-report
# ══════════════════════════════════════════════════════════════════

echo "=== F11: Master wastage with has_batch=true ==="
# RESULT: 200, 0 records (no wastage has segment_allocations_json populated yet)
curl -s -X POST "${API_URL}/proxy/v2/inventory/wastage-report" \
  -H "Authorization: Bearer ${KILLUA_TOKEN}" -H "Content-Type: application/json" \
  -d '{"from_date":"2026-05-01","to_date":"2026-05-29","has_batch":true}'

echo "=== F12: Master wastage standard ==="
# RESULT: 200, 7 records — all have segment_allocations:[], batch:null, source_type:null
# Keys include: segment_allocations_json, source_type, segment_allocations, batch, expiry_date
curl -s -X POST "${API_URL}/proxy/v2/inventory/wastage-report" \
  -H "Authorization: Bearer ${KILLUA_TOKEN}" -H "Content-Type: application/json" \
  -d '{"from_date":"2026-05-01","to_date":"2026-05-29"}'

echo "=== F13: F3 wastage with include_segments=true ==="
# RESULT: 200, 0 wastage records, BUT segment_snapshot: 6 entries with batch/expiry data
# segment_snapshot_note: "Current on-hand segment rows when include_segments=true"
curl -s -X POST "${API_URL}/proxy/v2/inventory/wastage-report" \
  -H "Authorization: Bearer ${F3_TOKEN}" -H "Content-Type: application/json" \
  -d '{"from_date":"2026-05-01","to_date":"2026-05-29","include_segments":true}'

echo "=== F19: Master wastage with include_segments=true ==="
# RESULT: 200, 7 wastage records + segment_snapshot: 38 segment entries across all stores
curl -s -X POST "${API_URL}/proxy/v2/inventory/wastage-report" \
  -H "Authorization: Bearer ${KILLUA_TOKEN}" -H "Content-Type: application/json" \
  -d '{"from_date":"2026-05-01","to_date":"2026-05-29","include_segments":true}'
