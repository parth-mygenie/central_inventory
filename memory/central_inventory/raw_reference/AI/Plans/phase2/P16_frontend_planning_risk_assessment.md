# P16 Refined Request-Line Lifecycle — Frontend Planning & Risk Assessment

> **Date:** 26 May 2026
> **Scope:** Frontend architecture analysis for refined request-line lifecycle (P16) integration
> **Status:** PLANNING ONLY — no code changes
> **Source truth:** `P16_refined_request_line.md`, `P14_request_selector_ownership.md`, `P12_request_stock_flow_frontend.md`, `api_implementation_status.md`

---

## 1. Current Frontend Architecture Assessment

### 1.1 Screen Inventory (12 screens, 15 components)

| Route | Component | Purpose | Touches transfer lifecycle? |
|-------|-----------|---------|---------------------------|
| `/` | `OperationsHub` | KPI cards + quick actions | YES — reads `pending-queues`, counts by header status |
| `/hierarchy` | `HierarchySummary` | Store list with transfer rollups | No — reporting only |
| `/store/:id` | `StoreDetail` | Stock + batch + transactions for one store | No — read-only |
| `/queues` | `PendingQueues` | Tab-based queue browser | YES — `approval_pending`, `receive_pending`, `my_requests` |
| `/history` | `HistoryLedger` | Transfer history + stock ledger | YES — reads history, derives ledger from transfer details |
| `/transfer/:id` | `TransferDetail` | Single transfer view + actions | **CRITICAL** — approve/dispatch/receive/reject/cancel |
| `/dispatch/new` | `DirectDispatchForm` | Create direct dispatch | No — `initiate` only (no request lifecycle) |
| `/request/new` | `RequestStockForm` | 3-step request stock form | YES — creates requests |
| `/adjustment/new` | `StockAdjustmentForm` | Increase/decrease stock | No — own-store only |
| `/wastage/new` | `WastageEntryForm` | Record wastage | No — own-store only |
| `/wastage/report` | `WastageReport` | Wastage report | No — read-only |
| (shared) | `SourceSelector` | Segment/bucket picker | No — used by dispatch/adjustment/wastage, NOT request |

### 1.2 State Architecture

- **No global store.** Every screen fetches its own data via `api.*` calls. No Redux, no Zustand, no context-based transfer cache.
- **LoginContext** is the only shared state: `token`, `user`, `restaurantType`, `restaurantId`, permission helpers.
- **Each screen is self-contained:** `useState` + `useEffect` + `useCallback` for data. No shared transfer state across screens.
- **No optimistic updates.** All mutations go through `useWriteAction` which calls API → toast → re-fetch.
- **No WebSocket/polling.** `useCentralInventoryRealtime` is a placeholder stub.

### 1.3 API Integration Layer (`api.js`)

- **393 lines,** 22 exported functions.
- Every API call normalizes responses (transfer lines, resolution meta, batch items).
- `approveTransfer(id)` sends `POST /approve/{id}` with **empty body `{}`** — legacy full-approve only.
- `dispatchTransfer(id)` sends `POST /dispatch/{id}` with **empty body** — no `dispatch_lines`.
- `receiveTransfer(id, payload)` accepts partial receive with `received_lines[]`.
- **No `cancelRemainder`, `withdraw`, `amend`, `modification`, `receiveDispute`, `resolveDispute` methods exist.**

---

## 2. Current Request Lifecycle Mapping

### 2.1 Current Flow (What Frontend Supports Today)

```
Franchise: RequestStockForm → POST /request (no selector)
                                    ↓
Central:  TransferDetail → Approve button → POST /approve/{id} body: {}
                                    ↓
Central:  TransferDetail → Dispatch button → POST /dispatch/{id} body: {}
                                    ↓
Franchise: TransferDetail → Receive button → POST /receive/{id} body: {} or received_lines[]
```

### 2.2 Header Status Assumption (Current)

The frontend treats `transfer.status` as the **sole lifecycle indicator**. There is NO line-level status awareness:

| Frontend reads | What it assumes | P16 reality |
|----------------|-----------------|-------------|
| `status === "requested"` | All lines are pending approval | Some lines may be `on_hold`, `cancelled_remainder` |
| `status === "approved"` | Everything is approved, ready to dispatch | Only some lines may be approved; others on hold |
| `status === "dispatched"` | Full shipment sent | Only approved qty dispatched; hold lines skipped |
| `status === "received"` | Transfer complete | Dispute may be pending |
| **NO** `partially_approved` | Not handled at all | **NEW header status from P16** |

---

## 3. Current Frontend Assumptions (Dangerous Under P16)

### 3.1 Critical Assumption Violations

| # | Assumption | Where in code | P16 violation | Risk level |
|---|-----------|---------------|---------------|------------|
| A1 | `transfer.status == line.status` | `TransferDetail` renders lines without per-line status | Lines can be `approved`, `on_hold`, `cancelled_remainder` while header is `partially_approved` | **CRITICAL** |
| A2 | `approved == fully approved` | `PendingQueues` filters `status === "approved"` for "Ready to Dispatch" | `partially_approved` transfers exist; some lines may not be dispatchable | **CRITICAL** |
| A3 | `approve sends {}` (full approve) | `TransferDetail.handleApprove` sends empty body | P16 requires `approval_lines[]` + `default_remainder_policy` | **CRITICAL** |
| A4 | `dispatch == all lines` | `TransferDetail.handleDispatch` sends `{}` | Dispatch skips `on_hold`/`cancelled_remainder` lines; UI shows no line-level dispatch status | **HIGH** |
| A5 | `line.quantity == requested_qty == dispatch_qty` | `TransferDetail` line table shows single `quantity` column | P16 has `requested_display_qty`, `approved_display_qty`, `hold_display_qty`, `cancelled_display_qty` per line | **HIGH** |
| A6 | `ReceiveDialog uses line.quantity for dispatched amount` | `ReceiveDialog` line 27: `dispatched: l.quantity ?? 0` | Dispatched qty may differ from requested qty (partial approve → partial dispatch) | **HIGH** |
| A7 | `StatusBadge only knows header statuses` | `terminology.js STATUS_CONFIG` | Missing: `partially_approved`, `on_hold`, `cancelled_remainder`, `receive_dispute_pending` | **HIGH** |
| A8 | `StatusTimeline is linear` | `StatusTimeline.getTimelineSteps` | P16 introduces wave branches: approve wave 1 → hold → approve wave 2; timeline doesn't branch | **MEDIUM** |
| A9 | `PendingQueues approval_pending == requested` | `PendingQueues` assumes `approval_pending` items are first-time approvals | Some may be `partially_approved` needing second wave | **MEDIUM** |
| A10 | `No cancel-remainder concept` | No UI or API method for it | P16 adds `POST /approve/{id}/cancel-remainder` | **MEDIUM** |
| A11 | `No receive dispute concept` | No UI for dispute | P16 adds `POST /receive/{id}` with `dispute: true` | **MEDIUM** |
| A12 | `OperationsHub counts assume simple statuses` | `OperationsHub` counts `approval_pending`, `receive_pending` | `partially_approved` transfers may appear in wrong queue or be miscounted | **MEDIUM** |

### 3.2 Hidden Legacy Assumptions

| Area | Assumption | Evidence |
|------|-----------|----------|
| `transferActions.js` | Terminal statuses are `received, partially_received, cancelled, rejected` | Line 47 — missing `on_hold`, `cancelled_remainder` as possible line-terminal states |
| `transferActions.js` | `status === "approved"` → show Dispatch button | Doesn't handle `partially_approved` |
| `HistoryLedger.deriveLedgerEntries` | Uses `line.quantity` as the single movement quantity | Doesn't distinguish `approved_display_qty` vs `requested_display_qty` |
| `ReceiveDialog` | Initializes `accepted_qty` from `line.quantity` | Should use dispatched qty from `meta_json.dispatch.dispatched_display_total` |
| `api.js normalizeTransfer` | Flattens `transfer + lines` from POS response | Doesn't parse `meta_json.approval` fields |

---

## 4. Current Reusable Components

| Component | Reuse potential for P16 | Modification needed? |
|-----------|------------------------|---------------------|
| `SourceSelector` | Still used by DirectDispatch, Adjustment, Wastage. NOT for request approve. | **No change** — central approve UI needs NEW component |
| `ConfirmActionDialog` | Reusable for simple actions | **No change** for legacy approve; insufficient for partial approve |
| `ReasonDialog` | Reusable for reject/cancel with resolution | May need `remainder_policy` option for cancel-remainder |
| `ReceiveDialog` | Line-level partial receive | Needs `dispatched_display_qty` per line instead of `line.quantity` |
| `StatusBadge` | Must add new statuses | Add `partially_approved`, `on_hold`, `cancelled_remainder`, `receive_dispute_pending` |
| `StatusTimeline` | Must handle multi-wave lifecycle | Needs wave-branch rendering |
| `Badges.StoreTypeBadge` | No change | — |
| `DateRangePicker` | No change | — |
| `StateDisplays` | No change | — |

---

## 5. Current Dangerous Coupling Points

| Coupling | Components affected | Why dangerous |
|----------|-------------------|---------------|
| **Header-status → action matrix** | `transferActions.js` → `TransferDetail` | Adding `partially_approved` requires updating action matrix; currently binary approve/dispatch |
| **Header-status → queue filtering** | `PendingQueues`, `OperationsHub` | `approval_pending` currently means `status=requested`; `partially_approved` may or may not appear |
| **`line.quantity` as single truth** | `TransferDetail`, `ReceiveDialog`, `HistoryLedger` | P16 splits into requested/approved/hold/cancelled display quantities |
| **`approve → {} body`** | `TransferDetail.handleApprove` → `api.approveTransfer` | Hardcoded empty body; P16 needs `approval_lines[]` |
| **`dispatch → {} body`** | `TransferDetail.handleDispatch` → `api.dispatchTransfer` | Backend handles auto-FEFO correctly, but UI doesn't know which lines dispatched |
| **Status terminology mapping** | `terminology.js STATUS_CONFIG` | Drives ALL badges, filters, timelines — single place but must be extended carefully |

---

## 6. Target Refined Lifecycle Model (P16)

### 6.1 New Header Statuses

| Status | Meaning | Frontend must handle |
|--------|---------|---------------------|
| `requested` | Unchanged | Same as today |
| `partially_approved` | **NEW** — at least one line approved, some on hold | Show which lines approved vs held |
| `approved` | All lines approved (legacy + refined) | Unchanged for legacy; for refined = all lines have approved qty |
| `dispatched` | At least approved lines dispatched | May still have hold/cancelled lines |
| `received` | Destination confirmed | Same (unless dispute) |
| `receive_dispute_pending` | **NEW** — receiver flagged dispute | Show dispute UI |

### 6.2 New Line Statuses

| Status | Meaning | Visual treatment |
|--------|---------|-----------------|
| `requested` | Not yet in any approve wave | Default/amber |
| `approved` | Has `approved_display_qty`; may have `hold_display_qty` | Blue/green (show both amounts) |
| `on_hold` | Full line waiting (omitted from approval_lines) | Yellow/amber with "On Hold" badge |
| `cancelled_remainder` | Line or remaining qty dropped | Red/strikethrough |

### 6.3 New Line Meta Fields (`meta_json.approval`)

| Field | UI use |
|-------|--------|
| `requested_display_qty` | Show "originally requested" |
| `original_requested_display_qty` | Audit: pre-shrink amount |
| `approved_display_qty` | Show "approved / ready to dispatch" |
| `hold_display_qty` | Show "waiting for central" (not reserved) |
| `cancelled_display_qty` | Show "cancelled by central" |
| `remainder_policy` | Show whether hold or cancel was chosen |
| `approval_waves[]` | Audit trail: each wave with qty + segments + timestamp |

---

## 7. Required UI State-Machine Changes

### 7.1 TransferDetail — State Machine Extension

```
Current:  requested → approved → dispatched → received (linear)
                    ↘ rejected                ↘ cancelled

Target:   requested → partially_approved → approved → dispatched → received
                    ↘ rejected             ↗ (second wave)        ↘ receive_dispute_pending
          Per line:  requested → approved (partial qty)
                               → on_hold
                               → cancelled_remainder
```

### 7.2 Action Matrix Extension (`transferActions.js`)

| Status | Source (Central) actions | Destination (Franchise) actions |
|--------|------------------------|-------------------------------|
| `requested` | Approve (legacy `{}` + NEW partial), Reject | Edit (franchise) |
| `partially_approved` | **NEW:** Second wave approve, Cancel remainder, Dispatch approved, Reject | View only |
| `approved` | Dispatch, Cancel remainder, Reject | View only |
| `dispatched` | Cancel | Receive, Report Issue, **Dispute** |
| `receive_dispute_pending` | **Resolve dispute** | View |

### 7.3 Approve UI Branching

```
User clicks "Approve" on TransferDetail:
  → IF legacy mode or user chooses "Approve All":
      → Send {} (current behavior, backward compat)
  → IF user chooses "Partial Approve":
      → Show NEW ApproveWaveDialog:
          → Per line: segment picker (source-options), quantity, remainder_policy
          → Build approval_lines[] + default_remainder_policy
          → POST /approve/{id} with structured body
```

---

## 8. Required Component Changes

### 8.1 MUST Change (Blocking)

| Component | Change | Priority |
|-----------|--------|----------|
| `TransferDetail` | Parse line `meta_json.approval`; show per-line status, qty breakdown; handle `partially_approved` | P0 |
| `transferActions.js` | Add `partially_approved` to action matrix; add cancel-remainder, second-wave actions | P0 |
| `terminology.js STATUS_CONFIG` | Add `partially_approved`, `on_hold`, `cancelled_remainder`, `receive_dispute_pending` | P0 |
| `StatusBadge` | Auto-works once STATUS_CONFIG updated | P0 |
| `api.js` | Add `approvePartial`, `cancelRemainder`, `receiveDispute`, `resolveDispute`, `withdrawRequest`, `amendRequest`, `modificationRequest` methods | P0 |

### 8.2 SHOULD Change (High Value)

| Component | Change | Priority |
|-----------|--------|----------|
| `StatusTimeline` | Handle `partially_approved`, multi-wave visual, wave audit nodes | P1 |
| `PendingQueues` | Handle `partially_approved` in tab counts; possibly new tab "Partial Approvals" | P1 |
| `OperationsHub` | Count `partially_approved` correctly (not in "Ready to Dispatch" unless all lines approved) | P1 |
| `ReceiveDialog` | Use `meta_json.dispatch.dispatched_display_total` per line, not `line.quantity` | P1 |
| `HistoryLedger` | Handle `partially_approved` in status filter; show wave-level audit entries | P1 |

### 8.3 NEW Components Needed

| Component | Purpose | Priority |
|-----------|---------|----------|
| `ApproveWaveDialog` | Central UI for partial approve: per-line segment picker + qty + remainder_policy | P0 |
| `LineStatusBadge` | Visual badge for line-level status (`approved`, `on_hold`, `cancelled_remainder`) | P0 |
| `LineQuantityBreakdown` | Inline display: requested / approved / hold / cancelled qty per line | P0 |
| `CancelRemainderDialog` | Central UI for cancel-remainder action on partial transfers | P1 |
| `ApprovalWaveHistory` | Collapsible audit view of `meta_json.approval.approval_waves[]` per line | P2 |
| `ReceiveDisputeDialog` | Franchise UI for flagging dispute on received transfer | P2 |
| `DisputeResolutionDialog` | Central UI for resolving `receive_dispute_pending` transfers | P2 |

---

## 9. Required API Integration Changes

### 9.1 New API Methods Needed in `api.js`

```javascript
// P16 — Partial approve with approval_lines
function approveTransferPartial(transferId, { approvalLines, defaultRemainderPolicy }) { ... }

// P16 — Cancel hold on partially approved transfer
function cancelRemainder(transferId, { lineIds }) { ... }

// P15 — Franchise withdraw request
function withdrawRequest(transferId) { ... }

// P15 — Franchise amend while requested
function amendRequest(transferId, payload) { ... }

// P15 — Franchise modification after approve
function modificationRequest(transferId, payload) { ... }

// P15 — Receive with dispute
function receiveDispute(transferId, payload) { ... }

// P15 — Central resolve dispute
function resolveDispute(transferId, payload) { ... }
```

### 9.2 Existing API Method Impact

| Method | Change needed |
|--------|---------------|
| `approveTransfer(id)` | **Keep as-is** for legacy `{}` full approve. Add separate `approveTransferPartial`. |
| `dispatchTransfer(id)` | **No change** — backend already skips non-dispatchable lines |
| `receiveTransfer(id, payload)` | Add `dispute: true` support |
| `getTransferDetails(id)` | **No change** to call; normalizer must parse `meta_json.approval` fields |
| `normalizeTransfer(raw)` | Must extract and expose `meta_json.approval` per line |

---

## 10. Required Line-Level State Architecture

### 10.1 Line Data Model (Frontend)

```javascript
// Current line model (from API normalization):
{
  id, stock_title, quantity, unit,
  accepted_qty, rejected_qty, resolution_type
}

// Target line model (P16-enriched):
{
  id, stock_title, unit,
  status,                              // "requested" | "approved" | "on_hold" | "cancelled_remainder"
  requested_display_qty,               // from meta_json.approval
  original_requested_display_qty,      // audit copy
  approved_display_qty,                // sum of committed segment qty
  hold_display_qty,                    // not reserved
  cancelled_display_qty,               // dropped by cancel policy
  remainder_policy,                    // "hold" | "cancel"
  approval_waves,                      // [{approved_display_qty, segments[], at}]
  // receive fields (existing):
  accepted_qty, rejected_qty, resolution_type,
  // dispatch fields:
  dispatched_display_total             // from meta_json.dispatch
}
```

### 10.2 Normalization Strategy

Add a `normalizeTransferLine` enhancement in `api.js`:

```javascript
function normalizeLineApproval(line) {
  let meta = line.meta_json;
  if (typeof meta === "string") {
    try { meta = JSON.parse(meta); } catch { meta = {}; }
  }
  const approval = meta?.approval || {};
  const dispatch = meta?.dispatch || {};
  return {
    ...line,
    lineStatus: line.status || "requested",
    requestedDisplayQty: approval.requested_display_qty ?? line.requested_qty ?? line.quantity,
    approvedDisplayQty: approval.approved_display_qty ?? null,
    holdDisplayQty: approval.hold_display_qty ?? null,
    cancelledDisplayQty: approval.cancelled_display_qty ?? null,
    remainderPolicy: approval.remainder_policy ?? null,
    approvalWaves: approval.approval_waves || [],
    dispatchedDisplayTotal: dispatch.dispatched_display_total ?? null,
  };
}
```

---

## 11. High-Risk Areas

### 11.1 CRITICAL Risk: Stale Transfer State After Approve Wave

**Scenario:** Central approves wave 1 (partial). Frontend still has stale transfer data. User clicks Dispatch — UI shows "all items" but dispatch only moves approved qty.

**Mitigation:** Force `fetchDetail()` after every approve action. Do NOT cache transfer state across navigation.

### 11.2 CRITICAL Risk: Incorrect Dispatch Quantity Display

**Scenario:** Transfer has 20kg requested, 10kg approved, 10kg on_hold. UI shows "20kg" in line table. User thinks full 20kg will dispatch.

**Mitigation:** TransferDetail line table MUST show `approved_display_qty` (dispatchable) separately from `requested_display_qty`.

### 11.3 HIGH Risk: PendingQueues Miscounting

**Scenario:** `partially_approved` transfer appears in `approval_pending` queue (API returns it because it still needs action). Frontend counts it alongside first-time requests. User sees inflated "Pending Approvals" count.

**Mitigation:** PendingQueues must distinguish first-time requests from partial-approve-pending. May need visual differentiation or sub-tabs.

### 11.4 HIGH Risk: ReceiveDialog Uses Wrong Quantity

**Scenario:** Line was requested 20kg, approved 10kg, dispatched 10kg. ReceiveDialog initializes `accepted_qty = line.quantity` (20kg). User submits → API rejects or produces incorrect receive.

**Mitigation:** ReceiveDialog must use `dispatched_display_total` from `meta_json.dispatch`, not `line.quantity`.

### 11.5 HIGH Risk: StatusTimeline Breaks on `partially_approved`

**Scenario:** Transfer goes `requested → partially_approved`. StatusTimeline.getTimelineSteps looks for `approved_at` timestamp — which may exist but transfer isn't fully approved. Shows "Approved ✓" incorrectly.

**Mitigation:** StatusTimeline must check `transfer.status` not just timestamp existence. `partially_approved` needs its own step.

### 11.6 MEDIUM Risk: Legacy Full-Approve Regression

**Scenario:** Adding partial approve UI accidentally breaks the `{}` full-approve path. Central clicks "Approve All" but code sends malformed payload.

**Mitigation:** Keep `api.approveTransfer(id)` unchanged (sends `{}`). New `api.approveTransferPartial(id, payload)` is a separate method. Action matrix routes to correct handler.

### 11.7 MEDIUM Risk: Mixed Old/New Transfer Records

**Scenario:** Old transfers have no `meta_json.approval` on lines. New P16 transfers do. Frontend crashes on `undefined.approved_display_qty`.

**Mitigation:** All P16 field access must have fallbacks. `approval.approved_display_qty ?? null`. Render legacy lines with single `quantity` column when approval meta is absent.

### 11.8 MEDIUM Risk: Concurrent Approve Waves

**Scenario:** Two central users both open the same transfer's approve dialog. Both submit partial approves. Second wave may conflict or produce unexpected line states.

**Mitigation:** Optimistic locking not available in frontend. After approve call, always re-fetch transfer detail. Show stale-data warning if `updated_at` changed between load and action.

---

## 12. Regression-Risk Analysis

| Existing flow | Regression risk from P16 work | Safeguard |
|---------------|-------------------------------|-----------|
| Direct Dispatch (`/dispatch/new`) | **NONE** — completely separate from request lifecycle | No changes to this flow |
| Stock Adjustment (`/adjustment/new`) | **NONE** — own-store only | No changes |
| Wastage Entry (`/wastage/new`) | **NONE** — own-store only | No changes |
| Legacy full-approve `{}` | **MEDIUM** — if approve action routing changes | Keep separate `approveTransfer` vs `approveTransferPartial` |
| Legacy full-dispatch `{}` | **LOW** — dispatch body unchanged | Backend auto-skips non-dispatchable lines |
| Receive (full) `{}` | **LOW** — body unchanged for full receive | Backend handles |
| Receive (partial) `received_lines[]` | **MEDIUM** — qty source may change | Must audit ReceiveDialog qty initialization |
| Hierarchy Summary / Store Detail | **NONE** — read-only reporting | No changes |
| Login / Auth | **NONE** | No changes |

---

## 13. Migration Strategy

### Phase 0: Foundation (Non-Breaking)

**Goal:** Extend status vocabulary and data normalization without changing behavior.

1. Add new statuses to `terminology.js STATUS_CONFIG`
2. Add line-level normalization to `api.js` (parse `meta_json.approval`)
3. Add new API methods to `api.js` (partial approve, cancel-remainder, etc.)
4. Add `partially_approved` to `transferActions.js`
5. **No UI rendering changes yet** — just data pipeline ready

**Risk:** Zero. Only additive. All existing behavior unchanged.

### Phase 1: TransferDetail Line-Level Rendering

**Goal:** TransferDetail shows per-line status and qty breakdown when P16 data is present. Falls back to legacy rendering when absent.

1. `TransferDetail` line table: show `lineStatus` badge, qty breakdown columns
2. Handle `meta_json.approval` when present, fall back to `line.quantity` when absent
3. Show "On Hold" / "Cancelled" badges inline
4. Update `StatusTimeline` for `partially_approved`

**Risk:** Low. Additive rendering. Legacy transfers show unchanged (no `meta_json.approval` → single quantity display).

### Phase 2: Partial Approve UI (Central Only)

**Goal:** Central user can partial-approve with `approval_lines[]`.

1. Build `ApproveWaveDialog` component
2. Integrate `source-options` per line for segment picker (central calls own-store source-options)
3. Wire to `api.approveTransferPartial`
4. Keep "Approve All" button for legacy full-approve
5. Update action matrix for `partially_approved` → second wave / cancel-remainder

**Risk:** Medium. Must test both legacy and partial approve paths. Segment picker must handle source-options correctly.

### Phase 3: Cancel-Remainder + Second Wave

**Goal:** Central can cancel hold or approve second wave.

1. Build `CancelRemainderDialog`
2. Wire second-wave approve (re-use ApproveWaveDialog)
3. Update PendingQueues to show `partially_approved` transfers
4. Update OperationsHub counts

**Risk:** Medium. Queue counting logic needs careful testing.

### Phase 4: Franchise Lifecycle (Withdraw, Amend, Dispute)

**Goal:** Franchise-side lifecycle actions.

1. Wire `withdraw`, `amend` actions for `requested` transfers
2. Wire `modification` for post-approve transfers
3. Wire `dispute` on receive
4. Build dispute resolution UI for central

**Risk:** Lower — franchise actions are simpler. But dispute introduces new header status.

---

## 14. Safe Rollout Order

```
Phase 0 (foundation)    → Deploy. Invisible to users. Purely additive.
Phase 1 (line rendering) → Deploy. Existing transfers render same. New P16 transfers render enriched.
Phase 2 (partial approve) → Deploy to central users. Franchise sees results but doesn't need new UI.
Phase 3 (cancel/wave)    → Deploy to central users. Franchise sees updated statuses passively.
Phase 4 (franchise)      → Deploy to franchise users. Last — least urgent, lowest risk.
```

Each phase is independently deployable and independently rollback-safe.

---

## 15. Suggested Smoke/UAT Coverage

### Per Phase

| Phase | Test | Method |
|-------|------|--------|
| 0 | Legacy full-approve still works | curl + UI screenshot |
| 0 | New statuses render badges (mock data) | Component unit test |
| 1 | Legacy transfer detail renders correctly (no meta_json.approval) | Screenshot |
| 1 | P16 transfer with partial approve renders line breakdown | curl to create → screenshot |
| 2 | Central partial approve: 10kg of 20kg → `partially_approved` | Full UI flow |
| 2 | Central full approve: `{}` still works | Regression |
| 2 | Second wave approve on held line | Full UI flow |
| 3 | Cancel remainder → lines show cancelled | Full UI flow |
| 3 | PendingQueues counts correctly with mixed statuses | Manual count verification |
| 4 | Franchise withdraw while `requested` | Full UI flow |
| 4 | Franchise receive dispute → central resolve | Full UI flow |

### Cross-Phase Regression

- Legacy direct dispatch unaffected
- Legacy receive (full) unaffected
- Adjustment/wastage unaffected
- Login/auth unaffected
- Hierarchy reporting unaffected

---

## 16. Rollback Considerations

| Phase | Rollback method | Data safety |
|-------|----------------|-------------|
| 0 | Revert `terminology.js`, `api.js` additions | No data touched |
| 1 | Revert `TransferDetail` line rendering | No data touched; P16 transfers still exist but render as legacy |
| 2 | Revert `ApproveWaveDialog` + action matrix | Central falls back to `{}` approve; P16 transfers with partial approval still viewable |
| 3 | Revert cancel-remainder UI | Cancel-remainder callable via curl if needed |
| 4 | Revert franchise lifecycle actions | Franchise sees P16 statuses but can't take new actions |

**Key:** Backend P16 APIs are independently deployed. Frontend rollback does NOT break backend state. The worst case is: frontend shows less info, but data is correct.

---

## 17. Implementation Warnings

1. **Do NOT modify `api.approveTransfer(id)` signature.** Add `api.approveTransferPartial` as separate method.
2. **Do NOT change `transferActions.js` terminal status list** without verifying all consumers.
3. **Do NOT assume `meta_json` is always parsed.** POS API returns it as a string sometimes.
4. **Do NOT show ApproveWaveDialog to franchise users.** Only central/master can partial-approve.
5. **Do NOT remove `line.quantity` rendering.** It's the fallback for legacy transfers without `meta_json.approval`.
6. **Do NOT assume `hold_display_qty` is locked stock.** It's explicitly NOT reserved per P16.
7. **Do NOT modify SourceSelector.** It's used by dispatch/adjustment/wastage, not by approve flow. Central approve needs its own segment picker integrated into ApproveWaveDialog.
8. **Do NOT add global transfer cache.** Each screen re-fetches independently. Adding cache risks stale state in multi-wave workflows.

---

## 18. Summary: What This Is

This is a **staged fulfillment workflow migration**, not a field addition.

The frontend is moving from:
- **Atomic transfer model** (one approve → one dispatch → one receive)

To:
- **Wave-based fulfillment model** (multiple approve waves → partial dispatch → hold management → dispute resolution)

The existing frontend was built for the atomic model. Every component assumes it. The migration must be incremental, backward-compatible, and phase-gated to avoid breaking the operational warehouse workflow that users depend on daily.
