# CR-051 — Gate 4: Code Gate (Owner GO)

> **ID:** CR-051
> **Artifact:** 4 — Code Gate
> **Date:** 2026-10-19
> **Owner action:** Approved via chat ("planning role - do gate 4")
> **Plan:** `control/sessions/CR-051_ARTIFACT_3_IMPLEMENTATION_PLAN.md`

---

## Approval

Owner gave GO at Gate 4. IMPLEMENTATION agent authorised to begin coding.

---

## Scope confirmed by owner

- **New screen:** Purchase Report at `/reports/purchase` — all roles (master / central / franchise)
- **Date filter:** default last 30 days, date range picker
- **Filters:** vendor dropdown, ingredient text search, payment type pills (All / Cash / Card / UPI / Bank Transfer / Others)
- **Table columns:** Purchase Date · Store* · Ingredient · Vendor · Qty · Unit Price · Amount · Payment Type · **Invoice #** (A2) · Txn ID
  *(Store column: master + central accounts only)*
- **Summary bar:** Grand Total · purchase count · store count
- **By-store accordion:** master / central only — shows store name + line count (NOT `by_restaurant.total_amount` — confirmed 0 bug)
- **Export Excel button:** calls `exportInventoryMaster()` → opens `download_url` in new tab
- **Invoice # (A2):** column included; **no duplicate-check warning** (invoice can repeat across vendors — owner confirmed)
- `screenVisibility.js` edit: **owner-approved** (FROZEN file)

---

## Files authorised to change

1. `frontend/src/services/api.js` — add `getVendorItemListFull()` + `exportInventoryMaster()` + exports; existing `getVendorItemList` untouched
2. `frontend/src/lib/screenVisibility.js` — +1 SCREEN_VISIBILITY entry, +1 NAV_SECTIONS entry under Reports
3. `frontend/src/App.js` — +1 import, +1 route `/reports/purchase`
4. `frontend/src/components/central-inventory/PurchaseReport.jsx` — **NEW FILE**

---

## Files NOT authorised to change

- `VendorManagement.jsx` — `getVendorItemList` call is unchanged; no impact
- `backend/server.py` — proxy-only; no new endpoints needed
- `AddStockPurchaseForm.jsx` — BUG-055 (A1) is a separate item, not in scope here
- Any other frozen file not listed above
