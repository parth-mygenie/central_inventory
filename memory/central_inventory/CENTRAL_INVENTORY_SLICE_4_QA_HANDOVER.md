# Central Inventory Slice 4 — QA Handover

> **Date:** 23 May 2026
> **For:** Owner / QA Team
> **Automated QA:** 20/20 features PASS + 14/14 backend tests PASS

---

## 1. What to Test

12 must-have + 3 should-have Slice 4 items across 3 login roles. All write actions now enabled.

---

## 2. Central Store Login (`abhishek@kalabahia.com` / `Qplazm@10`)

### Operations Hub
- [ ] "Dispatch Stock" button visible, enabled, navigates to /dispatch/new
- [ ] No "Request Stock" button (Central cannot request)

### Direct Dispatch Form (/dispatch/new)
- [ ] "Destination Store" dropdown shows Master Stores + Outlets with business labels
- [ ] Can select item from inventory master dropdown
- [ ] After selecting item: Source Selector appears with segments
- [ ] Source Selector defaults to "Segment" mode
- [ ] Can toggle to "Bucket" mode (shows amber warning)
- [ ] Quantity input accepts numbers, validates UOM (pcs=whole, kg/ltr=2 decimals)
- [ ] "Add Item" button adds more item rows
- [ ] "Create Dispatch" disabled until all fields valid
- [ ] Submit calls real preprod API via proxy

### Transfer Detail — Write Actions
- [ ] Transfer #101 (requested, as source): **Approve** + **Reject** buttons enabled
- [ ] Click **Approve** → confirmation dialog ("Approve Transfer #101?") → Confirm → toast "Transfer #101 approved"
- [ ] Transfer #101 (requested): Click **Reject** → reason dialog → select resolution type + enter reason (min 10 chars) → submit → toast "Transfer #101 rejected"
- [ ] Transfer #104 (approved, as source): **Dispatch** + **Cancel** buttons enabled
- [ ] Click **Dispatch** → confirmation dialog → Confirm → toast "Transfer #104 dispatched"
- [ ] Transfer (dispatched, as destination): **Receive** + **Report Issue** buttons visible
- [ ] Click **Receive** → dialog shows line items → "Receive All" button → toast "Transfer received"
- [ ] Click **Receive** → toggle "Partial Receive" → adjust accepted/rejected per line → enter reason → submit → toast "partially received"
- [ ] Click **Report Issue** → reason dialog with issue types (Damaged in Transit, Wrong Items, etc.) → submit
- [ ] Transfer (dispatched, as source): **Cancel** button → reason dialog → submit → toast "cancelled — stock restored"
- [ ] Transfer #108 (received): NO action buttons
- [ ] Transfer #111 (cancelled): NO action buttons
- [ ] Transfer #112 (rejected): NO action buttons
- [ ] All buttons disabled during API call (double-click prevention)

---

## 3. Master Store Login (`owner@democentral1.com` / `Qplazm@10`)

### Operations Hub
- [ ] "Dispatch Stock" + "Request Stock" buttons visible and enabled
- [ ] "Dispatch Stock" navigates to /dispatch/new
- [ ] "Request Stock" navigates to /request/new

### Direct Dispatch Form
- [ ] Destination shows only child Outlets (DemoFranchise1, DemoFranchise2)
- [ ] Does NOT show other Master Stores or Central
- [ ] Form works end-to-end

### Request Stock Form (/request/new)
- [ ] "Requesting From" shows parent store: "My Genie (Central Store)"
- [ ] Can add items with quantity and source selector
- [ ] Submit creates request

### Transfer Detail Actions
- [ ] Can approve/reject child's request (as source/parent)
- [ ] Can dispatch approved transfer (as source)
- [ ] Can receive dispatched transfer (as destination)
- [ ] "Report Issue" visible on dispatched-as-destination
- [ ] Own request (requested status): "Edit" button visible (noop — deferred)

---

## 4. Outlet Login (`owner@demofranchise1.com` / `Qplazm@10`)

### Operations Hub
- [ ] "Request Stock" button visible and enabled, navigates to /request/new
- [ ] "Dispatch Stock" button NOT visible

### Request Stock Form
- [ ] "Requesting From" shows parent store name
- [ ] Can add items, enter quantities, select source segments
- [ ] Submit creates stock request

### Transfer Detail Actions
- [ ] Can receive dispatched transfer (as destination)
- [ ] "Report Issue" visible on dispatched-as-destination
- [ ] NO approve/dispatch/cancel buttons visible
- [ ] Own request: "Edit" button visible (noop)

### Permission Denied
- [ ] Direct Dispatch form (/dispatch/new): Shows permission denied

---

## 5. Source Selector Checks
- [ ] Defaults to "Segment" mode
- [ ] Shows segments with batch, expiry, available quantity
- [ ] "Bucket" mode shows amber warning about reliability
- [ ] Bucket mode offers "Without Batch & Expiry" / "With Batch & Expiry"
- [ ] Empty state: "No stock segments available"

## 6. UOM Validation Checks
- [ ] pcs: rejects 10.5 (must be whole number)
- [ ] kg: accepts 2.5, 10.25 (up to 2 decimals)
- [ ] ltr: accepts 0.75, 1.5

## 7. Toast/Error Checks
- [ ] Success toasts show after all write actions
- [ ] Error toasts show API error messages (terminology mapped)
- [ ] No raw backend terms in any toast (no "franchise"/"central"/"master")

## 8. Cross-Role Checks
- [ ] No raw backend terms in forms, dialogs, buttons, toasts, or error messages
- [ ] All confirmation dialogs work for Approve, Dispatch
- [ ] All reason dialogs work for Reject, Cancel, Report Issue
- [ ] Partial Receive dialog shows line-level form when toggled
- [ ] Pending Queues: no "Write API blocked" or "Action blocked" text
- [ ] History & Ledger still works (regression)
- [ ] Login/logout still works (regression)

## 9. Regression Risks
| # | Risk | Check |
|---|------|-------|
| 1 | Login flow | Verify all 3 accounts |
| 2 | Sidebar navigation | All nav items work |
| 3 | Operations Hub counts | Pending counts correct |
| 4 | Hierarchy Summary | Tabs and stores load |
| 5 | Store Detail | Stock data loads |
| 6 | Pending Queues tabs | All tabs work |
| 7 | Transfer Detail (read) | Timeline, line items, resolution display |
| 8 | History & Ledger | Both tabs work |
| 9 | Terminology | No raw backend terms anywhere |

---

*End of QA Handover*
