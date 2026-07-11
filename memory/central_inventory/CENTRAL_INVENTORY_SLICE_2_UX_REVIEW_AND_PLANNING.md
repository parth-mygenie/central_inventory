# Central Inventory Slice 2 UX Review and Planning

> **Date:** 19 May 2026
> **Agent:** Senior UX Review and Slice 2 Planning Agent
> **Inputs:** Slice 1 code, seed data, QA validation report, freeze documents, all 3 login-level screenshots

---

## 1. Review Status

### **`ready_for_slice_2_planning`**

The seeded UX is good enough for owner review and Slice 2 scoping. Role-based separation works across all 3 levels. Terminology mapping is correct. No blocking UX defects found. 5 owner questions should be answered before Slice 2 implementation begins.

---

## 2. Current Seed Data Summary

| Category | Count | Details |
|----------|-------|---------|
| Stores | 7 | 1 Central Store + 2 Master Stores + 4 Outlets |
| Stock items | 16 per store | Butter, Chicken, Paneer, Rice, Oil, Onions, Tomatoes, Water Bottles, Salt, Sugar, Flour, Milk, Cream, Cashew Nuts, Ginger Garlic Paste, Sea Shore |
| Transfers | 12 | 3 requested, 1 approved, 3 dispatched, 2 received, 1 partially_received, 1 cancelled, 1 rejected |
| Login accounts | 7 | All use password `Qplazm@10`; `restaurant_type_flag` enriched via backend proxy |
| Stock levels | Tiered | Central: 50-500, Master: 10-200, Outlet: 0.5-80 with low-stock flags |

**Data coverage is comprehensive.** Every transfer status in the lifecycle is represented. All 3 hierarchy levels have stock, transactions, and role-specific queue data.

---

## 3. Role-Based UX Review

### 3.1 Central Store (abhishek@kalabahia.com)

| Area | Finding |
|------|---------|
| **What user sees** | Header: "Central Store" badge. Context: "My Store" with "Navigate to store" picker. Hub: 3 Pending Approvals, 0 Receives. Hierarchy: 2 Master Stores + 4 Outlets with sent/received/txn counts. Store Detail: 16 stock items + transactions. Queues: 3 approval items. |
| **What user can do** | View all stores, navigate hierarchy, view stock, view queues, drill into transfer detail. |
| **What is hidden** | "My Requests" card (Central doesn't request — correct per freeze). "Request Stock" button hidden. |
| **What is correct** | Role separation matches freeze. Terminology correct. Pending counts accurate. Hierarchy filter inversion works. "Dispatch Stock" button shown but disabled. |
| **Needs owner review** | (a) Context selector says "My Store" — should it say "My Genie" (the actual restaurant name)? Currently the store name shows correctly when login response has `restaurant_name`. (b) KPI placeholder is clearly marked pending. (c) "Navigate to store" picker navigates but doesn't change the hub context — it only takes you to Store Detail. Is that the intended behavior? |

### 3.2 Master Store (owner@democentral1.com)

| Area | Finding |
|------|---------|
| **What user sees** | Header: "Master Store" badge. Context: "My Store" with "Navigate to store" picker showing child outlets and sibling Master. Hub: 1 Pending Approval, 0 Receives, 1 My Request. Both "Dispatch Stock" and "Request Stock" buttons (disabled). |
| **What user can do** | Same read actions as Central but scoped to own children + siblings. Can see both tabs in hierarchy (Master Stores shows sibling DemoCentral2, Outlets shows own DemoFranchise1+2). |
| **What is hidden** | Nothing incorrectly hidden. All 4 nav items visible. |
| **What is correct** | Sees approval from its child (DemoCentral1→DemoFranchise1 transfer #102). Sees its own request (#104 to Central). Both dispatch and request buttons shown (Master can do both). |
| **Needs owner review** | (a) Master sees sibling Master Stores in the hierarchy — is this correct for the UX or should only own children be shown? (Per freeze: "central sees self + own franchises + sibling centrals + sibling franchises" — so this is correct per backend rules, but owner should confirm the UX intent.) |

### 3.3 Outlet (owner@demofranchise1.com)

| Area | Finding |
|------|---------|
| **What user sees** | Header: "Outlet" badge. Context: "My Store" with "Context locked" indicator. Hub: 0 Receives, 2 My Requests. Only "Request Stock" button (disabled). Quick actions still show "View Hierarchy" and "Pending Queues". |
| **What user can do** | View own stock, view own request history, view queue (Receives + My Requests tabs only). |
| **What is hidden** | Approval tab hidden (correct). "Dispatch Stock" button hidden (correct). "Navigate to store" picker replaced with "Context locked". |
| **What is correct** | Approval tab correctly hidden. Outlet cannot see other stores. "Request Stock" is the only action button. My Requests count (2) is accurate. |
| **Needs owner review** | (a) "View Hierarchy" link is shown for Outlet, but the hierarchy shows limited/self-only data — is this link useful for Outlet users or should it be hidden? (b) Outlet sees 0 Pending Receives currently — the seed data has transfers dispatched TO other franchises but not to DemoFranchise1. This is data-correct but might confuse the owner during review. |

---

## 4. Screen-by-Screen UX Review

### SCR-00 Context Selector

| Field | Assessment |
|-------|-----------|
| **Current state** | Renders inside Operations Hub. Shows store name + type badge + "Logged in as [Level]". Parent roles get "Navigate to store" dropdown. Outlet gets "Context locked". |
| **Data visibility** | Store name from login response or seed enrichment. Type badge from terminology adapter. Child store list from hierarchy-detail API. |
| **Role behavior** | Central/Master: store picker active. Outlet: locked. All correct. |
| **UX gaps** | (1) Store name defaults to "My Store" instead of the actual restaurant name from login enrichment — the `restaurant_name` field IS in the enriched login response but the context selector falls through to "My Store" because `user.restaurant_name` is missing from the original login data shape. (2) "Navigate to store" picker acts as a page navigation, not a context switch for the hub — user clicks a store and goes to `/store/:id` rather than changing the hub's data scope. This distinction should be clearer. (3) No breadcrumb showing current hierarchy path. |
| **Slice 2 recommendation** | Fix store name display. Add "View as [store]" label clarifying it navigates. Consider breadcrumb for hierarchy context. |

### SCR-01 Operations Hub

| Field | Assessment |
|-------|-----------|
| **Current state** | Pending count cards (Approvals, Receives, My Requests), quick action links, KPI placeholder, disabled write buttons. |
| **Data visibility** | Counts sourced from seed data pending-queues endpoint. All counts accurate per role. |
| **Role behavior** | Central: Approvals + Receives (no My Requests). Master: All 3 cards. Outlet: Receives + My Requests (no Approvals). Correct per freeze. |
| **UX gaps** | (1) No date context — counts have no time reference ("today" vs "all-time"). (2) KPI placeholder is large and empty-feeling — dominates the page below the useful cards. (3) Quick actions section could include "View Stock" link to own store detail. (4) No recent activity feed — the transfer history API is available but not used on the hub. |
| **Slice 2 recommendation** | Add recent transfers list (last 5-10). Reduce KPI placeholder prominence. Add "View My Stock" quick action. |

### SCR-02 Hierarchy Summary

| Field | Assessment |
|-------|-----------|
| **Current state** | Two tabs (Master Stores / Outlets), store list with sent/received/txn counts, search filter, click-through to detail. |
| **Data visibility** | Seed data provides non-zero counts. DemoCentral1: sent 57, received 175, 6 txns. DemoCentral2: sent 78, received 10, 5 txns. Outlets show transfer activity. |
| **Role behavior** | Central: both tabs with all stores. Master: both tabs with own children + siblings. Outlet: limited view. All correct. |
| **UX gaps** | (1) No date range filter — sent/received/txn counts are aggregated without time context. The API supports `from_date`/`to_date` but the UI doesn't offer date selection. (2) No sorting — user cannot sort by sent/received/name. (3) No low-stock indicator per store at summary level. (4) Column "Transactions" is vague — could specify "Transfer count". |
| **Slice 2 recommendation** | Must: Add date range picker. Should: Add column sorting. Should: Add low-stock count per store. |

### SCR-03 Store Detail

| Field | Assessment |
|-------|-----------|
| **Current state** | Store header with name + badge, child stores chips, stock summary table (16 items), batch drilldown on click, recent transactions table. |
| **Data visibility** | Rich stock data with quantities and low-stock flags. Batch data appears on stock item click. Transactions show transfer ID, from/to with terminology, item, qty, status. |
| **Role behavior** | Dispatch/Request buttons correctly gated by role. All disabled for Phase 1. |
| **UX gaps** | (1) Batch drilldown re-fetches the entire hierarchy-detail — could be optimized. (2) No date filter for transactions. (3) "Recent Transactions" title is misleading — it shows all transactions, not just recent ones. (4) Transaction timestamps show raw ISO format (`2026-05-19T02:36:28.199592+00:00`) — not human-readable. (5) Low stock items are highlighted with an amber row tint, but no count/summary of low-stock items at the top. (6) "Qty" and "Display" columns show the same value — redundant for seed data; may differ with real data but currently confusing. |
| **Slice 2 recommendation** | Must: Format timestamps to human-readable. Must: Add date filter. Should: Low-stock summary count at top. Should: Remove or clarify Qty vs Display distinction. |

### SCR-05 Pending Queues

| Field | Assessment |
|-------|-----------|
| **Current state** | 3 tabs with badge counts, blocked action banner, table per tab. Clicking a row navigates to transfer detail. |
| **Data visibility** | Central sees 3 approval items. Master sees 1 approval + 1 request. Outlet sees 2 requests. Counts match seed data. |
| **Role behavior** | Approval tab hidden for Outlet. Correct. Default tab selection adapts to role. |
| **UX gaps** | (1) Created timestamps are raw ISO format — need formatting. (2) No item summary in the queue rows — user must click through to see what items are in the transfer. An "Items" column with a count or summary would help quick scanning. (3) "Action blocked" button per row is correct but takes up space — could be a row-level tooltip instead. (4) No transfer type indicator (request vs dispatch) in the queue list. (5) Queue rows navigate to transfer detail — this is the drill-down enhancement already identified. It works now but the detail page doesn't show back-context about which queue tab the user came from. |
| **Slice 2 recommendation** | Must: Format timestamps. Must: Add items count/summary column. Should: Add transfer type badge. Should: Improve back-navigation from detail. |

### SCR-09 Transfer Detail

| Field | Assessment |
|-------|-----------|
| **Current state** | Back button, transfer header with ID + status badge + type tag, From/To cards with store badges, metadata grid (ID, status, created, updated, resolution), line items table, disabled action buttons. |
| **Data visibility** | All seed transfer fields render. From/To badges use terminology adapter correctly. Status badges color-coded. Resolution type shown for cancelled/partial. Line items show stock_title, quantity, unit, source_selector (truncated JSON). |
| **Role behavior** | All 6 action buttons disabled with lock icons. "Write API pending" message shown. |
| **UX gaps** | (1) No status timeline — user cannot see the progression (requested → approved → dispatched → received). Only current status shown. (2) Source selector shows raw JSON (`{"mode":"segment_id","segment_id":2001}...`) — not user-friendly. Should either be hidden or translated to batch/segment name. (3) No line-item acceptance/rejection detail for partially_received transfers — Transfer #110 has `accepted_qty: 7, rejected_qty: 3, resolution_type: "damaged"` on lines but this isn't displayed. (4) Timestamps are raw ISO. (5) `resolution_meta` (with reason text and receive totals) exists on some transfers but isn't displayed. (6) No notes/reason field display. (7) All 6 action buttons shown regardless of status — in a real UX, only relevant actions should appear based on status + role (e.g., don't show "Approve" for a received transfer). |
| **Slice 2 recommendation** | Must: Status timeline visualization. Must: Line-level accept/reject/damaged display. Must: Format timestamps. Must: Show resolution reason. Must: Show only contextually relevant action buttons per status+role. Should: Hide raw source_selector or translate it. |

---

## 5. Transfer Workflow Review

| Status | Seeded Transfer | UX Display | Gap |
|--------|----------------|------------|-----|
| **requested** | #101, #102, #103 | Yellow "Requested" badge. Appears in Approval Pending tab. | No timeline. No "time since requested" urgency indicator. |
| **approved** | #104 | Blue "Approved" badge. | Not visible in any pending queue tab (approved transfers awaiting dispatch aren't in a dedicated queue). UX gap: approved transfers should be in a "Ready to Dispatch" queue or shown differently. |
| **dispatched** | #105, #106, #107 | Indigo "Dispatched" badge. Appears in Receive Pending tab. | No "time in transit" indicator. No estimated delivery. |
| **received** | #108, #109 | Green "Received" badge. | Only visible in transfer history/detail, not in queues. Correct. |
| **partially_received** | #110 | Teal "Partially Received" badge. | Line-level acceptance data not displayed. Resolution reason not shown. This is the most complex status and currently shows the least detail. |
| **cancelled** | #111 | Red "Cancelled" badge. | Resolution type "return_to_source" shown. But no cancellation reason text. |
| **rejected** | #112 | Rose "Rejected" badge. | No rejection reason displayed. |

### Critical workflow gap:
**Approved transfers (#104) have no queue visibility.** Once approved, they disappear from the Approvals queue but don't appear in Receives (because they haven't been dispatched yet). The owner must decide: should there be a "Ready to Dispatch" queue, or should approved transfers remain visible in the Approvals tab with an "Approved — awaiting dispatch" state?

---

## 6. Transfer Detail Drill-Down Recommendation

### **Verdict: Must-have in Slice 2**

| Question | Answer |
|----------|--------|
| **Why needed** | Pending Queue rows currently navigate to `/transfer/:id` which works, but the detail page lacks critical context: no status timeline, no line-level accept/reject visibility, no resolution reasons. Without these, the drill-down is a dead-end for decision-making. |
| **Which queues link** | All 3 tabs (Approvals, Receives, My Requests) already link to detail via `navigate(/transfer/${id})`. This works. |
| **What must be shown** | (1) Status timeline with timestamps at each step. (2) Line items with accepted/rejected/damaged quantities for partial receives. (3) Resolution type + reason text. (4) Transfer notes if present. (5) Contextually relevant action buttons (disabled but correct per status+role). |
| **Allowed actions from detail** | Phase 1: All disabled. Slice 2 should show contextually correct buttons (e.g., "Approve" only for requested transfers viewed by the parent) — still disabled with "write blocked" label, but only the relevant ones. |

---

## 7. Enterprise UX Gaps

| # | Gap | Severity | Current State | Slice 2 Fix |
|---|-----|----------|---------------|-------------|
| 1 | **No audit trail / status timeline** | HIGH | Only current status shown. No progression history. | Must add timeline component showing each status change with timestamp. |
| 2 | **Raw ISO timestamps everywhere** | HIGH | `2026-05-19T02:36:28.199592+00:00` displayed as-is. | Must format to "19 May 2026, 2:36 AM" or "3 hours ago". |
| 3 | **No resolution/reason display** | HIGH | Cancelled and rejected transfers show `resolution_type` but no human-readable reason. `resolution_meta.reason` exists in data but isn't rendered. | Must display resolution reason and receive totals. |
| 4 | **No role clarity on action buttons** | MEDIUM | All 6 action buttons shown on every transfer regardless of status. A received transfer shows "Approve" button. | Should show only contextually valid actions per status + role. |
| 5 | **No disabled/loading states on action cards** | LOW | Pending count cards have no loading indicator during initial fetch. | Should add skeleton loading to count cards. |
| 6 | **No dangerous action confirmation** | N/A | All actions are currently disabled. | Must add confirmation dialogs when actions are enabled in future. Per SEC-002: A — confirmation for ALL destructive actions. |
| 7 | **Terminology consistency** | PASS | All backend terms mapped through adapter. Zero raw leaks. | No action needed. |
| 8 | **No transfer history screen** | MEDIUM | History API exists but no dedicated history view. Only accessible through store detail transactions. | Should add transfer history with filters in Slice 2 or 3. |

---

## 8. Owner Review Checklist

The owner should manually review the following using the seeded data:

### Central Store Login (abhishek@kalabahia.com / Qplazm@10)
- [ ] Header shows "Central Store" badge
- [ ] Operations Hub shows 3 Pending Approvals, 0 Receives
- [ ] "My Requests" card is correctly hidden
- [ ] "Dispatch Stock" button shown but disabled
- [ ] Hierarchy Summary → Master Stores tab shows DemoCentral1 (sent: 57) and DemoCentral2 (sent: 78)
- [ ] Hierarchy Summary → Outlets tab shows 4 outlets with transfer counts
- [ ] Store Detail shows 16 stock items with quantities
- [ ] Clicking a stock item opens batch drilldown
- [ ] Pending Queues → Approvals tab shows 3 requests (#101, #102, #103)
- [ ] Clicking a queue row opens Transfer Detail with full info
- [ ] Transfer Detail shows From/To with correct store type badges

### Master Store Login (owner@democentral1.com / Qplazm@10)
- [ ] Header shows "Master Store" badge
- [ ] Hub shows 1 Approval, 0 Receives, 1 My Request
- [ ] Both "Dispatch Stock" and "Request Stock" buttons shown (disabled)
- [ ] "Navigate to store" picker shows child outlets + sibling Master
- [ ] Hierarchy → Outlets tab shows DemoFranchise1 and DemoFranchise2
- [ ] Queues → Approvals shows transfer #102 (DemoCentral1→DemoFranchise1)
- [ ] Queues → My Requests shows transfer #104 (to Central)

### Outlet Login (owner@demofranchise1.com / Qplazm@10)
- [ ] Header shows "Outlet" badge
- [ ] "Context locked" indicator shown (no store picker)
- [ ] Hub shows 0 Receives, 2 My Requests
- [ ] Only "Request Stock" button shown (disabled)
- [ ] Approval tab is HIDDEN in Pending Queues
- [ ] My Requests tab shows 2 requests

### Cross-Role Checks
- [ ] No raw backend terms ("master", "central", "franchise") appear in any UI label
- [ ] All write buttons are disabled with "blocked" labels
- [ ] Read-only mode badge visible in header for all roles
- [ ] Logout works and redirects to login for all roles

---

## 9. Slice 2 Recommended Scope

### Must Have (implement in Slice 2)

| # | Item | Effort | Justification |
|---|------|--------|---------------|
| 1 | **Transfer Detail status timeline** | Medium | Enterprise requirement: traceability. Data exists (requested_at, approved_at, dispatched_at, received_at, cancelled_at). Must visualize progression. |
| 2 | **Line-item accept/reject/damaged display** | Medium | Transfer #110 has partial receive data but it's invisible. Critical for reconciliation. |
| 3 | **Human-readable timestamp formatting** | Low | Every timestamp in the app shows raw ISO. Quick win, high impact. |
| 4 | **Resolution reason display** | Low | `resolution_meta.reason` and `resolution_type` need to be shown on detail and queue. |
| 5 | **Date range picker on Hierarchy Summary** | Medium | API supports `from_date`/`to_date`. Users need to filter by day/week/month. |
| 6 | **Contextual action buttons** | Medium | Show only relevant actions per status+role on Transfer Detail (still disabled). Don't show "Approve" on a received transfer. |
| 7 | **Pending Queues → items count/summary column** | Low | Users need to see what's in a transfer without clicking through. |
| 8 | **Context selector store name fix** | Low | Show actual restaurant name from enriched login instead of "My Store". |

### Should Have (Slice 2 if time allows)

| # | Item | Effort | Justification |
|---|------|--------|---------------|
| 9 | **Recent transfers list on Operations Hub** | Low | Transfer history API available. Show last 5-10 transfers below pending cards. |
| 10 | **Column sorting on Hierarchy Summary** | Low | Sort by name, sent, received, txn count. Client-side only. |
| 11 | **Low-stock summary count on Store Detail** | Low | Show "X items below threshold" at top of stock table. |
| 12 | **Date filter on Store Detail transactions** | Medium | API supports date range for transactions. |
| 13 | **Transfer type badge in queues** | Low | Show "Request" or "Direct Dispatch" badge per row. |
| 14 | **Hide raw source_selector in Transfer Detail** | Low | Replace truncated JSON with "Batch selected" or hide entirely. |
| 15 | **Approved transfer visibility** | Medium | Approved transfers (#104) currently invisible in queues. Add "Ready to Dispatch" indication or keep in Approvals with status change. Needs owner decision (see Q3 below). |

### Phase 3

| # | Item | Justification |
|---|------|---------------|
| 16 | **Write form shells** (Request Stock, Dispatch Wizard, Receive Stock) | Blocked until UNIT_CONVERSION_NOT_DEFINED is fixed. Build form UI with disabled submit. |
| 17 | **Reports Dashboard** | Read APIs exist but report rendering, date range, and export need design. |
| 18 | **Token masking in API Verification Tool** (SEC-001) | Admin-only feature, not user-facing. |
| 19 | **Transfer history dedicated screen with filters** | Useful but not urgent while detail drill-down covers individual transfers. |
| 20 | **Confirmation dialogs for destructive actions** (SEC-002) | Required when write actions are enabled. |

### Future

| # | Item |
|---|------|
| 21 | Real-time WebSocket integration |
| 22 | Push notifications (in-app polling Phase 1) |
| 23 | Stock adjustment / wastage screens |
| 24 | Recipe mapping display |
| 25 | Physical stocktake |
| 26 | PDF/Excel report export |
| 27 | Operations Hub KPIs (pending owner spec) |

---

## 10. Owner Questions Before Slice 2

### Q1: Approved Transfer Queue Visibility

Transfer #104 (approved, awaiting dispatch) doesn't appear in any pending queue tab after approval. Where should it be visible?

- A. Keep in "Approvals" tab with "Approved — awaiting dispatch" label
- B. Add a new "Ready to Dispatch" tab/section
- C. Show in both Approvals and a new Dispatch Queue
- D. Approved transfers don't need queue visibility — find them in transfer history

**Recommended:** A (simplest, reuses existing tab)

### Q2: Outlet Hierarchy Access

Outlet users currently see the "Hierarchy Summary" nav link and can navigate to it, but they see very limited data (self only). Should the Hierarchy link be:

- A. Keep visible — Outlet can see their own row in the list
- B. Hide from Outlet navigation — Outlet only needs own stock detail
- C. Owner decides later

**Recommended:** B (cleaner experience, Outlet gets stock from Store Detail)

### Q3: Context Selector Navigation Behavior

Currently "Navigate to store" in the context selector navigates to `/store/:id` (Store Detail page). Should it instead:

- A. Keep current behavior — navigate to Store Detail page (current)
- B. Change hub/dashboard context to show data for the selected store without leaving the page
- C. Both — quick navigate chip + separate context switch
- D. Owner decides later

**Recommended:** A (simplest for Phase 1, context switching is complex)

### Q4: Operations Hub KPIs (RPT-003)

The KPI placeholder takes significant space. Before Slice 2:

- A. Owner provides specific KPI list now → we build in Slice 2
- B. Remove KPI placeholder entirely for Slice 2, add when ready
- C. Keep placeholder but make it smaller/collapsible
- D. Owner decides later

**Recommended:** C

### Q5: Transfer Detail — Show All Actions or Contextual Only?

Currently all 6 action buttons (Approve, Dispatch, Receive, Cancel, Reject, Edit) show on every transfer detail regardless of status. In Slice 2:

- A. Show only contextually valid actions per status + role (e.g., only "Approve" for a requested transfer viewed by parent)
- B. Keep all 6 visible but grey out invalid ones with tooltip
- C. Owner decides later

**Recommended:** A (cleaner, more professional)

---

## 11. Final Recommendation

### **`ready_for_slice_2_planning`**

The current seeded UX provides a solid foundation for owner review. All 3 role experiences are clearly separated and demonstrable. The 8 must-have items for Slice 2 are well-defined with low-to-medium effort. The 5 owner questions are non-blocking for planning but should be answered before implementation begins.

**Recommended next step:** Owner reviews the app using the checklist in Section 8 across all 3 logins, answers the 5 questions in Section 10, then Slice 2 implementation can begin immediately.

---

*End of Slice 2 UX Review and Planning*
