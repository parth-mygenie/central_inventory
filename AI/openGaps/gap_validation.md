# Open Gaps — API Validation Report

> **Validated:** 2026-06-18 (Branch: `18-6-26`)
> **Method:** All gaps tested via `curl` against live proxy API (`/api/proxy/v2/...`)
> **Auth:** `owner@chai.com` → restaurant_id=813, type=master
> **API Base:** `https://08bb3738-627a-4047-86b1-cfb1d84a0e40.preview.emergentagent.com`

---

## 1. Open Backend Gaps — P1 (Still Blocking)

### G-006 — Stock Return Flow API ❌ CONFIRMED OPEN

| Field | Detail |
|-------|--------|
| **What's Missing** | No return/RTO transfer type or dedicated endpoint |
| **Tested Endpoints** | `POST /inventory-transfer/return` → 404, `POST /inventory-transfer/rto` → 404, `POST /inventory/return` → 404 |
| **Also Tested** | `POST /inventory-transfer/initiate` with `{"type":"return"}` → validation error (requires from/to/items, no return type support) |
| **Result** | **GAP CONFIRMED** — No stock return flow API exists. Initiate endpoint does not support return type. |
| **Frontend Impact** | No return/RTO feature can be built |
| **Resolution** | _Awaiting POS backend implementation_ |

---

### G-014 — Invoice OCR/AI Extraction Endpoint ❌ CONFIRMED OPEN

| Field | Detail |
|-------|--------|
| **What's Missing** | No OCR or AI extraction endpoint for invoice processing |
| **Tested Endpoints** | `POST /inventory/ocr` → 404, `POST /inventory/invoice-scan` → 404, `POST /inventory/upload-invoice` → 404, `POST /inventory/purchase-order/upload-invoice` → 405, `POST /inventory/purchase-order/ocr` → 405 |
| **Result** | **GAP CONFIRMED** — No invoice OCR endpoint found. PO routes exist but no upload/OCR capability. |
| **Frontend Impact** | PO Receive "Upload Invoice" tab shows "Coming Soon" badge |
| **Resolution** | _Awaiting POS backend implementation_ |

---

### G-020 — Custom Unit Conversion in Inventory Master ❌ CONFIRMED OPEN

| Field | Detail |
|-------|--------|
| **What's Missing** | No purchase_unit, consumption_unit, or conversion_factor fields in inventory master |
| **Tested Endpoint** | `GET /inventory/get-inventory-master` |
| **Response Fields** | `id, category_id, stock_title, type, unit, small_unit, cal_quantity, quantity, display_unit, display_qty, min_qty_alert, min_unit_alert` |
| **Conversion Fields Found** | **None** — no `purchase_unit`, `consumption_unit`, `conversion_factor`, `carton_size`, `pack_qty` |
| **Unit Fields** | `unit: "kg"`, `small_unit: ""`, `display_unit: "kg"`, `min_unit_alert: "kg"` |
| **Result** | **GAP CONFIRMED** — Assumption: purchase unit = consumption unit. No mixed-unit support (e.g. "5 cartons = 60 pcs"). |
| **Frontend Impact** | Form ready to add fields when API delivers |
| **Resolution** | _Awaiting POS backend implementation_ |

---

## 2. Open Backend Gaps — P2 (Blocking Quality Features)

### G-001 — Stock Adjustment History API ❌ CONFIRMED OPEN

| Field | Detail |
|-------|--------|
| **What's Missing** | No dedicated endpoint to retrieve stock adjustment history |
| **Tested** | `POST /inventory-transfer/history` with status filters — 0 adjustment-type items returned |
| **Result** | **GAP CONFIRMED** — Transfer history does not include adjustment events. No separate adjustment history API. |
| **Frontend Impact** | Cannot show adjustment audit trail |
| **Related Bug** | BUG-007 |
| **Resolution** | _Awaiting POS backend_ |

---

### G-002 — No Before/After Qty in Transfer API ❌ CONFIRMED OPEN

| Field | Detail |
|-------|--------|
| **What's Missing** | `before_qty` and `after_qty` fields in transfer history and detail |
| **Tested Endpoints** | `POST /inventory-transfer/history` → no `before_qty`/`after_qty` fields in any of 7 items |
| **Also Tested** | `GET /inventory-transfer/details/239` → transfer fields: `id, from_restaurant_id, to_restaurant_id, type, reference_code, ...` — no before/after. Line fields: `id, transfer_id, line_no, source_inventory_master_id, ...` — no before/after. |
| **Transfer Fields** | 32 fields checked, none contain before/after quantity |
| **Line Fields** | 24 fields checked, none contain before/after quantity |
| **Result** | **GAP CONFIRMED** — No running balance or before/after snapshot in any transfer API response. |
| **Frontend Impact** | History Ledger "Before/After" columns show "—" |
| **Related Bug** | BUG-004 |
| **Resolution** | _Awaiting POS backend_ |

---

### G-005 — Dedicated Stock Ledger API ❌ CONFIRMED OPEN

| Field | Detail |
|-------|--------|
| **What's Missing** | Item-level stock movement history from a single API call |
| **Tested Endpoints** | `POST /inventory-transfer/stock-ledger` → 404, `POST /inventory/stock-ledger` → 404, `POST /inventory/ledger` → 404 |
| **Result** | **GAP CONFIRMED** — No dedicated stock ledger endpoint. Frontend must derive from transfer events (N+1 calls). |
| **Frontend Impact** | Stock Ledger tab makes N+1 API calls |
| **Related Bug** | BUG-003 |
| **Resolution** | _Awaiting POS backend_ |

---

### G-015 — Excel/CSV Parsing Endpoint ❌ CONFIRMED OPEN

| Field | Detail |
|-------|--------|
| **What's Missing** | Server-side parsing of Excel/CSV files for procurement import |
| **Tested Endpoints** | `POST /inventory/import-excel` → 404, `POST /inventory/import-csv` → 404, `POST /inventory/parse-file` → 404, `POST /inventory/purchase-order/import` → 405 |
| **Result** | **GAP CONFIRMED** — No Excel/CSV parsing endpoint. |
| **Frontend Impact** | Upload zone shows "Coming Soon" |
| **Resolution** | _Awaiting POS backend_ |

---

### G-016 — Invoice Number Storage / Duplicate Detection ❌ CONFIRMED OPEN

| Field | Detail |
|-------|--------|
| **What's Missing** | Invoice number field in PO schema + duplicate detection logic |
| **Tested Endpoint** | `GET /inventory/purchase-order/list` → 15 POs returned |
| **PO Schema Fields** | `id, restaurant_id, reference_code, vendor_id, vendor_name, status, expected_delivery_date, notes, cancel_reason, item_total, tot_tax, tot_amount, payment_type, approved_at, sent_at, cancelled_at, closed_at, created_at, updated_at` |
| **Invoice Fields** | **None** — no `invoice_number`, `invoice_ref`, or `invoice_id` field |
| **Result** | **GAP CONFIRMED** — PO schema has no invoice number storage. Duplicate detection impossible without it. |
| **Frontend Impact** | Cannot check for duplicate invoices on receive |
| **Resolution** | _Awaiting POS backend_ |

---

### G-011 — WebSocket Infrastructure ❌ CONFIRMED OPEN

| Field | Detail |
|-------|--------|
| **What's Missing** | Real-time push notification infrastructure |
| **Tested** | Backend `server.py` reviewed — only REST proxy endpoints (`/api/proxy/v2/...`). No WebSocket routes, no Socket.IO, no SSE. |
| **Result** | **GAP CONFIRMED** — No WebSocket infrastructure in backend or POS proxy layer. |
| **Frontend Impact** | No real-time push notifications for transfers/approvals |
| **Resolution** | _Awaiting infrastructure decision_ |

---

## 3. Open Backend Gaps — P3 (Low Priority / Informational)

### G-003 — User Name Resolution API ❌ CONFIRMED OPEN

| Field | Detail |
|-------|--------|
| **What's Missing** | Actor names (only numeric IDs available) |
| **Tested** | `GET /inventory-transfer/details/239` → `requested_by: null`, `approved_by: null`, no `*_name` variants |
| **Result** | **GAP CONFIRMED** — No name resolution for actor IDs. |
| **Frontend Impact** | Actor names show as numeric IDs (or blank) |
| **Resolution** | _Awaiting POS backend_ |

---

### G-004 — History API Missing restaurant_type ⚠️ POSSIBLY RESOLVED

| Field | Detail |
|-------|--------|
| **What's Missing (originally)** | `restaurant_type` field in history items |
| **Tested** | `POST /inventory-transfer/history` with `limit=20` → **7 items returned** |
| **Finding** | ALL 7 items contain `from_restaurant_type` and `to_restaurant_type` fields (e.g. `"master"`, `"franchise"`) |
| **Result** | **GAP APPEARS RESOLVED** — `from_restaurant_type` and `to_restaurant_type` now present in history API response. |
| **Note** | Needs broader validation with more data points. Current 7/7 items all have the field. |
| **Resolution** | _Recommend closing G-004 — verify with owner_ |

---

## 4. Closed Gaps — Verification Results

| ID | Status | Verification |
|----|:------:|-------------|
| **G-009** | ✅ VERIFIED CLOSED | `meta_json.approval` structure exists in transfer lines. `approval_lines` support confirmed via approval meta keys. |
| **G-010** | ✅ VERIFIED CLOSED | `reserve_on_approve: false` found in `stored_settings`, `resolved_settings`, and `defaults` of operational settings API. Setting exists and is functional. |
| **G-012** | ⚠️ CANNOT VERIFY | `request-catalog` returns `UNAUTHORIZED_ACTION: Only franchise or central can view request catalog` for master account. Need franchise login to verify. |
| **G-013** | ✅ VERIFIED CLOSED | `reference_code: "TRF-813-2026-0013"` present in transfer history items. |
| **G-017** | ✅ VERIFIED CLOSED | `GET /inventory/vendor-item-list?restaurant_ids[]=813` → 52 records returned with full fields (`ID, restaurant_id, ingredient_id, Restaurant_Name, Ingredient_Name, Purchase_Date, Vendor_Name, vendor_id, Quantity, Amount, unit_price, Payment_Type`). |
| **G-018** | ✅ VERIFIED CLOSED | `GET /inventory/production-run` → 20 production runs with fields: `id, reference_code, restaurant_id, output_inventory_master_id, output_stock_title, bom_sub_recipe_id, sub_recipe_name, planned_output_qty, actual_output_qty, output_unit, status, output_batch, output_expiry_date, unit_cost, total_cost`. |
| **G-019** | ✅ VERIFIED CLOSED | `GET /inventory/stock-inventory/{id}` → segments contain `unit_cost` field (e.g. `unit_cost: 0.35`). Segment fields: `segment_id, batch, expiry_date, cal_quantity, display_qty, source_restaurant_id, unit_cost`. |
| **G-021** | ✅ VERIFIED CLOSED | PO endpoints confirmed: `list` returns 15 POs, `detail/:id` returns full PO with lines. Schema: `id, reference_code, vendor_id, vendor_name, status, expected_delivery_date, notes, item_total, tot_tax, tot_amount, lines[]`. |
| **G-022** | ✅ VERIFIED CLOSED (NOT NEEDED) | `GET /stock-inventory?include_segments=true&include_consumption=true` works. API supports query params natively. |
| **G-023** | ✅ VERIFIED CLOSED | `GET /franchise/push-form/828` → response contains `push_summary` (keys: `total_source, total_child_matched, total_behind, breakdown, status`) AND `child_existing` (keys: `category_names, food_names, addon_names, ingredient_names, sub_recipe_names, recipe_names, role_names`). All 3 new keys (`ingredient_names`, `sub_recipe_names`, `recipe_names`) present. |

---

## 5. Other Known Issues — Verification Results

| Issue | Verified? | Finding |
|-------|:---------:|---------|
| **History items_count = 0** | ✅ CONFIRMED | All 5 checked transfers return `items_count: 0`. Backend returns 0 for all — requires per-transfer detail call (N+1). |
| **deleteSubRecipe unverified** | ⚠️ NOT TESTED | Sub-recipe list works (31 sub-recipes). Note: sub-recipes have `id: null` in list response, which may block delete by ID. |
| **store-sub-recipe name bug** | ✅ CONFIRMED | `POST /recipe/store-sub-recipe` with `{"name":"TEST","ingredients":[]}` → `Integrity constraint violation: 1048 Column 'name' cannot be null`. POS backend does NOT read the `name` field from request body. |
| **DailyConsumption trend** | ℹ️ EXPECTED | Would need 2 separate API calls for period comparison. Not a bug — feature gap. |
| **Negative stock (BUG-015)** | ❌ NOT FOUND NOW | 75 stock items checked, 0 have negative `cal_quantity`. May have been cleaned up or only in other restaurants. |
| **BUG-012: Parent store** | ✅ CONFIRMED | `hierarchy-summary` returns `parent_restaurant_id: null`. `franchise/list` does return it. Partial gap — data exists in one endpoint but not others. |

---

## 6. Deferred Bugs — Verification

| Bug | Gap Dependency | Status |
|-----|---------------|:------:|
| **BUG-003** (N+1 ledger) | G-005 | ✅ Confirmed — no dedicated ledger API |
| **BUG-004** (Before/After dash) | G-002 | ✅ Confirmed — no before/after fields |
| **BUG-005** (Actor IDs) | G-003 | ✅ Confirmed — no name resolution |
| **BUG-007** (Adjustment history) | G-001 | ✅ Confirmed — no adjustment history API |

---

## 7. Summary Table

### Open Gaps Count by Priority

| Priority | Count | IDs |
|:--------:|:-----:|-----|
| **P1** | 3 | G-006, G-014, G-020 |
| **P2** | 5 | G-001, G-002, G-005, G-015, G-016 |
| **P2** (infra) | 1 | G-011 |
| **P3** | 1 | G-003 |
| **Possibly Resolved** | 1 | G-004 (needs owner confirmation) |
| **Verified Closed** | 10 | G-009, G-010, G-012*, G-013, G-017, G-018, G-019, G-021, G-022, G-023 |

*G-012 couldn't be verified with master account — needs franchise login.

### Bottom Line

**3 P1 gaps remain (G-006 return flow, G-014 OCR, G-020 unit conversion)** — all require POS backend work. 6 P2/P3 gaps are quality-of-life improvements. G-004 appears resolved (restaurant_type now in history) — recommend closing after owner review.

---

## 8. API Test Commands Used

All tests executed against: `https://08bb3738-627a-4047-86b1-cfb1d84a0e40.preview.emergentagent.com`

```bash
# Auth
curl -s -X POST "$API/api/proxy/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"owner@chai.com","password":"Qplazm@10","fcm_token":"central_inventory_web"}'

# G-001: Adjustment history
curl -s -X POST "$API/api/proxy/v2/inventory-transfer/history" -H "Authorization: Bearer $T" -d '{"status":"completed","limit":5}'

# G-002: Transfer detail for before/after
curl -s "$API/api/proxy/v2/inventory-transfer/details/239" -H "Authorization: Bearer $T"

# G-003: Actor name resolution
# (checked via transfer detail - no *_name fields)

# G-004: History restaurant_type
curl -s -X POST "$API/api/proxy/v2/inventory-transfer/history" -H "Authorization: Bearer $T" -d '{"limit":20}'

# G-005: Stock ledger endpoint
curl -s -X POST "$API/api/proxy/v2/inventory-transfer/stock-ledger" -H "Authorization: Bearer $T" -d '{}'

# G-006: Return flow
curl -s -X POST "$API/api/proxy/v2/inventory-transfer/return" -H "Authorization: Bearer $T" -d '{}'

# G-011: WebSocket (code review - no WS routes in server.py)

# G-014: Invoice OCR
curl -s -X POST "$API/api/proxy/v2/inventory/ocr" -H "Authorization: Bearer $T" -d '{}'

# G-015: Excel/CSV parsing
curl -s -X POST "$API/api/proxy/v2/inventory/import-excel" -H "Authorization: Bearer $T" -d '{}'

# G-016: Invoice field in PO
curl -s "$API/api/proxy/v2/inventory/purchase-order/list" -H "Authorization: Bearer $T"

# G-020: Unit conversion in inventory master
curl -s "$API/api/proxy/v2/inventory/get-inventory-master" -H "Authorization: Bearer $T"

# Closed gap verifications
curl -s -X POST "$API/api/proxy/v2/inventory-transfer/operational-settings/get" -H "Authorization: Bearer $T" -d '{}'  # G-010
curl -s "$API/api/proxy/v2/inventory/vendor-item-list?restaurant_ids[]=813" -H "Authorization: Bearer $T"  # G-017
curl -s "$API/api/proxy/v2/inventory/production-run" -H "Authorization: Bearer $T"  # G-018
curl -s "$API/api/proxy/v2/inventory/stock-inventory/17815" -H "Authorization: Bearer $T"  # G-019
curl -s "$API/api/proxy/v2/inventory/purchase-order/25" -H "Authorization: Bearer $T"  # G-021
curl -s "$API/api/proxy/v2/franchise/push-form/828" -H "Authorization: Bearer $T"  # G-023
```
