# P17 — Amend / Withdraw / Modification Frontend Implementation Plan

> **Status:** PLANNING ONLY — no code changes
> **Author:** E1 agent, 27 May 2026
> **Depends on:** P15 lifecycle, P16 refined request-line (both implemented)
> **API validation:** Live POS API probing (preprod) — all 3 endpoints confirmed working

---

## 1. API Investigation Results (Verified 27 May 2026)

### 1.1 AMEND — `POST /inventory-transfer/request/{id}/amend`

| Attribute | Value |
|-----------|-------|
| **Status** | WORKING |
| **Actor** | Requester only (franchise/central who created) |
| **Prerequisite** | `status=requested` AND `type=request` (NOT `modification_request`) |
| **Payload** | `{ items: [...] }` — same format as request creation |
| **Behavior** | Replaces ALL lines in-place, same transfer_id, keeps `status=requested` |
| **Response** | `{ transfer_id, status: "requested", lines: [{line_id, requested_qty}] }` |
| **Line IDs** | NEW line_ids returned (old lines replaced) |
| **Error: non-requested** | `INVALID_TRANSFER_STATE: Only requested transfers can be amended.` |
| **Error: non-request type** | `INVALID_TRANSFER_STATE: Only request transfers can be amended.` |
| **Error: wrong actor** | Same as above (central cannot amend franchise's request) |
| **Error: missing items** | `VALIDATION_FAILED: The items field is required.` |
| **Stock impact** | None — no reservation at requested stage |
| **Audit** | `request_amended` event (assumed, consistent with `request_edited`) |

**Key delta from `edit/{id}`**: `amend` is franchise-actor scoped, while `edit` is source/parent-actor scoped. Both require `status=requested`. Amend preserves requester intent (franchise fixes their own request); edit is central's administrative correction.

### 1.2 WITHDRAW — `POST /inventory-transfer/request/{id}/withdraw`

| Attribute | Value |
|-----------|-------|
| **Status** | WORKING |
| **Actor** | Requester only |
| **Prerequisite** | `status=requested` AND `type=request` |
| **Payload** | `{}` (empty body) |
| **Behavior** | **Terminal** — sets `status=withdrawn` |
| **Response** | `{ transfer_id, status: "withdrawn" }` |
| **Queue impact** | Removed from `approval_pending` and `my_requests` |
| **History impact** | Shows with `status=withdrawn` (visible in history, not in queues) |
| **Error: non-requested** | `Only requested transfers can be withdrawn.` |
| **Error: non-request type** | `Only requested transfers can be withdrawn.` |
| **Stock impact** | None — no reservation at requested stage |
| **Reversibility** | NOT reversible — once withdrawn, cannot amend/re-request |

**New terminal status**: `withdrawn` must be added to terminology STATUS_CONFIG.

### 1.3 MODIFICATION — `POST /inventory-transfer/request/{id}/modification`

| Attribute | Value |
|-----------|-------|
| **Status** | WORKING |
| **Actor** | Requester only (franchise/central) |
| **Prerequisite** | Parent transfer `status` in `approved`, `partially_approved`, `dispatched`, `partially_received` |
| **Payload** | `{ items: [...] }` — new qty/items for the modification |
| **Behavior** | Creates **CHILD transfer** with new transfer_id |
| **Child type** | `modification_request` |
| **Child `parent_transfer_id`** | Points to original transfer |
| **Child status** | `requested` — needs central approval |
| **Parent impact** | **UNCHANGED** — parent status unaffected by creation or rejection |
| **Error: wrong status** | `INVALID_TRANSFER_STATE: Modification only allowed after approval.` |
| **Error: requested status** | Same error (cannot modify before approval) |

**Modification lifecycle:**
```
Parent (approved/partially_approved/dispatched/partially_received)
  └── Franchise: POST /request/{parent_id}/modification
       └── Child transfer created: type=modification_request, status=requested
            ├── Central: approve → child status=approved (parent unchanged)
            ├── Central: reject → child status=rejected (parent unchanged)
            └── Central: dispatch → child status=dispatched (separate stock movement)
```

**Critical: modification_request is a SEPARATE transfer.** It follows the normal request→approve→dispatch→receive lifecycle independently. The `parent_transfer_id` is informational linkage only — it does NOT mutate the parent.

**Restrictions on child:**
- CANNOT amend (`Only request transfers can be amended.`)
- CANNOT withdraw (`Only request transfers can be withdrawn.`)
- CAN be approved, rejected, dispatched, received by central/source

**Queue behavior:**
- Franchise `my_requests`: shows modification_request transfers
- Central `approval_pending`: shows modification_request transfers (when `status=requested`)
- `parent_transfer_id` may be NULL in queue items (confirmed from API response)

---

## 2. New Status & Type Vocabulary

### New terminal status: `withdrawn`

```js
// terminology.js STATUS_CONFIG addition
withdrawn: { label: "Withdrawn", color: "bg-slate-100 text-slate-700", dot: "bg-slate-400" }
```

- Terminal — no further actions
- Shows in history, not in active queues
- Different from `cancelled` (which is source-initiated post-dispatch)

### New transfer type: `modification_request`

```js
// Type badge rendering
modification_request → "Modification" (Badge variant: outline, amber/warning)
```

- Has `parent_transfer_id` — link to original
- Follows normal lifecycle (requested→approved→dispatched→received)
- Cannot be amended or withdrawn

---

## 3. Screens & Components Impacted

### 3.1 TransferDetail.jsx — HIGH IMPACT

**New actions needed:**

| Action | When visible | Actor | Variant |
|--------|-------------|-------|---------|
| Amend | `status=requested` AND `type=request` AND isDestination | Franchise | outline |
| Withdraw | `status=requested` AND `type=request` AND isDestination | Franchise | destructive |
| Request Modification | `status` in [`approved`, `partially_approved`, `dispatched`, `partially_received`] AND `type=request` AND isDestination | Franchise | outline |

**New rendering needed:**
- `type=modification_request` badge rendering
- `parent_transfer_id` link to parent transfer
- `withdrawn` status badge + terminal state (no actions)

### 3.2 transferActions.js — HIGH IMPACT

**New action entries in `getAvailableActions()`:**
```
// Destination-side additions
if (isDestination && transferType === "request") {
  if (status === "requested") {
    // existing: edit
    // NEW: amend, withdraw
  }
  if (["approved", "partially_approved", "dispatched", "partially_received"].includes(status)) {
    // NEW: modification
  }
}
```

**`withdrawn` as terminal status:** Add to the terminal-status list: `["received", "cancelled", "rejected", "withdrawn"]`

### 3.3 PendingQueues.jsx — MEDIUM IMPACT

**Changes:**
- `modification_request` type badge in queue rows
- Filter/tab logic: modification requests appear in existing tabs (approval_pending, my_requests)
- Optional: highlight modification requests with parent link
- Count badge on "Approvals" tab should include modification_requests (already does — API includes them)

### 3.4 HistoryLedger.jsx — MEDIUM IMPACT

**Changes:**
- `withdrawn` status rendering in history rows
- `modification_request` type rendering in history rows
- Parent link rendering (navigate to parent transfer)
- Ledger derivation: withdrawn transfers produce NO stock entries (no dispatch/receive happened)

### 3.5 StatusTimeline.jsx — MEDIUM IMPACT

**Changes:**
- `withdrawn` step (terminal branch, like rejected/cancelled)
- `modification_request` indicator (shows this is a child transfer)

### 3.6 terminology.js — LOW IMPACT

**Additions:**
- `STATUS_CONFIG.withdrawn`
- Type display mapping: `modification_request` → "Modification"

### 3.7 api.js — LOW IMPACT

**New methods:**
```js
amendRequest(transferId, items)        → POST /request/{id}/amend
withdrawRequest(transferId)            → POST /request/{id}/withdraw
requestModification(transferId, items) → POST /request/{id}/modification
```

**normalizeTransfer() update:**
- Handle `parent_transfer_id` field
- Handle `type=modification_request`

### 3.8 screenVisibility.js — NO CHANGE

Existing permissions cover this:
- `request-stock` permission gates amend/withdraw/modification (franchise only)
- `approve` permission gates modification approval (central only)

### 3.9 New Dialogs

| Dialog | Purpose | Complexity |
|--------|---------|------------|
| AmendRequestDialog | Edit items on a `status=requested` transfer | Medium — reuses RequestStockForm item picker pattern |
| WithdrawConfirmDialog | Confirm withdrawal with destructive warning | Low — simple confirm dialog |
| ModificationRequestDialog | Create modification request on an approved transfer | Medium — similar to AmendRequestDialog |

**Alternatively:** Amend and Modification could reuse the existing `RequestStockForm` pattern (source catalog → item selection → submit), but wrapped in a dialog or navigated as a sub-page.

---

## 4. Action Visibility Rules (Complete Matrix)

### Franchise/Outlet (isDestination) — Request-type transfers

| Status | Amend | Withdraw | Modification | Receive | Report Issue |
|--------|-------|----------|--------------|---------|-------------|
| requested | YES | YES | no | no | no |
| approved | no | no | YES | no | no |
| partially_approved | no | no | YES | no | no |
| dispatched | no | no | YES | YES | YES |
| partially_received | no | no | YES | YES | no |
| receive_dispute_pending | no | no | no | no | no |
| received | no | no | no | no | no |
| withdrawn | no | no | no | no | no |
| cancelled | no | no | no | no | no |
| rejected | no | no | no | no | no |

### Franchise/Outlet — Modification-request-type transfers

| Status | Amend | Withdraw | Modification | Other |
|--------|-------|----------|--------------|-------|
| requested | no | no | no | (wait for central) |
| approved | no | no | no | (wait for dispatch) |
| ALL other | no | no | no | (normal lifecycle) |

### Central/Source (isSource) — No change from P15/P16

Central actions (approve, dispatch, reject, cancel-remainder, resolve-dispute) are UNCHANGED. Modification requests appear in `approval_pending` and are approved/rejected like normal requests.

---

## 5. State Normalization Changes

### api.js normalizeTransfer() additions

```js
// New fields on normalized transfer:
{
  ...existing,
  parentTransferId: raw.parent_transfer_id || null,
  isModificationRequest: (raw.type === "modification_request"),
  isWithdrawn: (raw.status === "withdrawn"),
}
```

### Queue item normalization

Queue items from POS may include `modification_request` type. Frontend should:
- Display type badge (Modification vs Request vs Direct Dispatch)
- Show parent link if `parent_transfer_id` present
- Handle navigation to parent via link

---

## 6. Timeline Changes

### StatusTimeline.jsx additions

**Withdrawn branch (after requested):**
```
Requested ──→ Withdrawn (terminal, grey/slate)
```

**Modification indicator:**
```
[Modification of #117] → Requested → Approved → Dispatched → Received
```

Show a prefix badge/label when `type=modification_request` linking to parent.

---

## 7. Stale-State Risks

| Risk | Scenario | Mitigation |
|------|----------|------------|
| Amend race | Franchise amends while central is about to approve | API validates `status=requested` — approve on amended transfer still works (it's still requested). No data loss. |
| Withdraw race | Franchise withdraws while central is approving | API validates status — one operation wins. Loser gets `INVALID_TRANSFER_STATE`. Frontend should refresh on error. |
| Modification race | Franchise creates modification while central dispatches parent | Modification allowed even on `dispatched` parent — no conflict. Mod is independent transfer. |
| Stale queue | Queue shows transfer that was just withdrawn | Manual refresh button already added. Recommend: after amend/withdraw/modification, refetch queue data. |
| Modification on modification | Can franchise modify a modification_request? | NO — `INVALID_TRANSFER_STATE` (only `request` type allowed). No risk. |
| Parent detail stale | TransferDetail for parent doesn't show linked modifications | Enhancement needed: fetch child modifications and show in parent detail view. |

---

## 8. Operational Edge Cases

| Edge Case | Behavior (Verified) |
|-----------|-------------------|
| Amend changes line count | Old lines DELETED, new lines created with new line_ids |
| Amend changes item entirely | Allowed — items array is REPLACED entirely |
| Withdraw then re-request | Not possible — withdrawn is terminal. Must create new request. |
| Multiple modifications | Allowed — each creates a NEW child transfer. Multiple children can exist. |
| Modification rejected → re-modify | Allowed — franchise can create another modification (new child) |
| Modification approved → dispatch | Normal dispatch flow on the child transfer |
| Modification approved → parent dispatch | Parent and modification are INDEPENDENT — both can be dispatched |
| Parent cancelled/rejected after modification created | Modification child remains in its own lifecycle (not auto-cancelled) |
| Central amends franchise request | NOT allowed — amend is requester-only. Central uses `edit/{id}` instead. |

---

## 9. Implementation Sequencing (Rollback-Safe Order)

### Phase A: Foundation (Zero regression risk)

1. **terminology.js**: Add `withdrawn` to STATUS_CONFIG, add `modification_request` type mapping
2. **api.js**: Add `amendRequest()`, `withdrawRequest()`, `requestModification()` methods
3. **api.js normalizeTransfer()**: Handle `parent_transfer_id`, `isModificationRequest`, `isWithdrawn`
4. **transferActions.js**: Add `withdrawn` to terminal status list

**Rollback risk:** ZERO — additive changes only, no existing behavior modified.

### Phase B: Action Visibility (Low regression risk)

5. **transferActions.js**: Add `amend`, `withdraw`, `modification` action entries for franchise-side
6. **TransferDetail.jsx**: Wire new action handlers (amend, withdraw, modification)
7. **StatusTimeline.jsx**: Add `withdrawn` branch step

**Rollback risk:** LOW — new actions only appear for franchise on specific statuses. No existing actions affected.

### Phase C: Dialogs & UX (Medium regression risk)

8. **WithdrawConfirmDialog**: Simple confirmation dialog (reuse ConfirmActionDialog pattern)
9. **AmendRequestDialog**: Item editor for amending (reuse request-catalog item picker pattern)
10. **ModificationRequestDialog**: Item editor for modification (same pattern as amend)
11. **TransferDetail.jsx**: Parent link rendering for modification_request type transfers

**Rollback risk:** MEDIUM — new dialogs and UX elements. Regression only if dialog submission breaks existing flows.

### Phase D: Queue & History Polish (Low regression risk)

12. **PendingQueues.jsx**: Type badge for modification_request, parent link
13. **HistoryLedger.jsx**: Withdrawn rendering, modification_request type rendering
14. **OperationsHub.jsx**: No changes needed (modification_requests already counted in approval_pending)

**Rollback risk:** LOW — display-only changes.

---

## 10. Regression Risks

| Risk Area | Impact | Mitigation |
|-----------|--------|------------|
| Existing approve/dispatch/receive flows | NONE — no changes to these flows | Verify via existing P16 test suite |
| Existing TransferDetail rendering | LOW — new actions additive only | Conditional rendering, no existing action visibility changed |
| Existing queue filtering | LOW — modification_requests already in queues from API | Only adding type badge rendering |
| DirectDispatch flow | NONE — completely separate flow | No shared code modified |
| Stock adjustment / wastage | NONE — completely separate flows | No shared code modified |
| P16 hold-wave lifecycle | NONE — amend/withdraw only on `requested`, modification is independent | Modification creates new transfer, doesn't touch hold/wave state |

---

## 11. Modification ↔ Hold-Wave Interaction

**Question**: Can franchise modify a transfer that has outstanding hold?
**Answer**: YES — modification is allowed on `partially_approved`, `dispatched`, `partially_received` parent transfers. The modification child is independent — it doesn't affect hold state on the parent.

**Question**: Can central approve hold-wave on parent while modification child is pending?
**Answer**: YES — parent and modification are independent transfers. Central can continue approving hold waves on parent regardless of modification child status.

**Question**: Does modification child affect parent's reserved/dispatched quantities?
**Answer**: NO — modification child is a completely separate transfer with its own stock lifecycle. It does not mutate parent lines or quantities.

---

## 12. Modification ↔ Dispatch/Receive Interaction

**Dispatch after modification**: Both parent dispatch and modification child dispatch are independent. If parent is dispatched and franchise creates modification (for additional qty), the modification goes through its own approve→dispatch→receive cycle.

**Receive after modification**: Franchise receives parent and modification child separately. No merged receive.

---

## 13. Modification ↔ Dispute Interaction

**Question**: Can franchise create modification while parent is in `receive_dispute_pending`?
**Answer**: NOT TESTED — need to verify. Likely NO since `receive_dispute_pending` is not in the allowed status list (`approved`, `partially_approved`, `dispatched`, `partially_received`).

---

## 14. Open Questions (Require Owner Confirmation)

1. **AmendRequestDialog UX**: Should amend reuse the full request-catalog flow (Step 1: source, Step 2: catalog, Step 3: submit) or a simpler in-place editor showing existing lines?
2. **ModificationRequestDialog UX**: Same question as above.
3. **Parent detail view**: Should parent TransferDetail show linked modification requests as a sub-section?
4. **Queue notification**: Should modification_requests be visually distinct in approval_pending (badge, color, icon)?
5. **History filter**: Should there be a dedicated "Modifications" filter in transfer history?

---

## 15. Files to Create/Modify

### New files:
- `frontend/src/components/central-inventory/WithdrawConfirmDialog.jsx`
- `frontend/src/components/central-inventory/AmendRequestDialog.jsx`
- `frontend/src/components/central-inventory/ModificationRequestDialog.jsx`

### Modified files:
- `frontend/src/services/api.js` — 3 new methods + normalizer update
- `frontend/src/lib/terminology.js` — withdrawn status + modification_request type
- `frontend/src/lib/transferActions.js` — 3 new actions + withdrawn terminal
- `frontend/src/components/central-inventory/TransferDetail.jsx` — new actions + parent link
- `frontend/src/components/central-inventory/StatusTimeline.jsx` — withdrawn step
- `frontend/src/components/central-inventory/PendingQueues.jsx` — type badge
- `frontend/src/components/central-inventory/HistoryLedger.jsx` — withdrawn + modification rendering
- `frontend/src/components/common/Badges.jsx` — type badge (optional)

### NOT modified:
- `backend/server.py` — proxy already handles all paths via generic `proxy_v2`
- `frontend/src/hooks/useLoginContext.js` — no new permissions needed
- `frontend/src/lib/screenVisibility.js` — existing permissions cover all cases
- `frontend/src/components/central-inventory/OperationsHub.jsx` — no change needed
- `frontend/src/components/central-inventory/ApproveWaveDialog.jsx` — no change
- `frontend/src/components/central-inventory/ReceiveDialog.jsx` — no change
- `frontend/src/components/central-inventory/DisputeResolutionDialog.jsx` — no change

---

## 16. Estimated Effort

| Phase | Components | Effort |
|-------|-----------|--------|
| A: Foundation | terminology, api, transferActions | Small (30 min) |
| B: Action Visibility | transferActions, TransferDetail, StatusTimeline | Medium (1 hr) |
| C: Dialogs & UX | 3 new dialogs, TransferDetail wiring | Large (2 hr) |
| D: Queue & History Polish | PendingQueues, HistoryLedger | Small (30 min) |
| **Total** | | **~4 hours** |

---

## 17. Test Transfers Created During Investigation

| Transfer | Type | Status | Purpose |
|----------|------|--------|---------|
| 116 | request | withdrawn | Amend verified → then withdrawn |
| 117 | request | approved | Parent for modification T118 |
| 118 | modification_request | approved | Modification child of T117 (approved by central) |
| 119 | modification_request | rejected | Modification child of T110 (rejected by central) |
