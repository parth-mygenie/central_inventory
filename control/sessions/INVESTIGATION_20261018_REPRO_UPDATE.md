# INVESTIGATION UPDATE — 2026-10-18 (Re-probe with manager@mygenietest002.com / RID 828)

> **Agent Role:** INVESTIGATION
> **Previous doc:** `INVESTIGATION_20261018_MULTI_TOPIC.md`
> **New test account:** `manager@mygenietest002.com` / `Qplazm@10` / RID 828 (master, Mygenietest002)
> **All findings supersede previous where different**

---

## 1 — OQ-1: DEFINITIVELY ANSWERED

**Probe:** Dispatched item 20651 (makkhan, RID 828) using segment_id:241 (`batch: null`) + extra `batch`/`expiry_date` fields.

**Response:**
```json
{
  "status": false,
  "error_code": "LEGACY_SELECTOR_REQUIRED",
  "message": "Legacy stock without batch/expiry can only be dispatched using an explicit non-batch filter bucket selector."
}
```

### What this means

The backend **explicitly rejects** `segment_id` mode for un-batched segments. It requires `filter_bucket` mode (e.g. `{mode:"filter_bucket", bucket:"without_batch_and_expiry", ...}`).

There is no way to attach batch/expiry info during dispatch for un-batched stock. The only path to batch-tracking for previously-untracked stock is: add a new purchase WITH batch details → that creates a new batched segment → then dispatch from the new segment_id.

### CR-050 Option B revised scope

**Owner confirmed Option B.** Given this API constraint:

> Option B implementation = **Show an info badge on the row** (no block):
> "No batch tracking — dispatching from legacy stock bucket. To track batches, add a new purchase with batch details."
> Storekeeper can still dispatch via bucket mode (current behaviour preserved).
> A "Add Purchase" shortcut link navigates to `/purchase`.

**G-037 remains OPEN** — a dedicated "add batch info to existing segment" API is a future backend request, not blocking CR-050.

---

## 2 — G-036: CLOSED

**Re-probe with RID 828 AND RID 807 (fresh token):**

| Account | stored `po_coverage_days` | UPDATE result |
|---------|:---:|:---:|
| manager@mygenietest002.com (RID 828) | **3** ✅ | **Success** ✅ |
| manager@testcentral.com (RID 807) | **3** ✅ | **Success** ✅ |

Earlier `INVALID_SETTINGS_PAYLOAD` was a backend deployment timing issue. The key is now live on both accounts. **G-036 is CLOSED** — updated in L9.

**Impact on CR-048:** The frontend fallback logic (`po_coverage_days` defaults to 3) is still correct behaviour — it reads from `resolved_settings` which now always returns 3 if not user-overridden. The write path (update to custom value) also works. CR-048 can be planned without any backend blocker.

---

## 3 — Purchase Report: vendor-item-list CONFIRMED

**API:** `GET /inventory/vendor-item-list?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD`

### Response shape (complete)

```json
{
  "data": [
    {
      "ID": 13785,
      "restaurant_id": 828,
      "ingredient_id": 20651,
      "Restaurant_Name": "Mygenietest002",
      "restaurant_type_flag": "master",
      "Ingredient_Name": "makkhan",
      "Purchase_Date": "2026-10-18",
      "Vendor_Name": "masala dairy",
      "vendor_id": 282,
      "Quantity": "2 kg",
      "stock_quantity_raw": 2,
      "Amount": "0",
      "line_total": 0,
      "unit_price": 0,
      "Payment_Type": "",
      "transaction_id": "PUR-828-20261018-8003"
    }
  ],
  "total_amount": "0.00",
  "summary": {
    "applied_restaurant_ids": [828, 827],
    "total_records": 2,
    "actor_restaurant_type": "master",
    "scope_store_count": 2
  },
  "by_restaurant": [
    {
      "restaurant_id": 828,
      "restaurant_name": "Mygenietest002",
      "restaurant_type_flag": "master",
      "total_amount": 0,
      "line_count": 2
    }
  ]
}
```

### Field reference

| Field | Type | Notes |
|-------|------|-------|
| `ID` | int | Purchase line ID |
| `restaurant_id` | int | Store that made the purchase |
| `Restaurant_Name` | string | Store display name |
| `restaurant_type_flag` | string | `master` / `central` / `franchise` |
| `ingredient_id` | int | Inventory master ID |
| `Ingredient_Name` | string | Item name |
| `Purchase_Date` | string (YYYY-MM-DD) | Purchase/GRN date |
| `Vendor_Name` | string | Vendor name |
| `vendor_id` | int | Vendor ID |
| `Quantity` | string | Display qty with unit e.g. `"2 kg"` |
| `stock_quantity_raw` | number | Numeric qty only |
| `Amount` | string | Total amount (string, parse to float) |
| `line_total` | number | Same as Amount (float) |
| `unit_price` | number | Price per unit |
| `Payment_Type` | string | `Cash` / `Card` / `UPI` / etc. (empty if not set) |
| `transaction_id` | string | GRN reference e.g. `PUR-828-20261018-8003` |
| `total_amount` | string | Grand total across all rows |
| `summary.scope_store_count` | int | Number of stores in scope |
| `by_restaurant[]` | array | Per-store breakdown (id, name, type, total_amount, line_count) |

### Cross-store behaviour (important for master accounts)

`summary.applied_restaurant_ids: [828, 827]` — a master account sees purchases from ALL stores in its hierarchy, not just its own. `by_restaurant[]` provides the per-store breakdown for a "by store" grouping UI.

### Filter parameters (all confirmed working)

| Param | Type | Confirmed |
|-------|------|:---------:|
| `from_date` | YYYY-MM-DD | ✅ |
| `to_date` | YYYY-MM-DD | ✅ |
| `vendor_id` | int | ✅ |
| `ingredient_id` | int | ✅ |
| `payment_type` | string | ✅ |
| `per_page` / `page` | int | API accepts but does NOT paginate (returns all) |

### `getVendorItemList` already exists in api.js

`api.js` line 1083:
```javascript
function _getVendorItemList(restaurantId, { fromDate, toDate } = {}) {
  const params = new URLSearchParams();
  params.set("restaurant_ids[]", restaurantId);
  if (fromDate) params.set("from_date", fromDate);
  if (toDate) params.set("to_date", toDate);
  return client.get(`/proxy/v2/inventory/vendor-item-list?${params.toString()}`)
    .then((resp) => {
      return { ...resp, data: resp.data?.data || [] };  // ← strips summary/by_restaurant/total_amount
    });
}
const getVendorItemList = _cached("getVendorItemList", TTL.LONG, _getVendorItemList);
```

**Gaps for Purchase Report use:**
1. Strips `summary`, `by_restaurant`, `total_amount` from response (returns only `data[]`)
2. Missing filter params: `vendor_id`, `ingredient_id`, `payment_type`
3. Cache key includes `restaurantId` only — date range changes won't hit cache correctly if called with different dates

**Fix needed in PLANNING:** Extend `getVendorItemList` to accept all filter params + return full response.

### export-inventory-master clarified

`GET /inventory/export-inventory-master` → `download_url` to xlsx with columns: `ID, Ingredient Name, Purchase Date, Vendor Name, Quantity, Amount`

This is a **purchase history Excel export** — essentially the same data as `vendor-item-list` but as a downloadable file. It is the "Export to Excel" button on the Purchase Report screen.

---

## 4 — Scope: CR-051 Purchase Report Screen

### What to build

| Element | Detail |
|---------|--------|
| **Route** | `/reports/purchase` |
| **Nav entry** | Under "Reports" section in sidebar, after Wastage Report |
| **Data source** | `getVendorItemList(restaurantId, {fromDate, toDate, vendorId?, ingredientId?, paymentType?})` |
| **Date filter** | Default: last 30 days. Date range picker (same as DailyConsumptionReport) |
| **Filters** | Vendor dropdown, Ingredient search, Payment type pill |
| **Table columns** | Purchase Date · Store (for master) · Ingredient · Vendor · Qty · Unit Price · Amount · Payment · Transaction ID |
| **Summary bar** | Grand Total + store count + purchase count |
| **By-Store breakdown** | Accordion or tabs (master only) — per-store totals from `by_restaurant[]` |
| **Export** | "Export Excel" button → calls `GET /inventory/export-inventory-master` → opens `download_url` |
| **Visibility** | All roles (master, central, franchise) — same as Consumption + Wastage reports |

### Dependency on `screenVisibility.js` (FROZEN)

Must add to the Reports section in `screenVisibility.js`. Requires **owner approval** before code change (CI-R2).

---

## 5 — All Items Status

| Item | Status | Notes |
|------|:------:|-------|
| OQ-1: batch on un-batched dispatch | **CLOSED** | `LEGACY_SELECTOR_REQUIRED`. CR-050 Option B = info badge only |
| G-036: `po_coverage_days` | **CLOSED** | Works on both RID 807 + RID 828 |
| G-037: segment batch-update API | **OPEN** | No API, future request |
| vendor-item-list for Purchase Report | **CONFIRMED** | API + field mapping complete |
| export-inventory-master | **CONFIRMED** | Excel export for the same purchase data |
| getVendorItemList in api.js | **EXISTS** | Needs enhancement (filter params + full response) |
| screenVisibility.js frozen | **NOTED** | Owner approval needed for nav item |
| CR-050 Option B revised | **CONFIRMED** | Info badge + allow bucket dispatch |

---

## Ready for INTAKE

### CR-051 — Purchase Report Screen
All data needed. One owner decision needed: **approve modifying screenVisibility.js** to add the nav item.

### CR-052 — Bulk Stock Import (Add Stock screen)
`export-stock` + `upload-stock-excel` confirmed. No blockers.

### CR-053 — Raw Materials Bulk Import/Export
`import-inventory` needs `converion_factor` format — import template endpoint not yet found. Probe needed before INTAKE.
