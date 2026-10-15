# Central Inventory Slice 3 — QA Handover

> **Date:** 22 May 2026
> **For:** Owner / QA Team
> **Automated QA:** 15/15 PASS (`/app/test_reports/iteration_5.json`)

---

## 1. What to Test

10 must-have + 5 should-have Slice 3 items across 3 login roles.

---

## 2. Central Store Login Smoke Checklist

**Login:** `abhishek@kalabahia.com` / `Qplazm@10`

- [ ] Sidebar shows "History & Ledger" nav item between "Pending Queues" and "Reports"
- [ ] Clicking "History & Ledger" opens `/history` route
- [ ] **Transfer History tab** is default/first tab with count badge (5)
- [ ] Table shows columns: ID, Date, Source, Destination, Status, Type, Items, Direction, Updated, View
- [ ] All 5 transfers visible: #101 (Requested), #104 (Approved), #105 (Dispatched), #108 (Received), #110 (Partially Received)
- [ ] Status badges are color-coded (amber=Requested, blue=Approved, indigo=Dispatched, green=Received, teal=Partially Received)
- [ ] Type column shows "Request" or "Direct Dispatch" per transfer
- [ ] Direction column shows arrows: Out (red) for transfers FROM My Genie
- [ ] Timestamps are formatted (e.g., "22 May 2026, 1:38 PM") — no raw ISO strings
- [ ] Date range picker ("Select dates") visible and opens with presets
- [ ] Status filter pills visible: clicking "Requested" shows only requested transfers
- [ ] Direction filter: clicking "Outgoing" filters to outgoing transfers
- [ ] Search: typing "101" shows only Transfer #101
- [ ] Clear button resets all filters
- [ ] Clicking transfer row #101 navigates to `/transfer/101` (Transfer Detail)
- [ ] **Stock Ledger tab** — click to switch
- [ ] Stock Ledger tab shows count badge (9 movements)
- [ ] Table shows columns: Date, Store, Item, Movement, Dir., Qty, Unit, Before, After, Reference, Counterparty, Reason
- [ ] Store column shows names WITH type badges (Central Store, Master Store, Outlet)
- [ ] Movement types visible: Transfer Out (red), Transfer In (green), Partial Receive (teal)
- [ ] Before/After columns show "—" for all entries
- [ ] Reference column shows clickable "Transfer #NNN" links
- [ ] Clicking "Transfer #105" link navigates to `/transfer/105`
- [ ] Counterparty column shows names WITH type badges
- [ ] Reason column shows "damaged" for partial receive entry, "3kg of Paneer spoiled in transit" for related entry
- [ ] Movement type filter pills work
- [ ] Direction filter (All/In/Out) works
- [ ] Search by item name works (e.g., "Butter")
- [ ] No write action buttons anywhere on the screen

---

## 3. Master Store Login Smoke Checklist

**Login:** `owner@democentral1.com` / `Qplazm@10`

- [ ] "History & Ledger" nav item visible
- [ ] Transfer History shows only transfers involving DemoCentral1 (781) or its child outlets (DemoFranchise1=783, DemoFranchise2=784)
- [ ] Does NOT show transfers between DemoCentral2 and its outlets
- [ ] Transfer count: ~6 transfers
- [ ] Direction filter: "Incoming" shows transfers TO DemoCentral1
- [ ] Stock Ledger tab loads with movement entries for own + child stores
- [ ] Store type badges show "Master Store" for DemoCentral1
- [ ] All filters work within visibility scope
- [ ] Transfer Detail links work
- [ ] No write action buttons

---

## 4. Outlet Login Smoke Checklist

**Login:** `owner@demofranchise1.com` / `Qplazm@10`

- [ ] "History & Ledger" nav item visible
- [ ] Transfer History shows only transfers where DemoFranchise1 (783) is source or destination
- [ ] Transfer count: ~3 transfers
- [ ] Source/destination names visible (can see "My Genie", "DemoCentral1")
- [ ] Stock Ledger tab loads with own store movements
- [ ] No transfers from DemoFranchise2, DemoCentral2 visible
- [ ] All filters work within own scope
- [ ] Transfer Detail links work
- [ ] No write action buttons

---

## 5. Cross-Role Checks

- [ ] No raw ISO timestamps visible — all formatted
- [ ] No raw backend terms ("master", "central", "franchise") in UI text
- [ ] No write actions introduced anywhere on History & Ledger
- [ ] Empty states show clear messages ("No transfers match your filters", "No stock movements found")
- [ ] Loading states use skeleton shimmer
- [ ] Tab switch preserves filter state (date range shared between tabs)
- [ ] "History & Ledger" sidebar item is correctly positioned
- [ ] Back navigation from Transfer Detail returns correctly
- [ ] Existing Slice 2 functionality not broken (Operations Hub, Hierarchy, Queues, Transfer Detail all still work)

---

## 6. Transfer History Checks

- [ ] All 7 transfer statuses rendered correctly with color-coded badges
- [ ] "Requested" status shown (Transfer #101, #102, #103)
- [ ] "Approved" status shown (Transfer #104)
- [ ] "Dispatched" status shown (Transfer #105, #106, #107)
- [ ] "Received" status shown (Transfer #108, #109)
- [ ] "Partially Received" status shown (Transfer #110)
- [ ] "Cancelled" status shown (Transfer #111)
- [ ] "Rejected" status shown (Transfer #112)

---

## 7. Stock Ledger Checks

- [ ] Movement types derive correctly from transfer statuses:
  - Dispatched transfers → "Transfer Out" for source store
  - Received transfers → "Transfer In" for destination store + "Transfer Out" for source
  - Partially received → "Partial Receive" for destination + "Transfer Out" for source
  - Cancelled (post-dispatch) → "Reversal (Restored)" for source + "Transfer Out" for source
- [ ] Before/After columns show "—" for all entries (expected)
- [ ] Reason column populated for partial receive (#110): "damaged", "3kg of Paneer spoiled in transit"
- [ ] No sales consumption entries shown
- [ ] No adjustment/wastage entries shown (none in seed data)

---

## 8. Regression Risks

| # | Risk | Check |
|---|------|-------|
| 1 | Login flow broken | Verify login works for all 3 accounts |
| 2 | Sidebar navigation broken | Click each nav item, verify correct page loads |
| 3 | Operations Hub still works | Navigate to /, verify pending counts |
| 4 | Pending Queues still works | Navigate to /queues, verify tabs |
| 5 | Transfer Detail still works | Navigate to /transfer/101, verify timeline + actions |
| 6 | Hierarchy Summary still works | Navigate to /hierarchy, verify tabs |
| 7 | Store Detail still works | Navigate to /store/1, verify stock table |
| 8 | Terminology mapping intact | No raw "master"/"central"/"franchise" in any UI |
| 9 | Logout works | Click logout, verify redirect to login |

---

*End of QA Handover*
