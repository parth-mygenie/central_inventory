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