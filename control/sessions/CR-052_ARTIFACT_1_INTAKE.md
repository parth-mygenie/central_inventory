# CR-052 — Intake Artifact (Gate 1)

> **ID:** CR-052
> **Type:** CR
> **Registered:** 2026-10-18
> **Agent Role:** INTAKE
> **Severity:** P1 — HIGH
> **Source:** INVESTIGATION_20261018_MULTI_TOPIC.md (export-stock + upload-stock-excel probed live, manager@mygenietest002.com / RID 828)

---

## Problem Statement

Storekeepers who need to record many purchases at once (e.g., weekly supplier delivery with 30+ items) must enter each item individually in the Add Stock form. There is no bulk Excel upload option. The POS API already supports this via `export-stock` (download pre-filled template) + `upload-stock-excel` (upload filled file), but neither is wired in the frontend.

---

## Scope

Two buttons added to the existing Add Stock / Purchase screen (`/purchase`):

| Button | Action |
|--------|--------|
| **Download Template** | `GET /inventory/export-stock` → opens `download_url` in new tab (pre-filled xlsx with all ingredients) |
| **Upload Filled Template** | File picker → `POST /inventory/upload-stock-excel` (form: `products_file`) → shows success/error toast |

No new screen or nav item needed. Buttons appear as a secondary action alongside the existing "Add Stock" form — e.g., as an "Excel import" collapsed section or a toolbar row.

---

## API Confirmed (live probed)

**`GET /inventory/export-stock`**
```json
{
  "status": true,
  "message": "File generated successfully!",
  "download_url": "https://preprod.mygenie.online/storage/Purchase_List.xlsx",
  "items_exported": 357
}
```

Excel format — `MainSheet` columns:
`Ingredient_id · PurchaseDate · Title · CurrentStock · Unit · **Quantity** · **Amount** · **Payment_Type** · **Batch** · Brand · **Expiry** · Expiry Date · Converion Factor`

Bold = storekeeper fills in. Others are pre-filled by the API.

`Lists` sheet: dropdown reference values — valid units (kg, gm, ltr, ml, bundle, pkt, piece) and payment types (Cash, Card, UPI, Cash Draw, Unpaid, UPI Drawer, Bank Transfer).

**`POST /inventory/upload-stock-excel`** (form: `products_file=@file.xlsx`)

Tested with empty-qty rows → `{ status: true, message: "Stock updated successfully", purchases: [], total_purchases: 0 }`.

Filled rows → creates GRN/purchase records with batch and expiry if provided.

**No `partial_payments[]`** in Excel — single `Payment_Type` column only. Split payment is only available via the PO receive flow (CR-049).

---

## Code Reality

**NONE** — no Excel import/export UI exists on the Add Stock screen. `api.js` has no `exportStockTemplate` or `uploadStockExcel` functions. `AddStockPurchaseForm.jsx` has no Excel buttons.

---

## Duplicate Check

**DISTINCT** — no existing CR covers bulk Excel import on the Add Stock screen.

Related:
- CR-047 (Add Stock UX rewrite — same file. Execution order: CR-052 can be built independently; if CR-047 ships first, CR-052 bolts onto the new spreadsheet UI)
- CR-053 (Raw Materials import/export — different page, different API)

---

## Blast Radius

- Modify: `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx` — add two Excel buttons
- Modify: `frontend/src/services/api.js` — add `exportStockTemplate()` + `uploadStockExcel(file)`
- Estimated scope: **SMALL** (~half day)
- Hotspot: `api.js` (HIGH-RISK)

---

## Severity

**P1 — HIGH**

Storekeepers entering 30+ items per purchase session are the primary users of Add Stock. Manual one-by-one entry is the current workaround — extremely slow. The API already fully supports this; it is purely a missing frontend wire-up.

---

## Owner Decisions — ALL RESOLVED

| Question | Answer |
|----------|--------|
| Where do the buttons appear? | On the Add Stock / Purchase screen, as a secondary Excel import row |
| Scope of Excel format changes | Owner handles — "just implement the button" |

---

## Open Questions

None. Both endpoints confirmed working. No blockers.

---

## Next Step

→ PLANNING agent: Impact Analysis (Gate 2) + Implementation Plan (Gate 3)
→ No dependencies. Can be planned and implemented immediately.
→ If CR-047 ships first: implement Excel buttons in the new spreadsheet layout. If CR-047 is pending: implement on current card layout.
