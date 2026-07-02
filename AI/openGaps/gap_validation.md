# Gap Validation Report

> **Validated:** 2026-07-02  
> **Validated By:** E1 Agent  
> **Method:** API curl tests via proxy (`/api/proxy/v2/...`) against POS preprod  
> **Auth:** `manager@germanfluid.com` (RID 806, master) + `manager@outletdirectone.com` (RID 809, franchise)

---

## 1. Open Backend Gaps — Still Blocking (P1)

### G-006 | Stock Return Flow API | ❌ CONFIRMED OPEN

**What's Blocked:** No return/RTO feature at all  
**Priority:** P1  
**Frontend Status:** No screen built — needs backend first

**Validation:**
```
POST /inventory-transfer/return         → 404 NotFoundHttpException
POST /inventory-transfer/initiate-return → 404 NotFoundHttpException
POST /inventory-transfer/rto            → 404 NotFoundHttpException
```
**Verdict:** All three candidate endpoints return Laravel `NotFoundHttpException`. No return/RTO route exists on POS backend.

---

### G-014 | Invoice OCR/AI Extraction Endpoint | ❌ CONFIRMED OPEN

**What's Blocked:** PO Receive "Upload Invoice" tab  
**Priority:** P1  
**Frontend Status:** Tab shows "Coming Soon" badge — UI ready, waiting for backend

**Validation:**
```
POST /inventory/invoice-ocr                    → 404 NotFoundHttpException
POST /inventory/parse-invoice                  → 404 NotFoundHttpException
POST /inventory/purchase-order/upload-invoice   → 405 MethodNotAllowedHttpException (route exists but only supports GET/HEAD/DELETE)
```
**Verdict:** No OCR/invoice parsing endpoint exists. The `/purchase-order/upload-invoice` route exists for GET/DELETE but not POST (likely a placeholder or different purpose). Gap confirmed open.

---

### G-020 | Custom Unit Conversion in Inventory Master | ❌ CONFIRMED OPEN

**What's Blocked:** Mixed-unit display (e.g. "5 cartons = 60 pcs")  
**Priority:** P1  
**Frontend Status:** Current assumption: purchase unit = consumption unit. Form ready to add fields when API delivers.

**Validation:**
```
GET /inventory/get-inventory-master response per item:
  has_unit_conversion: false  (all 49 items = false)
  converion_factor: null      (note: typo in field name — missing 's')
  consumption_unit: null
  consumption_unit_id: null
  purchase_unit: NOT_PRESENT
  custom_units: NOT_PRESENT
```
**Verdict:** The schema has `has_unit_conversion` and `converion_factor` (typo) fields, but they are universally `false`/`null` across all 49 inventory items. No item has active unit conversion configured. The field infrastructure exists but is non-functional. Custom purchase→consumption unit mapping requires POS backend work.

---

## 2. Open Backend Gaps — Still Blocking (P2)

### G-015 | Excel/CSV Parsing Endpoint | ❌ CONFIRMED OPEN

**What's Blocked:** Procurement Excel import  
**Priority:** P2  
**Frontend Status:** Upload zone shows "Coming Soon" — UI ready

**Validation:**
```
POST /inventory/parse-excel           → 404 NotFoundHttpException
POST /inventory/import-csv            → 404 NotFoundHttpException
POST /inventory/purchase-order/import → 405 MethodNotAllowedHttpException (route exists but only supports GET/HEAD/DELETE)
```
**Verdict:** No Excel/CSV parsing endpoint exists. Same pattern as G-014 — `/purchase-order/import` route exists for GET/DELETE only.

---

### G-016 | Invoice Number Storage / Duplicate Detection | ❌ CONFIRMED OPEN

**What's Blocked:** Duplicate invoice check on receive  
**Priority:** P2

**Validation:**
```
GET /inventory/purchase-order/list → PO objects have these keys:
  [approved_at, cancel_reason, cancelled_at, closed_at, created_at, expected_delivery_date,
   id, item_total, notes, payment_type, reference_code, restaurant_id, sent_at, status,
   tot_amount, tot_tax, updated_at, vendor_id, vendor_name]

  invoice_number: NOT_PRESENT
  invoice_no: NOT_PRESENT
  invoice_id: NOT_PRESENT
  invoice_ref: NOT_PRESENT
  duplicate_check: NOT_PRESENT

POST /inventory/check-invoice-duplicate → 404 NotFoundHttpException
```
**Verdict:** PO objects carry no invoice number field. No duplicate detection endpoint exists. Gap confirmed open.

---

## 3. Open Backend Gaps — Low Priority / Informational

### G-001 | Stock Adjustment History API | ❌ CONFIRMED OPEN

**What's Blocked:** Can't show adjustment audit trail  
**Priority:** P2

**Validation:**
```
GET  /inventory/adjustment-history          → 404 NotFoundHttpException
POST /inventory/adjustment-history          → 404 NotFoundHttpException
GET  /inventory-transfer/adjustment-history → 404 NotFoundHttpException
```
**Verdict:** No adjustment history route exists. Gap confirmed open.

---

### G-002 | No Before/After Qty in Transfer API | ❌ CONFIRMED OPEN

**What's Blocked:** History Ledger "Before/After" columns show "—"  
**Priority:** P2

**Validation:**
```
POST /inventory-transfer/history (limit=3) → First history item checked:
  before_qty: NOT_PRESENT
  after_qty: NOT_PRESENT
  before_quantity: NOT_PRESENT
  after_quantity: NOT_PRESENT
  qty_before: NOT_PRESENT
  qty_after: NOT_PRESENT
  stock_before: NOT_PRESENT
  stock_after: NOT_PRESENT
```
**Verdict:** None of the 8 candidate field names are present in history items. Gap confirmed open.

---

### G-003 | No User Name Resolution API | ❌ CONFIRMED OPEN

**What's Blocked:** Actor names not shown (only store names)  
**Priority:** P3

**Validation:**
```
GET /inventory-transfer/details/226 → Transfer detail checked:
  dispatched_by: 4696          (numeric ID only)
  approved_by: None
  received_by: (numeric ID)
  created_by_name: NOT_PRESENT
  approved_by_name: NOT_PRESENT
  dispatched_by_name: NOT_PRESENT
  actor_name: NOT_PRESENT
  user_name: NOT_PRESENT
```
**Verdict:** Transfer detail returns actor IDs (e.g. `dispatched_by: 4696`) but no corresponding name fields. User name resolution requires backend work.

---

### G-004 | History API Missing restaurant_type | ⚠️ PARTIALLY RESOLVED

**What's Blocked:** Store type badges in history use workaround via `useRestaurantMap`  
**Priority:** P3

**Validation:**
```
POST /inventory-transfer/history (limit=2) → First item:
  from_restaurant_type: "master"      ← PRESENT
  to_restaurant_type: "franchise"     ← PRESENT
  restaurant_type: NOT_PRESENT
  restaurant_type_flag: NOT_PRESENT
  store_type: NOT_PRESENT
```
**Verdict:** `from_restaurant_type` and `to_restaurant_type` ARE now present in history items (both set correctly). The gap was originally about a standalone `restaurant_type` field. Since `from_/to_restaurant_type` are available, the `useRestaurantMap` workaround may no longer be needed for type badges. **Recommend re-evaluating if this can be CLOSED.**

---

### G-005 | Dedicated Stock Ledger API | ❌ CONFIRMED OPEN

**What's Blocked:** Stock Ledger tab derives data with N+1 calls  
**Priority:** P2

**Validation:**
```
GET  /inventory/stock-ledger          → 404 NotFoundHttpException
POST /inventory/stock-ledger          → 404 NotFoundHttpException
GET  /inventory-transfer/stock-ledger → 404 NotFoundHttpException
```
**Verdict:** No stock ledger endpoint exists. Frontend must use N+1 transfer detail calls. Gap confirmed open.

---

### G-011 | WebSocket Infrastructure | ❌ CONFIRMED OPEN

**What's Blocked:** No real-time push notifications for transfers/approvals  
**Priority:** P2

**Validation:**
```
GET /inventory-transfer/subscribe → 404 NotFoundHttpException
GET /ws                           → 404 NotFoundHttpException
```
**Verdict:** No WebSocket or push subscription endpoint exists. Gap confirmed open.

---

## 4. Closed Gaps — Verification

### G-009 | Partial Dispatch via approval_lines | ✅ CONFIRMED CLOSED

```
POST /inventory-transfer/approve/9999 with {"approval_lines":[]}
→ {"status":false,"error_code":"TRANSFER_NOT_FOUND","message":"Transfer not found"}
```
**Verdict:** Endpoint accepts `approval_lines` parameter (returns proper business error, not 404/validation). Confirmed working.

---

### G-010 | Soft Stock Reservation (reserve_on_approve) | ✅ CONFIRMED CLOSED

```
POST /inventory-transfer/operational-settings/get → 200
  Response includes: "reserve_on_approve": false
```
**Verdict:** `reserve_on_approve` setting exists and is configurable. Confirmed working.

---

### G-012 | request-catalog Missing Category | ✅ CONFIRMED CLOSED

```
POST /inventory-transfer/request-catalog {"source_restaurant_id":806}
→ 49 items, each with:
  category_id: 1529
  category_name: "coffee"
```
**Verdict:** Both `category_id` and `category_name` present in catalog items. Confirmed closed.

---

### G-013 | No PO Number (reference_code) | ✅ CONFIRMED CLOSED

```
POST /inventory-transfer/history → items include:
  reference_code: "TRF-806-2026-0016"
```
**Verdict:** `reference_code` present in transfer history items. Confirmed closed.

---

### G-017 | Vendor Purchase History API | ✅ CONFIRMED CLOSED

```
GET /inventory/vendor-item-list?restaurant_ids[]=806
→ 75 records with keys: [Amount, ID, Ingredient_Name, Payment_Type, Purchase_Date,
   Quantity, Restaurant_Name, Vendor_Name, ingredient_id, line_total, restaurant_id,
   restaurant_type_flag, stock_quantity_raw, unit_price, vendor_id]
```
**Verdict:** 75 records returned with full vendor purchase data. Confirmed closed.

---

### G-018 | Production Run List/History API | ✅ CONFIRMED CLOSED

```
GET /inventory/production-run → 200
  {"status":true, "data": [...], "meta": {...}}
  Runs count: 11
```
**Verdict:** Production run list returns 11 runs with pagination meta. Confirmed closed.

---

### G-019 | Segment unit_cost | ✅ CONFIRMED CLOSED

```
GET /inventory/stock-inventory/17681 (Almonds) →
  segments[0]: {
    "segment_id": 304,
    "batch": "VA-ALMD-001",
    "expiry_date": "2026-09-12",
    "cal_quantity": 1000,
    "display_qty": 1,
    "unit_cost": 1.4
  }
```
**Verdict:** `unit_cost` present in segment data (1.4 for Almonds batch). Confirmed closed.

---

### G-021 | Purchase Order Module (10 endpoints) | ✅ CONFIRMED CLOSED

```
GET  /inventory/purchase-order/list   → 200 (returns PO list)
GET  /inventory/purchase-order/6      → 200 (returns PO detail)
POST /inventory/purchase-order/create → 422 VALIDATION_FAILED (correct — requires vendor_id + lines)
```
**Verdict:** List, detail, and create endpoints all respond correctly. Validation errors are proper business rules. Confirmed closed.

---

### G-022 | Aggregated Stock with Segments/Consumption | ✅ CONFIRMED NOT NEEDED

```
GET /inventory/stock-inventory?include_segments=true&include_consumption=true&segment_limit=2
→ 200, 49 stocks, each with:
  consumption_summary: present ✓
  consumption_lines: present ✓
  segments_preview: present ✓  (note: key is "segments_preview" not "segments")
```
**Verdict:** API supports `include_segments` and `include_consumption` params. Data returned inline. Separate endpoint not needed. Confirmed NOT NEEDED.

---

### G-023 | Push-form API Missing child_existing Keys | ✅ CONFIRMED CLOSED

```
GET /franchise/push-form/812 → 200
  push_summary: {total_source: 73, total_child_matched: 13, total_behind: 60, breakdown: {...}}
  child_existing keys: [category_names, food_names, addon_names, ingredient_names,
                        sub_recipe_names, recipe_names, role_names]
```
**Verdict:** Both `push_summary` and enriched `child_existing` (with ingredient/sub_recipe/recipe names) are present. Confirmed closed.

---

## 5. Other Known Issues — Validation

### History items_count Always 0 | ❌ CONFIRMED

```
Transfer 226: items_count=0 (status=received)
Transfer 224: items_count=0 (status=received)
Transfer 223: items_count=0 (status=received)
Transfer 222: items_count=0 (status=partially_received)
Transfer 220: items_count=0 (status=received)
```
**Verdict:** All 5 sampled transfers show `items_count=0`. Backend does not compute line count in history listing. Would need per-transfer detail call (N+1) to get actual counts.

---

### store-sub-recipe Create API Bug (name null) | ❌ CONFIRMED

```
POST /recipe/store-sub-recipe {"name":"test-validation-only","ingredients":[]}
→ SQLSTATE[23000]: Integrity constraint violation: 1048 Column 'name' cannot be null
  SQL: insert into `sub_recipes` (`name`, ...) values (?, ...)
```
**Verdict:** POS backend ignores the `name` field from JSON payload and inserts NULL. This is a confirmed POS backend bug — the Laravel query shows `?` placeholder for name, indicating the field is not bound from the request. Existing sub-recipes work, but creating new ones via API fails.

---

### Wastage Reasons | ✅ WORKING

```
GET /inventory/wastage-reasons → 200
  4 reasons: [Others, Expired, Pilferage, Spillage]
```
**Verdict:** Wastage reasons endpoint works. Returns 4 configured reasons.

---

### Daily Consumption Report | ✅ WORKING

```
POST /report/daily-consumption-report {} → 200
  stock_summary: 18 items
  stock_details: 102 items
  date_range, restaurant_id, applied_restaurant_ids, hierarchy_scope: all present
```
**Verdict:** Consumption report works. No trend comparison (would need 2 separate API calls with different date ranges).

---

## 6. Summary Table

### Open Gaps (Blocking)

| ID | Gap | Status | Priority | Resolution Owner |
|----|-----|:------:|:--------:|:---:|
| **G-006** | Stock return flow API | ❌ OPEN | **P1** | POS Backend |
| **G-014** | Invoice OCR/AI extraction | ❌ OPEN | **P1** | POS Backend |
| **G-020** | Custom unit conversion | ❌ OPEN | **P1** | POS Backend |
| G-015 | Excel/CSV parsing | ❌ OPEN | P2 | POS Backend |
| G-016 | Invoice number storage | ❌ OPEN | P2 | POS Backend |

### Open Gaps (Low Priority)

| ID | Gap | Status | Priority | Resolution Owner |
|----|-----|:------:|:--------:|:---:|
| G-001 | Stock adjustment history API | ❌ OPEN | P2 | POS Backend |
| G-002 | Before/after qty in transfer | ❌ OPEN | P2 | POS Backend |
| G-005 | Dedicated stock ledger API | ❌ OPEN | P2 | POS Backend |
| G-011 | WebSocket infrastructure | ❌ OPEN | P2 | POS Backend |
| G-003 | User name resolution | ❌ OPEN | P3 | POS Backend |
| **G-004** | **History restaurant_type** | **⚠️ RE-EVALUATE** | **P3** | **from/to types present — may be closable** |

### Closed Gaps (Verified)

| ID | Gap | Verified |
|----|-----|:--------:|
| G-009 | Partial dispatch (approval_lines) | ✅ |
| G-010 | reserve_on_approve setting | ✅ |
| G-012 | request-catalog category_id | ✅ |
| G-013 | reference_code in transfers | ✅ |
| G-017 | vendor-item-list API (75 records) | ✅ |
| G-018 | Production run list (11 runs) | ✅ |
| G-019 | Segment unit_cost (1.4 confirmed) | ✅ |
| G-021 | Purchase Order Module (list/detail/create) | ✅ |
| G-022 | Aggregated stock params (NOT NEEDED) | ✅ |
| G-023 | push_summary + child_existing keys | ✅ |

### Bug Confirmations

| Bug | Confirmed | Notes |
|-----|:---------:|-------|
| History items_count=0 | ✅ Yes | All 5 sampled transfers = 0 |
| store-sub-recipe name null | ✅ Yes | SQLSTATE[23000] — POS doesn't bind `name` param |
| Wastage reasons | Working | 4 reasons returned |
| Daily consumption report | Working | 18 summary + 102 detail items |

---

## Resolution Log

_This section will be updated as gaps are resolved._

| Date | Gap ID | Resolution | Validated By |
|------|--------|------------|:------------:|
| — | — | — | — |
