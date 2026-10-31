# BUG-061 — ARTIFACT 4: CODE GATE (Owner GO)

> **ID:** BUG-061
> **Artifact:** 4 — Code Gate
> **Date:** 2026-10-20
> **Owner action:** "gate 4 go" (chat)
> **Plan:** `control/sessions/BUG-061_ARTIFACT_3_IMPLEMENTATION_PLAN.md`

## Approval

Owner gave GO at Gate 4. IMPLEMENTATION agent authorised to begin coding.

## Scope confirmed — 6 edits, 1 file

1. Line 2 — add `Fragment` to React import
2. Line 34 — remove `totalAmount` state
3. Line 55 — remove `setTotalAmount` from fetch
4. After line 69 — add `txnGroups` + `correctTotal` useMemos
5. Line 150 — `totalAmount` → `correctTotal` in summary bar
6. Lines 229–276 — replace flat tbody with transaction-grouped render

## File authorised to change
- `frontend/src/components/central-inventory/PurchaseReport.jsx`

## Files NOT authorised to change
- Any other file. `screenVisibility.js` and `terminology.js` FROZEN.
