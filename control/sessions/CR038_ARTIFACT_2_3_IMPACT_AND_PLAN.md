# CR-038 — Stock Return Flow + Wastage Reasons CRUD (G-006)

> **Gates:** 2 + 3 combined | **Planned:** 2026-07-11 | **Agent:** PLANNING
> **Source:** `AI/openGaps/gap_validation.md` — G-006 FULLY RESOLVED (both endpoints deployed)
> **Code Reality:** NONE for returns. PARTIAL for wastage reasons — `getWastageReasons()` (api.js:550) reads list; no add/CRUD.

---

## 1. Impact Analysis (Gate 2)

### What backend now provides (verified 2026-07-07)

1. `GET /proxy/v2/inventory-transfer/return/eligible` → `{status:true, data:{transfers:[]}}` (destination-store token)
2. `POST /proxy/v2/inventory-transfer/return/initiate` `{original_transfer_id, lines:[{line_id, quantity}]}`
   - Error codes (200 body): `RETURN_NOT_FROM_DESTINATION`, `INVALID_TRANSFER_STATE_FOR_RETURN`
3. Wastage reasons CRUD: `GET /wastage-reasons/list` → `{reasons, is_master, can_edit}`; `POST /wastage-reasons/add {reason}` → `{id}`

### Known unknowns (MUST curl-probe before coding — R9)
- **Eligible list returned 0** for `type=dispatch` transfers in validation. May only include `type=request` transfers, or depend on timing/settings. Probe with 806/809 hierarchy which has received transfers.
- Successful `return/initiate` response shape not captured (only error paths verified). Probe.
- Wastage add path prefix: validation shows `/wastage-reasons/add`; existing list call in api.js uses `/inventory/wastage-reasons` (works). Probe exact v2 paths for both.

### Data flow (target)

```
TransferDetail (received, viewer = destination) → [Return Items] button
  → ReturnStockDialog: lines w/ received qty → user picks line qty subset
  → api.initiateReturn() → success: toast + invalidate transfer caches → new return transfer appears in queues/ledger
Eligibility: api.getReturnEligible() gates the button / lists returnable transfers
```

### Affected files

| File | Change | Risk |
|------|--------|:---:|
| `frontend/src/services/api.js` | +3 methods: `getReturnEligible`, `initiateReturn`, `addWastageReason` | LOW (additive) |
| `frontend/src/components/central-inventory/TransferDetail.jsx` | "Return Items" action (destination store, status received/partially received) | MEDIUM |
| `frontend/src/components/central-inventory/ReturnStockDialog.jsx` **(NEW)** | Line picker + qty inputs + submit + error-code mapping | MEDIUM |
| `frontend/src/components/central-inventory/WastageEntryForm.jsx` | "+ Add reason" inline (only when `can_edit`) | LOW |

### Frozen-file constraint
`screenVisibility.js` is FROZEN. A dedicated "Returns" nav screen would require owner-approved edit. **Recommendation: NO new nav item** — mount return as an action on TransferDetail (like dispute resolution). Avoids frozen-file edit entirely.

### Conflict pre-check
- `TransferDetail.jsx`: CR-037 (this batch) also edits it. **Execution order: CR-038 AFTER CR-037** (or same session, sequential edits).
- `WastageEntryForm.jsx`: BUG-033 (IMPLEMENTED, in QA) touched it — additive, parallel-safe.

### Open Questions (owner)
1. Entry point confirmed as TransferDetail action (no new nav screen)? If you want a Returns list screen, screenVisibility.js edit needs your approval.
2. Eligibility business rule: if probe confirms only `type=request` transfers are returnable, is that acceptable for v1?
3. Who can add wastage reasons — respect `can_edit` from API only (recommended)?

## 2. Implementation Plan (Gate 3)

### Edits

**Edit 1 — api.js: +3 methods (after `getWastageReasons`, ~line 556)**
```js
// CR-038 — G-006 stock return flow
function getReturnEligible() {
  return client.get("/proxy/v2/inventory-transfer/return/eligible");
}
function initiateReturn({ originalTransferId, lines }) {
  return client.post("/proxy/v2/inventory-transfer/return/initiate", {
    original_transfer_id: originalTransferId, lines,
  }).then(r => { _invalidateTransferCaches(); _invalidateStockCaches(); return r; });
}
function addWastageReason(reason) {
  return client.post("/proxy/v2/inventory/wastage-reasons/add", { reason }); // path confirm via R9 probe
}
```
Export all 3 in the api object.

**Edit 2 — ReturnStockDialog.jsx (NEW, ~180 lines).** Props: `transfer`, `open`, `onClose`, `onSuccess`. Table of received lines (title, received qty, return qty input `min=0 max=received`). Submit → `initiateReturn`. Map error codes: `RETURN_NOT_FROM_DESTINATION` → "Only the receiving store can return items"; `INVALID_TRANSFER_STATE_FOR_RETURN` → "This transfer is not in a returnable state". data-testids: `return-dialog`, `return-line-qty-{i}`, `return-submit-btn`.

**Edit 3 — TransferDetail.jsx: Return action.** In the actions area, render `[Return Items]` button when: viewer restaurant id === `to_restaurant_id` AND status ∈ {received, partially_received} (refine with probe results / `return/eligible` check on mount). Opens ReturnStockDialog.

**Edit 4 — WastageEntryForm.jsx: add-reason inline.** Where `wastageReasons` dropdown renders (~line 257): if API `can_edit` true, append "+ Add new reason" item → small input+save → `api.addWastageReason` → refresh reasons list. (Requires `useWastageReasons` hook to expose `can_edit` + `refresh` — extend hook if needed; check `hooks/` during implementation.)

### Execution sequence
R9 curl-probes (eligible on 806/809, initiate happy-path on a fresh test transfer, wastage add path) → api.js → ReturnStockDialog → TransferDetail → WastageEntryForm.

### Scope lock
- **WILL change:** `api.js`, `TransferDetail.jsx`, `WastageEntryForm.jsx` (+ its hook if needed), **NEW** `ReturnStockDialog.jsx`
- **Will NOT touch:** `screenVisibility.js` (FROZEN), `terminology.js`, `server.py`, nav/sidebar, PendingQueues

### Verification Matrix

| # | File | Change | How to Verify | Automated? |
|---|------|--------|---------------|:---:|
| 1 | api.js | 3 new methods | curl eligible (destination token) → 200 | YES |
| 2 | ReturnStockDialog | happy path | Create+dispatch+receive test transfer, return 1 unit → success, stock ledger shows return row | NO |
| 3 | ReturnStockDialog | error mapping | Initiate from wrong actor via curl → friendly message logic (unit-level check) | YES (curl) |
| 4 | TransferDetail | button gating | Sender sees no Return button; receiver on received transfer sees it | NO |
| 5 | WastageEntryForm | add reason | Add "Test reason CR-038" → appears in dropdown | NO |

### Post-code registry checklist
- [ ] registry.json: CR-038 → IMPLEMENTED · L3 · L7 · `// CR-038` markers · dashboard `--check` PASS
