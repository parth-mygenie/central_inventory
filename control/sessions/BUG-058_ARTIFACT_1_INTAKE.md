# BUG-058 — ARTIFACT 1: INTAKE
> **ID:** BUG-058
> **Title:** Review Screen — Fare + Invoice # Not Shown in Confirm Header
> **Date:** 2026-10-20
> **Severity:** P2 — MEDIUM
> **Source:** OWNER-REPORTED (screenshot provided)
> **Confidence:** CONFIRMED (code verified)

---

## Description
The "Confirm Stock Purchase" review screen does not display the Fare charge or Invoice # in its
header. The Grand Total correctly includes fare (uses `fullPayableTotal`) but shows no breakdown
telling the user how much is items vs. fare.

## Evidence
- Screenshot: Owner-provided (confirms Fare ₹100 entered in form, invisible in review)
- Code trace: `AddStockPurchaseForm.jsx` lines 302–321 (header: 3 cols only) + line 347 (Grand Total)
- Reproduce: Enter purchase with non-zero fare → click "Review & Confirm" → review header omits fare

## Steps to Reproduce
1. Login as `owner@mygenietest002.com / Qplazm@10`
2. Navigate to /purchase → Manual Entry tab
3. Enter vendor, date, invoice #, fare > 0, add items
4. Click "Review & Confirm"
5. **Expected:** Fare and Invoice # visible in header; items subtotal + fare breakdown shown
6. **Actual:** Header shows Vendor, Date, Payment only. Grand Total shown but no breakdown.

## Root Cause
`confirmMode` render (lines 295–364) has a 3-column header grid (Vendor / Date / Payment).
`fare` and `invoiceNumber` state variables are populated but not referenced in this render block.

## Blast Radius
- Files: 1 (`AddStockPurchaseForm.jsx`)
- Scope: SMALL (~10 lines)
- Hotspot files: NO

## Duplicate Check
DISTINCT — no prior bug about review screen fare display.
Related: BUG-055 (Invoice # field on form, Gate 5 PASS) — that added the input field but not the review display.

## Fix Location
- Lines 302–321: add Fare + Invoice # to header grid (4th + 5th column or expand 3→5)
- Lines 346–350: add items subtotal + fare line before Grand Total row

## Open Questions
None. Business rule clear: show fare if > 0, show invoice # if not empty.
