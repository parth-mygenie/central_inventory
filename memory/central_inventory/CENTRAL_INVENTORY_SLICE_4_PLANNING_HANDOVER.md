# Central Inventory Slice 4 — Planning Handover

> **Date:** 22 May 2026
> **From:** Senior Slice 4 Write Flow Planning Agent
> **To:** Owner / Slice 4 Implementation Planning Agent

---

## 1. Planning Document Path

`/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_4_WRITE_FLOW_PLANNING.md`

---

## 2. Recommended Scope

### Must Have (10 items)
1. Approve transfer action (Transfer Detail)
2. Reject transfer with reason dialog (Transfer Detail)
3. Dispatch approved transfer (Transfer Detail)
4. Receive transfer — full (Transfer Detail)
5. Cancel transfer with reason dialog (Transfer Detail)
6. Direct Dispatch form (new screen/modal)
7. Source selector (segment_id mode, source-options API)
8. Confirmation dialogs for all destructive actions
9. Duplicate submission prevention
10. Post-action data refresh

### Should Have (5 items)
11. Request Stock form (child → parent)
12. Partial receive with line-level resolution
13. Edit transfer (pre-dispatch)
14. Success/error toast notifications
15. Quantity validation with UOM awareness

### Deferred (6+ items)
Stock adjustment, wastage entry, stock return, lateral transfers, partial dispatch, inward audit

---

## 3. API Readiness Summary

**10/10 write APIs verified_ready** from 52/52 E2E PASS report.

| Category | Count | Status |
|----------|-------|--------|
| Transfer lifecycle APIs | 8 | verified_ready |
| Supporting read APIs | 2 | verified_ready |
| Backend blockers for Slice 4 | 0 | None |
| UNIT_CONVERSION | — | Resolved |

Key payload insight: `source_selector` MUST use `segment_id` mode (not `filter_bucket`).

---

## 4. Owner Questions (8 total)

| # | Question | Recommended | Impact |
|---|----------|-------------|--------|
| Q-S4-001 | Real preprod API or seed proxy? | A (real API) | BLOCKS implementation approach |
| Q-S4-002 | Source selector: segment_id only or both modes? | C (auto-select, segment_id only) | Source selector UX design |
| Q-S4-003 | Central → Outlet direct dispatch included? | A (yes) | Destination picker scope |
| Q-S4-004 | Outlet can create stock requests? | A (yes) | Request form role scope |
| Q-S4-005 | Central/Master direct dispatch without request? | A (yes) | Direct Dispatch form inclusion |
| Q-S4-006 | Post-dispatch reject by destination included? | B (exclude, follow owner rule) | Action matrix clarity |
| Q-S4-007 | Partial receive: must-have or should-have? | B (should-have) | Receive form complexity |
| Q-S4-008 | Adjustment/wastage excluded from Slice 4? | A (yes, excluded) | Scope control |

**Critical question:** Q-S4-001 (API approach) blocks implementation.

---

## 5. Backend Blockers

**None for Slice 4 transfer write flows.**

All 10 required APIs are verified_ready. Items needing backend work (partial dispatch, soft reservation, over-receive) are NOT in Slice 4 scope.

---

## 6. Key Implementation Notes

1. **`transferActions.js` already exists** with correct role/status visibility matrix — Slice 4 only needs to enable the buttons and wire handlers.
2. **TransferDetail.jsx** already renders disabled action buttons — Slice 4 changes them to enabled with `onClick` handlers.
3. **`api.js`** needs new functions: `approveTransfer(id)`, `rejectTransfer(id, payload)`, `dispatchTransfer(id)`, `receiveTransfer(id, payload?)`, `cancelTransfer(id, payload)`, `initiateTransfer(payload)`, `requestStock(payload)`, `getSourceOptions(payload)`.
4. **Confirmation dialog** should be a reusable component (used by approve, dispatch, reject, cancel, receive).
5. **Direct Dispatch form** is a new route/modal — requires source selector, destination picker, item selector, quantity inputs.

---

## 7. Next Agent Recommendation

**`Central Inventory Slice 4 Owner Question Gate Agent`**

After owner answers Q-S4-001 through Q-S4-008:

**`Central Inventory Slice 4 Implementation Planning Agent`**

---

*End of Planning Handover*
