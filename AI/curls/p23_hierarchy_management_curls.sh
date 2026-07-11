#!/usr/bin/env bash
# P23 — Hierarchy Management (Create / View / Bundle Push) — API Validation Curls (29 May 2026)
# Actors: Master (rid=1), Central (rid=782), Franchise (rid=784)

API_URL="https://api-sync-staging.preview.emergentagent.com/api"

# ══════════════════════════════════════════════════════════════════
# HIERARCHY LIST — GET /franchise/list
# ══════════════════════════════════════════════════════════════════

echo "=== H1: Master — default listing ==="
# RESULT: 200, 4 children (2 central + 1 franchise + 1 test), allowed_child_types: [central, franchise]
# relationship: "hierarchy_children", meta: {current_page:1, last_page:1, per_page:25, total:4}
curl -s "${API_URL}/proxy/v2/franchise/list" \
  -H "Authorization: Bearer ${MASTER_TOKEN}"

echo "=== H2: Master — child_type=central ==="
# RESULT: 200, 3 central children, relationship: "master_to_central"
curl -s "${API_URL}/proxy/v2/franchise/list?child_type=central" \
  -H "Authorization: Bearer ${MASTER_TOKEN}"

echo "=== H3: Master — child_type=franchise ==="
# RESULT: 200, 1 franchise child (TestFranchise_P23_Probe, direct under master)
# NOTE: Only DIRECT franchise children of master, not grandchildren
curl -s "${API_URL}/proxy/v2/franchise/list?child_type=franchise" \
  -H "Authorization: Bearer ${MASTER_TOKEN}"

echo "=== H4: Central — default listing ==="
# RESULT: 200, 3 franchise children, allowed_child_types: [franchise]
# relationship: "central_to_franchise"
curl -s "${API_URL}/proxy/v2/franchise/list" \
  -H "Authorization: Bearer ${CENTRAL_TOKEN}"

echo "=== H5: Franchise — listing (forbidden) ==="
# RESULT: 200 (but success:false), message: "This restaurant type is not allowed to manage hierarchy children."
curl -s "${API_URL}/proxy/v2/franchise/list" \
  -H "Authorization: Bearer ${FRANCHISE_TOKEN}"

echo "=== H6: Master — pagination ==="
# RESULT: 200, meta: {current_page:1, last_page:1, per_page:25, total:4}
curl -s "${API_URL}/proxy/v2/franchise/list?limit=50" \
  -H "Authorization: Bearer ${MASTER_TOKEN}"

# ══════════════════════════════════════════════════════════════════
# CREATE — GET /franchise/create (form schema) + POST /franchise/create
# ══════════════════════════════════════════════════════════════════

echo "=== C1: Master — GET create form ==="
# RESULT: 200, child_type defaults to "central", allowed_child_types: [central, franchise]
# available_entities: {categories:2, foods:3, addons:1, ingredients:4, sub_recipes:0, recipes:3, roles:12, employees:47}
curl -s "${API_URL}/proxy/v2/franchise/create" \
  -H "Authorization: Bearer ${MASTER_TOKEN}"

echo "=== C2: Central — GET create form ==="
# RESULT: 200, child_type: "franchise", allowed_child_types: [franchise]
# available_entities: {categories:1, foods:2, addons:1, ingredients:4, ...}
curl -s "${API_URL}/proxy/v2/franchise/create" \
  -H "Authorization: Bearer ${CENTRAL_TOKEN}"

echo "=== C3: Franchise — GET create form (forbidden) ==="
# RESULT: 403, "This restaurant type is not allowed to create hierarchy children."
curl -s "${API_URL}/proxy/v2/franchise/create" \
  -H "Authorization: Bearer ${FRANCHISE_TOKEN}"

echo "=== C4: Master — GET create form?child_type=franchise ==="
# RESULT: 200, but child_type still returns "central" (ignores query param — server defaults)
curl -s "${API_URL}/proxy/v2/franchise/create?child_type=franchise" \
  -H "Authorization: Bearer ${MASTER_TOKEN}"

echo "=== C5: POST create — empty body (validation) ==="
# RESULT: 422, errors: {name:required, phone:required, email:required, password:required, address:required}
curl -s -X POST "${API_URL}/proxy/v2/franchise/create" \
  -H "Authorization: Bearer ${MASTER_TOKEN}" -H "Content-Type: application/json" \
  -d '{}'

echo "=== C6: POST create — Master → central ==="
# RESULT: 201, message: "Central created successfully", child.restaurant_type_flag: "central"
curl -s -X POST "${API_URL}/proxy/v2/franchise/create" \
  -H "Authorization: Bearer ${MASTER_TOKEN}" -H "Content-Type: application/json" \
  -d '{"name":"TestCentral_P23_Probe","email":"testcentral_p23@test.com","phone":"9999900001","address":"Test Address","password":"Test@12345","child_type":"central"}'

echo "=== C7: POST create — Master → franchise directly ==="
# RESULT: 201, message: "Franchise created successfully", child.restaurant_type_flag: "franchise", parent_restaurant_id: 1
curl -s -X POST "${API_URL}/proxy/v2/franchise/create" \
  -H "Authorization: Bearer ${MASTER_TOKEN}" -H "Content-Type: application/json" \
  -d '{"name":"TestFranchise_P23_Probe","email":"testfranchise_p23@test.com","phone":"9999900002","address":"Test Address","password":"Test@12345","child_type":"franchise"}'

echo "=== C8: POST create — Central → franchise ==="
# RESULT: 201, message: "Franchise created successfully", parent_restaurant_id: 782
curl -s -X POST "${API_URL}/proxy/v2/franchise/create" \
  -H "Authorization: Bearer ${CENTRAL_TOKEN}" -H "Content-Type: application/json" \
  -d '{"name":"TestFranchise_P23_Central","email":"testfranchise_p23c@test.com","phone":"9999900003","address":"Test Address","password":"Test@12345"}'

echo "=== C9: POST create — duplicate email ==="
# RESULT: 422, errors: {email: ["The email has already been taken."]}
curl -s -X POST "${API_URL}/proxy/v2/franchise/create" \
  -H "Authorization: Bearer ${MASTER_TOKEN}" -H "Content-Type: application/json" \
  -d '{"name":"DupTest","email":"testcentral_p23@test.com","phone":"9999900099","address":"Dup","password":"Test@12345","child_type":"central"}'

echo "=== C10: Central trying to create central (invalid child_type) ==="
# RESULT: 422, errors: {child_type: ["The selected child type is invalid."]}
curl -s -X POST "${API_URL}/proxy/v2/franchise/create" \
  -H "Authorization: Bearer ${CENTRAL_TOKEN}" -H "Content-Type: application/json" \
  -d '{"name":"ShouldFail","email":"shouldfail@test.com","phone":"9999900098","address":"Fail","password":"Test@12345","child_type":"central"}'

# ══════════════════════════════════════════════════════════════════
# BUNDLE PUSH — GET /franchise/push-form/{id} + POST /franchise/push/{id}
# ══════════════════════════════════════════════════════════════════

echo "=== B1: GET push-form/782 — Master push preview to DemoCentral2 ==="
# RESULT: 200, source_entities: {categories:2, foods:3, addons:1, ingredients:4, sub_recipes:0, recipes:3, roles:12}
curl -s "${API_URL}/proxy/v2/franchise/push-form/782" \
  -H "Authorization: Bearer ${MASTER_TOKEN}"

echo "=== B2: GET push-form/787 — Master push preview to new TestCentral ==="
# RESULT: 200, same source_entities as B1
curl -s "${API_URL}/proxy/v2/franchise/push-form/787" \
  -H "Authorization: Bearer ${MASTER_TOKEN}"

echo "=== B3: POST push/787 — without push_food_bundle (422 BUNDLE_ONLY_PUSH) ==="
# RESULT: 422, error_code: "BUNDLE_ONLY_PUSH", message: "Bundle-only push enforced. Send {\"push_food_bundle\": true}."
curl -s -X POST "${API_URL}/proxy/v2/franchise/push/787" \
  -H "Authorization: Bearer ${MASTER_TOKEN}" -H "Content-Type: application/json" \
  -d '{}'

echo "=== B4: POST push/787 — with push_food_bundle=true (success) ==="
# RESULT: 200, results: {categories:{ins:2,upd:0,fail:0}, ingredients:{ins:4,...}, foods:{ins:3,...}, recipes:{ins:3,...}}
# _audit: {table:"central_push_log", enabled:true}
# _diagnostics: {warning_total:0, link_repair:{fixed_recipe_addon_id:0, fixed_addon_recipe_id:1, ...}}
curl -s -X POST "${API_URL}/proxy/v2/franchise/push/787" \
  -H "Authorization: Bearer ${MASTER_TOKEN}" -H "Content-Type: application/json" \
  -d '{"push_food_bundle": true}'

echo "=== B5: POST push/786 — non-direct-child (404) ==="
# RESULT: 404, "Child restaurant not found" (786=DemoFranchise4, parent=782, not direct child of master)
curl -s -X POST "${API_URL}/proxy/v2/franchise/push/786" \
  -H "Authorization: Bearer ${MASTER_TOKEN}" -H "Content-Type: application/json" \
  -d '{"push_food_bundle": true}'

echo "=== B6: Franchise push-form (403 forbidden) ==="
# RESULT: 403, "Forbidden hierarchy action"
curl -s "${API_URL}/proxy/v2/franchise/push-form/782" \
  -H "Authorization: Bearer ${FRANCHISE_TOKEN}"

echo "=== B7: Central push to own child (785=DemoFranchise3) ==="
# RESULT: 200, results show updated counts (not inserted — already pushed before)
curl -s -X POST "${API_URL}/proxy/v2/franchise/push/785" \
  -H "Authorization: Bearer ${CENTRAL_TOKEN}" -H "Content-Type: application/json" \
  -d '{"push_food_bundle": true}'

# ══════════════════════════════════════════════════════════════════
# HISTORY — POST /franchise/history
# ══════════════════════════════════════════════════════════════════

echo "=== HI1: Master — default history ==="
# RESULT: 200, logs: 59 records (from push operations), per_page:50 default
# log keys: [id, parent_restaurant_id, child_restaurant_id, entity_type, source_entity_id, target_entity_id, action, pushed_by, status, notes, created_at]
curl -s -X POST "${API_URL}/proxy/v2/franchise/history" \
  -H "Authorization: Bearer ${MASTER_TOKEN}" -H "Content-Type: application/json" \
  -d '{}'

echo "=== HI2: Master — paginated (limit=5, page=1) ==="
# RESULT: 200, meta: {current_page:1, last_page:12, per_page:5, total:59}
curl -s -X POST "${API_URL}/proxy/v2/franchise/history" \
  -H "Authorization: Bearer ${MASTER_TOKEN}" -H "Content-Type: application/json" \
  -d '{"limit": 5, "page": 1}'

echo "=== HI3: Central — history ==="
# RESULT: 200, logs: 39 records, parent=DemoCentral2
curl -s -X POST "${API_URL}/proxy/v2/franchise/history" \
  -H "Authorization: Bearer ${CENTRAL_TOKEN}" -H "Content-Type: application/json" \
  -d '{}'

echo "=== HI4: Franchise — history (forbidden) ==="
# RESULT: 403, "This restaurant type is not allowed to view hierarchy push history."
curl -s -X POST "${API_URL}/proxy/v2/franchise/history" \
  -H "Authorization: Bearer ${FRANCHISE_TOKEN}" -H "Content-Type: application/json" \
  -d '{}'
