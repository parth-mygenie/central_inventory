# Central Inventory — Comprehensive E2E + Phase 2 Test Report

> **Date:** January 2026 (final run on refreshed DB, all migrations applied)  
> **Environment:** preprod.mygenie.online  
> **Accounts tested:** All 7 (Master + 2 Centrals + 4 Franchises)  
> **Items tested:** Cooking Oil (ltr), maida (kg), red meat (kg), patri (kg)  
> **Test script:** `e2e_final_test.py` (same folder)  

---

## Final Score: 52/52 PASSED (100%)

---

### Section A: Direct Dispatch (12/12 PASS)
| Test | Flow | Result |
|---|---|---|
| A1 | Master→Central1 (Cooking Oil 2ltr) + Receive | PASS |
| A2 | Master→Central2 (maida 5kg) + Receive | PASS |
| A3 | Master→Franchise3 direct (red meat 2kg, skip middle) + Receive | PASS |
| A4 | Master→Franchise4 direct (patri 1kg, skip middle) + Receive | PASS |
| A5 | Central1→Franchise1 (Cooking Oil 0.5ltr) + Receive | PASS |
| A6 | Central2→Franchise3 (maida 1kg) + Receive | PASS |

### Section B: Request→Approve→Dispatch→Receive (8/8 PASS)
| Test | Flow | Result |
|---|---|---|
| B1 | Franchise1→Central1 request→approve→dispatch→receive (Oil 0.3ltr) | PASS |
| B2 | Central2→Master request→approve→dispatch→receive (Oil 1ltr) | PASS |

### Section C: Reject + Cancel + Partial Receive (8/8 PASS)
| Test | Flow | Result |
|---|---|---|
| C1 | Pre-dispatch reject (F3→C2 request, C2 rejects) | PASS |
| C2 | Post-dispatch cancel + stock restore (Master cancels) | PASS |
| C3 | Partial receive with damaged resolution (70% accept, 30% damaged) | PASS |
| C4 | Post-dispatch reject by destination (F1 refuses delivery) | PASS |

### Section D: Hierarchy Reporting + Queues (10/10 PASS)
| Test | Result |
|---|---|
| Hierarchy Summary (central stores) | PASS |
| Hierarchy Summary (franchise stores) | PASS |
| Hierarchy Detail — Master (id=1) | PASS |
| Hierarchy Detail — Central1 (id=781) | PASS |
| Hierarchy Detail — Franchise1 (id=783) | PASS |
| Hierarchy Detail — Franchise3 (id=785) | PASS |
| Pending Queues — Master | PASS |
| Pending Queues — Central1 | PASS |
| Pending Queues — Franchise1 | PASS |
| Transfer History — Master | PASS |

### Section E: Phase 2 Ops APIs (14/14 PASS)
| Test | Result | Notes |
|---|---|---|
| Operational Settings GET | PASS | Returns all P0–P11 settings |
| Reconciliation Summary | PASS | Segment vs master drift |
| Ops Dashboard | PASS | Hub KPIs |
| Stale Transfers | PASS | Escalation list |
| Near-expiry Alerts | PASS | Segment expiry window |
| Cost Valuation (FIFO) | PASS | |
| Wastage Report | PASS | Multi-restaurant scope |
| Decrease Adjustment | PASS | segment_id selector |
| Record Wastage | PASS | segment_id selector |
| Session Status | PASS | restaurant_ids[] param |
| Lateral Transfer (C1→C2) | PASS | After enabling allow_lateral_central_transfer |
| Reconciliation Request Create | PASS | |
| Return Initiate | PASS | `lines` field, correct line_id from details |
| Inward Audit | PASS | Destination token, bill_pdf migration applied |

### Section F: Stock Verification (All 7 stores)
| Store | Stock After All Tests |
|---|---|
| Master (id=1) | Cooking Oil=24.8ltr, maida=59.8kg, patri=13kg, red meat=32kg |
| Central1 (id=781) | Cooking Oil=2.7ltr |
| Central2 (id=782) | Cooking Oil=1ltr, maida=8kg, red meat=2.8kg |
| Franchise1 (id=783) | Cooking Oil=1.3ltr |
| Franchise2 (id=784) | no stock (no transfers sent to this store) |
| Franchise3 (id=785) | maida=2kg, red meat=4kg |
| Franchise4 (id=786) | patri=2kg |

---

## Key Fixes Applied in Final Script (vs earlier 48/50 version)

| Issue | Root Cause | Fix |
|---|---|---|
| B1+B2 Dispatch failed | Used `filter_bucket` selector but stock only exists as segments (created with batch/expiry) | Changed to `segment_id` selector from source-options |
| Decrease Adj + Record Wastage failed | Same bucket selector issue | Changed to `segment_id` selector |
| Session Status failed | Sent `restaurant_id` (singular) | Changed to `restaurant_ids[]` (array) |
| Lateral Initiate failed | `allow_lateral_central_transfer` was false | Enabled setting before test |
| Return Initiate failed | Used `return_lines` field name | Changed to `lines` per actual API contract |
| Inward Audit failed | Used Master token (source) | Changed to Central1 token (destination — only destination can audit) |
| Inward Audit SQL error | `bill_pdf` column missing | Owner ran migration — now working |

---

## Franchise Bundle Push Status

| From | To | Status |
|---|---|---|
| Master (1) | DemoCentral1 (781) | Done (by owner) |
| Master (1) | DemoCentral2 (782) | Done |
| DemoCentral1 (781) | DemoFranchise1 (783) | Done |
| DemoCentral1 (781) | DemoFranchise2 (784) | Done |
| DemoCentral2 (782) | DemoFranchise3 (785) | Done |
| DemoCentral2 (782) | DemoFranchise4 (786) | Done |

---

## How to Re-run

```bash
python3 /app/memory/central_inventory/api_evidence/e2e_final_test.py
```

Seeds fresh stock, runs all 52 tests, prints pass/fail summary.



---

## Addendum: Request Stock 3-Step Flow — E2E Verification (25 May 2026)

> **Source:** `memory/central_inventory/REQUEST_STOCK_E2E_TEST_RESULTS.md`
> **Environment:** preprod.mygenie.online (real POS APIs, no seed/mock)
> **Accounts tested:** Master(1), Central1(781), Central2(782), Franchise1(783), Franchise4(786)
> **Password (all accounts):** `Qplazm@10`

### New Endpoints Verified

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/inventory-transfer/request-sources` | POST | **WORKING** | Returns requester context + sources[] with `can_submit_request` |
| `/inventory-transfer/request-catalog` | POST | **WORKING** | Returns source store's inventory with `source_inventory_master_id` |

These endpoints were newly registered (routes added to `api.php` on 25 May 2026). Previously returned 404.

### Section G: Request Stock 3-Step Flow (24/24 PASS)

| Test | Flow | Result | Notes |
|------|------|--------|-------|
| T1 | request-sources F786 | PASS | 3 sources: C782(parent), Master(1), C781(sibling, submit=false) |
| T2 | request-sources F783 | PASS | 3 sources: C781(parent), Master(1), C782(sibling, submit=false) |
| T3 | request-sources C781 | PASS | 2 sources: Master(1, parent), C782(sibling, submit=false) |
| T4 | request-sources Master | PASS | 403 UNAUTHORIZED_ACTION (correct — master cannot request) |
| T5 | request-catalog F786→C782 | PASS | 4 items with source_inventory_master_id, available_display_qty |
| T6 | request-catalog F786→Master | PASS | 4 items from master store catalog |
| T7 | request-catalog F786→C781 sibling | PASS | 200 OK browse allowed (submit gated at /request) |
| T8 | request-catalog C781→Master | PASS | 4 items |
| T9 | submit F786→C782 default parent (filter_bucket) | PASS | tid=72 |
| T10 | submit F786→C782 explicit from_rid | PASS | tid=73 |
| T11 | submit F786→Master(1) segment_id | PASS | tid=74 |
| T12 | submit F786→C781 sibling (flag OFF) | PASS | INVALID_HIERARCHY 403 (correct) |
| T13 | submit C781→Master(1) | PASS | tid=75 |
| T14 | submit Master→any | PASS | INVALID_SOURCE_SELECTOR 422 (master blocked) |
| T15 | submit F786 wrong source_inv_id | PASS | SOURCE_STOCK_NOT_FOUND 422 |
| T16 | submit F786 missing source_selector | PASS | VALIDATION_FAILED 422 |
| T17 | submit F783→C781 segment_id | PASS | tid=76 |
| T18 | pending-queues F786 my_requests | PASS | 7 visible requests |
| T19 | pending-queues C782 approval_pending | PASS | 4 from F786 |
| T20 | pending-queues Master approval_pending | PASS | 2 (from C781 + F786) |
| T21 | operational-settings read | PASS | allow_cross_central_franchise_dispatch visible |
| T22 | operational-settings enable cross flag | PASS | Updated successfully |
| T23 | submit F786→C781 sibling (flag ON) | PASS | tid=77, can_submit_request now true |
| T24 | dispatch C781→F786 cross-branch (flag ON) | PASS | tid=78 (also confirms hierarchy diagnosis fix) |

### Verified Response Shapes

**request-sources:**
```json
{
  "status": true,
  "data": {
    "requester": { "restaurant_id": 786, "restaurant_type": "franchise" },
    "sources": [
      { "restaurant_id": 782, "relation": "direct_parent", "is_direct_parent": true, "can_submit_request": true },
      { "restaurant_id": 1, "relation": "upstream_master", "is_direct_parent": false, "can_submit_request": true },
      { "restaurant_id": 781, "relation": "sibling_central", "is_direct_parent": false, "can_submit_request": false }
    ]
  }
}
```

**request-catalog:**
```json
{
  "status": true,
  "data": {
    "source_restaurant": { "restaurant_id": 782, "can_submit_request": true },
    "items": [
      { "source_inventory_master_id": 16988, "stock_title": "Cooking Oil", "unit": "ltr",
        "available_display_qty": 1, "is_mapped_to_child": true }
    ]
  }
}
```

**request (submit):**
```json
{
  "status": true,
  "data": { "transfer_id": 72, "type": "request", "status": "requested",
    "lines": [{ "line_id": 56, "stock_title": "maida", "requested_qty": 0.5, "requested_unit": "kg" }]
  }
}
```

### `allow_cross_central_franchise_dispatch` Behavior (Verified)

| Scenario | Flag OFF | Flag ON |
|----------|----------|---------|
| F786 → C782 (parent) request | allowed | allowed |
| F786 → Master(1) request | allowed | allowed |
| F786 → C781 (sibling) request | **INVALID_HIERARCHY** | **allowed** (tid=77) |
| C781 → F786 (cross-branch) dispatch | INVALID_HIERARCHY | **allowed** (tid=78) |

Setting name: `allow_cross_central_franchise_dispatch`
Default: `false`
Update: `POST /operational-settings/update` with `{"restaurant_id":1,"settings":{"allow_cross_central_franchise_dispatch":true}}`

### Key Integration Rule: source-options Requires OWNER Token

`POST /source-options` enforces `from_restaurant_id == auth token restaurant_id`.
- Child token + parent's from_restaurant_id → `UNAUTHORIZED_ACTION`
- For request flow, use `filter_bucket` selector or catalog `available_display_qty` as max hint.

### Inventory Master IDs at Each Store (Verified)

| Store | Cooking Oil | maida | patri | red meat |
|-------|-------------|-------|-------|----------|
| Master(1) | 16980 | 16981 | 16983 | 16982 |
| Central1(781) | 16984 | 16985 | 16986 | 16987 |
| Central2(782) | 16988 | 16989 | 16990 | 16991 |
| Franchise4(786) | 17004 | 17005 | 17006 | 17007 |

**Critical:** `source_inventory_master_id` in request payload must be the SOURCE store's id (e.g. 16989 for maida at C782), NOT the requester's id (17005 at F786).


---

### Addendum: Pending-Queues Observations for Request Flow (25 May 2026)

> Source: `REQUEST_STOCK_E2E_TEST_RESULTS.md`

- `my_requests` items have `id: null` in some responses (POS inconsistency — `transfer_id` field not in queue item shape)
- Frontend should use `data.my_requests` for requester's pipeline tracker
- Parent sees requests in `data.approval_pending`
- `from_restaurant_id` and `to_restaurant_id` are present in queue items
- Requester (F786) saw 7 `my_requests` after test run (T18)
- Parent (C782) saw 4 `approval_pending` from F786 (T19)
- Master saw 2 `approval_pending` from C781 + F786 (T20)

### Addendum: Edge Cases from Request Stock E2E (25 May 2026)

> Source: `REQUEST_STOCK_E2E_TEST_RESULTS.md`

1. **T14 (Master request attempt):** Returns `INVALID_SOURCE_SELECTOR` 422 instead of expected `UNAUTHORIZED_ACTION` 403.
   - POS validates `source_selector` BEFORE checking actor role.
   - Frontend should not show Request Stock button for master users (already gated by `canDo('request-stock')`).

2. **T7 (Sibling catalog browse):** Returns 200 OK even when `can_submit_request=false`.
   - Catalog browsing is NOT gated by the cross-flag; only submit is gated at `/request` endpoint.
   - Frontend should also check `data.source_restaurant.can_submit_request` from catalog response for UX gating.

3. **Pending-queues `id` field:** Queue items show `id: null` (not `transfer_id`).
   - Queue list items from POS don't include `id` in the same shape as history items.
   - Frontend should handle `item.id || item.transfer_id` for navigation.

4. **T11 (Upstream master request with segment_id):** Works correctly.
   - Franchise CAN request from master with master's `segment_id`.
   - This implies segment lookup is done at the SOURCE store, not the requester.
