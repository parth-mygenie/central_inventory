# P26 G-012 & G-013 Gap Resolution — API Validation Addendum

> **Status:** VALIDATED — critical blocker found in G-013 write path
> **Date:** 9 June 2026
> **Probes:** 10 probes against live POS API via proxy
> **Hierarchy:** Tokyo Garden (rid=798, master) → Kyoto Garden (rid=799, franchise) + Hokkaido Garden (rid=800, franchise)
> **Branch:** 9-6-26

---

## 0. Executive Summary

| Gap | Scope | Verdict | Severity |
|-----|-------|---------|----------|
| **G-012** | Request Catalog Categories | **PASS** — all checks green | ✅ Ready |
| **G-013** | Reference Codes | **PARTIAL PASS / BLOCKER** — read path works, write path broken | 🔴 Blocker |

**G-013 Blocker:** POS API `POST /inventory-transfer/request` inserts **empty string** for `reference_code`. A `UNIQUE` constraint on the column means only **one** new transfer can ever be created before all subsequent creates fail with `Duplicate entry '' for key 'inventory_transfers_reference_code_unique'`. The `TRF-legacy-{id}` values visible on read endpoints are **computed fallbacks** in the API read layer, not stored values.

---

## 1. Test Accounts (corrected from API response)

| Email | RID | API `restaurant_type_flag` | Parent | Business Label |
|-------|:---:|--------------------------|:------:|----------------|
| owner@tokyogarden.com | 798 | `master` | null | TOP (Central Store) |
| owner@kyotogarden.com | 799 | `franchise` | 798 | BOTTOM (Outlet) |
| owner@hokkaidogarden.com | 800 | `franchise` | 798 | BOTTOM (Outlet) |

**Note:** User-provided labels had 800 as "master" and 798 as "franchise" — API flags are inverted from those labels. 798 is the actual master.

---

## 2. G-012: Request Catalog Categories — VALIDATION

### Endpoint: `POST /inventory-transfer/request-catalog`

### Probe 1: Franchise 799 (Kyoto) → Source 798 (Tokyo/master)

**Response shape:**
```json
{
  "status": true,
  "message": "...",
  "data": {
    "source_restaurant": {
      "restaurant_id": 798,
      "name": "Tokyo Garden",
      "restaurant_type": "master",
      "business_type": "restaurant",
      "can_submit_request": true
    },
    "items": [
      {
        "category_id": 1507,
        "category_name": "rice ball",
        "source_inventory_master_id": 17609,
        "stock_title": "rice",
        "unit": "kg",
        "unit_id": 1,
        "display_unit": "kg",
        "available_display_qty": 5,
        "available_cal_quantity": 5000,
        "is_mapped_to_child": true
      }
    ]
  }
}
```

**Item schema (all fields):**
| Field | Type | Always Present |
|-------|------|:-:|
| `category_id` | int \| null | YES |
| `category_name` | string | YES |
| `source_inventory_master_id` | int | YES |
| `stock_title` | string | YES |
| `unit` | string | YES |
| `unit_id` | int | YES |
| `display_unit` | string | YES |
| `available_display_qty` | number | YES |
| `available_cal_quantity` | number | YES |
| `is_mapped_to_child` | bool | YES |

### Check Results

| # | Check | Result | Evidence |
|---|-------|:------:|----------|
| G012-C1 | Every item has `category_id` | **PASS** | 3/3 items (Probe 1), 3/3 items (Probe 2) |
| G012-C2 | Every item has `category_name` | **PASS** | 3/3 items (Probe 1), 3/3 items (Probe 2) |
| G012-C3 | Uncategorized items: `category_id=null`, `category_name=""` | **N/A** | No uncategorized items in test data — all items assigned to categories |
| G012-C4 | Sorted by `category_name` → `stock_title` | **PASS** | Order: "rice ball"/rice → "rice ball"/sea weed → "sushi"/raw tuna |
| G012-C5 | Category groups buildable from response | **PASS** | 2 groups: [1507] "rice ball" (2 items), [1509] "sushi" (1 item) |

### Probe 2: Franchise 800 (Hokkaido) → Source 798 (Tokyo/master)
- **Same result**: 3 items, same categories, same sort order
- Both franchises see identical catalog from master source

### Probe 3 & 4: Master 798 self-catalog & master→franchise
```json
{
  "status": false,
  "error_code": "UNAUTHORIZED_ACTION",
  "message": "Only franchise or central can view request catalog.",
  "data": [],
  "next_action": null
}
```
- **Expected behavior**: Master cannot use request-catalog (only franchise/central roles can request stock)

### Edge Cases

| # | Edge Case | Finding |
|---|-----------|---------|
| E1 | Uncategorized items | **NOT OBSERVED** — all 3 test items have categories. Cannot validate `null`/`""` fallback pattern |
| E2 | Empty catalog | Not tested — would need a franchise with no mapped ingredients |
| E3 | Master access denied | Correctly returns `UNAUTHORIZED_ACTION` |
| E4 | `is_mapped_to_child` field | All items show `true` — confirms items are mapped from master to requesting franchise |
| E5 | `source_restaurant` metadata | Includes `can_submit_request: true` — useful for UI enablement |

### G-012 Verdict: **PASS** ✅

All P26 spec requirements met. Category fields present, sorting correct, groupable. Uncategorized edge case untestable with current data but field schema supports it.

---

## 3. G-013: Reference Codes — VALIDATION

### Probe 1: Request Creation (`POST /inventory-transfer/request`)

**Request:**
```json
{
  "from_restaurant_id": 798,
  "items": [{ "source_inventory_master_id": 17609, "quantity": 1, "unit": "kg" }]
}
```

**Response (franchise 799 → master 798):**
```json
{
  "status": true,
  "message": "Transfer request created",
  "data": {
    "transfer_id": 171,
    "reference_code": "TRF-legacy-171",
    "type": "request",
    "status": "requested",
    "lines": [
      {
        "line_id": 173,
        "stock_title": null,
        "requested_qty": 1,
        "requested_unit": "kg"
      }
    ]
  }
}
```

**Observation:** `stock_title` is `null` in creation response lines (only populated in details response).

### Probe 2: Transfer Details (`GET /inventory-transfer/details/171`)

```json
{
  "status": true,
  "data": {
    "transfer": {
      "id": 171,
      "from_restaurant_id": 798,
      "to_restaurant_id": 799,
      "type": "request",
      "reference_code": "TRF-legacy-171",
      "parent_transfer_id": null,
      "requested_by": 4661,
      "requested_at": "2026-06-09 18:01:23",
      "status": "requested",
      "resolution_type": "return_to_source",
      ...
    },
    "lines": [
      {
        "id": 173,
        "transfer_id": 171,
        "line_no": 1,
        "source_inventory_master_id": 17609,
        "source_stock_title": "rice",
        "source_unit_id": 1,
        "source_category_id": 1507,
        "requested_qty": "1.00000000",
        "requested_unit": "kg",
        "quantity_cal": "1000.00000000",
        "quantity_display": "1.00000000",
        "display_unit": "kg",
        "status": "requested",
        "line_reference": "TRF-legacy-171-L01",
        ...
      }
    ]
  }
}
```

### Probe 3: Pending Queues — Requester (franchise 799)

```json
{
  "data": {
    "my_requests": [
      { "transfer_id": 171, "reference_code": "TRF-legacy-171", "status": "requested", ... },
      { "transfer_id": 151, "reference_code": "TRF-legacy-151", "status": "requested", ... }
    ],
    "approval_pending": [],
    "receive_pending": [],
    "receive_dispute_pending": [],
    "actions": { ... }
  }
}
```

### Probe 4: Pending Queues — Approver (master 798)

```json
{
  "data": {
    "approval_pending": [
      { "transfer_id": 171, "reference_code": "TRF-legacy-171", "status": "requested" },
      { "transfer_id": 167, "reference_code": "TRF-legacy-167", "status": "requested" },
      { "transfer_id": 151, "reference_code": "TRF-legacy-151", "status": "requested" }
    ],
    ...
  }
}
```

### Probe 5: Pending Queues — franchise 800

```json
{
  "data": {
    "my_requests": [
      { "transfer_id": 167, "reference_code": "TRF-legacy-167", "status": "requested" },
      { "transfer_id": 160, "reference_code": "TRF-legacy-160", "status": "approved" }
    ],
    ...
  }
}
```

### Check Results — Read Path

| # | Check | Result | Evidence |
|---|-------|:------:|----------|
| G013-C1 | Creation returns `transfer_id` | **PASS** | `transfer_id: 171` |
| G013-C2 | Creation returns `reference_code` | **PASS** | `reference_code: "TRF-legacy-171"` |
| G013-C3 | Details returns `transfer.reference_code` | **PASS** | Matches creation response |
| G013-C4 | Details returns `line_reference` on lines | **PASS** | `"TRF-legacy-171-L01"` |
| G013-C5 | Pending queues expose `reference_code` | **PASS** | All items across all queue sections have `reference_code` |
| G013-C6 | Format follows documented pattern | **PASS** | `TRF-legacy-{id}` for transfers, `TRF-legacy-{id}-L{nn}` for lines |
| G013-C7 | Reference consistency across endpoints | **PASS** | Same `TRF-legacy-{id}` on creation, details, and all queue views |

### Cross-Reference Consistency Matrix

| Transfer | Creation | Details | Queue (requester) | Queue (approver) | Queue (other) | Consistent |
|:--------:|----------|---------|-------------------|------------------|---------------|:----------:|
| 151 | N/A (pre-existing) | TRF-legacy-151 | TRF-legacy-151 (799) | TRF-legacy-151 (798) | — | ✅ |
| 160 | N/A (pre-existing) | — | — | — | TRF-legacy-160 (800) | ✅ |
| 167 | N/A (pre-existing) | TRF-legacy-167 | — | TRF-legacy-167 (798) | TRF-legacy-167 (800) | ✅ |
| 171 | TRF-legacy-171 | TRF-legacy-171 | TRF-legacy-171 (799) | TRF-legacy-171 (798) | — | ✅ |

### Line Reference Format

| Transfer | Line | line_reference | Pattern Match |
|:--------:|:----:|---------------|:------------:|
| 151 | 1 | TRF-legacy-151-L01 | ✅ `{ref}-L{line_no:02d}` |
| 151 | 2 | TRF-legacy-151-L02 | ✅ |
| 167 | 1 | TRF-legacy-167-L01 | ✅ |
| 171 | 1 | TRF-legacy-171-L01 | ✅ |

---

## 4. 🔴 G-013 CRITICAL BLOCKER: Write Path Failure

### Probe 5 & 6: Second + Third Request Creation — BOTH FAIL

**Probe 5** — Franchise 800 creating request:
```json
{
  "status": false,
  "error_code": "UNKNOWN_ERROR",
  "message": "SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry '' for key 'inventory_transfers.inventory_transfers_reference_code_unique' (SQL: insert into `inventory_transfers` (`from_restaurant_id`, `to_restaurant_id`, `type`, `status`, `requested_by`, `requested_at`, `created_at`, `updated_at`, `reference_code`) values (798, 800, request, requested, 4666, 2026-06-09 18:02:06, 2026-06-09 18:02:06, 2026-06-09 18:02:06, ))",
  "data": [],
  "next_action": null
}
```

**Probe 6** — Franchise 799 creating another request:
```json
{
  "status": false,
  "error_code": "UNKNOWN_ERROR",
  "message": "SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry '' for key 'inventory_transfers.inventory_transfers_reference_code_unique'"
}
```

### Root Cause Analysis

| # | Finding | Evidence |
|---|---------|----------|
| 1 | `reference_code` column has `UNIQUE` constraint | Error: `inventory_transfers_reference_code_unique` |
| 2 | Write path inserts **empty string `''`** for `reference_code` | SQL in error: `..., reference_code) values (..., )` — last value is empty |
| 3 | `TRF-legacy-{id}` is a **read-layer computed fallback** | Not stored in DB — generated on-the-fly from transfer ID |
| 4 | Transfer 171 succeeded because it was the **first** to insert `''` | No prior `''` existed (older transfers likely stored `NULL`) |
| 5 | All subsequent creates fail | Second `''` violates unique constraint |
| 6 | Pre-existing transfers (151, 160, 167) likely stored `NULL` | MySQL `UNIQUE` allows multiple `NULL` but not multiple `''` |

### Impact

- **ALL new transfer request creations are blocked** after the first one
- This affects `POST /inventory-transfer/request` for ALL franchises in this hierarchy
- Pre-existing transfers remain readable with computed reference codes
- The blocker is in the **POS API backend** (preprod.mygenie.online), not the proxy

### Recommended Fix (POS API side)

The POS API write path needs to generate a proper `reference_code` before insert:
```
Option A: Generate on insert → reference_code = "TRF-{id}" (requires post-insert update or DB trigger)
Option B: Generate before insert → reference_code = "TRF-{uuid}" or "TRF-{timestamp}-{random}"  
Option C: Set default to NULL instead of '' (allows unique constraint with multiple NULLs)
```

---

## 5. Pending Queue Schema

```json
{
  "transfer_id": 171,
  "reference_code": "TRF-legacy-171",
  "type": "request",
  "status": "requested",
  "from_restaurant_id": 798,
  "to_restaurant_id": 799,
  "created_at": "2026-06-09 18:01:23",
  "updated_at": "2026-06-09 18:01:23",
  "line_count": 1
}
```

Queue sections: `my_requests`, `approval_pending`, `receive_pending`, `receive_dispute_pending`, `actions`

---

## 6. Transfer Details Line Schema (Full)

```json
{
  "id": 173,
  "transfer_id": 171,
  "line_no": 1,
  "source_inventory_master_id": 17609,
  "destination_inventory_master_id": null,
  "source_stock_title": "rice",
  "source_unit_id": 1,
  "source_category_id": 1507,
  "source_purchase_price": null,
  "requested_qty": "1.00000000",
  "requested_unit": "kg",
  "quantity_cal": "1000.00000000",
  "quantity_display": "1.00000000",
  "display_unit": "kg",
  "meta_json": null,
  "status": "requested",
  "received_at": null,
  "created_at": "2026-06-09 18:01:23",
  "updated_at": "2026-06-09 18:01:23",
  "line_reference": "TRF-legacy-171-L01"
}
```

**Note:** `source_category_id` is present in detail lines (1507) — this is the same `category_id` from request-catalog. Useful for G-012 round-trip validation.

---

## 7. Data Validation Matrix

| Probe | Endpoint | Actor | Target | Result | Key Finding |
|:-----:|----------|-------|--------|:------:|-------------|
| P1 | POST request-catalog | 799 (franchise) | source=798 | **PASS** | 3 items, 2 categories, sorted, all fields present |
| P2 | POST request-catalog | 800 (franchise) | source=798 | **PASS** | Same catalog — both franchises see identical items |
| P3 | POST request-catalog | 798 (master) | source=798 | **EXPECTED FAIL** | `UNAUTHORIZED_ACTION` — master cannot request |
| P4 | POST request-catalog | 798 (master) | source=799 | **EXPECTED FAIL** | `UNAUTHORIZED_ACTION` — same restriction |
| P5 | POST request (create) | 799 (franchise) | from=798 | **PASS** | tid=171, ref=TRF-legacy-171 |
| P6 | GET details/171 | 799 (franchise) | — | **PASS** | ref consistent, line_reference present |
| P7 | POST pending-queues | 799 (franchise) | — | **PASS** | ref on all items, tid 171 in my_requests |
| P8 | POST pending-queues | 798 (master) | — | **PASS** | ref on all items, tid 171 in approval_pending |
| P9 | POST request (create) | 800 (franchise) | from=798 | **🔴 FAIL** | SQL unique constraint violation on empty reference_code |
| P10 | POST request (create) | 799 (franchise) | from=798 | **🔴 FAIL** | Same blocker — no new transfers possible |

---

## 8. Frontend Readiness Assessment

### G-012: Request Catalog UI Impact

| Component | Current State | Change Needed |
|-----------|--------------|---------------|
| `RequestStockForm.jsx` | Uses `requestCatalog()` from api.js | **None** — if API returns `category_id`/`category_name`, frontend can group without changes |
| `api.js` → `requestCatalog()` | Calls `POST /proxy/v2/inventory-transfer/request-catalog` | **None** — response already includes category fields |
| Category grouping UI | Currently flat list | **NEW** — needs category accordion/group display in step 2 of request flow |

### G-013: Reference Code UI Impact

| Component | Current State | Change Needed |
|-----------|--------------|---------------|
| `TransferDetail.jsx` | Shows transfer info | **ADD** `reference_code` display in header |
| `PendingQueues.jsx` | Shows queue items | **ADD** `reference_code` column/badge |
| `HistoryLedger.jsx` | Shows transfer history | **ADD** `reference_code` column if available |
| `RequestStockForm.jsx` | Shows creation success | **ADD** `reference_code` in success toast/confirmation |

---

## 9. Conclusion & Next Steps

### G-012: ✅ READY FOR FRONTEND
- API delivers `category_id` + `category_name` on every catalog item
- Sorting is correct (category_name → stock_title)
- Frontend can build grouped category UI directly from API response
- **Action:** Implement category grouping in `RequestStockForm` step 2

### G-013: 🔴 BLOCKED BY POS API BUG
- Read layer works perfectly — `reference_code` and `line_reference` present and consistent
- Write layer has **critical blocker**: empty `reference_code` + unique constraint = only 1 new transfer possible
- **Action required:** POS API team must fix `reference_code` generation in the write path
- **Workaround:** None available from proxy/frontend side
- **After POS fix:** Frontend can display `reference_code` in TransferDetail, PendingQueues, HistoryLedger

### Transfers created during validation
- Transfer 171 (Kyoto→Tokyo, rice 1kg, status=requested) — created as probe, needs cleanup or approval
