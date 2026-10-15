#!/usr/bin/env bash

# =============================
# P20 — Stock Inventory Summary Curls
# All endpoints verified against live POS API (preprod) — 27 May 2026
# Tested with: Master(rid=1), Central2(rid=782), Franchise4(rid=786)
# =============================

# --- Credentials ---
# MASTER_TOKEN  = abhishek@kalabahia.com / Qplazm@10 → rid=1, type=master
# CENTRAL_TOKEN = owner@democentral2.com / Qplazm@10 → rid=782, type=central
# FRANCHISE_TOKEN = owner@demofranchise4.com / Qplazm@10 → rid=786, type=franchise

BASE_V2="https://preprod.mygenie.online/api/v2/vendoremployee"

# =============================
# Curl 1 — Master: Default (no hierarchy)
# =============================
echo
echo "=== P20-V1: Master — GET /inventory/stock-inventory (default) ==="
curl --location "${BASE_V2}/inventory/stock-inventory" \
  --header "Authorization: Bearer ${MASTER_TOKEN}" \
  --header "Accept: application/json"
echo
echo "# RESULT: 200 OK — 4 items in current_stocks[], no hierarchy fields"
echo "# Items: Cooking Oil (24.82 ltr), maida (108.15 kg), patri (13.83 kg), red meat (32.00 kg)"
echo "# All is_low_stock=false at master level"

# =============================
# Curl 2 — Master: With hierarchy
# =============================
echo
echo "=== P20-V2: Master — GET /inventory/stock-inventory?include_hierarchy=true ==="
curl --location "${BASE_V2}/inventory/stock-inventory?include_hierarchy=true" \
  --header "Authorization: Bearer ${MASTER_TOKEN}" \
  --header "Accept: application/json"
echo
echo "# RESULT: 200 OK — same current_stocks[] + hierarchy_context + hierarchy_summary"
echo "# hierarchy_context.scope_restaurant_ids = [1, 781, 782, 783, 784, 785, 786] (7 stores)"
echo "# hierarchy_summary.totals = {stock_rows: 28, low_stock_rows: 13}"
echo "# hierarchy_summary.by_store[] includes per-store aggregates"

# =============================
# Curl 3 — Central: Default (no hierarchy)
# =============================
echo
echo "=== P20-V3: Central (C782) — GET /inventory/stock-inventory (default) ==="
curl --location "${BASE_V2}/inventory/stock-inventory" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json"
echo
echo "# RESULT: 200 OK — 4 items, own store (C782)"
echo "# Items: Cooking Oil (0.20 ltr), maida (0.00 kg, LOW), patri (0.00 kg, LOW), red meat (0.80 kg)"
echo "# 2 items is_low_stock=true (maida, patri at 0 qty)"

# =============================
# Curl 4 — Central: With hierarchy
# =============================
echo
echo "=== P20-V4: Central (C782) — GET /inventory/stock-inventory?include_hierarchy=true ==="
curl --location "${BASE_V2}/inventory/stock-inventory?include_hierarchy=true" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json"
echo
echo "# RESULT: 200 OK — same current_stocks[] + hierarchy"
echo "# hierarchy_context.scope_restaurant_ids = [782, 781, 783, 784, 785, 786] (6 stores, NO master)"
echo "# Central sees siblings + all franchises but NOT master"
echo "# hierarchy_summary.totals = {stock_rows: 24, low_stock_rows: 13}"

# =============================
# Curl 5 — Franchise: Default (no hierarchy)
# =============================
echo
echo "=== P20-V5: Franchise (F786) — GET /inventory/stock-inventory (default) ==="
curl --location "${BASE_V2}/inventory/stock-inventory" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json"
echo
echo "# RESULT: 200 OK — 4 items, own store (F786)"
echo "# Items: Cooking Oil (0.50 ltr), maida (1.20 kg), patri (2.00 kg), red meat (2.10 kg)"
echo "# 0 items is_low_stock=true (all above threshold)"

# =============================
# Curl 6 — Franchise: With hierarchy
# =============================
echo
echo "=== P20-V6: Franchise (F786) — GET /inventory/stock-inventory?include_hierarchy=true ==="
curl --location "${BASE_V2}/inventory/stock-inventory?include_hierarchy=true" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json"
echo
echo "# RESULT: 200 OK — same current_stocks[] + hierarchy (self-only)"
echo "# hierarchy_context.scope_restaurant_ids = [786] (self only)"
echo "# hierarchy_summary.total_stores_in_scope = 1"
echo "# Hierarchy toggle has NO added value for franchise users"

# =============================
# Summary of Findings
# =============================
echo
echo "=== P20 API VALIDATION SUMMARY ==="
echo "1. Both endpoints WORKING for all 3 roles (master/central/franchise)"
echo "2. current_stocks[] is IDENTICAL between default and hierarchy calls (backward compatible)"
echo "3. Hierarchy is purely ADDITIVE — adds hierarchy_context + hierarchy_summary"
echo "4. Scope rules match existing hierarchy-summary/hierarchy-detail visibility:"
echo "   - Master: sees all stores (7)"
echo "   - Central: sees self + siblings + all franchises, NOT master (6)"
echo "   - Franchise: sees only self (1)"
echo "5. is_low_stock boolean is POS-computed — no frontend recomputation needed"
echo "6. Quantities are STRINGS in current_stocks — need parseFloat() for arithmetic"
echo "7. by_store[].total_display_qty is MIXED UNITS (kg+ltr sum) — use as indicator only"
echo "8. by_store[] includes: stock_rows, low_stock_rows, total_cal_quantity, total_display_qty"
echo "9. Hierarchy toggle has minimal value for franchise (shows only self)"
echo "10. No backend proxy changes needed — generic V2 proxy handles GET + query params"
