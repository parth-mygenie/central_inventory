# BUG-058 + BUG-059 — ARTIFACT 4: CODE GATE (Owner GO)

> **IDs:** BUG-058, BUG-059
> **Artifact:** 4 — Code Gate
> **Date:** 2026-10-20
> **Owner action:** Approved via chat ("proceed with gate 4")
> **Plan:** `control/sessions/BUG-058_059_ARTIFACT_3_IMPLEMENTATION_PLAN.md`

---

## Approval

Owner gave GO at Gate 4. IMPLEMENTATION agent authorised to begin coding.

---

## Scope confirmed

**BUG-059 — 3 edits:**
1. Line 2: add `useRef` to React import
2. Line ~657: add `const justFocused = useRef(false)` inside SpreadsheetRow
3. Lines 805–809: add `onFocus` + `onKeyUp` guard on expiry Input

**BUG-058 — 2 edits:**
4. Lines 302–320: header grid → flex-wrap + conditional Fare + Invoice # cells
5. Lines 346–351: items subtotal + fare breakdown before Grand Total (conditional)

---

## Files authorised to change

1. `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx` — 5 targeted edits

## Files NOT authorised to change

- Any file not listed above
- `frontend/src/lib/screenVisibility.js` — FROZEN
- `frontend/src/lib/terminology.js` — FROZEN
- `backend/server.py` — no changes needed
- `frontend/src/services/api.js` — no changes needed
