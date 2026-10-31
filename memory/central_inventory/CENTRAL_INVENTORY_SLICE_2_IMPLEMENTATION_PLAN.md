# Central Inventory Slice 2 Implementation Plan

> **Date:** 19 May 2026
> **Agent:** Senior Slice 2 Implementation Planning Agent
> **Status:** Code inspection only — no modifications made

---

## 1. Planning Status

### `implementation_plan_ready_owner_approval_required`

All 12 Slice 2 items are planned. File targets identified. Role/status matrices created. Smoke checklist prepared. Awaiting owner approval before implementation begins.

---

## 2. Inputs Reviewed

| # | Input | Path | Reviewed |
|---|-------|------|----------|
| 1 | Slice 2 UX Review & Planning | `/app/memory/central_inventory/CENTRAL_INVENTORY_SLICE_2_UX_REVIEW_AND_PLANNING.md` | YES |
| 2 | System Handover Document | `/app/memory/central_inventory/SYSTEM_HANDOVER_DOCUMENT.md` | YES |
| 3 | Slice 1 Handover | `/app/memory/central_inventory/CENTRAL_INVENTORY_FRONTEND_SLICE_1_HANDOVER.md` | YES |
| 4 | Slice 1 QA Validation Report | `/app/memory/central_inventory/CENTRAL_INVENTORY_FRONTEND_SLICE_1_QA_VALIDATION_REPORT.md` | YES |
| 5 | Test Credentials | `/app/memory/test_credentials.md` | YES |
| 6 | Seed Data Module | `/app/backend/seed_data.py` | YES |
| 7 | All 6 screen components | `/app/frontend/src/components/central-inventory/*.jsx` | YES |
| 8 | All infrastructure files | `terminology.js`, `screenVisibility.js`, `useLoginContext.js`, `api.js`, `App.js` | YES |
| 9 | Common components | `Badges.jsx`, `StateDisplays.jsx`, `AppHeader.jsx` | YES |

---

## 3. Approved Slice 2 Scope

| # | Item | Owner Answer |
|---|------|-------------|
| 1 | Ready to Dispatch tab | Q1: B |
| 2 | Status timeline on Transfer Detail | Must-have |
| 3 | Line-level accept/reject display | Must-have |
| 4 | Timestamp formatting | Must-have |
| 5 | Resolution reason display | Must-have |
| 6 | Date range picker | Must-have |
| 7 | Contextual action buttons by role + status | Q5: A |
| 8 | Items count column in queues | Must-have |
| 9 | Store name fix | Must-have (partially done in clarification round) |
| 10 | Downward-only scoped hierarchy | Q2: A |
| 11 | Context selector updates hub in-place | Q3: B |
| 12 | Remove KPI placeholder | Q4: B |

---

## 4. Explicitly Deferred

- KPI dashboard/cards (future reporting slice)
- Write form shells (Request Stock, Dispatch Wizard, Receive Stock) — blocked by UNIT_CONVERSION
- Reports dashboard
- Token masking (SEC-001)
- WebSocket real-time integration
- Wastage/adjustment/reconciliation screens
- Recipe consumption
- Backend terminology refactor

---

## 5. Current Code Recon Summary

### Screens (6 components in `/app/frontend/src/components/central-inventory/`)
| Component | Lines | Key State |
|-----------|-------|-----------|
| `ContextSelector.jsx` | 133 | Store picker dropdown, calls `onStoreChange` prop — currently navigates via parent |
| `OperationsHub.jsx` | 195 | Pending count cards, KPI placeholder (lines 164-173), quick actions, context selector embedded |
| `HierarchySummary.jsx` | 148 | Two tabs (Master Stores / Outlets), no date picker, no hierarchy filtering beyond API |
| `StoreDetail.jsx` | 293 | Stock table, batch drilldown, transactions — timestamps raw ISO |
| `PendingQueues.jsx` | 229 | 3 tabs, no items_count column, no Ready to Dispatch tab, all actions show "Action blocked" |
| `TransferDetail.jsx` | 223 | No timeline, no line-level accept/reject, raw timestamps, all 6 buttons always shown |

### Infrastructure
| File | Key Observations |
|------|-----------------|
| `terminology.js` | TERM_MAP correct. `STATUS_CONFIG` has 7 statuses. No `formatTimestamp` helper exists. |
| `screenVisibility.js` | `ACTION_PERMISSIONS` has 10 actions. `NAV_ITEMS` has 4 entries. No transfer-status-based action logic exists. |
| `useLoginContext.js` | `restaurantType`, `restaurantId`, `canDo()`, `isTopLevel/Middle/Bottom`. `restaurant_name` now stored. |
| `api.js` | `getPendingQueues()` returns flat queues. `getHierarchySummary()` already accepts `fromDate`/`toDate`. `getTransferHistory()` exists but unused. |
| `seed_data.py` | Pending queues returns `approval_pending`, `receive_pending`, `my_requests`. No `ready_to_dispatch` key. Transfer objects have `_at` timestamps + `resolution_meta` + line-level `accepted_qty`/`rejected_qty`. |

### Key Data Shape (from seed_data.py)
```
Transfer: { id, type, status, from_restaurant, to_restaurant, 
            requested_by, requested_at, approved_by, approved_at, 
            dispatched_by, dispatched_at, received_by, received_at,
            cancelled_by, cancelled_at, resolution_type, resolution_meta,
            lines: [{ stock_title, quantity, unit, accepted_qty, rejected_qty, resolution_type }] }
```

---

## 6. File Target Map

| # | Area | Existing File | Change Type | Risk |
|---|------|---------------|-------------|------|
| 1 | Timestamp formatting | NEW: `src/lib/formatters.js` | Create utility | LOW |
| 2 | Transfer action matrix | NEW: `src/lib/transferActions.js` | Create logic | MEDIUM — must match freeze exactly |
| 3 | Status timeline component | NEW: `src/components/central-inventory/StatusTimeline.jsx` | Create component | LOW |
| 4 | Ready to Dispatch data | MODIFY: `/app/backend/seed_data.py` → `get_pending_queues()` | Add `ready_to_dispatch` key | LOW |
| 5 | Ready to Dispatch backend | MODIFY: `/app/backend/server.py` → `proxy_pending_queues()` | Include new key in response | LOW |
| 6 | Pending Queues screen | MODIFY: `PendingQueues.jsx` | Add tab + items column + timestamps | MEDIUM |
| 7 | Transfer Detail screen | MODIFY: `TransferDetail.jsx` | Timeline + line-level + resolution + contextual actions | HIGH — largest change |
| 8 | Operations Hub | MODIFY: `OperationsHub.jsx` | Remove KPI, in-place context, add Ready to Dispatch count | MEDIUM |
| 9 | Context Selector | MODIFY: `ContextSelector.jsx` | In-place hub update instead of navigation | MEDIUM |
| 10 | Hierarchy Summary | MODIFY: `HierarchySummary.jsx` | Date picker + downward-only filter | MEDIUM |
| 11 | Store Detail | MODIFY: `StoreDetail.jsx` | Timestamp formatting in transactions | LOW |
| 12 | Hierarchy visibility | MODIFY: `/app/backend/seed_data.py` → `get_visible_restaurants()` | Enforce downward-only | LOW |
| 13 | Common badges | MODIFY: `Badges.jsx` (optional) | No change expected | NONE |
| 14 | Date picker component | NEW: `src/components/common/DateRangePicker.jsx` | Create wrapper for existing calendar | LOW |

---

## 7. Implementation Plan by Item

### ITEM 1: Ready to Dispatch Tab

**Requirement:** Approved transfers must appear in a separate "Ready to Dispatch" tab so dispatch-capable users can find them.

**Current state:** `PendingQueues.jsx` has 3 tabs: Approvals, Receives, My Requests. Approved transfers (#104) disappear from all tabs. `seed_data.py` `get_pending_queues()` does not filter for `status == "approved"`.

**Proposed change:**
- Backend (`seed_data.py`): Add `ready_to_dispatch` array to `get_pending_queues()` — filter transfers where `status == "approved"` AND `from_restaurant_id == actor_restaurant_id` (actor is the one who would dispatch).
- Backend (`server.py`): Include `ready_to_dispatch` in the `proxy_pending_queues` response slim mapping.
- Frontend (`PendingQueues.jsx`): Add 4th tab "Ready to Dispatch" with Truck icon + badge count. Only visible to roles that `canDo("dispatch")`. Tab shows same table layout with items_count column.
- Frontend (`OperationsHub.jsx`): Add "Ready to Dispatch" count card between Approvals and Receives.

**File targets:** `seed_data.py`, `server.py`, `PendingQueues.jsx`, `OperationsHub.jsx`

**Data dependency:** `available_in_current_seed` — Transfer #104 is `approved` status and should appear.

**Role/status logic:** Only `master` (Central) and `central` (Master) see Ready to Dispatch. Franchise (Outlet) does not see it — they cannot dispatch.

**Acceptance criteria:**
1. Central login sees Ready to Dispatch tab with transfer #104
2. Master login sees Ready to Dispatch tab (may have 0 items depending on data)
3. Outlet login does NOT see Ready to Dispatch tab
4. Tab shows count badge
5. Clicking row navigates to Transfer Detail

**Smoke test:** Login as Central → Pending Queues → "Ready to Dispatch" tab visible with count → Transfer #104 listed → Click navigates to detail.

**Risk:** LOW. Additive tab. No existing behavior broken.

---

### ITEM 2: Status Timeline on Transfer Detail

**Requirement:** Show visual progression of transfer lifecycle: Requested → Approved → Dispatched → Received (or Cancelled/Rejected branch).

**Current state:** `TransferDetail.jsx` shows only current status badge + `created_at` / `updated_at`. The data already contains `requested_at`, `approved_at`, `dispatched_at`, `received_at`, `cancelled_at` timestamps.

**Proposed change:**
- Create NEW `StatusTimeline.jsx` component.
- Build timeline steps from transfer data fields. For each step, show: status label, timestamp (formatted), active/completed/pending state, actor ID if available.
- Handle branching: if `cancelled_at` exists, show cancel branch. If `rejected`, show reject instead of approve.
- Insert between header and From/To cards in `TransferDetail.jsx`.

**File targets:** NEW `StatusTimeline.jsx`, MODIFY `TransferDetail.jsx`

**Data dependency:** `available_in_current_seed` — All `_at` fields and `_by` fields exist in seed data.

**Timeline steps per transfer type:**
- Request-based: Requested → Approved → Dispatched → Received
- Direct dispatch: Dispatched → Received
- Cancelled: ...→ Cancelled (branch)
- Rejected: Requested → Rejected (branch)
- Partial: ...→ Partially Received (with resolution)

**Acceptance criteria:**
1. Transfer #101 (requested): Shows "Requested" as current active step, other steps pending
2. Transfer #104 (approved): Shows Requested ✓ → Approved (current) → Dispatched (pending)
3. Transfer #108 (received): Shows full completed timeline
4. Transfer #110 (partially_received): Shows timeline with partial receive + resolution
5. Transfer #111 (cancelled): Shows timeline with cancel branch
6. Transfer #112 (rejected): Shows Requested → Rejected

**Smoke test:** Navigate to `/transfer/108` → Verify full 4-step timeline all completed with timestamps.

**Risk:** MEDIUM. Timeline logic must handle all 7 statuses correctly. Branching (cancel/reject) is the tricky part.

---

### ITEM 3: Line-Level Accept/Reject Display

**Requirement:** For partially received transfers, show accepted_qty, rejected_qty, and resolution_type per line item.

**Current state:** `TransferDetail.jsx` line items table shows: Item, Qty, Unit, Source. No accepted/rejected columns. Transfer #110 seed data has `accepted_qty: 7, rejected_qty: 3, resolution_type: "damaged"` on line #223 but this is invisible.

**Proposed change:**
- Modify line items table in `TransferDetail.jsx` to add conditional columns when transfer status is `partially_received` or `received`:
  - Accepted column
  - Rejected column
  - Line resolution column
- Hide source_selector JSON column (replace with "Batch selected" text or remove).
- Show these columns only when line-level data exists (not all transfers have it).

**File targets:** MODIFY `TransferDetail.jsx`

**Data dependency:** `available_in_current_seed` — Line fields `accepted_qty`, `rejected_qty`, `resolution_type` exist on transfer #110 lines.

**Acceptance criteria:**
1. Transfer #110: Line shows Paneer | 10 kg | Accepted: 7 | Rejected: 3 | Resolution: damaged
2. Transfer #108 (received, no partial): Accepted/Rejected columns not shown (or show full qty accepted)
3. Transfer #101 (requested): No accept/reject columns

**Smoke test:** Navigate to `/transfer/110` → Line items table shows accepted/rejected columns → Values match seed data.

**Risk:** LOW. Conditional column display.

---

### ITEM 4: Timestamp Formatting

**Requirement:** All timestamps across the app should display in human-readable format: `19 May 2026, 11:30 AM`.

**Current state:** Raw ISO strings everywhere: `2026-05-19T02:36:28.199592+00:00`.

**Proposed change:**
- Create NEW `src/lib/formatters.js` with `formatTimestamp(isoString)` → `"19 May 2026, 2:36 AM"` and `formatRelativeTime(isoString)` → `"3 hours ago"`.
- Use `date-fns` (already installed in package.json: `"date-fns": "^4.1.0"`).
- Apply across: `PendingQueues.jsx` (created_at column), `TransferDetail.jsx` (metadata + timeline), `StoreDetail.jsx` (transaction date column).

**File targets:** NEW `formatters.js`, MODIFY `PendingQueues.jsx`, `TransferDetail.jsx`, `StoreDetail.jsx`, `StatusTimeline.jsx`

**Data dependency:** `available_in_current_seed` — All timestamps are ISO strings.

**Acceptance criteria:**
1. No raw ISO string visible anywhere in the app
2. Transfer Detail metadata shows formatted created/updated dates
3. Pending Queues "Created" column shows formatted dates
4. Status timeline shows formatted timestamps per step

**Smoke test:** Login as Central → Pending Queues → Verify "Created" column is formatted → Click row → Transfer Detail timestamps formatted.

**Risk:** LOW. Pure display utility. `date-fns` already available.

---

### ITEM 5: Resolution Reason Display

**Requirement:** Show resolution_type + resolution_meta.reason for cancelled, rejected, and partially_received transfers.

**Current state:** `TransferDetail.jsx` shows `data.resolution_type` in metadata grid but does NOT render `resolution_meta.reason` or `resolution_meta.receive_totals`.

**Proposed change:**
- In `TransferDetail.jsx`, add a "Resolution Details" card that appears when `resolution_type` or `resolution_meta` exists.
- Display: resolution type label, reason text, receive totals (accepted/rejected/damaged/returned) if present.
- Also show on timeline's terminal step (e.g., the "Cancelled" step shows reason).

**File targets:** MODIFY `TransferDetail.jsx`, `StatusTimeline.jsx` (reason on terminal step)

**Data dependency:** `available_in_current_seed` — Transfer #110 has `resolution_meta: { reason: "3kg of Paneer spoiled in transit", receive_totals: {...} }`. Transfer #111 has `resolution_type: "return_to_source"`.

**Acceptance criteria:**
1. Transfer #110: Shows "Partial Return — 3kg of Paneer spoiled in transit" + accepted: 7, rejected: 3, damaged: 3
2. Transfer #111: Shows "Return to Source" as resolution type
3. Transfer #108 (received, no resolution): No resolution card shown

**Smoke test:** Navigate to `/transfer/110` → Resolution card visible with reason + totals.

**Risk:** LOW. Conditional display based on data presence.

---

### ITEM 6: Date Range Picker

**Requirement:** Add date range filtering to Hierarchy Summary.

**Current state:** `HierarchySummary.jsx` has no date picker. `api.getHierarchySummary()` already accepts `fromDate`/`toDate` params. Backend seed `get_hierarchy_summary()` doesn't currently filter by date.

**Proposed change:**
- Create NEW `DateRangePicker.jsx` using existing `react-day-picker` (v8.10.1 already installed) and `date-fns`.
- Add to `HierarchySummary.jsx` between tabs and store list.
- Default range: today. Presets: Today, Yesterday, This Week, This Month, Custom.
- Pass dates to `getHierarchySummary({ storeType, fromDate, toDate })`.
- Backend seed: Update `get_hierarchy_summary()` to accept and filter by date range (compare `created_at` of transfers against range).

**File targets:** NEW `DateRangePicker.jsx`, MODIFY `HierarchySummary.jsx`, MODIFY `seed_data.py`

**Data dependency:** `available_in_current_seed` — Transfer timestamps exist but seed `get_hierarchy_summary` ignores dates currently.

**Acceptance criteria:**
1. Date picker visible on Hierarchy Summary
2. Default shows today's data
3. Selecting "This Week" shows wider data range
4. Counts update when date changes
5. "Custom" allows manual date range selection

**Smoke test:** Login as Central → Hierarchy Summary → Change date to "This Week" → Verify counts change.

**Risk:** MEDIUM. Requires backend seed_data.py date filtering update. Calendar component integration.

---

### ITEM 7: Contextual Action Buttons by Role + Status

**Requirement:** Show only valid actions per transfer status + current user role. No irrelevant buttons.

**Current state:** `TransferDetail.jsx` line 201 renders ALL 6 buttons (`["Approve", "Dispatch", "Receive", "Cancel", "Reject", "Edit"]`) regardless of status or role.

**Proposed change:**
- Create NEW `src/lib/transferActions.js` with function `getAvailableActions(transferStatus, transferType, userRole, actorRestaurantId, fromRestaurantId, toRestaurantId)` → returns array of action objects.
- Replace hardcoded array in `TransferDetail.jsx` with dynamic action list.
- All actions remain disabled (write API blocked) but only contextually valid ones appear.
- Add "Write API blocked" tooltip on each disabled button.

**File targets:** NEW `transferActions.js`, MODIFY `TransferDetail.jsx`

**Role/status logic:** See Section 8 matrix below.

**Acceptance criteria:**
1. Transfer #101 (requested, Central login): Shows Approve + Reject only
2. Transfer #104 (approved, Central login): Shows Dispatch + Cancel only
3. Transfer #105 (dispatched, Central login as source): Shows Cancel only
4. Transfer #105 (dispatched, DemoCentral2 login as destination): Shows Receive only
5. Transfer #108 (received): No action buttons
6. Outlet login on any transfer: Only Receive shown if they are the destination

**Smoke test:** Navigate to `/transfer/101` as Central → Only Approve + Reject buttons visible → Navigate to `/transfer/108` → No action buttons.

**Risk:** HIGH. This is the most logic-intensive item. Must match freeze document action permissions exactly. Requires comparing actor restaurant ID against from/to.

---

### ITEM 8: Items Count Column

**Requirement:** Add items count to Pending Queues table rows.

**Current state:** Queue rows show: Transfer ID, From, To, Status, Created, Actions. No items count. The seed data `slim()` function in `server.py` already includes `items_count`.

**Proposed change:**
- Add "Items" column header + cell to queue tables in `PendingQueues.jsx`.
- Display `item.items_count` or `item.lines?.length` with format: "3 items" / "1 item".
- Add to all 4 tabs (Approvals, Receives, My Requests, Ready to Dispatch).

**File targets:** MODIFY `PendingQueues.jsx`

**Data dependency:** `available_in_current_seed` — `items_count` field exists in slim() response from `server.py`.

**Acceptance criteria:**
1. Each queue row shows items count
2. Format: "3 items" / "1 item" (plural-aware)
3. Fallback: "-" if count missing

**Smoke test:** Login as Central → Pending Queues → Approvals tab → Each row shows items count.

**Risk:** LOW. Additive column.

---

### ITEM 9: Store Name Fix

**Requirement:** Context selector and header show the actual restaurant name.

**Current state:** PARTIALLY FIXED in clarification round. `useLoginContext.js` line 109 now extracts `restaurant_name` from login response. `ContextSelector.jsx` line 53 uses `user?.restaurant_name`. Working after fresh login + localStorage clear.

**Proposed change:**
- Verify the fix works for all 3 login levels (Central="My Genie", Master="DemoCentral1", Outlet="DemoFranchise1").
- Ensure header (`AppHeader.jsx` line 15) also uses `restaurant_name` correctly.
- No additional code change expected — just validation.

**File targets:** Validation only on `useLoginContext.js`, `ContextSelector.jsx`, `AppHeader.jsx`

**Acceptance criteria:**
1. Central login shows "My Genie" in context + header
2. Master login shows "DemoCentral1" in context + header
3. Outlet login shows "DemoFranchise1" in context + header
4. No "My Store" fallback visible for any seeded account

**Smoke test:** Login as each role → Verify name in header and context selector.

**Risk:** LOW. Already fixed. Validation only.

---

### ITEM 10: Downward-Only Scoped Hierarchy Visibility

**Requirement:** Each role sees only stores below them, never above.

**Current state:** Backend `seed_data.py` `get_visible_restaurants()`: master sees all non-self, central sees children + siblings. `HierarchySummary.jsx` shows tabs "Master Stores" / "Outlets". Central currently sees both tabs with all 6 stores. Master also sees both tabs with siblings.

**Proposed change:**
- Backend (`seed_data.py`): Modify `get_visible_restaurants()`:
  - `master` → sees all `central` + all `franchise` (children — downward). CORRECT already.
  - `central` → sees only own `franchise` children (NOT sibling centrals). CHANGE: Remove sibling visibility.
  - `franchise` → sees nothing (self only, handled by empty return). CORRECT already.
- Frontend (`HierarchySummary.jsx`): Master login should only see "Outlets" tab (hide "Master Stores" tab since Master cannot see upward or lateral). Central sees both tabs.
  - Conditional tab rendering: if `isMiddleLevel`, show only "Outlets" tab. If `isTopLevel`, show both. If `isBottomLevel`, show only own row.

**File targets:** MODIFY `seed_data.py` → `get_visible_restaurants()`, MODIFY `HierarchySummary.jsx`

**Acceptance criteria:**
1. Central login: Both tabs visible. Master Stores tab shows DemoCentral1 + DemoCentral2. Outlets tab shows all 4 outlets.
2. Master login (DemoCentral1): Only "Outlets" tab visible. Shows DemoFranchise1 + DemoFranchise2 only. Does NOT see DemoCentral2 or My Genie.
3. Outlet login (DemoFranchise1): Hierarchy shows only self.

**Smoke test:** Login as Master → Hierarchy → Only "Outlets" tab → Only own child outlets listed → No "Master Stores" tab → No upward stores.

**Risk:** MEDIUM. Must carefully update backend filtering AND frontend tab logic. Risk of breaking Central's full view.

---

### ITEM 11: Context Selector Updates Hub Data In-Place

**Requirement:** Selecting a store in the context selector changes the Operations Hub data scope without navigating to another page.

**Current state:** `ContextSelector.jsx` calls `onStoreChange(storeId)` which sets `activeStoreId` in `OperationsHub.jsx`. But the hub's `fetchQueues()` doesn't use `activeStoreId` — it always fetches for the logged-in user's own restaurant. The store picker label says "Navigate to store" (page navigation intent).

**Proposed change:**
- `OperationsHub.jsx`: Pass `activeStoreId` to `fetchQueues()`. Backend's `get_pending_queues()` already receives an actor restaurant ID — when `activeStoreId` is set, use that as the scoping ID.
- Backend (`server.py`): Accept optional `store_restaurant_id` in pending-queues request body, pass to `get_pending_queues()`.
- `ContextSelector.jsx`: Change button label from "Navigate to store" to "View as" or similar. Show active context name when different from own store.
- Only Central/Master can switch. Outlet remains locked.
- When context is switched, show a clear indicator of which store's data is being viewed, with a "Reset to own" option.

**File targets:** MODIFY `ContextSelector.jsx`, MODIFY `OperationsHub.jsx`, MODIFY `server.py` (pending-queues endpoint), MODIFY `seed_data.py` (accept actor override)

**Acceptance criteria:**
1. Central login: Select "DemoCentral1" in context → Hub shows DemoCentral1's pending counts → "Viewing as DemoCentral1" indicator visible
2. Central login: Click "Reset" → Hub shows own (My Genie) counts again
3. Master login: Select child outlet → Hub shows outlet's pending counts
4. Outlet login: Context locked, no switching possible
5. No page navigation occurs during context switch

**Smoke test:** Login as Central → Click context dropdown → Select DemoCentral1 → Hub pending counts change → "Viewing as" label appears → Click Reset → Counts return to own.

**Risk:** HIGH. This changes the data flow of the hub. Must ensure all hub cards (Approvals, Receives, My Requests, Ready to Dispatch) respect the active context. Must not break pending queues for the default (own) context.

---

### ITEM 12: Remove KPI Placeholder

**Requirement:** Remove the dashed KPI placeholder from Operations Hub. No empty space left.

**Current state:** `OperationsHub.jsx` lines 164-173 render a `<Card>` with `border-dashed` class, AlertTriangle icon, and text "KPI pending backend/owner definition".

**Proposed change:**
- Delete lines 164-173 (KPI placeholder card) from `OperationsHub.jsx`.
- Verify layout remains balanced. Quick action cards + pending count cards should fill the space.
- No replacement needed. Hub will show: Context Selector → Pending Cards → Quick Actions → Disabled Write Buttons.

**File targets:** MODIFY `OperationsHub.jsx`

**Acceptance criteria:**
1. No KPI placeholder visible on Operations Hub for any role
2. No large empty gap in layout
3. Hub remains visually balanced

**Smoke test:** Login as Central → Operations Hub → No "KPI Dashboard" placeholder visible.

**Risk:** LOW. Simple deletion.

---

## 8. Role + Status Action Matrix

Actions shown on Transfer Detail page. All remain **disabled** (write API blocked) but only contextually valid ones are displayed.

### Legend
- **V** = Visible (disabled, with "Write API blocked" label)
- **—** = Hidden (not shown)
- Actor context matters: some actions depend on whether the logged-in user is the source or destination of the transfer.

### Central Store (backend `master`)

| Status | View Detail | Approve | Reject | Dispatch | Receive | Cancel | Edit |
|--------|-------------|---------|--------|----------|---------|--------|------|
| requested (as source) | V | V | V | — | — | — | — |
| approved (as source) | V | — | — | V | — | V | — |
| dispatched (as source) | V | — | — | — | — | V | — |
| dispatched (as destination) | V | — | — | — | V | — | — |
| received | V | — | — | — | — | — | — |
| partially_received | V | — | — | — | — | — | — |
| cancelled | V | — | — | — | — | — | — |
| rejected | V | — | — | — | — | — | — |

### Master Store (backend `central`)

| Status | View Detail | Approve | Reject | Dispatch | Receive | Cancel | Edit |
|--------|-------------|---------|--------|----------|---------|--------|------|
| requested (as source/parent) | V | V | V | — | — | — | — |
| requested (as requester) | V | — | — | — | — | — | V |
| approved (as source) | V | — | — | V | — | V | — |
| dispatched (as source) | V | — | — | — | — | V | — |
| dispatched (as destination) | V | — | — | — | V | — | — |
| received | V | — | — | — | — | — | — |
| partially_received | V | — | — | — | — | — | — |
| cancelled | V | — | — | — | — | — | — |
| rejected | V | — | — | — | — | — | — |

### Outlet (backend `franchise`)

| Status | View Detail | Approve | Reject | Dispatch | Receive | Cancel | Edit |
|--------|-------------|---------|--------|----------|---------|--------|------|
| requested (as requester) | V | — | — | — | — | — | V |
| approved | V | — | — | — | — | — | — |
| dispatched (as destination) | V | — | — | — | V | — | — |
| received | V | — | — | — | — | — | — |
| partially_received | V | — | — | — | — | — | — |
| cancelled | V | — | — | — | — | — | — |
| rejected | V | — | — | — | — | — | — |

---

## 9. Hierarchy Visibility Matrix

| Login Role | Backend Type | Can See Own Node | Can See Parent | Can See Children | Can See Siblings | Can Switch Context | Notes |
|------------|-------------|------------------|----------------|------------------|------------------|--------------------|-------|
| Central Store | `master` | YES | N/A (is top) | YES (all Master Stores + all Outlets) | N/A | YES (to any child) | Full downward visibility |
| Master Store | `central` | YES | **NO** | YES (own Outlets only) | **NO** | YES (to own Outlets) | Downward only. No sibling Master Stores. No Central above. |
| Outlet | `franchise` | YES | **NO** | N/A (is bottom) | **NO** | **NO** (locked) | Self only. No upward or lateral visibility. |

---

## 10. API / Data Dependency Notes

| # | Dependency | Status | Notes |
|---|-----------|--------|-------|
| 1 | Transfer `_at` timestamps | `available_in_current_seed` | All `requested_at`, `approved_at`, `dispatched_at`, `received_at`, `cancelled_at` exist |
| 2 | Transfer `resolution_meta` | `available_in_current_seed` | Transfer #110 has reason + receive_totals |
| 3 | Line-level `accepted_qty` / `rejected_qty` | `available_in_current_seed` | Transfer #110 line has these fields |
| 4 | `items_count` in pending queue response | `available_in_current_seed` | `slim()` in server.py already returns it |
| 5 | `from_date` / `to_date` in hierarchy-summary | `available_in_current_frontend_data` | `api.getHierarchySummary()` already accepts dates. Backend seed needs date filtering. |
| 6 | `ready_to_dispatch` queue | `backend_api_needed_later` for real data | Seed will add it. Real API will need endpoint or filter. |
| 7 | Hierarchy downward-only filtering | `available_in_current_seed` | Needs modification to `get_visible_restaurants()` |
| 8 | Context-scoped pending queues | `available_in_current_seed` | Needs modification to `get_pending_queues()` to accept override actor |
| 9 | `date-fns` library | `available_in_current_frontend_data` | Already in `package.json` v4.1.0 |
| 10 | `react-day-picker` | `available_in_current_frontend_data` | Already in `package.json` v8.10.1 |

---

## 11. Backend Terminology Mapping Notes

| Risk Area | Backend Value | UI Must Show | Where in Slice 2 |
|-----------|-------------|-------------|-------------------|
| Store type in timeline ("dispatched by master restaurant") | `master` | "Central Store" | StatusTimeline.jsx — must use `mapRestaurantType()` |
| Store type in Ready to Dispatch rows | `central`, `franchise` | "Master Store", "Outlet" | PendingQueues.jsx — already uses `mapRestaurantType()` |
| Hierarchy tab labels | `store_type: "central"` | "Master Stores" tab | HierarchySummary.jsx — already uses `STORE_TYPE_FILTERS` |
| Context selector store badges | `restaurant_type` from API | Business labels | ContextSelector.jsx — already uses `<StoreTypeBadge>` |

**No new terminology risks in Slice 2.** All mapping infrastructure from Slice 1 is reusable.

---

## 12. Acceptance Criteria

1. Ready to Dispatch tab exists in Pending Queues with correct count for dispatch-capable roles. Outlet does not see it.
2. Transfer Detail shows a visual status timeline with timestamps for every status change in the transfer lifecycle.
3. Partially received transfers show line-level accepted/rejected/damaged quantities.
4. All timestamps in the app display in `"DD MMM YYYY, h:mm A"` format. No raw ISO strings visible.
5. Resolution reasons display for cancelled, rejected, and partial-receive transfers.
6. Hierarchy Summary has a date range picker. Changing dates updates store counts.
7. Transfer Detail shows only contextually valid action buttons per role + status. No irrelevant buttons. All remain disabled (write blocked).
8. Pending Queue rows show items count column (e.g., "3 items").
9. Context selector and header show actual restaurant name for all 3 login levels.
10. Hierarchy shows only downward stores. Master does not see Central or sibling Masters. Outlet sees only itself.
11. Context selector changes Operations Hub data scope in-place. No page navigation.
12. KPI placeholder completely removed from Operations Hub. No empty gap.

---

## 13. Smoke Checklist

### Central Store Login (`abhishek@kalabahia.com`)

- [ ] Header shows "My Genie" + "Central Store" badge
- [ ] Operations Hub: No KPI placeholder
- [ ] Operations Hub: "Ready to Dispatch" count card visible (1 — transfer #104)
- [ ] Context selector: Click "DemoCentral1" → Hub data updates in-place → "Viewing as DemoCentral1" label shown
- [ ] Context selector: Reset → Hub returns to own data
- [ ] Hierarchy Summary: Both tabs (Master Stores / Outlets) visible
- [ ] Hierarchy Summary: Date picker visible, defaults to today
- [ ] Pending Queues: 4 tabs visible (Approvals, Ready to Dispatch, Receives, My Requests)
- [ ] Pending Queues: Items count column visible in all tabs
- [ ] Pending Queues: Timestamps formatted
- [ ] Pending Queues: Ready to Dispatch tab shows transfer #104
- [ ] Transfer Detail `/transfer/101`: Only Approve + Reject buttons visible (disabled)
- [ ] Transfer Detail `/transfer/104`: Only Dispatch + Cancel buttons visible (disabled)
- [ ] Transfer Detail `/transfer/108`: No action buttons. Full completed timeline.
- [ ] Transfer Detail `/transfer/110`: Timeline shows partial receive. Resolution reason "3kg of Paneer spoiled" visible. Line shows Accepted: 7, Rejected: 3.
- [ ] Transfer Detail `/transfer/111`: Timeline shows cancelled. Resolution "return_to_source" visible.

### Master Store Login (`owner@democentral1.com`)

- [ ] Header shows "DemoCentral1" + "Master Store" badge
- [ ] Operations Hub: No KPI placeholder
- [ ] Context selector: Can select child outlets → Hub data changes in-place
- [ ] Hierarchy Summary: Only "Outlets" tab visible (no "Master Stores" tab)
- [ ] Hierarchy Summary: Shows DemoFranchise1 + DemoFranchise2 only
- [ ] Pending Queues: 4 tabs (Approvals, Ready to Dispatch, Receives, My Requests)
- [ ] Pending Queues: Items count + formatted timestamps on all rows
- [ ] Transfer Detail `/transfer/102`: Approve + Reject visible (as parent of request)

### Outlet Login (`owner@demofranchise1.com`)

- [ ] Header shows "DemoFranchise1" + "Outlet" badge
- [ ] Operations Hub: No KPI placeholder, no Ready to Dispatch card
- [ ] Context selector: "Context locked", no switching
- [ ] Hierarchy Summary: Shows only own store row
- [ ] Pending Queues: 2 tabs only (Receives, My Requests) — no Approvals, no Ready to Dispatch
- [ ] Pending Queues: Items count + formatted timestamps
- [ ] Transfer Detail: Only Receive visible if Outlet is destination of dispatched transfer

### Cross-Role Checks
- [ ] No raw ISO timestamps visible anywhere
- [ ] No raw backend terms ("master", "central", "franchise") in UI
- [ ] No KPI placeholder on any login
- [ ] All disabled action buttons show "Write API blocked" label

---

## 14. Implementation Risks

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | **Contextual action matrix wrong for edge cases** | HIGH | Build `transferActions.js` as separate testable module. Validate against Section 8 matrix. Test every seeded transfer ID. |
| 2 | **Context selector in-place update breaks hub** | HIGH | Keep default (own restaurant) behavior when no override selected. Add explicit Reset button. Test default first, then override. |
| 3 | **Hierarchy downward-only filter breaks Central's full view** | MEDIUM | Ensure `master` type still returns ALL children. Only restrict `central` type. |
| 4 | **Timestamp formatting inconsistency** | LOW | Create single `formatTimestamp()` utility. Use everywhere. No inline formatting. |
| 5 | **KPI placeholder removal creates layout gap** | LOW | Verify quick actions + pending cards fill space naturally. May need minor spacing adjustment. |
| 6 | **Date filtering with seed data vs real API** | MEDIUM | Seed data uses `datetime.now()` at server start. Dates may shift between restarts. Accept as known limitation. |
| 7 | **Backend terminology in timeline actor labels** | LOW | Pass all restaurant types through `mapRestaurantType()`. |
| 8 | **Ready to Dispatch tab count mismatch** | LOW | Ensure `get_pending_queues()` approved-status filter matches what the tab displays. |

---

## 15. Owner Approval Gate

Before implementation starts, owner must approve:

- [ ] **Final Slice 2 scope** — 12 items listed in Section 3
- [ ] **File target map** — Section 6
- [ ] **Role + Status action matrix** — Section 8
- [ ] **Hierarchy visibility matrix** — Section 9
- [ ] **Smoke checklist** — Section 13

Once approved, hand to: `Central Inventory Slice 2 Implementation Agent`

---

## 16. Recommended Next Agent

**`Central Inventory Slice 2 Implementation Agent`**

Trigger only after owner approves this planning document.

Implementation agent should:
1. Follow this plan item-by-item
2. Create new files first (formatters.js, transferActions.js, StatusTimeline.jsx, DateRangePicker.jsx)
3. Then modify existing files in order: seed_data.py → server.py → OperationsHub → ContextSelector → PendingQueues → TransferDetail → HierarchySummary → StoreDetail
4. Test each item against its acceptance criteria
5. Run full smoke checklist across all 3 logins
6. Produce Slice 2 handover document

---

*End of Slice 2 Implementation Plan*
