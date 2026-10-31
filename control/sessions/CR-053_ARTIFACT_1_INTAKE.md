# CR-053 — Intake Artifact (Gate 1)

> **ID:** CR-053
> **Type:** CR
> **Registered:** 2026-10-18
> **Agent Role:** INTAKE
> **Severity:** P2 — MEDIUM
> **Source:** INVESTIGATION_20261018_CR053_IMPORT_FORMAT.md (import-inventory + export-inventory-master probed live, 20+ iterations, manager@mygenietest002.com / RID 828)

---

## Problem Statement

There is no way to bulk-import or bulk-export ingredient definitions (the raw materials catalogue) in Central Inventory. Restaurant owners setting up a new store or needing to update many ingredient definitions must do so one-by-one via the ingredient form. The POS API supports both import (`import-inventory`) and export (`export-inventory-master`) but neither is wired in the frontend.

---

## Scope

Two buttons added to the existing Raw Materials / Ingredients page (e.g. `IngredientCatalogue.jsx`):

| Button | Action |
|--------|--------|
| **Export** | `GET /inventory/export-inventory-master` → opens `download_url`. Owner confirmed: just build the button — Excel content/format can change based on feedback. |
| **Import** | Opens a modal: "Download Template" (client-generated xlsx) + file picker → `POST /inventory/import-inventory` (form: `file`) → shows success/error |

No new nav item. No `screenVisibility.js` change. Buttons go on the existing ingredients page.

---

## API Confirmed (live probed)

### Export: `GET /inventory/export-inventory-master`
```json
{
  "status": true,
  "message": "Stock report exported successfully!",
  "download_url": "https://preprod.mygenie.online/storage/stock_report_XXXX.xlsx"
}
```
Current Excel content: purchase history (ID, Ingredient Name, Purchase Date, Vendor Name, Quantity, Amount). Owner confirmed format can change — just build the button.

### Import: `POST /inventory/import-inventory` (form: `file=@file.xlsx`)

**The import is POSITIONAL — column order matters, header names are ignored.**
A header row (row 1) is REQUIRED as a skip row — data starts at row 2.

**Confirmed working column formats (all live-tested):**

| Cols | Format (by position) | Works |
|:----:|---------------------|:-----:|
| 3 | `[category_name, stock_title, unit]` | ✅ |
| 4 | `[category_name, stock_title, unit, min_qty_alert]` | ✅ |
| 5 | `[category_name, stock_title, unit, small_unit, min_unit_alert]` | ✅ |
| 6+ | Any with small_unit + more columns | ❌ `CONVERSION_FACTOR_REQUIRED` |

**Example valid file:**
```
Row 1: [Category, Ingredient Name, Unit, Min Qty, Min Unit]   ← skip row
Row 2: [Dairy, Butter, kg, 0.5, kg]
Row 3: [Spices, Cumin Seeds, kg, 100, gm]
Row 4: [Oils, Olive Oil, ltr, 500, ml]
```

**Critical limitation confirmed:** `converion_factor` field is NEVER correctly set via Excel import. Ingredients requiring unit conversion (`has_unit_conversion: true`) must be created via the individual add-ingredient UI form. An inline warning in the import modal will document this.

---

## Code Reality

**NONE** — no import/export buttons on the ingredients page. `api.js` has no `exportInventoryMaster()` or `importInventory(file)` functions.

---

## Duplicate Check

**DISTINCT** — no existing CR covers ingredient bulk import/export.

Related:
- CR-051 (Purchase Report export uses same `export-inventory-master` endpoint — same API call, different context)
- CR-052 (Bulk stock import — different page, different API)

---

## Blast Radius

- Modify: `frontend/src/components/central-inventory/IngredientCatalogue.jsx` — add Export + Import buttons
- New: `ImportIngredientsModal.jsx` (or inline modal) — template download + file upload UI
- Modify: `frontend/src/services/api.js` — add `exportInventoryMaster()` + `importInventory(file)`
- Estimated scope: **SMALL** (~1 day)
- Hotspot: `api.js` (HIGH-RISK)

---

## Severity

**P2 — MEDIUM**

Workaround exists (one-by-one UI). Import is most valuable during onboarding. Export is useful for backup/audit.

---

## Owner Decisions — ALL RESOLVED

| Question | Answer |
|----------|--------|
| Export format | "Just build the button — Excel content can change based on feedback" ✅ |
| Import template format | Client-generated positional xlsx with 4-col format. Warn about converion_factor limitation. ✅ |
| New nav item needed? | No — buttons on existing ingredients page only ✅ |

---

## Open Questions

None. Both endpoints confirmed working. Import format confirmed. No blockers.

---

## Next Step

→ PLANNING agent: Impact Analysis (Gate 2) + Implementation Plan (Gate 3)
→ Note for PLANNING: `api.js` `exportInventoryMaster` function will be shared with CR-051 (same endpoint). Coordinate so it's defined once.
