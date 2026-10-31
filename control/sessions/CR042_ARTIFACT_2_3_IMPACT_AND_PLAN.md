# CR-042 — Custom Unit Conversion Adoption (G-020)

> **Gates:** 2 + 3 combined | **Planned:** 2026-07-11 | **Agent:** PLANNING
> **Source:** `AI/openGaps/gap_validation.md` — G-020 FULLY RESOLVED (read + write)
> **Code Reality:** NONE — no reference to `consumption_unit` / `converion_factor` / `has_unit_conversion` anywhere in frontend/src.

---

## 1. Impact Analysis (Gate 2)

### What backend now provides (verified 2026-07-07)
- **Write:** `POST /inventory/add-inventory` accepts per item: `unit` (purchase), `consumption_unit`, `converion_factor` *(API typo — literally "converion_factor", must be sent as-is)*
- **Read:** `GET /inventory/get-inventory-master` returns `has_unit_conversion`, `consumption_unit`, `converion_factor`, `purchase_unit`. Existing data: Chicken kg→gm ×1000, Eggs pkt→piece ×6, Garam Chicken Rice handi→plate ×4.
- Items without conversion: `has_unit_conversion=false`, `consumption_unit=null` — must null-guard.

### Data flow (current → target)
- Raw Material Master (`IngredientCatalogue.jsx`): edit dialog (state ~line 166, payload line 180 `{unit, min_qty_alert, min_unit_alert}` → `updateStockItem`). Target: add conversion fields to the edit form + a "Conversion" display (e.g. "1 pkt = 22 biscuit") on the item detail/expanded row.
- Item creation: `addInventoryItem` (api.js:713) — locate creation form during implementation (grep `addInventoryItem` consumers); add same 2 fields there.
- **Whether `update-stock` persists conversion fields is UNVERIFIED** (validation only tested add-inventory). R9 probe required; if update path doesn't accept them, edit-form fields ship read-only with a note, and gap addendum filed.

### Affected files

| File | Change | Risk |
|------|--------|:---:|
| `frontend/src/components/central-inventory/IngredientCatalogue.jsx` | Edit dialog +2 fields; expanded row/intel "Conversion" display line | MEDIUM (recently rewritten in CR-030; consumption intel math lives here) |
| creation form (locate via grep — possibly same file or ItemEditorDialog) | +2 fields on create payload | LOW |

**Explicit non-goal (v1):** converting displayed stock quantities app-wide into consumption units. That's a P2 follow-up — quantity displays already have a working normalization layer (BUG-036); mixing conversion factors into it without a dedicated CR risks NaN regressions (R6).

### Conflict pre-check
`IngredientCatalogue.jsx`: CR-043 (this batch) also adds lock badges here. **Execution order: CR-042 BEFORE CR-043** (or same session sequential). BUG-029→036 (QA pending) touched consumption intel in this file — conversion display is additive, parallel-safe.

### Open Questions (owner)
1. Confirm v1 scope = create/edit fields + display only (no app-wide qty re-unit-ing)?
2. If `update-stock` can't persist conversion (probe result), acceptable to have conversion set at creation only for v1?

## 2. Implementation Plan (Gate 3)

### Edits

**Edit 1 — IngredientCatalogue.jsx edit dialog (state line ~166, payload line ~180).**
Add form state: `consumption_unit: item.consumption_unit || ""`, `converion_factor: item.converion_factor || ""`. Two inputs: "Consumption Unit" (text/select) + "Conversion Factor" (number, min 0). Helper preview under fields: `1 {form.unit} = {factor} {consumption_unit}`. Include in payload only when both set (pending probe on update-stock support). `// CR-042` marker.

**Edit 2 — IngredientCatalogue.jsx display.** In expanded row / intel block (~lines 74-140): when `item.has_unit_conversion` → badge/line `data-testid="ing-conversion-{id}"`: `1 {purchase_unit || unit} = {Number(converion_factor)} {consumption_unit}`.

**Edit 3 — creation form.** Same 2 fields wired into `addInventoryItem` items payload (`consumption_unit`, `converion_factor` keys, omit when empty).

### Execution sequence
R9 probes (update-stock with conversion fields; re-read master) → Edit 1-3.

### Scope lock
- **WILL change:** `IngredientCatalogue.jsx` (+ creation form file if separate)
- **Will NOT touch:** BUG-036 normalization layer (`lib/` consumption utils), StockInventorySummary quantities, api.js (payloads pass through existing methods)

### Verification Matrix

| # | File | Change | How to Verify | Automated? |
|---|------|--------|---------------|:---:|
| 1 | probe | update-stock supports fields | curl PUT update-stock/{id} w/ conversion → re-read master | YES |
| 2 | create | conversion persists | Create "CR042 Test Pack" pkt→piece ×12 → master shows has_unit_conversion=true | YES (curl) + UI |
| 3 | display | badge renders | Chicken shows "1 kg = 1000 gm"; item w/o conversion shows nothing (no null text) | NO |

### Post-code registry checklist
- [ ] registry.json: CR-042 → IMPLEMENTED · L3 · L7 · `// CR-042` markers · dashboard `--check` PASS
