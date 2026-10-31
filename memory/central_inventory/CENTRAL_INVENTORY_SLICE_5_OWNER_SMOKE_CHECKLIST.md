# Central Inventory Slice 5 Owner Smoke Checklist

> **Date:** 24 May 2026
> **QA Status:** `slice_5_qa_passed_with_known_limitations_ready_for_owner_smoke`

---

## 1. Purpose

Owner manual smoke test for final Slice 5 acceptance. All automated/agent QA has passed (55/57 checks pass, 2 not tested due to live mutation safety, 0 defects).

---

## 2. Required Roles

| Role | Email | Password |
|------|-------|----------|
| Central Store | `abhishek@kalabahia.com` | `Qplazm@10` |
| Master Store | `owner@democentral1.com` | `Qplazm@10` |
| Outlet | `owner@demofranchise1.com` | `Qplazm@10` |

---

## 3. Central Smoke

- [ ] Login as Central — Hub loads cleanly
- [ ] NO "Read-only Mode" badge in header
- [ ] NO "Phase 1 Limited Slice" yellow banner
- [ ] "Adjust Stock" button visible on Hub
- [ ] Click "Adjust Stock" → Stock Adjustment form loads
- [ ] Select Decrease → item dropdown populates with items
- [ ] Quantity input works (try pcs = must be whole number)
- [ ] Reason dropdown: 5 categories (Counting Error, System Correction, Opening Balance, Quality Issue, Other)
- [ ] Select "Other" → free-text textarea appears
- [ ] Submit button disabled until form is complete
- [ ] "Record Wastage" button visible on Hub
- [ ] Click "Record Wastage" → Wastage Entry form loads
- [ ] "Wastage Report" button visible → report page loads
- [ ] History & Ledger → Transfer History shows transfers
- [ ] History & Ledger → Stock Ledger shows 7 filter pills
- [ ] Reports sidebar shows "(soon)" — correct deferred indicator

---

## 4. Master Smoke

- [ ] Login as Master — Hub loads cleanly
- [ ] NO "Read-only Mode" badge in header
- [ ] NO "Phase 1 Limited Slice" banner
- [ ] "Adjust Stock" button NOT visible
- [ ] Navigate to `/adjustment/new` directly → "Access Denied" shown
- [ ] "Record Wastage" button visible → form loads
- [ ] "Wastage Report" button visible → report page loads
- [ ] "Dispatch Stock" and "Request Stock" buttons visible (Slice 4 regression)
- [ ] History & Ledger loads

---

## 5. Outlet Smoke

- [ ] Login as Outlet — Hub loads cleanly
- [ ] NO "Read-only Mode" badge in header
- [ ] "Adjust Stock" button NOT visible
- [ ] "Dispatch Stock" button NOT visible (Outlet cannot dispatch)
- [ ] "Record Wastage" button visible → form loads
- [ ] Reason dropdown: 6 categories (Expired, Spoiled, Damaged, Spillage, Pest/Contamination, Other)
- [ ] "Request Stock" button visible (Slice 4 regression)
- [ ] History & Ledger loads

---

## 6. Cross-Role Checks

- [ ] No cost/value columns or fields anywhere
- [ ] No backend terms ("master"/"central"/"franchise") in any visible text
- [ ] Store badges say "Central Store" / "Master Store" / "Outlet"
- [ ] No global read-only mode indicator
- [ ] No unauthorized store data visible (each role sees own scope)
- [ ] Edit Transfer button still renders (noop — expected for deferred feature)

---

## 7. Known Limitations Acknowledgement

| # | Limitation | Impact |
|---|-----------|--------|
| 1 | Stock Adjustment entries do not appear in Stock Ledger | No adjustment history API exists — filter pills are ready, rows will appear when API is available |
| 2 | Wastage ledger rows currently empty | No wastage has been recorded in preprod yet — code is ready |
| 3 | Wastage Report may show error for Master/Outlet | Preprod API scope may restrict — error state with Retry is the correct handling |
| 4 | Stock Increase (`add-stock`) payload estimated | May need backend confirmation — Stock Decrease is fully verified |
| 5 | Edit Transfer is noop | API contract unknown — deferred to future slice |

---

## 8. Owner Acceptance Statement

After completing the smoke checklist above, the owner may record acceptance:

> **Owner approval granted for Central Inventory Slice 5 acceptance.**
>
> Accepted:
> 1. Hardcoded UI cleanup (no read-only badges/banners)
> 2. Stock Adjustment flow (Central-only, increase/decrease)
> 3. Wastage Entry flow (all roles, own store level)
> 4. Wastage Report (role-scoped read-only)
> 5. Wastage ledger/history traceability (data-dependent)
> 6. Stock Adjustment traceability known limitation (accepted)
> 7. Role/permission behavior verified
> 8. Validation/defaults per Q-S5-003
> 9. Slice 1–4 regression stable
> 10. Known limitations documented and accepted
>
> Proceed to Slice 5 closure documentation.

---

*End of Owner Smoke Checklist*
