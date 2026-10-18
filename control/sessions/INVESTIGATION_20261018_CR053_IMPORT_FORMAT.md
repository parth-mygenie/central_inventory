# INVESTIGATION — CR-053: Raw Materials Bulk Import/Export

> **Agent Role:** INVESTIGATION
> **Date:** 2026-10-18
> **Test account:** `manager@mygenietest002.com` / `Qplazm@10` / RID 828
> **API probes:** 20+ iterations on `import-inventory` + `export-inventory-master`

---

## 1 — export-inventory-master (Raw Materials EXPORT)

**Endpoint:** `GET /api/v2/vendoremployee/inventory/export-inventory-master`

**Response:**
```json
{
  "status": true,
  "message": "Stock report exported successfully!",
  "download_url": "https://preprod.mygenie.online/storage/stock_report_XXXX.xlsx"
}
```

**Excel file structure:**
- Sheet: `Stock Report`
- Columns: `ID`, `Ingredient Name`, `Purchase Date`, `Vendor Name`, `Quantity`, `Amount`
- Content: purchase/GRN HISTORY for the store (one row per purchase line)

**Classification: PURCHASE HISTORY REPORT — not an ingredient template**
The file exports a log of what was purchased and when. It is NOT a template for re-import.
It belongs on the **Purchase Report screen** (CR-051) as an "Export to Excel" button, NOT on the Raw Materials page.

**Already wired in `api.js`?** NO — a new API call needed for this endpoint.

---

## 2 — import-inventory (Raw Materials IMPORT)

**Endpoint:** `POST /api/v2/vendoremployee/inventory/import-inventory`
**Form field:** `file` (xlsx upload)

### What it does
Creates or updates ingredient definitions (inventory master records). This is for BULK SETUP of ingredients — e.g., when onboarding a new restaurant.

### Format discovery: POSITIONAL (not header-name based)

After 20+ probe iterations the format was reverse-engineered:

**The API reads by COLUMN POSITION, not by column header names.**
- A header row IS required (as a skip row) — the API skips row 1 always
- Data rows start at row 2
- Column headers can be ANYTHING — they are ignored

**Confirmed column map:**

| Position | Field | Type | Notes |
|----------|-------|------|-------|
| 0 | category_name | string | Looks up category by name; creates new if not found |
| 1 | stock_title | string | Ingredient name |
| 2 | unit | string | Display unit (kg, ltr, pcs, gm, ml, bundle, pkt, piece) |
| 3 | small_unit | string | Optional — small unit for conversion (e.g. gm for kg item) |
| 4 | min_unit_alert | string | Optional — the unit for the min threshold |
| 5+ | unknown | — | ≥6 column combinations trigger CONVERSION_FACTOR_REQUIRED validation |

**Working format variations (all confirmed with live probes):**

| Cols | Format | Use case |
|:----:|--------|---------|
| 3 | `[category, stock_title, unit]` | Minimal — no min threshold |
| 4 | `[category, stock_title, unit, min_qty_alert]` | Standard — with min threshold qty |
| 5 | `[category, stock_title, unit, small_unit, min_unit_alert]` | With small unit (no conversion factor set) |

**Example rows:**
```
Row 1: [Category, Stock Title, Unit, Min Qty, Min Unit]   ← skip row (any text)
Row 2: [Dairy, Butter, kg, 0.5, kg]                       ← simple ingredient
Row 3: [Spices, Cumin Seeds, kg, 100, gm]                 ← with small unit
Row 4: [Oils, Olive Oil, ltr, 500, ml]                    ← with small unit
```

### Critical limitation: `converion_factor` cannot be set via import

**Confirmed:** `converion_factor` field is NEVER correctly populated via the Excel import. In all successful 5-column imports, `converion_factor` remains `None` and `has_unit_conversion: False`.

The 1000 value passed at position 4 goes to `min_unit_alert` (string), not `converion_factor`.

**Implication for CR-053:** Ingredients that use `has_unit_conversion: true` (CR-042 scope, e.g., buying in `pkt` but consuming in `pieces`) CANNOT be set up via import. They must be created via the normal add-ingredient UI.

### Template download: NO ENDPOINT EXISTS

All guessed template endpoints returned 404:
`/inventory/import-inventory-template`, `/inventory/inventory-master-template`,
`/inventory/download-template`, `/inventory/import-template`, etc.

**Implication for CR-053:** The "Download Template" button on the Raw Materials page must serve a **client-generated** Excel file from the frontend (hardcoded column structure), OR display inline instructions showing the expected format.

---

## 3 — Summary Table

| Feature | Endpoint | Status | Where it goes |
|---------|----------|:------:|---------------|
| Export ingredient list as report | `GET /inventory/export-inventory-master` | ✅ Working | Purchase Report screen (CR-051) — "Export" button |
| Import ingredients (bulk create) | `POST /inventory/import-inventory` | ✅ Working (basic) | Raw Materials page — "Import" button |
| Import template download | None found | ❌ 404 | Frontend must generate template |
| Set `converion_factor` via import | Not possible | ❌ Limitation | Use add-ingredient UI for conversion items |

---

## 4 — CR-053 Scope

### Export (Raw Materials page)
- "Export" button → calls `export-inventory-master` → shows download link or auto-downloads `.xlsx`
- File is a purchase history report (labeled clearly as "Purchase History Export")
- **NOTE:** This same export is ALSO the data source for CR-051 Purchase Report screen's "Export to Excel" button — same endpoint, two places

### Import (Raw Materials page)
- "Import" button → opens a modal with:
  1. "Download Template" → downloads client-generated template with correct column structure (3 sample columns + header row)
  2. File picker → uploads to `POST /import-inventory`
  3. Shows success/error feedback
- Template format (generated by frontend):

```
Category Name | Stock Title | Unit | Min Qty Alert | Min Unit Alert
Dairy         | Butter      | kg   | 0.5           | kg
Spices        | Cumin Seeds | kg   | 100           | gm
Oils          | Olive Oil   | ltr  | 500           | ml
```

- **Limitation warning** in modal: "Items with unit conversion (e.g., buying in packs, consuming by piece) cannot be bulk imported. Add these via the individual ingredient form."

### No new API needed
Both endpoints already exist in the POS API. `import-inventory` needs a new proxy function in `api.js`. `export-inventory-master` also needs a new function (separate from `getVendorItemList`).

---

## 5 — Files to change for CR-053

| File | Change |
|------|--------|
| `frontend/src/services/api.js` | Add `exportInventoryMaster()` + `importInventory(file)` |
| `frontend/src/components/central-inventory/IngredientCatalogue.jsx` (or RawMaterials) | Add Import/Export buttons |
| `frontend/src/lib/screenVisibility.js` (**FROZEN**) | No change needed — this is on existing Raw Materials page, not a new nav item |

**screenVisibility.js not needed** — import/export are buttons on the existing ingredient page, not a new sidebar item.

---

## 6 — Open questions for PLANNING

1. **Export file positioning:** The `export-inventory-master` export shows purchase history, not ingredient definitions. Should the "Export" on Raw Materials page export ingredient definitions (ID, Name, Unit, Min Qty) instead? If so, a different export format/endpoint is needed — OR the current report export is accepted as the Raw Materials export.

2. **Template language:** Should the template download be an actual `.xlsx` file or a visible table of instructions?

3. **Duplicate handling:** The import updates existing ingredients if `stock_title` matches. Confirm the exact matching key (by name? by ID?).
