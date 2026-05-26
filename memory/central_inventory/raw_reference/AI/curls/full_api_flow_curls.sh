#!/usr/bin/env bash

# Full API curl collection (start to current state)
# Covers:
# 1) Auth/login flows used in this implementation timeline
# 2) Franchise API v2 flows
# 3) Inventory transfer hierarchy flows (request/approve/dispatch/receive/cancel/reject)

# =============================
# Base URLs
# =============================
BASE_V1="https://preprod.mygenie.online/api/v1"
BASE_V2="https://preprod.mygenie.online/api/v2/vendoremployee"

# =============================
# Tokens / IDs (replace all)
# =============================
FRANCHISE_TOKEN="REPLACE_WITH_FRANCHISE_VENDOR_EMPLOYEE_TOKEN"
CENTRAL_TOKEN="REPLACE_WITH_CENTRAL_VENDOR_EMPLOYEE_TOKEN"
MASTER_TOKEN="REPLACE_WITH_MASTER_VENDOR_EMPLOYEE_TOKEN"
ADMIN_TOKEN="REPLACE_WITH_ADMIN_TOKEN_FOR_LOGIN_AS_RESTAURANT"

FRANCHISE_RESTAURANT_ID="REPLACE_WITH_FRANCHISE_RESTAURANT_ID"
CENTRAL_RESTAURANT_ID="REPLACE_WITH_CENTRAL_RESTAURANT_ID"
MASTER_RESTAURANT_ID="REPLACE_WITH_MASTER_RESTAURANT_ID"
CHILD_RESTAURANT_ID="REPLACE_WITH_CHILD_RESTAURANT_ID"
TRANSFER_ID="REPLACE_WITH_TRANSFER_ID"
TRANSFER_ID_2="REPLACE_WITH_TRANSFER_ID_2"
TRANSFER_ID_3="REPLACE_WITH_TRANSFER_ID_3"
TRANSFER_ID_4="REPLACE_WITH_TRANSFER_ID_4"
BUTTER_SOURCE_INVENTORY_ID="3585"
WATER_SOURCE_INVENTORY_ID="3576"
BUTTER_REQUEST_TRANSFER_ID="REPLACE_WITH_BUTTER_REQUEST_TRANSFER_ID"
WATER_REQUEST_TRANSFER_ID="REPLACE_WITH_WATER_REQUEST_TRANSFER_ID"
ORIGIN_TRANSFER_ID="REPLACE_WITH_TRANSFER_ID_FOR_LINEAGE_OR_NULL"

# =============================
# 1) Auth APIs (v1)
# =============================

echo "=== V1: vendoremployee/common-login ==="
curl --location "${BASE_V1}/auth/vendoremployee/common-login" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "email": "killua@franchise.com",
    "password": "Drunkrebel@29",
    "fcm_token": "test_fcm_token"
  }'

echo
echo "=== V1: adminemployee/login-as-restaurant ==="
curl --location "${BASE_V1}/auth/adminemployee/login-as-restaurant" \
  --header "Authorization: Bearer ${ADMIN_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"restaurant_id\": ${FRANCHISE_RESTAURANT_ID}
  }"

echo
echo "=== V1: vendoremployee/login (normal) ==="
curl --location "${BASE_V1}/auth/vendoremployee/login" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "email": "abhishek@kalabahia.com",
    "password": "Qplazm@10"
  }'

# =============================
# 2) Franchise APIs (v2)
# =============================

echo
echo "=== V2: franchise/list ==="
curl --location "${BASE_V2}/franchise/list?limit=25" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json"

echo
echo "=== V2: franchise/create metadata ==="
curl --location "${BASE_V2}/franchise/create" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json"

echo
echo "=== V2: franchise/create ==="
curl --location "${BASE_V2}/franchise/create" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "name": "Demo Franchise Outlet",
    "phone": "9999999999",
    "email": "demo.franchise@example.com",
    "password": "Demo@12345",
    "address": "Demo Address, City"
  }'

echo
echo "=== V2: franchise/manage/{id} ==="
curl --location "${BASE_V2}/franchise/manage/${CHILD_RESTAURANT_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json"

echo
echo "=== V2: franchise/push-form/{id} ==="
curl --location "${BASE_V2}/franchise/push-form/${CHILD_RESTAURANT_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json"

echo
echo "=== V2: franchise/push/{id} ==="
curl --location "${BASE_V2}/franchise/push/${CHILD_RESTAURANT_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "push_food_bundle": true
  }'

echo
echo "=== V2: franchise/history ==="
curl --location "${BASE_V2}/franchise/history" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "limit": 50
  }'

# =============================
# 3) Inventory Transfer APIs (v2)
# =============================

echo
echo "=== V2: inventory-transfer/initiate (direct dispatch compatibility) ==="
curl --location "${BASE_V2}/inventory-transfer/initiate" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"from_restaurant_id\": ${CENTRAL_RESTAURANT_ID},
    \"to_restaurant_id\": ${FRANCHISE_RESTAURANT_ID},
    \"items\": [
      {
        \"source_inventory_master_id\": 1,
        \"quantity\": 2,
        \"unit\": \"kg\",
        \"source_selector\": {
          \"mode\": \"filter_bucket\",
          \"bucket\": \"without_batch_and_expiry\",
          \"batch_state\": \"null\",
          \"expiry_state\": \"null\"
        }
      }
    ]
  }"

echo
echo "=== V2: inventory-transfer/request (franchise -> central) ==="
curl --location "${BASE_V2}/inventory-transfer/request" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "items": [
      {
        "stock_title": "Tomato",
        "unit_id": 1,
        "quantity": 5,
        "unit": "kg",
        "source_selector": {
          "mode": "filter_bucket",
          "bucket": "without_batch_and_expiry",
          "batch_state": "null",
          "expiry_state": "null"
        }
      }
    ]
  }'

echo
echo "=== V2: inventory-transfer/request (central -> master) ==="
curl --location "${BASE_V2}/inventory-transfer/request" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "items": [
      {
        "stock_title": "Cooking Oil",
        "unit_id": 2,
        "quantity": 10,
        "unit": "ltr",
        "source_selector": {
          "mode": "filter_bucket",
          "bucket": "without_batch_and_expiry",
          "batch_state": "null",
          "expiry_state": "null"
        }
      }
    ]
  }'

echo
echo "=== V2: inventory-transfer/approve/{id} (parent/source approver) ==="
curl --location "${BASE_V2}/inventory-transfer/approve/${TRANSFER_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'

echo
echo "=== V2: inventory-transfer/reject/{id} (SOURCE rejects request) ==="
curl --location "${BASE_V2}/inventory-transfer/reject/${TRANSFER_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'

echo
echo "=== V2: inventory-transfer/dispatch/{id} (after approval) ==="
curl --location "${BASE_V2}/inventory-transfer/dispatch/${TRANSFER_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'

echo
echo "=== V2: inventory-transfer/receive/{id} (destination confirms receipt) ==="
curl --location "${BASE_V2}/inventory-transfer/receive/${TRANSFER_ID}" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'

echo
echo "=== V2: inventory-transfer/cancel/{id} (SOURCE / sender only) ==="
curl --location "${BASE_V2}/inventory-transfer/cancel/${TRANSFER_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'

echo
echo "=== V2: inventory-transfer/reject/{id} (DESTINATION / receiver only) ==="
curl --location "${BASE_V2}/inventory-transfer/reject/${TRANSFER_ID}" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'

echo
echo "=== V2: inventory-transfer/details/{id} ==="
curl --location "${BASE_V2}/inventory-transfer/details/${TRANSFER_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json"

echo
echo "=== V2: inventory-transfer/history ==="
curl --location "${BASE_V2}/inventory-transfer/history" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"restaurant_id\": ${CENTRAL_RESTAURANT_ID},
    \"limit\": 20
  }"

echo
echo "=== V2: inventory-transfer/source-options (frontend source selector) ==="
curl --location "${BASE_V2}/inventory-transfer/source-options" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"from_restaurant_id\": ${CENTRAL_RESTAURANT_ID},
    \"source_inventory_master_id\": ${WATER_SOURCE_INVENTORY_ID}
  }"

echo
echo "=== V2: inventory-transfer/initiate using without_expiry_only selector ==="
curl --location "${BASE_V2}/inventory-transfer/initiate" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"from_restaurant_id\": ${CENTRAL_RESTAURANT_ID},
    \"to_restaurant_id\": ${FRANCHISE_RESTAURANT_ID},
    \"items\": [
      {
        \"source_inventory_master_id\": ${WATER_SOURCE_INVENTORY_ID},
        \"quantity\": 1,
        \"unit\": \"ltr\",
        \"source_selector\": {
          \"mode\": \"filter_bucket\",
          \"bucket\": \"without_expiry_only\",
          \"batch_state\": \"value\",
          \"batch\": \"WATER-APR-LOT-01\",
          \"expiry_state\": \"null\"
        }
      }
    ]
  }"

echo
echo "=== V2: inventory-transfer/initiate using exact segment_id selector ==="
curl --location "${BASE_V2}/inventory-transfer/initiate" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"from_restaurant_id\": ${CENTRAL_RESTAURANT_ID},
    \"to_restaurant_id\": ${FRANCHISE_RESTAURANT_ID},
    \"items\": [
      {
        \"source_inventory_master_id\": ${WATER_SOURCE_INVENTORY_ID},
        \"quantity\": 0.5,
        \"unit\": \"ltr\",
        \"source_selector\": {
          \"mode\": \"segment_id\",
          \"segment_id\": 3
        }
      }
    ]
  }"

echo
echo "=== V2: inventory/add-stock/{id} with batch + expiry + lineage ==="
curl --location "${BASE_V2}/inventory/add-stock/${WATER_SOURCE_INVENTORY_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --form "quantity=40" \
  --form "unit=ltr" \
  --form "vendor_id=1" \
  --form "payment_type=Cash" \
  --form "purchase_date=2026-04-27" \
  --form "price=1200" \
  --form "tot_amount=1200" \
  --form "batch=WATER-APR-LOT-01" \
  --form "expiry_date=2026-12-31" \
  --form "source_restaurant_id=${CENTRAL_RESTAURANT_ID}" \
  --form "origin_transfer_id=${ORIGIN_TRANSFER_ID}"

echo
echo "=== Cancel/Reject/Receive payload variants ==="

echo
echo "=== Cancel (default backward-compatible: return_to_source) ==="
curl --location "${BASE_V2}/inventory-transfer/cancel/${TRANSFER_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'

echo
echo "=== Cancel with damaged resolution ==="
curl --location "${BASE_V2}/inventory-transfer/cancel/${TRANSFER_ID_2}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "resolution_type": "damaged",
    "resolution_meta": {
      "reason": "temperature breach in transit",
      "damaged_qty": 2
    }
  }'

echo
echo "=== Cancel with partial_return resolution ==="
curl --location "${BASE_V2}/inventory-transfer/cancel/${TRANSFER_ID_3}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "resolution_type": "partial_return",
    "resolution_meta": {
      "reason": "some cartons leaked",
      "returned_qty": 6
    }
  }'

echo
echo "=== Cancel with in_transit_hold resolution ==="
curl --location "${BASE_V2}/inventory-transfer/cancel/${TRANSFER_ID_4}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "resolution_type": "in_transit_hold",
    "resolution_meta": {
      "reason": "carrier dispute - awaiting inspection"
    }
  }'

echo
echo "=== Receive with explicit full acceptance ==="
curl --location "${BASE_V2}/inventory-transfer/receive/${TRANSFER_ID}" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "received_lines": [
      { "line_id": 101, "accepted_qty": 10, "rejected_qty": 0 },
      { "line_id": 102, "accepted_qty": 5, "rejected_qty": 0 }
    ]
  }'

echo
echo "=== Receive with partial rejection + return_to_source ==="
curl --location "${BASE_V2}/inventory-transfer/receive/${TRANSFER_ID_2}" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "resolution_type": "return_to_source",
    "resolution_meta": {
      "reason": "minor breakage"
    },
    "received_lines": [
      { "line_id": 201, "accepted_qty": 8, "rejected_qty": 2 }
    ]
  }'

echo
echo "=== Receive with partial rejection + damaged ==="
curl --location "${BASE_V2}/inventory-transfer/receive/${TRANSFER_ID_3}" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "resolution_type": "damaged",
    "resolution_meta": {
      "reason": "seal broken"
    },
    "received_lines": [
      { "line_id": 301, "accepted_qty": 6, "rejected_qty": 4 }
    ]
  }'

echo
echo "=== Hierarchy summary (franchise stores, default today) ==="
curl --location "${BASE_V2}/inventory-transfer/hierarchy-summary" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "store_type": "franchise"
  }'

echo
echo "=== Hierarchy summary (central stores, date range) ==="
curl --location "${BASE_V2}/inventory-transfer/hierarchy-summary" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "store_type": "central",
    "from_date": "2026-04-01",
    "to_date": "2026-04-30"
  }'

echo
echo "=== Hierarchy detail (store-wise stock + batches + transactions) ==="
curl --location "${BASE_V2}/inventory-transfer/hierarchy-detail" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "store_restaurant_id": '${FRANCHISE_RESTAURANT_ID}',
    "selected_stock_title": "Water",
    "selected_unit_id": 3
  }'

echo
echo "=== Pending stock queues ==="
curl --location "${BASE_V2}/inventory-transfer/pending-queues" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "limit": 50
  }'

echo
echo "=== Franchise bundle push ==="
curl --location "${BASE_V2}/franchise/push/${FRANCHISE_RESTAURANT_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"push_food_bundle": true}'



# =============================
# ADDENDUM: Request Stock 3-Step Flow (25 May 2026)
# Verified against real POS APIs — all 24/24 tests PASS
# Source: memory/central_inventory/REQUEST_STOCK_E2E_TEST_RESULTS.md
# =============================

# --- Tokens (replace with fresh tokens from login) ---
# MASTER_TOKEN  = abhishek@kalabahia.com / Qplazm@10  → rid=1, type=master
# CENTRAL1_TOKEN = owner@democentral1.com / Qplazm@10 → rid=781, type=central
# CENTRAL2_TOKEN = owner@democentral2.com / Qplazm@10 → rid=782, type=central
# FRANCHISE1_TOKEN = owner@demofranchise1.com / Qplazm@10 → rid=783, type=franchise
# FRANCHISE4_TOKEN = owner@demofranchise4.com / Qplazm@10 → rid=786, type=franchise

# =============================
# Step 1: request-sources (who can this store request from?)
# =============================

echo
echo "=== Request Sources — Franchise 786 ==="
curl --location "${BASE_V2}/inventory-transfer/request-sources" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'
# Expected: 3 sources — C782 (direct_parent, submit=true), Master(1) (upstream_master, submit=true), C781 (sibling_central, submit=false unless allow_cross_central_franchise_dispatch=true)

echo
echo "=== Request Sources — Central 781 ==="
curl --location "${BASE_V2}/inventory-transfer/request-sources" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'
# Expected: 2 sources — Master(1) (direct_parent, submit=true), C782 (sibling_central, submit=false by default)

echo
echo "=== Request Sources — Master (should FAIL 403) ==="
curl --location "${BASE_V2}/inventory-transfer/request-sources" \
  --header "Authorization: Bearer ${MASTER_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'
# Expected: 403 UNAUTHORIZED_ACTION — master cannot use request flow

# =============================
# Step 2: request-catalog (source store SKUs)
# =============================

echo
echo "=== Request Catalog — F786 browsing C782 (direct parent) ==="
curl --location "${BASE_V2}/inventory-transfer/request-catalog" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"source_restaurant_id": 782}'
# Expected: items[] with source_inventory_master_id (16988, 16989, 16990, 16991), available_display_qty, is_mapped_to_child

echo
echo "=== Request Catalog — F786 browsing Master(1) ==="
curl --location "${BASE_V2}/inventory-transfer/request-catalog" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"source_restaurant_id": 1}'
# Expected: items[] from master (16980, 16981, 16982, 16983)

echo
echo "=== Request Catalog — C781 browsing Master(1) ==="
curl --location "${BASE_V2}/inventory-transfer/request-catalog" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"source_restaurant_id": 1}'

# =============================
# Step 3: Submit request
# =============================

echo
echo "=== Submit Request — F786 → default parent C782 (filter_bucket) ==="
curl --location "${BASE_V2}/inventory-transfer/request" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "items": [
      {
        "source_inventory_master_id": 16989,
        "stock_title": "maida",
        "quantity": 0.5,
        "unit": "kg",
        "source_selector": {
          "mode": "filter_bucket",
          "bucket": "without_batch_and_expiry",
          "batch_state": "null",
          "expiry_state": "null"
        }
      }
    ]
  }'
# Expected: status=true, transfer_id, type=request, status=requested

echo
echo "=== Submit Request — F786 → explicit from_restaurant_id=782 ==="
curl --location "${BASE_V2}/inventory-transfer/request" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "from_restaurant_id": 782,
    "items": [
      {
        "source_inventory_master_id": 16989,
        "stock_title": "maida",
        "quantity": 0.3,
        "unit": "kg",
        "source_selector": {
          "mode": "filter_bucket",
          "bucket": "without_batch_and_expiry",
          "batch_state": "null",
          "expiry_state": "null"
        }
      }
    ]
  }'
# Expected: status=true, transfer_id

echo
echo "=== Submit Request — F786 → upstream Master(1) with segment_id ==="
# First get a segment from master: POST source-options with MASTER token
# (child cannot call source-options on parent — UNAUTHORIZED_ACTION)
MASTER_SEGMENT_ID="REPLACE_WITH_SEGMENT_FROM_MASTER_SOURCE_OPTIONS"
curl --location "${BASE_V2}/inventory-transfer/request" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"from_restaurant_id\": 1,
    \"items\": [
      {
        \"source_inventory_master_id\": 16983,
        \"stock_title\": \"patri\",
        \"quantity\": 0.1,
        \"unit\": \"kg\",
        \"source_selector\": {
          \"mode\": \"segment_id\",
          \"segment_id\": ${MASTER_SEGMENT_ID}
        }
      }
    ]
  }"
# Expected: status=true, transfer_id (segment_id must belong to source/master restaurant)

echo
echo "=== Submit Request — F786 → sibling C781 (expect INVALID_HIERARCHY if flag off) ==="
curl --location "${BASE_V2}/inventory-transfer/request" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "from_restaurant_id": 781,
    "items": [
      {
        "source_inventory_master_id": 16985,
        "stock_title": "maida",
        "quantity": 0.1,
        "unit": "kg",
        "source_selector": {
          "mode": "filter_bucket",
          "bucket": "without_batch_and_expiry",
          "batch_state": "null",
          "expiry_state": "null"
        }
      }
    ]
  }'
# Expected: 403 INVALID_HIERARCHY if allow_cross_central_franchise_dispatch=false
# Expected: 200 success if allow_cross_central_franchise_dispatch=true

echo
echo "=== Submit Request — C781 → Master(1) (central requesting parent) ==="
curl --location "${BASE_V2}/inventory-transfer/request" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"items\": [
      {
        \"source_inventory_master_id\": 16983,
        \"stock_title\": \"patri\",
        \"quantity\": 0.1,
        \"unit\": \"kg\",
        \"source_selector\": {
          \"mode\": \"segment_id\",
          \"segment_id\": ${MASTER_SEGMENT_ID}
        }
      }
    ]
  }"
# Expected: status=true, transfer_id

# =============================
# Error cases
# =============================

echo
echo "=== Error: wrong source_inventory_master_id ==="
curl --location "${BASE_V2}/inventory-transfer/request" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "items": [{"source_inventory_master_id": 99999, "stock_title": "ghost", "quantity": 1, "unit": "kg",
      "source_selector": {"mode": "filter_bucket", "bucket": "without_batch_and_expiry", "batch_state": "null", "expiry_state": "null"}}]
  }'
# Expected: 422 SOURCE_STOCK_NOT_FOUND

echo
echo "=== Error: missing source_selector ==="
curl --location "${BASE_V2}/inventory-transfer/request" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"items": [{"source_inventory_master_id": 16989, "quantity": 0.5, "unit": "kg"}]}'
# Expected: 422 VALIDATION_FAILED

# =============================
# Track: pending-queues after submit
# =============================

echo
echo "=== Pending Queues — Franchise 786 (my_requests) ==="
curl --location "${BASE_V2}/inventory-transfer/pending-queues" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"limit": 50}'
# Check data.my_requests for submitted requests

echo
echo "=== Pending Queues — Central 782 (approval_pending) ==="
curl --location "${BASE_V2}/inventory-transfer/pending-queues" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"limit": 50}'
# Check data.approval_pending for requests from F786

# =============================
# Cross-branch flag management
# =============================

echo
echo "=== Read operational settings ==="
curl --location "${BASE_V2}/inventory-transfer/operational-settings/get" \
  --header "Authorization: Bearer ${MASTER_TOKEN}" \
  --header "Content-Type: application/json" \
  --data-raw '{"restaurant_id": 1}'
# Check resolved_settings.allow_cross_central_franchise_dispatch

echo
echo "=== Enable cross-branch dispatch/request ==="
curl --location "${BASE_V2}/inventory-transfer/operational-settings/update" \
  --header "Authorization: Bearer ${MASTER_TOKEN}" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "restaurant_id": 1,
    "settings": {
      "allow_cross_central_franchise_dispatch": true
    }
  }'
# After enabling: sibling central shows can_submit_request=true in request-sources
# and both cross-request and cross-dispatch succeed


# =============================
# ADDENDUM: Missing Request Stock curl examples (25 May 2026)
# Source: REQUEST_STOCK_E2E_TEST_RESULTS.md
# =============================

echo
echo "=== Submit Request — Master → any (should FAIL — master cannot request) ==="
curl --location "${BASE_V2}/inventory-transfer/request" \
  --header "Authorization: Bearer ${MASTER_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "items": [
      {
        "source_inventory_master_id": 16985,
        "stock_title": "maida",
        "quantity": 0.1,
        "unit": "kg",
        "source_selector": {
          "mode": "filter_bucket",
          "bucket": "without_batch_and_expiry",
          "batch_state": "null",
          "expiry_state": "null"
        }
      }
    ]
  }'
# Expected: 422 INVALID_SOURCE_SELECTOR (POS validates selector BEFORE checking actor role)
# NOTE: Frontend should never reach here — master gated by canDo('request-stock')

echo
echo "=== Cross-branch dispatch — C781 → F786 (after enabling allow_cross_central_franchise_dispatch) ==="
# Prerequisite: operational-settings/update with allow_cross_central_franchise_dispatch=true
CENTRAL1_TOKEN="REPLACE_WITH_CENTRAL1_TOKEN_RID_781"
curl --location "${BASE_V2}/inventory-transfer/initiate" \
  --header "Authorization: Bearer ${CENTRAL1_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "from_restaurant_id": 781,
    "to_restaurant_id": 786,
    "items": [
      {
        "source_inventory_master_id": 16985,
        "stock_title": "maida",
        "quantity": 0.1,
        "unit": "kg",
        "source_selector": {
          "mode": "filter_bucket",
          "bucket": "without_batch_and_expiry",
          "batch_state": "null",
          "expiry_state": "null"
        }
      }
    ]
  }'
# Expected: 200 success, transfer_id created (cross-branch dispatch allowed with flag ON)
# Without flag: would return INVALID_HIERARCHY 403

echo
echo "=== Request Catalog — F786 browsing sibling C781 (browse allowed even if submit not) ==="
curl --location "${BASE_V2}/inventory-transfer/request-catalog" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"source_restaurant_id": 781}'
# Expected: 200 OK with items[] — browse is NOT gated by can_submit_request
# data.source_restaurant.can_submit_request = false (if cross flag off) / true (if on)

echo
echo "=== Pending Queues — Master (approval_pending from centrals + franchises) ==="
curl --location "${BASE_V2}/inventory-transfer/pending-queues" \
  --header "Authorization: Bearer ${MASTER_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"limit": 50}'
# Check data.approval_pending for requests from C781 and F786 to master



# =============================
# ADDENDUM: Dispatch Selector Diagnosis — Transfer 82 Fix Flow (26 May 2026)
# Root cause: request saved with filter_bucket/without_batch_and_expiry but ALL
# stock at C782 for red meat is in with_batch_and_expiry segments only.
# Dispatch reads meta_json.selector from line → 0 matching segments → SELECTED_BUCKET_STOCK_NOT_FOUND
#
# Fix path: edit (correct selector) → re-approve → dispatch
# See: AI/Plans/phase2/P13_dispatch_selector_diagnosis_transfer82.md
# =============================

# --- Variables for this flow ---
# CENTRAL2_TOKEN = owner@democentral2.com / Qplazm@10 → rid=782, type=central
# Transfer 82: type=request, from=782 (C2), to=786 (F4), line source_inventory_master_id=16991 (red meat)
# Segments at C782 for red meat: seg_id=23 (1.4kg, MEAT-BATCH-01, exp 2026-06-30), seg_id=36 (1.4kg same)

echo
echo "=== DIAGNOSIS: Transfer 82 — inspect stored selector ==="
echo "# Transfer 82 line 66 meta_json.selector:"
echo "#   mode: filter_bucket"
echo "#   bucket: without_batch_and_expiry"
echo "#   batch_state: null, expiry_state: null"
echo "# This bucket has count=0 at C782 for red meat. ALL stock is in with_batch_and_expiry."
curl --location "${BASE_V2}/inventory-transfer/details/82" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json"
echo "# Check lines[0].meta_json.selector — if bucket is without_batch_and_expiry, that's the problem."

echo
echo "=== DIAGNOSIS: Verify source-options bucket counts before dispatch ==="
echo "# CRITICAL: Always check filters.*.count BEFORE using filter_bucket selector."
echo "# If count=0 for the bucket, dispatch WILL fail with SELECTED_BUCKET_STOCK_NOT_FOUND."
curl --location "${BASE_V2}/inventory-transfer/source-options" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"from_restaurant_id": 782, "source_inventory_master_id": 16991}'
echo "# Expected: filters.without_batch_and_expiry.count = 0"
echo "# Expected: filters.with_batch_and_expiry.count = 2, cal_quantity = 2800"
echo "# Segments: seg_id=23 (1.4kg), seg_id=36 (1.4kg)"

echo
echo "=== FIX STEP 1: Edit transfer 82 with correct segment_id selector ==="
echo "# Edit replaces the stored selector in meta_json. Status resets to 'requested'."
curl --location "${BASE_V2}/inventory-transfer/edit/82" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "items": [
      {
        "source_inventory_master_id": 16991,
        "stock_title": "red meat",
        "quantity": 0.8,
        "unit": "kg",
        "source_selector": {
          "mode": "segment_id",
          "segment_id": 23
        }
      }
    ]
  }'
echo "# Expected: status=true, transfer_id=82, status=requested (edit resets to requested)"

echo
echo "=== FIX STEP 2: Re-approve after edit (mandatory — edit invalidates prior approval) ==="
curl --location "${BASE_V2}/inventory-transfer/approve/82" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'
echo "# Expected: status=true, transfer_id=82, status=approved"

echo
echo "=== FIX STEP 3: Dispatch (now uses corrected segment_id selector from meta_json) ==="
echo "# Body: {} — dispatch reads selector from line meta_json, NOT from dispatch payload."
curl --location "${BASE_V2}/inventory-transfer/dispatch/82" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'
echo "# Expected: status=true, transfer_id=82, status=dispatched"
echo "# Deducted: 0.8kg from segment 23 (MEAT-BATCH-01)"
echo "# Remaining: seg 23 = 0.6kg, seg 36 = 1.4kg, total = 2.0kg"

echo
echo "=== VERIFIED RESULT (26 May 2026 10:26 UTC) ==="
echo "# Edit:     200 OK — selector updated to segment_id:23, status reset to requested"
echo "# Approve:  200 OK — status=approved"
echo "# Dispatch: 200 OK — status=dispatched, 0.8kg deducted from seg 23"
echo "# Post-dispatch source-options: total 2.0kg remaining (seg23=0.6kg + seg36=1.4kg)"

echo
echo "=== GENERAL: Dispatch selector contract reminder ==="
echo "# dispatch/{id} does NOT accept source_selector in payload."
echo "# It reads meta_json.selector from the transfer line (set at request/edit time)."
echo "# If the stored selector points to an empty bucket → SELECTED_BUCKET_STOCK_NOT_FOUND."
echo "# Fix: edit the transfer with a valid selector (segment_id preferred), re-approve, then dispatch."
echo "#"
echo "# Selector validation order:"
echo "# 1. At request/edit time: assertSelectorAllocatable() runs — fails early if bucket is empty"
echo "# 2. At dispatch time: fetchAllocatableSourceRows() runs — fails if stored selector matches 0 rows"
echo "#"
echo "# SAFE DEFAULT for request flow: segment_id from source-options (always points to real stock)"
echo "# LEGACY FALLBACK: filter_bucket — ONLY safe when filters.*.count > 0 for that bucket"

# =============================
# ADDENDUM: Phase 2 Ops + P4b Reserve + P7-P11
# Prereq: php artisan migrate (2026_05_21 through 2026_05_24)
# =============================

echo
echo "=== G0a) Operational settings get (master) ==="
curl --location "${BASE_V2}/inventory-transfer/operational-settings/get" \
  --header "Authorization: Bearer ${MASTER_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{\"restaurant_id\": ${MASTER_RESTAURANT_ID}}"

echo
echo "=== G0b) Enable reserve_on_approve + allow_lateral_central_transfer (master only) ==="
curl --location "${BASE_V2}/inventory-transfer/operational-settings/update" \
  --header "Authorization: Bearer ${MASTER_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"restaurant_id\": ${MASTER_RESTAURANT_ID},
    \"settings\": {
      \"reserve_on_approve\": true,
      \"allow_lateral_central_transfer\": true
    }
  }"

echo
echo "=== G1a) Reconciliation summary (segment vs master drift) ==="
curl --location "${BASE_V2}/inventory-transfer/reconciliation-summary" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"detail_limit": 25}'

echo
echo "=== G1b) Ops dashboard ==="
curl --location "${BASE_V2}/inventory-transfer/ops-dashboard" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"limit": 10}'

echo
echo "=== G1c) Stale transfers ==="
curl --location "${BASE_V2}/inventory-transfer/stale-transfers" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"older_than_hours": 24, "limit": 20}'

echo
echo "=== G1d) Near-expiry alerts ==="
curl --location "${BASE_V2}/inventory-transfer/near-expiry-alerts" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"within_days": 3, "limit": 20}'

echo
echo "=== G1e) Cost valuation (FIFO) ==="
curl --location "${BASE_V2}/inventory-transfer/cost-valuation" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"method\": \"fifo\",
    \"restaurant_id\": ${CENTRAL_RESTAURANT_ID}
  }"

echo
echo "=== G2a) P4b: Approve with reserve ==="
curl --location "${BASE_V2}/inventory-transfer/approve/${BUTTER_REQUEST_TRANSFER_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'

echo
echo "=== G3a) Open stocktake operation session (franchise store) ==="
curl --location "${BASE_V2}/inventory-transfer/operation-session/open" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"restaurant_id\": ${FRANCHISE_RESTAURANT_ID},
    \"mode\": \"stocktake\"
  }"

echo
echo "=== G3b) Stocktake lines (counted qty) ==="
curl --location "${BASE_V2}/inventory-transfer/stocktake/lines" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"restaurant_id\": ${FRANCHISE_RESTAURANT_ID},
    \"lines\": [
      {
        \"stock_title\": \"Butter\",
        \"unit_id\": 3,
        \"counted_cal_qty\": 10
      }
    ]
  }"

echo
echo "=== G3c) Stocktake complete ==="
curl --location "${BASE_V2}/inventory-transfer/stocktake/complete" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{\"restaurant_id\": ${FRANCHISE_RESTAURANT_ID}}"

echo
echo "=== G4a) Record hierarchy wastage ==="
curl --location "${BASE_V2}/inventory-transfer/record-wastage" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"restaurant_id\": ${CENTRAL_RESTAURANT_ID},
    \"quantity\": 1,
    \"unit\": \"kg\",
    \"stock_title\": \"Butter\",
    \"unit_id\": 3,
    \"reason_code\": \"damage\",
    \"source_selector\": {
      \"mode\": \"filter_bucket\",
      \"bucket\": \"without_batch_and_expiry\",
      \"batch_state\": \"null\",
      \"expiry_state\": \"null\"
    }
  }"

echo
echo "=== G4b) Wastage report with hierarchy scope + segments ==="
curl --location "${BASE_V2}/inventory/wastage-report" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"restaurant_ids\": [${CENTRAL_RESTAURANT_ID}, ${FRANCHISE_RESTAURANT_ID}],
    \"include_segments\": true
  }"

echo
echo "=== G5a) Reconciliation request create (franchise child) ==="
RECON_REQUEST_ID="REPLACE_WITH_RECONCILIATION_REQUEST_ID"
curl --location "${BASE_V2}/inventory-transfer/reconciliation-request/create" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"restaurant_id\": ${FRANCHISE_RESTAURANT_ID},
    \"notes\": \"cycle count variance\"
  }"

echo
echo "=== G5b) Reconciliation request lines ==="
curl --location "${BASE_V2}/inventory-transfer/reconciliation-request/${RECON_REQUEST_ID}/lines" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"restaurant_id\": ${FRANCHISE_RESTAURANT_ID},
    \"lines\": [
      {
        \"stock_title\": \"Water\",
        \"unit_id\": 3,
        \"proposed_cal_qty\": 100
      }
    ]
  }"

echo
echo "=== G5c) Reconciliation request submit ==="
curl --location "${BASE_V2}/inventory-transfer/reconciliation-request/${RECON_REQUEST_ID}/submit" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{\"restaurant_id\": ${FRANCHISE_RESTAURANT_ID}}"

echo
echo "=== G5d) Reconciliation request approve (parent central; auto-applies variances) ==="
curl --location "${BASE_V2}/inventory-transfer/reconciliation-request/${RECON_REQUEST_ID}/approve" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'

echo
echo "=== G6a) Lateral initiate (central A -> central B sibling) ==="
CENTRAL_B_TOKEN="REPLACE_WITH_SIBLING_CENTRAL_VENDOR_EMPLOYEE_TOKEN"
CENTRAL_B_RESTAURANT_ID="REPLACE_WITH_SIBLING_CENTRAL_RESTAURANT_ID"
LATERAL_TRANSFER_ID="REPLACE_WITH_LATERAL_TRANSFER_ID"
curl --location "${BASE_V2}/inventory-transfer/lateral/initiate" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"from_restaurant_id\": ${CENTRAL_RESTAURANT_ID},
    \"to_restaurant_id\": ${CENTRAL_B_RESTAURANT_ID},
    \"items\": [
      {
        \"quantity\": 2,
        \"unit\": \"kg\",
        \"stock_title\": \"Butter\",
        \"unit_id\": 3,
        \"source_selector\": {
          \"mode\": \"filter_bucket\",
          \"bucket\": \"without_batch_and_expiry\",
          \"batch_state\": \"null\",
          \"expiry_state\": \"null\"
        }
      }
    ]
  }"

echo
echo "=== G6b) Lateral approve (master) ==="
curl --location "${BASE_V2}/inventory-transfer/approve/${LATERAL_TRANSFER_ID}" \
  --header "Authorization: Bearer ${MASTER_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'

echo
echo "=== G6c) Lateral dispatch (sender central) ==="
curl --location "${BASE_V2}/inventory-transfer/dispatch/${LATERAL_TRANSFER_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'

echo
echo "=== G6d) Lateral receive (receiver central B) ==="
curl --location "${BASE_V2}/inventory-transfer/receive/${LATERAL_TRANSFER_ID}" \
  --header "Authorization: Bearer ${CENTRAL_B_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'

echo
echo "=== G7a) Inward audit (after receive; no stock move) ==="
curl --location "${BASE_V2}/inventory-transfer/inward-audit/${BUTTER_REQUEST_TRANSFER_ID}" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'

echo
echo "=== G7b) Decrease adjustment (hierarchy-scoped shrink) ==="
curl --location "${BASE_V2}/inventory-transfer/decrease-adjustment" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"restaurant_id\": ${CENTRAL_RESTAURANT_ID},
    \"quantity\": 0.5,
    \"unit\": \"kg\",
    \"stock_title\": \"Butter\",
    \"unit_id\": 3,
    \"source_selector\": {
      \"mode\": \"filter_bucket\",
      \"bucket\": \"without_batch_and_expiry\",
      \"batch_state\": \"null\",
      \"expiry_state\": \"null\"
    }
  }"

echo
echo "=== G7c) Return initiate (from received transfer) ==="
curl --location "${BASE_V2}/inventory-transfer/return/initiate" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"original_transfer_id\": ${BUTTER_REQUEST_TRANSFER_ID},
    \"return_lines\": [
      {\"line_id\": 1, \"quantity\": 1}
    ]
  }"

echo
echo "=== G7e) Enable cross-central franchise dispatch (master only) ==="
curl --location "${BASE_V2}/inventory-transfer/operational-settings/update" \
  --header "Authorization: Bearer ${MASTER_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"restaurant_id\": ${MASTER_RESTAURANT_ID},
    \"settings\": {
      \"allow_cross_central_franchise_dispatch\": true
    }
  }"

echo
echo "=== G7f) Cross-central initiate (central A -> sibling central's franchise) ==="
FRANCHISE_SIBLING_RESTAURANT_ID="REPLACE_WITH_FRANCHISE_UNDER_SIBLING_CENTRAL"
curl --location "${BASE_V2}/inventory-transfer/initiate" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"from_restaurant_id\": ${CENTRAL_RESTAURANT_ID},
    \"to_restaurant_id\": ${FRANCHISE_SIBLING_RESTAURANT_ID},
    \"items\": [{
      \"source_inventory_master_id\": ${BUTTER_SOURCE_INVENTORY_ID},
      \"quantity\": 1,
      \"unit\": \"kg\",
      \"source_selector\": {
        \"mode\": \"segment_id\",
        \"segment_id\": REPLACE_WITH_SEGMENT_ID_ON_SENDER_CENTRAL
      }
    }]
  }"

echo
echo "=== G7d) Dispatch async (optional; requires queue worker) ==="
curl --location "${BASE_V2}/inventory-transfer/dispatch-async/${BUTTER_REQUEST_TRANSFER_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'


# =============================
# ADDENDUM: P12/P14 Canonical Request Flow — No Selector (26 May 2026)
# Verified: request WITHOUT source_selector → approve → dispatch (auto-FEFO)
# Transfers: #89 (curl verified), #96 (UI test)
# =============================

# --- Credentials ---
# FRANCHISE4_TOKEN = owner@demofranchise4.com / Qplazm@10 → rid=786, type=franchise
# CENTRAL2_TOKEN = owner@democentral2.com / Qplazm@10 → rid=782, type=central

echo
echo "=== P12: Request WITHOUT source_selector (786 → 782, canonical) ==="
echo "# Per P14: requester owns source store + SKU + quantity only."
echo "# Sender (central) allocates batch/segment at dispatch via auto-FEFO."
curl --location "${BASE_V2}/inventory-transfer/request" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "items": [{
      "source_inventory_master_id": 16991,
      "quantity": 0.3,
      "unit": "kg"
    }]
  }'
echo "# Expected: status=true, transfer_id, type=request, status=requested"
echo "# No source_selector in payload. No allocation at request time."

echo
echo "=== P12: Approve no-selector request (central 782) ==="
echo "# Replace TRANSFER_ID with transfer_id from request response."
curl --location "${BASE_V2}/inventory-transfer/approve/${TRANSFER_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'
echo "# Expected: status=true, status=approved"

echo
echo "=== P14: Dispatch with auto-FEFO (no selector on line) ==="
echo "# Body: {} — no source_selector, no dispatch_lines."
echo "# Backend runs resolveDispatchSelector() → auto_fefo persisted."
echo "# Allocates from first FEFO-eligible segment at source store."
curl --location "${BASE_V2}/inventory-transfer/dispatch/${TRANSFER_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'
echo "# Expected: status=true, status=dispatched"
echo "# Transfer 89 verified: 0.3kg red meat dispatched via auto-FEFO from C782"

echo
echo "=== P12: Request with multiple items, no selector ==="
curl --location "${BASE_V2}/inventory-transfer/request" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "items": [
      {
        "source_inventory_master_id": 16988,
        "stock_title": "Cooking Oil",
        "quantity": 0.5,
        "unit": "ltr"
      },
      {
        "source_inventory_master_id": 16989,
        "stock_title": "maida",
        "quantity": 1,
        "unit": "kg"
      }
    ]
  }'
echo "# Expected: multi-line request created, no selector on any line."

echo
echo "=== P12: Request with explicit non-default source (786 → master 1) ==="
curl --location "${BASE_V2}/inventory-transfer/request" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "from_restaurant_id": 1,
    "items": [{
      "source_inventory_master_id": 16982,
      "stock_title": "red meat",
      "quantity": 0.5,
      "unit": "kg"
    }]
  }'
echo "# Expected: request to master store (if allow_master_direct_franchise enabled)."

echo
echo "=== Backward compat: Request WITH optional source_selector (still accepted) ==="
curl --location "${BASE_V2}/inventory-transfer/request" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "items": [{
      "source_inventory_master_id": 16991,
      "quantity": 0.2,
      "unit": "kg",
      "source_selector": {
        "mode": "filter_bucket",
        "bucket": "with_batch_and_expiry",
        "batch_state": "value",
        "batch": "MEAT-BATCH-01",
        "expiry_state": "value",
        "expiry_date": "2026-06-30"
      }
    }]
  }'
echo "# Expected: request created with selector stored in meta_json."
echo "# Dispatch will use stored selector instead of auto-FEFO."


# =============================
# ADDENDUM: P16 Lifecycle Revalidation Curls (26 May 2026)
# Verified against live POS API — partial approve, cancel-remainder,
# second wave, dispatch on partial, receive dispute, legacy compat
# =============================

# --- Credentials for this section ---
# FRANCHISE4_TOKEN = owner@demofranchise4.com / Qplazm@10 → rid=786, type=franchise
# CENTRAL2_TOKEN = owner@democentral2.com / Qplazm@10 → rid=782, type=central
# MASTER_TOKEN = abhishek@kalabahia.com / Qplazm@10 → rid=1, type=master

# --- Key segment references ---
# C782 red meat (16991): seg 23 (MEAT-BATCH-01, 2026-06-30), seg 36 (same batch)
# C782 maida (16989): seg 29 (MAIDA-BATCH-01, 2026-12-31)

echo
echo "=== P16: Create multi-line request for partial approve (F786 → C782) ==="
curl --location "${BASE_V2}/inventory-transfer/request" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "items": [
      {"source_inventory_master_id": 16991, "stock_title": "red meat", "quantity": 2, "unit": "kg"},
      {"source_inventory_master_id": 16989, "stock_title": "maida", "quantity": 1, "unit": "kg"}
    ]
  }'
echo "# Returns: transfer_id, 2 lines with line_ids"
echo "# NOTE: No source_selector — P14 canonical flow"

echo
echo "=== P16: Partial approve — approve only one line with segment (REQUIRES segments[]) ==="
echo "# CRITICAL: approval_lines[].segments is REQUIRED when using approval_lines"
echo "# Omitting segments → VALIDATION_FAILED"
PARTIAL_APPROVE_TRANSFER_ID="REPLACE_WITH_TRANSFER_ID"
APPROVE_LINE_ID="REPLACE_WITH_LINE_ID"
curl --location "${BASE_V2}/inventory-transfer/approve/${PARTIAL_APPROVE_TRANSFER_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"approval_lines\": [
      {
        \"line_id\": ${APPROVE_LINE_ID},
        \"approved_qty\": 0.3,
        \"segments\": [{\"segment_id\": 23, \"quantity\": 0.3}],
        \"remainder_policy\": \"hold\"
      }
    ],
    \"default_remainder_policy\": \"hold\"
  }"
echo "# Expected: status=partially_approved"
echo "# Lines: approved line has approved_display_qty=0.3, hold_display_qty=1.7"
echo "# Non-approved lines get status=on_hold, hold_display_qty = full requested qty"

echo
echo "=== P16: Second wave approve (on partially_approved transfer) ==="
echo "# Can call approve again on same transfer to approve more hold qty"
curl --location "${BASE_V2}/inventory-transfer/approve/${PARTIAL_APPROVE_TRANSFER_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw "{
    \"approval_lines\": [
      {
        \"line_id\": ${APPROVE_LINE_ID},
        \"approved_qty\": 1,
        \"segments\": [{\"segment_id\": 29, \"quantity\": 1}],
        \"remainder_policy\": \"hold\"
      }
    ],
    \"default_remainder_policy\": \"hold\"
  }"
echo "# Expected: approved_display_qty accumulates, hold_display_qty decreases"
echo "# When all hold_display_qty = 0 → status transitions to approved"
echo "# approval_waves[] in meta_json grows with each wave"

echo
echo "=== P16: Cancel remainder (drop all held lines/qty) ==="
echo "# Only works on partially_approved transfers with hold_display_qty > 0"
CANCEL_REMAINDER_TRANSFER_ID="REPLACE_WITH_PARTIALLY_APPROVED_TRANSFER_ID"
curl --location "${BASE_V2}/inventory-transfer/approve/${CANCEL_REMAINDER_TRANSFER_ID}/cancel-remainder" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'
echo "# Expected: status=approved (transitions from partially_approved)"
echo "# Hold lines become status=cancelled_remainder, cancelled_display_qty populated"
echo "# Approved line's requested_qty is EDITED (shrunk to match approved_display_qty)"
echo "# Error if no hold remainder: UNKNOWN_ERROR / NO_HOLD_REMAINDER"

echo
echo "=== P16: Dispatch on partially_approved transfer ==="
echo "# Dispatches ONLY approved lines; on_hold/cancelled_remainder lines are skipped"
curl --location "${BASE_V2}/inventory-transfer/dispatch/${PARTIAL_APPROVE_TRANSFER_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'
echo "# Expected: status=dispatched"
echo "# Response lines only include dispatched items with dispatched_qty + outstanding_after"
echo "# Non-approved lines NOT included in dispatch response"
echo "# After dispatch: line status=pending (not dispatched), meta_json.dispatch.dispatched_display_total populated"

echo
echo "=== P16: Receive with dispute (AUTO-TRIGGERED by rejected_qty > 0) ==="
echo "# CRITICAL: No explicit dispute:true flag needed"
echo "# Simply submitting received_lines with rejected_qty > 0 triggers dispute"
DISPATCHED_TRANSFER_ID="REPLACE_WITH_DISPATCHED_TRANSFER_ID"
curl --location "${BASE_V2}/inventory-transfer/receive/${DISPATCHED_TRANSFER_ID}" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "received_lines": [
      {"line_id": 91, "accepted_qty": 0.2, "rejected_qty": 0.1}
    ]
  }'
echo "# Expected: status=receive_dispute_pending"
echo "# resolution_meta populated with receive_dispute: {submitted_at, received_lines, resolution_type, receiver_employee_id}"
echo "# Full acceptance (rejected_qty=0 on all lines or empty body) → status=received (no dispute)"

echo
echo "=== P16: Resolve dispute — CONFIRMED WORKING (26 May 2026) ==="
echo "# Canonical route: POST /receive-dispute/{id}/resolve"
echo "# Prior 404 was WRONG ROUTE — tested /resolve-dispute/{id} instead of /receive-dispute/{id}/resolve"

echo
echo "=== P16-DISPUTE: Resolve dispute — ACCEPT path (central approves franchise dispute) ==="
DISPUTE_TRANSFER_ID="REPLACE_WITH_RECEIVE_DISPUTE_PENDING_TRANSFER_ID"
curl --location "${BASE_V2}/inventory-transfer/receive-dispute/${DISPUTE_TRANSFER_ID}/resolve" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "accept": true,
    "note": "Damage approved"
  }'
echo "# Expected: status=true, data.status = received or partially_received"
echo "# data.accepted = true"
echo "# data.lines[] with received_qty / rejected_qty per line"
echo "# resolution_meta populated with receive_totals: {accepted_qty, rejected_qty, returned_qty, damaged_qty, on_hold_qty}"
echo "# Rejected qty handled per transfer's resolution_type (default: return_to_source)"
echo "# Verified: Transfer 104 → partially_received (had on_hold maida line auto-received)"

echo
echo "=== P16-DISPUTE: Resolve dispute — REJECT path (central rejects, franchise re-receives) ==="
curl --location "${BASE_V2}/inventory-transfer/receive-dispute/${DISPUTE_TRANSFER_ID}/resolve" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "accept": false,
    "note": "Resubmit photos"
  }'
echo "# Expected: status=true, data.status = dispatched (REVERTED — franchise must re-receive)"
echo "# data.accepted = false"
echo "# resolution_meta populated with receive_dispute_rejected: {at, note}"
echo "# Transfer reappears in franchise receive_pending queue (status=dispatched)"
echo "# Verified: Transfer 108 → dispatched (reverted from receive_dispute_pending)"

echo
echo "=== P16: Transfer details (GET not POST!) ==="
echo "# CRITICAL: details/{id} is GET, not POST"
curl --location --request GET "${BASE_V2}/inventory-transfer/details/${PARTIAL_APPROVE_TRANSFER_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json"
echo "# POST to this endpoint → 405 Method Not Allowed"
echo "# Response: transfer header + lines with meta_json (STRING, needs JSON.parse)"
echo "# meta_json.approval contains: approved_display_qty, hold_display_qty, cancelled_display_qty,"
echo "#   requested_display_qty, original_requested_display_qty, remainder_policy, approval_waves[]"
echo "# meta_json.dispatch contains: dispatched_display_total, last_wave_at"
echo "# meta_json.segments contains: segment allocation details"
echo "# meta_json.reserve contains: mode, segments_reserved, recorded_at"

echo
echo "=== P16: Legacy full approve backward compat ==="
curl --location "${BASE_V2}/inventory-transfer/approve/${TRANSFER_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'
echo "# Still works. approved_display_qty = full amount, hold_display_qty = 0"
echo "# Backward compatible with all existing request-approve flows"

echo
echo "=== P16: Queue counter observations ==="
echo "# approval_pending: includes both 'requested' AND 'partially_approved' transfers"
echo "# receive_pending: includes 'dispatched' AND 'partially_received' transfers"
echo "# my_requests: includes ALL lifecycle statuses (requested, approved, dispatched,"
echo "#   receive_dispute_pending, partially_received)"
echo "# Frontend must handle these extra statuses in queue rendering"

echo
echo "=== P16: Source-options for segment picker (needed for ApproveWaveDialog) ==="
echo "# Central calls source-options on own-store segments for approve segment picker"
curl --location "${BASE_V2}/inventory-transfer/source-options" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"from_restaurant_id": 782, "source_inventory_master_id": 16991}'
echo "# Returns: segments[], filters with counts"
echo "# Use segment_id from here for approval_lines[].segments[].segment_id"
echo "# source-options requires OWNER token (from_restaurant_id == auth token restaurant_id)"

# =============================
# P16 FRONTEND IMPLEMENTATION COMPLETE (26 May 2026)
# All 4 phases implemented + 16/16 tests PASS
# Frontend API methods added: approveTransferPartial, cancelRemainder, resolveDispute
# =============================
