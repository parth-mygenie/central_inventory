
# =============================
# ADDENDUM: P17 Amend / Withdraw / Modification (27 May 2026)
# All endpoints verified against live POS API (preprod)
# Transfers tested: T116 (amend→withdraw), T117 (parent), T118 (mod approved), T119 (mod rejected)
# =============================

# --- Credentials ---
# FRANCHISE4_TOKEN = owner@demofranchise4.com / Qplazm@10 → rid=786, type=franchise
# CENTRAL2_TOKEN = owner@democentral2.com / Qplazm@10 → rid=782, type=central
# MASTER_TOKEN = abhishek@kalabahia.com / Qplazm@10 → rid=1, type=master

# --- Key inventory master IDs at C782 ---
# maida: 16989
# red meat: 16991
# Cooking Oil: 16988
# patri: 16990

echo
echo "=== P17-A1) Create test request (F786 → C782) ==="
curl --location "${BASE_V2}/inventory-transfer/request" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "items": [{
      "source_inventory_master_id": 16989,
      "stock_title": "maida",
      "quantity": 0.1,
      "unit": "kg"
    }]
  }'
echo "# Expected: transfer_id, status=requested, type=request"

echo
echo "=== P17-A2) AMEND request — change qty (franchise only, status=requested) ==="
echo "# REPLACE TRANSFER_ID with value from P17-A1"
AMEND_TRANSFER_ID="REPLACE"
curl --location "${BASE_V2}/inventory-transfer/request/${AMEND_TRANSFER_ID}/amend" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "items": [{
      "source_inventory_master_id": 16989,
      "stock_title": "maida",
      "quantity": 0.2,
      "unit": "kg"
    }]
  }'
echo "# Expected: status=true, transfer_id same, status=requested, new line_ids"
echo "# NOTE: ALL lines are REPLACED. Old line_ids are no longer valid."

echo
echo "=== P17-A3) AMEND with multiple items (replaces entire line set) ==="
curl --location "${BASE_V2}/inventory-transfer/request/${AMEND_TRANSFER_ID}/amend" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "items": [
      {"source_inventory_master_id": 16989, "stock_title": "maida", "quantity": 0.3, "unit": "kg"},
      {"source_inventory_master_id": 16991, "stock_title": "red meat", "quantity": 0.5, "unit": "kg"}
    ]
  }'
echo "# Expected: 2 new lines, old single line deleted"

echo
echo "=== P17-B1) WITHDRAW request (franchise only, status=requested, TERMINAL) ==="
curl --location "${BASE_V2}/inventory-transfer/request/${AMEND_TRANSFER_ID}/withdraw" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'
echo "# Expected: status=true, status=withdrawn (TERMINAL — no further actions)"
echo "# Transfer removed from approval_pending and my_requests queues"
echo "# Transfer remains visible in history with status=withdrawn"

echo
echo "=== P17-B2) WITHDRAW error — already withdrawn ==="
curl --location "${BASE_V2}/inventory-transfer/request/${AMEND_TRANSFER_ID}/withdraw" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'
echo "# Expected: error — Only requested transfers can be withdrawn."

echo
echo "=== P17-C1) Create request for MODIFICATION flow ==="
MOD_PARENT_ID="REPLACE"
curl --location "${BASE_V2}/inventory-transfer/request" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "items": [{"source_inventory_master_id": 16989, "stock_title": "maida", "quantity": 0.1, "unit": "kg"}]
  }'
echo "# Save transfer_id as MOD_PARENT_ID"

echo
echo "=== P17-C2) Approve parent request (central) ==="
curl --location "${BASE_V2}/inventory-transfer/approve/${MOD_PARENT_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'
echo "# Expected: status=approved"

echo
echo "=== P17-C3) MODIFICATION request — franchise requests qty change post-approval ==="
echo "# Creates CHILD transfer with type=modification_request, parent_transfer_id=MOD_PARENT_ID"
curl --location "${BASE_V2}/inventory-transfer/request/${MOD_PARENT_ID}/modification" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "items": [{
      "source_inventory_master_id": 16989,
      "stock_title": "maida",
      "quantity": 0.3,
      "unit": "kg"
    }]
  }'
echo "# Expected: NEW transfer_id, parent_transfer_id=MOD_PARENT_ID, type=modification_request, status=requested"
echo "# CRITICAL: Parent status UNCHANGED (still approved)"

echo
echo "=== P17-C4) Central approves modification request ==="
MOD_CHILD_ID="REPLACE"
curl --location "${BASE_V2}/inventory-transfer/approve/${MOD_CHILD_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'
echo "# Expected: modification child status=approved"
echo "# Parent status UNCHANGED"

echo
echo "=== P17-C5) Central rejects modification request (alternative to C4) ==="
curl --location "${BASE_V2}/inventory-transfer/reject/${MOD_CHILD_ID}" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'
echo "# Expected: modification child status=rejected"
echo "# Parent status UNCHANGED"

echo
echo "=== P17-D1) Error: AMEND on approved transfer ==="
curl --location "${BASE_V2}/inventory-transfer/request/${MOD_PARENT_ID}/amend" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"items": [{"source_inventory_master_id": 16989, "quantity": 0.5, "unit": "kg"}]}'
echo "# Expected: INVALID_TRANSFER_STATE — Only requested transfers can be amended."

echo
echo "=== P17-D2) Error: WITHDRAW on approved transfer ==="
curl --location "${BASE_V2}/inventory-transfer/request/${MOD_PARENT_ID}/withdraw" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{}'
echo "# Expected: Only requested transfers can be withdrawn."

echo
echo "=== P17-D3) Error: MODIFICATION on requested transfer (not yet approved) ==="
curl --location "${BASE_V2}/inventory-transfer/request/${AMEND_TRANSFER_ID}/modification" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"items": [{"source_inventory_master_id": 16989, "quantity": 0.3, "unit": "kg"}]}'
echo "# Expected: INVALID_TRANSFER_STATE — Modification only allowed after approval."

echo
echo "=== P17-D4) Error: AMEND on modification_request type ==="
curl --location "${BASE_V2}/inventory-transfer/request/${MOD_CHILD_ID}/amend" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"items": [{"source_inventory_master_id": 16989, "quantity": 0.5, "unit": "kg"}]}'
echo "# Expected: INVALID_TRANSFER_STATE — Only request transfers can be amended."

echo
echo "=== P17-D5) Error: Central tries to amend franchise request ==="
curl --location "${BASE_V2}/inventory-transfer/request/${AMEND_TRANSFER_ID}/amend" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"items": [{"source_inventory_master_id": 16989, "quantity": 0.5, "unit": "kg"}]}'
echo "# Expected: INVALID_TRANSFER_STATE — Only request transfers can be amended."
echo "# NOTE: Central uses edit/{id} to correct requests, not amend"

echo
echo "=== P17-E1) Verify withdrawn in history ==="
curl --location "${BASE_V2}/inventory-transfer/history" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"limit": 50}'
echo "# Check: withdrawn transfers appear in history"
echo "# Check: modification_request type transfers appear in history with parent_transfer_id"

echo
echo "=== P17-E2) Verify withdrawn NOT in queues ==="
curl --location "${BASE_V2}/inventory-transfer/pending-queues" \
  --header "Authorization: Bearer ${FRANCHISE_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"limit": 100}'
echo "# Check: no withdrawn transfers in any queue"
echo "# Check: modification_request transfers appear in my_requests"

echo
echo "=== P17-E3) Verify modification appears in central approval_pending ==="
curl --location "${BASE_V2}/inventory-transfer/pending-queues" \
  --header "Authorization: Bearer ${CENTRAL_TOKEN}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data-raw '{"limit": 100}'
echo "# Check: modification_request with status=requested appears in approval_pending"
echo "# Check: parent_transfer_id may be null in queue items"

# =============================
# P17 ENDPOINT CONTRACT SUMMARY
# =============================
echo
echo "=== P17 ENDPOINT CONTRACT SUMMARY ==="
echo "# AMEND:       POST /request/{id}/amend       | Requester | status=requested, type=request | Replaces lines in-place"
echo "# WITHDRAW:    POST /request/{id}/withdraw     | Requester | status=requested, type=request | Terminal → withdrawn"
echo "# MODIFICATION: POST /request/{id}/modification | Requester | status=approved+   type=request | Creates child transfer"
echo "#"
echo "# AMEND vs EDIT:"
echo "#   amend → franchise fixes own request (requester actor)"
echo "#   edit  → central corrects request lines (source/parent actor)"
echo "#"
echo "# MODIFICATION creates CHILD transfer:"
echo "#   type=modification_request, parent_transfer_id=<original>"
echo "#   Follows normal request→approve→dispatch→receive lifecycle"
echo "#   Parent status UNCHANGED by any modification lifecycle action"
echo "#   Cannot be amended or withdrawn (only type=request supports these)"
