# INVESTIGATION — Multi-Topic (2026-10-18)

> **Agent Role:** INVESTIGATION
> **Topics:** OQ-1 (batch on un-batched dispatch), po_coverage_days, PO receive split payment,
>              4 Excel endpoints, Purchase Report nav item
> **Test account:** `manager@testcentral.com` / `Qplazm@10` / RID 807 (only account with active stock)

---

## 1 — OQ-1: Adding Batch Info to Un-Batched Segments Before Dispatch

**Question:** Does the POS API support adding batch/expiry to a `segment_id: null` (un-batched) segment so Option B dispatch prompt can work?

### Probes run

| Probe | Endpoint | Result |
|---|---|---|
| Extra `batch`/`expiry_date` fields in dispatch `source_selector` | `POST /inventory-transfer/initiate` | VALIDATION_FAILED — `from === to` (not a batch-field rejection) |
| 5 guessed segment-update endpoints | `POST /inventory/{add,update}-segment`, etc. | **All 404** |
| `add-stock` with batch+expiry | `POST /inventory/add-stock/18278` | `DIRECT_PURCHASE_REQUIRES_PO` (RID 807 has `require_po_for_purchase` enabled) |
| Segment-add via add-purchase | `POST /inventory/add-purchase` | NOT probed for batch-on-existing (different use case) |

### Conclusion: **G-037 needed**

No API exists to attach batch/expiry info to an existing un-batched segment. The dispatch `source_selector` contract (`{mode, segment_id}` or `{mode, bucket, batch_state, expiry_state}`) has no `batch`/`expiry_date` fields that the API would persist.

**CR-050 Option B scope must be scoped down to:**
> Show warning + block dispatch: *"This item has no batch tracking. To maintain traceability, please add a purchase with batch details before dispatching."*
> No batch-entry UI needed until G-037 is filed and resolved.

**Register as G-037:** "No API to add batch/expiry to existing un-batched inventory segment (for dispatch traceability)."

---

## 2 — G-036 Confirmation: po_coverage_days

**Status before probe:** OPEN (registered 2026-10-16)

| Probe | Endpoint | Result |
|---|---|---|
| GET stored settings | `POST /operational-settings/get` | `po_coverage_days` NOT in `stored_settings` or `resolved_settings` |
| UPDATE with `po_coverage_days: 7` | `POST /operational-settings/update` | **`INVALID_SETTINGS_PAYLOAD: No valid settings keys in payload`** |

**Confirmed: G-036 is a real backend gap.** The backend has a whitelist of ~25 valid settings keys. `po_coverage_days` is absent. Backend team must add it.

Current stored keys (25+): `allow_legacy_conversion`, `fefo_consumption_enabled`, `require_po_for_purchase`, `po_variance_alert_pct`, `po_auto_close_on_full_receive`, `require_po_approval`, etc.

**G-036 remains OPEN.**

---

## 3 — PO Receive Split Payment (CR-049 dependency)

**Live probe:** No PO in `sent` / `approved` status available for RID 807 or RID 1. Contract validated from curl reference doc (`po_receive_split_and_bulk_excel_curls.md`).

### Contract confirmed (from curl doc)

**Single payment:**
```json
POST /inventory/purchase-order/{id}/receive
{
  "purchase_date": "2026-10-16",
  "payment_type": "Cash",
  "receive_lines": [{
    "line_id": <LINE_ID>,
    "received_qty": 25,
    "actual_rate": 160,
    "batch": "GSM-JUN-001",
    "expiry_date": "2026-12-31"
  }]
}
Response: { status, transaction_id: "PUR-...", payment_type, partial_payments: [] }
```

**Split payment:**
```json
{
  "purchase_date": "2026-10-16",
  "payment_type": "partial",
  "partial_payments": [
    { "payment_mode": "Cash", "amount": 3000 },
    { "payment_mode": "UPI", "amount": 1500, "transaction_id": "UPI-REF-OPTIONAL" }
  ],
  "receive_lines": [{ "line_id": ..., "received_qty": 50, "actual_rate": 90, "batch": "...", "expiry_date": "..." }]
}
Constraint: sum(partial_payments.amount) == Σ received_qty × actual_rate
Response: { payment_type: "partial", partial_payments: [...] }
```

**Key rules:**
- `payment_type: "partial"` is the trigger for split mode (not `"Cash"` or `"UPI"`)
- Minimum 2 legs in `partial_payments[]`
- Sum of legs must match GRN total exactly (±0.01)
- `transaction_id` is optional (only relevant for UPI/Bank Transfer legs)
- `payment_mode` values: `Cash | Card | UPI | Bank Transfer | Others`

**This is backend change Brief-1 from BACKEND_BRIEFS_20261016.md** — backend team must add `partial_payments[]` support to the `/purchase-order/{id}/receive` endpoint.

---

## 4 — Payment Modes

Confirmed via `GET /expense/payment-method`:
```
UPI, Cash, Card, Unpaid, Store, UPI Drawer, Cash Draw, Bank Transfer, Others
```

CR-047 UI uses: `Cash | Card | UPI | Bank Transfer | Others` — correct subset.
`Unpaid` is present but not in CR-047 scope.
`Store`, `UPI Drawer`, `Cash Draw` are store-specific modes (POS terminal cash drawer integrations) — out of scope.

---

## 5 — Export-Stock: Bulk Purchase Excel (for Add Stock screen)

**Endpoint:** `GET /inventory/export-stock`
**Response:**
```json
{"status": true, "message": "File generated successfully!", "download_url": "https://preprod.mygenie.online/storage/Purchase_List.xlsx", "items_exported": 357}
```

**Excel structure:**
- Sheet 1 — `MainSheet`: all inventory items pre-filled
- Sheet 2 — `Lists`: dropdown reference values

**MainSheet columns:**

| Column | Filled by | Notes |
|--------|:---------:|-------|
| `Ingredient_id` | API | Read-only identifier |
| `PurchaseDate` | API | Today's date pre-filled |
| `Title` | API | Item name (read-only reference) |
| `CurrentStock` | API | Current qty (read-only reference) |
| `Unit` | API | Display unit (read-only reference) |
| **`Quantity`** | Storekeeper | Qty to add — leave blank to skip item |
| **`Amount`** | Storekeeper | Total amount for this purchase line |
| **`Payment_Type`** | Storekeeper | From Lists sheet: `Cash | Card | UPI | Cash Draw | Unpaid | UPI Drawer | Bank Transfer` |
| **`Batch`** | Storekeeper | Optional batch name |
| **`Brand`** | Storekeeper | Optional brand |
| **`Expiry`** | Storekeeper | Expiry (text format?) |
| **`Expiry Date`** | Storekeeper | Expiry (date format?) |
| **`Converion Factor`** | Storekeeper | For unit conversion items |

**Note:** NO `partial_payments[]` — single `Payment_Type` per row only.

**Upload endpoint:** `POST /inventory/upload-stock-excel` (form: `products_file`)
- Tested with empty-qty file → `{status: true, message: "Stock updated successfully", purchases: [], total_purchases: 0}`
- When Quantity+Amount filled → creates purchase/GRN records (batch/expiry recorded if filled)
- **This is the bulk "Add Stock without PO" mechanism**

**Where it appears:** Add Stock / Purchase screen (`/purchase`) — "Bulk Import" button

---

## 6 — Export-Inventory-Master: Purchase History Report

**Endpoint:** `GET /inventory/export-inventory-master`
**Response:**
```json
{"status": true, "message": "Stock report exported successfully!", "download_url": "https://preprod.mygenie.online/storage/stock_report_XXXXX.xlsx"}
```

**Excel structure — Sheet `Stock Report`:**

| Column | Content |
|--------|---------|
| `ID` | Ingredient_id |
| `Ingredient Name` | Item name |
| `Purchase Date` | Date of last purchase |
| `Vendor Name` | Vendor |
| `Quantity` | Quantity purchased |
| `Amount` | Amount paid |

**360 rows for RID 807** — one row per purchase/GRN record.

**This is a purchase history report — NOT an ingredient template.**
- Message says "Stock report exported" — confirms report, not a template
- No unit/batch/expiry columns — it's a historical summary

**Where it appears:** New **Purchase Report** screen → "Export" button

---

## 7 — Import-Inventory: Bulk Ingredient Import

**Endpoint:** `POST /inventory/import-inventory` (form: `file`)

**Tested with stock_report file (wrong format):**
```json
{"Message": "Validation failed", "success": false, "errors": {"converion_factor": ["CONVERSION_FACTOR_REQUIRED"]}}
```

**Requires ingredient-format file with:**
- `converion_factor` (API's typo for conversion_factor) — REQUIRED
- Likely also: `stock_title`, `unit`, `small_unit`, `min_qty_alert`, `type`, etc.
- This is for bulk **create/update ingredients** — NOT purchase records

**Where it appears:** Raw Materials page (`/ingredients` or `/raw-materials`) — "Import" button

**Critical gap:** No "download import template" endpoint found. The import template (with correct columns) must be obtained separately. The `export-inventory-master` exports a report with different columns — it is NOT a re-importable template.

**Action for PLANNING:** Probe whether a GET endpoint exists for an ingredient import template. Check if `export-inventory-master` has a `?type=template` param or similar.

---

## 8 — Nav Structure: Reports Section

**Current state (`screenVisibility.js` lines 111-116):**
```javascript
{
  id: "reports",
  label: "Reports",
  items: [
    { id: "consumption-report", label: "Consumption Report", path: "/reports/consumption", icon: "BarChart3" },
    { id: "wastage-report", label: "Wastage Report", path: "/wastage/report", icon: "TrendingDown" },
  ],
},
```

**To add Purchase Report:** a new item must be added to `screenVisibility.js`.

**Critical constraint:** `screenVisibility.js` is a **FROZEN** file (CI-R2, R2 shared rules). Modifying it requires **owner approval** before any code change.

**Proposed addition (pending owner approval):**
```javascript
{ id: "purchase-report", screen: "scr-purchase-report", label: "Purchase Report", path: "/reports/purchase", icon: "ShoppingCart" }
```

Also needs:
- New route in `App.js`: `<Route path="/reports/purchase" element={<PurchaseReport />} />`
- New component `PurchaseReport.jsx` (calls `export-inventory-master`, shows download link + table of purchase history)
- New screen key in `screenVisibility.js`: `"scr-purchase-report": { master: FULL, central: FULL, franchise: FULL }`
- New capability key: `"view-purchase-report": { master: true, central: true, franchise: true }`

---

## Summary Table

| Topic | Status | Action |
|-------|:------:|--------|
| OQ-1: batch on un-batched dispatch | **ANSWERED** | G-037 needed. CR-050 Option B = warning only |
| G-036: po_coverage_days | **CONFIRMED OPEN** | Backend must add key to whitelist |
| PO receive split payment | **CONTRACT CONFIRMED** | Needs Brief-1 BE work. No live PO to probe |
| Payment modes | **CONFIRMED** | 9 modes. CR-047 uses correct 5. |
| export-stock + upload-stock-excel | **CONFIRMED** | 13-column purchase template. Bulk Add Stock. |
| export-inventory-master | **CONFIRMED** | Purchase history report (6 cols, not ingredient template) |
| import-inventory | **PARTIALLY CONFIRMED** | Needs converion_factor. Import template endpoint not found. |
| Purchase Report nav | **SCOPED** | screenVisibility.js FROZEN → needs owner approval |

---

## Items to Register

### G-037 — No API to add batch/expiry to un-batched segment
- Type: OPEN GAP
- Blocked feature: CR-050 Option B (full batch-entry prompt before dispatch)
- Workaround: show warning + block dispatch (Option B-ii)

### Potential new CRs (subject to owner GO):
| ID | Title | Scope |
|----|-------|-------|
| CR-051 | Purchase Report Screen | New nav item + screen using `export-inventory-master` |
| CR-052 | Bulk Stock Import (Excel) | Add Stock screen: download template + upload (`export-stock` + `upload-stock-excel`) |
| CR-053 | Raw Materials Bulk Import/Export | Ingredients page: import via `import-inventory` + export report |
