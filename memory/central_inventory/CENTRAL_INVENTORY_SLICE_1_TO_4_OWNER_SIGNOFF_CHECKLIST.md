# Central Inventory Slice 1-4 Owner Sign-Off Checklist

> **Date:** 23 May 2026
> **For:** Owner final review before Slice 1-4 closure

---

## 1. Slice 1 Checks

- [ ] Login works for Central Store (`abhishek@kalabahia.com` / `Qplazm@10`)
- [ ] Login works for Master Store (`owner@democentral1.com` / `Qplazm@10`)
- [ ] Login works for Outlet (`owner@demofranchise1.com` / `Qplazm@10`)
- [ ] Header shows correct store name + type badge per login
- [ ] Sidebar shows correct navigation items per role
- [ ] Operations Hub loads with pending counts
- [ ] Hierarchy Summary shows Master Stores / Outlets tabs
- [ ] Store Detail shows stock summary with 16 items
- [ ] Pending Queues shows tabs (role-filtered)
- [ ] Transfer Detail shows from/to info, status, line items
- [ ] Context Selector shows store picker for Central/Master, locked for Outlet
- [ ] Logout works and redirects to login

---

## 2. Slice 2 Checks

- [ ] Ready to Dispatch tab visible in Pending Queues (Central/Master only)
- [ ] Transfer Detail shows status timeline (Requested → Approved → Dispatched → Received)
- [ ] Transfer #110: line-level accept/reject columns visible (Accepted: 7, Rejected: 3)
- [ ] Transfer #110: Resolution Details card visible (type, reason, receive totals)
- [ ] All timestamps formatted (e.g., "23 May 2026, 4:46 AM") — no raw ISO strings
- [ ] Date range picker on Hierarchy Summary works with presets
- [ ] Transfer Detail shows contextual action buttons per role + status
- [ ] Items count column in Pending Queues shows "2 items", "3 items" etc.
- [ ] Hierarchy: Master login shows Outlets tab only (no Master Stores tab)
- [ ] Context selector: "View as store" → counts update → Reset returns to own

---

## 3. Slice 3 Checks

- [ ] "History & Ledger" nav item visible in sidebar
- [ ] `/history` route loads with Transfer History tab
- [ ] Transfer History shows transfers with status badges, timestamps, direction
- [ ] Stock Ledger tab loads with movement entries
- [ ] Date range filter works on both tabs
- [ ] Status filter pills filter Transfer History
- [ ] Movement type filter pills filter Stock Ledger
- [ ] Direction filter (All/Incoming/Outgoing) works
- [ ] Search by transfer ID works
- [ ] Clicking a transfer row navigates to Transfer Detail
- [ ] Stock Ledger "Transfer #NNN" links navigate to Transfer Detail
- [ ] Before/After columns show "—" (expected — no API data)
- [ ] Role visibility: Central sees all, Master sees own+children, Outlet sees own

---

## 4. Slice 4 Checks

### Action Buttons on Transfer Detail
- [ ] Transfer #101 (requested, Central as source): **Approve** + **Reject** buttons visible and enabled
- [ ] Clicking **Approve** opens confirmation dialog → Confirm → transfer status updates
- [ ] Clicking **Reject** opens reason dialog → select type + enter reason → submit
- [ ] Transfer #104 (approved, Central as source): **Dispatch** + **Cancel** buttons visible
- [ ] Transfer (dispatched, as destination): **Receive** + **Report Issue** buttons visible
- [ ] Transfer (dispatched, as source): **Cancel** button visible
- [ ] Terminal transfers (#108 received, #111 cancelled, #112 rejected): NO action buttons

### Confirmation & Reason Dialogs
- [ ] Approve/Dispatch: confirmation dialog with transfer summary
- [ ] Reject/Cancel: reason dialog with resolution type dropdown + reason textarea (min 10 chars)
- [ ] Report Issue: reason dialog with issue-specific types (Damaged, Wrong Items, etc.)

### Receive Dialog
- [ ] "Receive All" mode: single button, sends empty payload
- [ ] "Partial Receive" toggle: shows per-line accepted/rejected quantities
- [ ] Per-line resolution type + reason required if rejected > 0

### Direct Dispatch Form (/dispatch/new)
- [ ] Accessible from Operations Hub "Dispatch Stock" button (Central/Master)
- [ ] NOT accessible for Outlet (permission denied)
- [ ] Destination dropdown shows stores appropriate for role
- [ ] Item selector loads from inventory master
- [ ] Source selector appears after item selection (segment_id default)
- [ ] Source selector mode toggle works (Segment/Bucket)
- [ ] Bucket mode shows amber warning
- [ ] Quantity validation: pcs=whole numbers, kg/ltr=2 decimals
- [ ] "Create Dispatch" button disabled until all fields valid
- [ ] Submit calls real preprod API

### Request Stock Form (/request/new)
- [ ] Accessible from Operations Hub "Request Stock" button (Master/Outlet)
- [ ] NOT accessible for Central (no button shown)
- [ ] Shows parent store name as read-only
- [ ] Item selector and source selector work
- [ ] Submit creates stock request

### Cross-Cutting Slice 4
- [ ] All action buttons disabled during API call (loading spinner visible)
- [ ] Success toasts display after each write action
- [ ] Error toasts display on API failure
- [ ] After successful write, Transfer Detail refreshes with new status
- [ ] Pending Queues counts update on next navigation

---

## 5. Cross-Role Checks

- [ ] Central can: dispatch, approve, reject, dispatch-approved, receive, cancel, report issue
- [ ] Master can: dispatch (to children), request (from parent), approve, reject, dispatch-approved, receive, cancel, report issue, edit own request
- [ ] Outlet can: request (from parent), receive, report issue, edit own request
- [ ] Outlet CANNOT: dispatch, approve, reject, cancel
- [ ] Central CANNOT: request stock
- [ ] No action appears for wrong role/status combinations

---

## 6. Business Terminology Checks

- [ ] No raw "master" in any UI label, button, toast, error, or heading (should say "Central Store")
- [ ] No raw "central" in any UI surface (should say "Master Store")
- [ ] No raw "franchise" in any UI surface (should say "Outlet")
- [ ] Hierarchy Summary tabs say "Master Stores" and "Outlets"
- [ ] Store badges show "Central Store", "Master Store", "Outlet"
- [ ] Error messages use business terms (not backend terms)

---

## 7. Known Issues Acknowledgement

By signing off, owner acknowledges these known non-blocking issues:

1. "Phase 1 Limited Slice — Read-only mode" banner still shows in header (cosmetic — text update deferred)
2. Edit Transfer button renders but does not perform action (API contract unknown — deferred to Slice 5)
3. Before/After quantity in Stock Ledger shows "—" (backend does not provide these fields)
4. Actor names in Stock Ledger show numeric IDs (no user name resolution API)
5. Stock Ledger uses multiple API calls (acceptable for current scale)
6. filter_bucket source selector mode may fail with batched stock (warning shown to users)
7. Transfer History rows lack store type badges (API limitation — names shown correctly)

---

## 8. Final Owner Approval Statement

Owner approval granted for Central Inventory Slice 1 through Slice 4 closure.

Approved:
1. Slice 1 read-only foundation
2. Slice 2 UX polish and transfer visibility
3. Slice 3 History & Ledger read-only traceability
4. Slice 4 transfer write flows
5. Known non-blocking issues documented
6. Deferred items moved to Post-Slice-4 Open Items Register

Proceed to Slice 5 planning only after this closure is accepted.

---

**Owner Signature:** ________________________

**Date:** ________________________

---

*End of Owner Sign-Off Checklist*
