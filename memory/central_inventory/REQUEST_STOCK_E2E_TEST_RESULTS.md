# Request Stock Flow — E2E Test Results & Frontend Integration Notes

> **Date:** 25 May 2026
> **Method:** Real POS API testing with real auth users and real hierarchy data
> **Tokens:** Fresh login for all 5 user types (master, 2 centrals, 2 franchises)
> **No seed/mock data used**

---

## Test Summary: 24/24 PASS

| # | Test | Actor | Target | Expected | Actual | Status |
|---|------|-------|--------|----------|--------|--------|
| T1 | request-sources | F786 | — | 3 sources | 3 sources (782 parent, 1 master, 781 sibling) | PASS |
| T2 | request-sources | F783 | — | 3 sources | 3 sources (781 parent, 1 master, 782 sibling) | PASS |
| T3 | request-sources | C781 | — | 2 sources | 2 sources (1 parent, 782 sibling) | PASS |
| T4 | request-sources | Master | — | 403 | 403 UNAUTHORIZED_ACTION | PASS |
| T5 | request-catalog | F786 | C782 (parent) | items list | 4 items with source_inventory_master_id | PASS |
| T6 | request-catalog | F786 | Master(1) | items list | 4 items | PASS |
| T7 | request-catalog | F786 | C781 (sibling) | browse allowed | 200 OK (browse works, submit gated separately) | PASS |
| T8 | request-catalog | C781 | Master(1) | items list | 4 items | PASS |
| T9 | submit request | F786 → C782 | default parent | transfer created | tid=72 status=requested | PASS |
| T10 | submit request | F786 → C782 | explicit from_rid | transfer created | tid=73 status=requested | PASS |
| T11 | submit request | F786 → Master(1) | segment_id selector | transfer created | tid=74 status=requested | PASS |
| T12 | submit request | F786 → C781 | sibling (flag OFF) | INVALID_HIERARCHY 403 | INVALID_HIERARCHY 403 | PASS |
| T13 | submit request | C781 → Master(1) | central→parent | transfer created | tid=75 status=requested | PASS |
| T14 | submit request | Master → any | master cannot request | error | INVALID_SOURCE_SELECTOR 422 | PASS |
| T15 | submit request | F786 → wrong id | bad source_inv_id | error | SOURCE_STOCK_NOT_FOUND 422 | PASS |
| T16 | submit request | F786 → no selector | missing field | error | VALIDATION_FAILED 422 | PASS |
| T17 | submit request | F783 → C781 | segment_id selector | transfer created | tid=76 status=requested | PASS |
| T18 | pending-queues | F786 | my_requests | created transfers visible | 7 my_requests | PASS |
| T19 | pending-queues | C782 | approval_pending | requests from F786 visible | 4 approval_pending | PASS |
| T20 | pending-queues | Master | approval_pending | requests from C781/F786 visible | 2 approval_pending | PASS |
| T21 | operational-settings | Master | read flags | cross flag visible | allow_cross_central_franchise_dispatch: false | PASS |
| T22 | operational-settings | Master | enable cross flag | setting accepted | Updated successfully | PASS |
| T23 | submit request | F786 → C781 | sibling (flag ON) | transfer created | tid=77, can_submit_request now true | PASS |
| T24 | direct dispatch | C781 → F786 | cross-branch (flag ON) | dispatch created | tid=78 | PASS |

---

## API Response Observations

### request-sources response shape (VERIFIED)
```json
{
  "status": true,
  "message": "Request hierarchy sources fetched successfully",
  "data": {
    "requester": { "restaurant_id": 786, "restaurant_type": "franchise" },
    "sources": [
      { "restaurant_id": 782, "name": "DemoCentral2", "restaurant_type": "central",
        "relation": "direct_parent", "is_direct_parent": true, "can_submit_request": true },
      { "restaurant_id": 1, "name": "My Genie", "restaurant_type": "master",
        "relation": "upstream_master", "is_direct_parent": false, "can_submit_request": true },
      { "restaurant_id": 781, "name": "DemoCentral1", "restaurant_type": "central",
        "relation": "sibling_central", "is_direct_parent": false, "can_submit_request": false }
    ]
  }
}
```
- `relation` values observed: `direct_parent`, `upstream_master`, `sibling_central`
- `can_submit_request` correctly reflects `allow_cross_central_franchise_dispatch` flag
- Central as requester shows `direct_parent` (master) + `sibling_central` (peer)

### request-catalog response shape (VERIFIED)
```json
{
  "status": true,
  "message": "Request catalog fetched successfully",
  "data": {
    "source_restaurant": { "restaurant_id": 782, "can_submit_request": true },
    "items": [
      { "source_inventory_master_id": 16988, "stock_title": "Cooking Oil", "unit": "ltr",
        "available_display_qty": 1, "is_mapped_to_child": true },
      ...
    ]
  }
}
```
- `source_inventory_master_id` is the KEY field — must be used in submit, NOT child store ids
- `available_display_qty` is the available quantity hint for UX
- `is_mapped_to_child` indicates push-map exists
- Catalog browse is allowed even for non-submittable sources (sibling returns 200)
- Submit permission is checked at `/request` endpoint, not at catalog browse

### request (submit) response shape (VERIFIED)
```json
{
  "status": true,
  "message": "Transfer request created",
  "data": {
    "transfer_id": 72,
    "type": "request",
    "status": "requested",
    "lines": [
      { "line_id": 56, "stock_title": "maida", "requested_qty": 0.5, "requested_unit": "kg" }
    ]
  }
}
```

### pending-queues observation
- `my_requests` items have `id: null` in some responses (POS inconsistency — `transfer_id` field not in queue item)
- Frontend should use `data.my_requests` for requester's tracker
- Parent sees requests in `data.approval_pending`
- `from_restaurant_id` and `to_restaurant_id` are present in queue items

---

## Hierarchy Behavior Observations

### `can_submit_request` is controlled by `allow_cross_central_franchise_dispatch`
| Scenario | Flag OFF | Flag ON |
|----------|----------|---------|
| F786 → C782 (parent) | submit=true | submit=true |
| F786 → Master(1) | submit=true | submit=true |
| F786 → C781 (sibling) | **submit=false** | **submit=true** |
| C781 → Master(1) | submit=true | submit=true |
| C781 → C782 (sibling) | submit=false | submit=true |
| C781 dispatch → F786 | INVALID_HIERARCHY | **SUCCESS** |

### Same flag gates BOTH request AND dispatch cross-edges
The `allow_cross_central_franchise_dispatch` flag controls:
1. `can_submit_request` in request-sources for sibling central
2. `POST /request` hierarchy validation for sibling central as source
3. `POST /initiate` hierarchy validation for cross-branch Central→Franchise dispatch

### source-options requires OWNER token
`POST /source-options` requires `from_restaurant_id` to match the auth token's restaurant.
- C782 token + from_restaurant_id=782 → works
- F786 token + from_restaurant_id=782 → `UNAUTHORIZED_ACTION`
- For request flow: use source-options with SOURCE store's token or skip to filter_bucket

---

## Frontend Integration Notes

### Current frontend (`RequestStockForm.jsx`) gaps vs canonical contract

1. **Uses `getHierarchySummary()` instead of `request-sources`**
   - Current: fetches hierarchy-summary with both store types, merges, picks parent
   - Correct: call `request-sources` → get sources with `can_submit_request` flag
   - Impact: missing hierarchy validation info, no `relation` data, no cross-branch gating

2. **Uses `getInventoryMaster()` instead of `request-catalog`**
   - Current: fetches logged-in store's own inventory
   - Correct: call `request-catalog` with `source_restaurant_id` from selected source
   - Impact: shows CHILD store items instead of SOURCE store items; `source_inventory_master_id` will be wrong

3. **Missing `from_restaurant_id` in submit payload**
   - Current: omits `from_restaurant_id` (defaults to parent)
   - Correct: include when user selects non-default source
   - Impact: requests always go to default parent, no upstream master or sibling support

4. **Source selector for non-own-store**
   - source-options requires SOURCE store token (UNAUTHORIZED_ACTION from child token)
   - Frontend should either:
     a. Skip segment picker and use `filter_bucket` selector for requests
     b. Or use request-catalog `available_display_qty` as the max hint without segment picker

### Missing frontend integration points
- [ ] New API method: `requestSources()` → `POST /inventory-transfer/request-sources`
- [ ] New API method: `requestCatalog(sourceRestaurantId)` → `POST /inventory-transfer/request-catalog`
- [ ] Step 1 UI: Source picker with `can_submit_request` gating
- [ ] Step 2 UI: Catalog from selected source (not own store)
- [ ] `source_inventory_master_id` must come from catalog, not from `get-inventory-master`
- [ ] Optional `from_restaurant_id` in submit payload when non-default source selected
- [ ] Handle `INVALID_HIERARCHY` when sibling selected but cross flag off
- [ ] Handle `REQUEST_SOURCE_NOT_ALLOWED` from catalog endpoint
- [ ] `relation` display (direct_parent / upstream_master / sibling_central)
- [ ] Default selection: `is_direct_parent === true`

### source_selector contract for requests
- **segment_id mode**: `segment_id` must belong to SOURCE restaurant
- **filter_bucket mode**: `{"mode":"filter_bucket","bucket":"without_batch_and_expiry","batch_state":"null","expiry_state":"null"}`
- For requests, `filter_bucket` is the safe default since child cannot call source-options on parent

---

## Edge Cases Found

1. **T14 (Master request)**: Returns `INVALID_SOURCE_SELECTOR` 422 instead of expected `UNAUTHORIZED_ACTION` 403
   - POS validates source_selector BEFORE checking actor role
   - Frontend should not show Request Stock button for master users (already gated by `canDo('request-stock')`)

2. **T7 (sibling catalog browse)**: Returns 200 even when `can_submit_request=false`
   - Catalog browsing is not gated by cross-flag; only submit is gated
   - Frontend should check `data.source_restaurant.can_submit_request` from catalog response too

3. **pending-queues `id` field**: Queue items show `id: null` (not `transfer_id`)
   - The queue list items from POS don't include the transfer `id` field in the same shape as history items
   - Frontend should handle `item.id || item.transfer_id` for navigation

4. **T11 upstream master request with segment_id**: Works correctly
   - Franchise CAN request from master with master's segment_id
   - This implies the segment lookup is done at the source store, not the requester

---

## Tested Credentials (all working as of 25 May 2026)

| Email | Password | rid | type |
|-------|----------|-----|------|
| abhishek@kalabahia.com | Qplazm@10 | 1 | master |
| owner@democentral1.com | Qplazm@10 | 781 | central |
| owner@democentral2.com | Qplazm@10 | 782 | central |
| owner@demofranchise1.com | Qplazm@10 | 783 | franchise |
| owner@demofranchise4.com | Qplazm@10 | 786 | franchise |
