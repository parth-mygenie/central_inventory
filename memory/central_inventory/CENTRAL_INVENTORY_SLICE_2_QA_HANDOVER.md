# Central Inventory Slice 2 — QA Handover

> **Date:** 19 May 2026
> **For:** Owner / QA Team

---

## 1. What QA Should Test

12 items were implemented in Slice 2. All should be verified across 3 login roles.

---

## 2. Central Login Smoke Checklist

**Login:** `abhishek@kalabahia.com` / `Qplazm@10`

- [ ] Header shows "My Genie" + "Central Store" badge
- [ ] Operations Hub: No KPI placeholder visible
- [ ] Operations Hub: "Ready to Dispatch" count card shows 1
- [ ] Operations Hub: "Pending Approvals" shows 3
- [ ] Context selector: Click "View as store" → Select DemoCentral1 → "Viewing as DemoCentral1" appears → Counts update
- [ ] Context selector: Click Reset → Counts return to own
- [ ] Hierarchy Summary: Both tabs visible (Master Stores / Outlets)
- [ ] Hierarchy Summary: "Select dates" button visible, opens date picker with presets
- [ ] Hierarchy Summary: Master Stores tab shows DemoCentral1, DemoCentral2 with "Master Store" badges
- [ ] Pending Queues: 4 tabs visible (Approvals 3, Ready to Dispatch 1, Receives, My Requests)
- [ ] Pending Queues: "Items" column shows counts (e.g., "2 items", "3 items")
- [ ] Pending Queues: "Created" column shows formatted dates (e.g., "19 May 2026, 7:14 AM")
- [ ] Pending Queues: Ready to Dispatch tab shows Transfer #104 (Approved, My Genie → DemoCentral1)
- [ ] Transfer Detail `/transfer/101`: Timeline: Requested (active) → Approved (pending) → Dispatched (pending) → Received (pending)
- [ ] Transfer Detail `/transfer/101`: Actions: Only Approve + Reject shown (disabled, "Write API blocked")
- [ ] Transfer Detail `/transfer/104`: Actions: Only Dispatch + Cancel shown
- [ ] Transfer Detail `/transfer/108`: Full completed timeline. No action buttons.
- [ ] Transfer Detail `/transfer/110`: Timeline: Dispatched → Partially Received with timestamps
- [ ] Transfer Detail `/transfer/110`: Resolution Details card: "Partial Return", reason "3kg of Paneer spoiled in transit", Accepted: 7, Rejected: 3, Damaged: 3, Returned: 3
- [ ] Transfer Detail `/transfer/110`: Line items: Paneer | 10 kg | Accepted: 7 | Rejected: 3 | Resolution: damaged
- [ ] Transfer Detail `/transfer/111`: Timeline shows Dispatched → Cancelled. Resolution: "Return to Source"
- [ ] Transfer Detail `/transfer/112`: Timeline shows Requested → Rejected
- [ ] Store Detail: Transaction dates formatted (not raw ISO)

---

## 3. Master Login Smoke Checklist

**Login:** `owner@democentral1.com` / `Qplazm@10`

- [ ] Header shows "DemoCentral1" + "Master Store" badge
- [ ] Operations Hub: No KPI placeholder
- [ ] Operations Hub: Ready to Dispatch card visible (may show 0)
- [ ] Context selector: "View as store" button visible
- [ ] Context selector: Can select child outlets → "Viewing as" indicator appears
- [ ] Hierarchy Summary: Only "Outlets" tab visible (NO "Master Stores" tab)
- [ ] Hierarchy Summary: Shows DemoFranchise1 + DemoFranchise2 only
- [ ] Hierarchy Summary: Date picker visible
- [ ] Pending Queues: 4 tabs (Approvals, Ready to Dispatch, Receives, My Requests)
- [ ] Pending Queues: Items count + formatted timestamps on all rows
- [ ] Transfer Detail `/transfer/102`: Approve + Reject visible (as parent of request)

---

## 4. Outlet Login Smoke Checklist

**Login:** `owner@demofranchise1.com` / `Qplazm@10`

- [ ] Header shows "DemoFranchise1" + "Outlet" badge
- [ ] Operations Hub: No KPI placeholder
- [ ] Operations Hub: No Ready to Dispatch card (Outlet cannot dispatch)
- [ ] Context selector: "Context locked" indicator, no "View as store" button
- [ ] Hierarchy Summary: Only "Outlets" tab visible
- [ ] Pending Queues: No "Approvals" tab, No "Ready to Dispatch" tab
- [ ] Pending Queues: Only "Receives" and "My Requests" tabs visible
- [ ] Pending Queues: Items count + formatted timestamps
- [ ] Transfer Detail: Only "Receive" shown if Outlet is destination of dispatched transfer

---

## 5. Cross-Role Hierarchy Checks

- [ ] Central login → Hierarchy → Master Stores: DemoCentral1, DemoCentral2 (both visible)
- [ ] Central login → Hierarchy → Outlets: All 4 outlets visible
- [ ] Master login → Hierarchy: Only "Outlets" tab → DemoFranchise1, DemoFranchise2
- [ ] Master login → Hierarchy: NO Master Stores tab. Cannot see DemoCentral2 or My Genie.
- [ ] Outlet login → Hierarchy: Limited/self only view

---

## 6. Ready to Dispatch Checks

- [ ] Central login: Ready to Dispatch tab in Queues shows Transfer #104
- [ ] Central login: Ready to Dispatch count card on Hub shows 1
- [ ] Master login: Ready to Dispatch tab visible (may have 0 items)
- [ ] Outlet login: No Ready to Dispatch tab or card

---

## 7. Transfer Detail Checks

- [ ] Status Timeline renders for all statuses: requested, approved, dispatched, received, partially_received, cancelled, rejected
- [ ] Line-level accept/reject columns appear only when data exists (Transfer #110)
- [ ] Resolution Details card appears only when resolution data exists (#110, #111)
- [ ] Contextual actions match role + status matrix (no irrelevant buttons)
- [ ] All timestamps formatted (no raw ISO strings)
- [ ] "Write API blocked" label on all disabled action buttons

---

## 8. Date Range Filter Checks

- [ ] "Select dates" button visible on Hierarchy Summary
- [ ] Clicking opens popover with Quick Select presets + Calendar
- [ ] Selecting a preset closes the picker and shows the date range on the button
- [ ] Clear (X) button resets the filter
- [ ] Data refreshes when date range changes

---

## 9. Store Name Checks

- [ ] Central login: "My Genie" in header and context selector
- [ ] Master login: "DemoCentral1" in header and context selector
- [ ] Outlet login: "DemoFranchise1" in header and context selector
- [ ] No "My Store" fallback visible for any seeded account

---

## 10. Button/Action Visibility Checks

| Transfer | Central Login | Master Login | Outlet Login |
|----------|--------------|-------------|-------------|
| #101 (requested, Central→Franchise1) | Approve, Reject | — | — |
| #102 (requested, Central1→Franchise1) | — | Approve, Reject | — |
| #104 (approved, Central→Central1) | Dispatch, Cancel | — | — |
| #105 (dispatched, Central→Central2) | Cancel | — | — |
| #108 (received) | None | None | None |
| #110 (partially_received) | None | None | None |
| #111 (cancelled) | None | None | None |
| #112 (rejected) | None | None | None |

---

## 11. Regression Risks

| # | Risk | Check |
|---|------|-------|
| 1 | Login flow broken | Verify login works for all 3 accounts |
| 2 | Sidebar navigation broken | Click each nav item, verify correct page loads |
| 3 | Logout broken | Verify logout redirects to login page |
| 4 | Store Detail stock data missing | Navigate to any store, verify 16 stock items load |
| 5 | Batch drilldown broken | Click a stock item in Store Detail, verify batches appear |
| 6 | Transfer Detail back navigation | Click Back on Transfer Detail, verify it returns to previous page |
| 7 | Existing terminology mapping broken | Check no raw "master"/"central"/"franchise" in UI text |
| 8 | Read-only mode indicators removed | Verify "Read-only Mode" badge in header and Phase 1 notices still present |

---

*End of QA Handover*
