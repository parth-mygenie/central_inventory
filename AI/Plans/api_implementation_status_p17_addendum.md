
---

## Addendum: P17 Amend / Withdraw / Modification Endpoints — API Investigation (27 May 2026)

> **Source:** Live POS API probing (preprod.mygenie.online)
> **Verified transfers:** T116 (amend → withdraw), T117 (parent for modification), T118 (modification child approved), T119 (modification child rejected)

### New Endpoints Confirmed

| Endpoint | Method | Actor | Prereq Status | Prereq Type | Status |
|----------|--------|-------|---------------|-------------|--------|
| `POST /inventory-transfer/request/{id}/amend` | POST | Requester (franchise/central) | `requested` | `request` only | **WORKING** |
| `POST /inventory-transfer/request/{id}/withdraw` | POST | Requester | `requested` | `request` only | **WORKING** |
| `POST /inventory-transfer/request/{id}/modification` | POST | Requester | `approved`, `partially_approved`, `dispatched`, `partially_received` | `request` only | **WORKING** |

### Amend Contract

**Payload:** `{ items: [{source_inventory_master_id, stock_title, quantity, unit}] }` (same as request creation)
**Behavior:** REPLACES all lines in-place. Same transfer_id. New line_ids generated. Status stays `requested`.
**Response:** `{ status: true, message: "Request amended successfully", data: { transfer_id, status: "requested", lines: [{line_id, requested_qty}] } }`
**Errors:**
- Non-requested status → `INVALID_TRANSFER_STATE: Only requested transfers can be amended.`
- Non-request type → `INVALID_TRANSFER_STATE: Only request transfers can be amended.`
- Missing items → `VALIDATION_FAILED: The items field is required.`
- Central actor on franchise request → Same INVALID_TRANSFER_STATE
**Stock impact:** None (no reservation at requested stage)

### Withdraw Contract

**Payload:** `{}` (empty)
**Behavior:** Terminal status change to `withdrawn`. Irreversible.
**Response:** `{ status: true, message: "Request withdrawn successfully", data: { transfer_id, status: "withdrawn" } }`
**Errors:**
- Non-requested status → `Only requested transfers can be withdrawn.`
- Non-request type → Same error
**Queue impact:** Removed from `approval_pending` and `my_requests`
**History impact:** Shows as `status=withdrawn`
**Stock impact:** None

### Modification Contract

**Payload:** `{ items: [{source_inventory_master_id, stock_title, quantity, unit}] }` (same as request creation)
**Behavior:** Creates **NEW child transfer** with:
- `type: "modification_request"`
- `parent_transfer_id: <original_id>`
- `status: "requested"` (needs central approval)
**Response:** `{ status: true, message: "Modification request created", data: { transfer_id: <new_id>, parent_transfer_id: <parent_id>, type: "modification_request", status: "requested", lines: [{line_id}] } }`
**Parent impact:** UNCHANGED — parent status unaffected by creation, approval, or rejection of modification
**Errors:**
- Requested parent → `INVALID_TRANSFER_STATE: Modification only allowed after approval.`
**Modification child lifecycle:** Normal request→approve→dispatch→receive. Cannot be amended or withdrawn.

### New Status: `withdrawn`

- Terminal (no further actions)
- Must be added to STATUS_CONFIG
- Shows in history, not in queues

### New Type: `modification_request`

- Has `parent_transfer_id`
- Shows in franchise `my_requests` and central `approval_pending`
- Follows normal request lifecycle independently
- Cannot be amended or withdrawn

### Queue Observations (27 May 2026)

- Franchise `my_requests`: includes `modification_request` type (T118 approved, T119 requested)
- Central `approval_pending`: includes `modification_request` type with `status=requested`
- `parent_transfer_id` may be NULL in queue items
- Withdrawn transfers do NOT appear in queues (terminal)
- Withdrawn transfers DO appear in history

### Amend vs Edit Distinction

| | `amend` | `edit` |
|---|---------|--------|
| Route | `/request/{id}/amend` | `/edit/{id}` |
| Actor | **Requester** (franchise/central) | **Source/parent** (central/master) |
| Prereq status | `requested` | `requested` or `approved` |
| Status after | `requested` (unchanged) | `requested` (reset from approved) |
| Purpose | Franchise fixes their own request | Central corrects request lines |

### Transfer Flow Table Update

| Step | Endpoint | Allowed actor | Valid input status | Valid type | Resulting status | Stock movement |
|------|----------|---------------|--------------------|-----------|-----------------| --------------|
| Amend | `POST /request/{id}/amend` | requester (`to_restaurant_id`) | `requested` | `request` | `requested` | none |
| Withdraw | `POST /request/{id}/withdraw` | requester (`to_restaurant_id`) | `requested` | `request` | `withdrawn` | none |
| Modification | `POST /request/{id}/modification` | requester (`to_restaurant_id`) | `approved`, `partially_approved`, `dispatched`, `partially_received` | `request` | creates child `requested` | none |

### Edge Cases Verified

1. **Amend on approved** → `INVALID_TRANSFER_STATE` ✓
2. **Withdraw on approved** → `Only requested transfers can be withdrawn.` ✓
3. **Central amend** → `Only request transfers can be amended.` ✓
4. **Modification on requested** → `INVALID_TRANSFER_STATE: Modification only allowed after approval.` ✓
5. **Modification on partially_approved** → WORKS (creates child transfer) ✓
6. **Amend on modification_request** → `Only request transfers can be amended.` ✓
7. **Withdraw on modification_request** → `Only request transfers can be withdrawn.` ✓
8. **Reject modification** → Parent status UNCHANGED ✓
9. **Approve modification** → Child approved, parent UNCHANGED ✓
10. **Multiple modifications on same parent** → Each creates separate child ✓

### Frontend Planning

See `AI/Plans/phase2/P17_amend_withdraw_modification_plan.md` for full implementation plan.
