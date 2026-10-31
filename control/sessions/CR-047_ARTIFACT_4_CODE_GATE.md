# CR-047 — Gate 4: Code Gate (Owner GO)

> **ID:** CR-047
> **Artifact:** 4 — Code Gate
> **Date:** 2026-10-18
> **Owner action:** Approved via chat ("implementation role - gate 4 - CR-047")
> **Plan:** `control/sessions/CR-047_ARTIFACT_3_IMPLEMENTATION_PLAN.md`

## Approval

Owner gave GO at Gate 4. IMPLEMENTATION agent authorised to begin coding.

## Scope confirmed by owner

- Add Stock form → spreadsheet UX + `add-purchase` API + split payment
- Auto-batch format: `{ABBREV}-{DDMONYY}-{HHMM}`
- Expiry optional
- Duplicate item detection
- Payment: single row layout (vendor+date+fare+payment in one strip)
- CR-039 Upload Invoice tab PRESERVED

## Files authorised to change

1. `frontend/src/services/api.js` — add `addPurchase()`, annotate deprecated, export
2. `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx` — Manual Entry rewrite
