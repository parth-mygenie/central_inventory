# CR-051 — Intake Artifact (Gate 1)

> **ID:** CR-051
> **Type:** CR
> **Registered:** 2026-10-18
> **Agent Role:** INTAKE
> **Severity:** P2 — MEDIUM
> **Source:** INVESTIGATION_20261018_REPRO_UPDATE.md (vendor-item-list API probed live, manager@mygenietest002.com / RID 828)

---

## Problem Statement

There is no Purchase Report screen in Central Inventory. Storekeepers and managers have no way to view or export a history of what was purchased, from which vendor, on which date, and at what amount — all within the app. The data is available via the POS API (`vendor-item-list` endpoint) but no frontend screen exists.

---

## Scope

| Element | Detail |
|---------|--------|
| **Route** | `/reports/purchase` |
| **Nav entry** | Under existing "Reports" section in sidebar, after Wastage Report |
| **Data source** | `GET /inventory/vendor-item-list?from_date=&to_date=` — already wired as `getVendorItemList` in `api.js` line 1083 (needs enhancement — see below) |
| **Date filter** | Default: last 30 days. Date range picker. Same pattern as `DailyConsumptionReport`. |
| **Optional filters** | Vendor dropdown, Ingredient name search, Payment type pills |
| **Table columns** | Purchase Date · Store (master/central roles only) · Ingredient · Vendor · Qty · Unit Price · Amount · Payment Type · Transaction ID |
| **Summary bar** | Grand Total (`total_amount`) · purchase count (`summary.total_records`) · store count (`summary.scope_store_count`) |
| **By-store breakdown** | Accordion or tab group for master/central accounts — per-store totals from `by_restaurant[]` |
| **Export button** | "Export Excel" → calls `GET /inventory/export-inventory-master` → opens `download_url`. Owner confirmed: just build the button, Excel content/format can change later based on feedback. |
| **Visibility** | All roles: master, central, franchise |

---

## API Confirmed (live probed)

**`GET /inventory/vendor-item-list?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD`**

Response shape:
```json
{
  "data": [
    {
      "ID": 13785,
      "restaurant_id": 828,
      "Restaurant_Name": "Mygenietest002",
      "restaurant_type_flag": "master",
      "ingredient_id": 20651,
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

Cross-store: master accounts see purchases from ALL hierarchy stores. `by_restaurant[]` provides per-store breakdown.

Confirmed filter params: `vendor_id`, `ingredient_id`, `payment_type`, `from_date`, `to_date`.

**`GET /inventory/export-inventory-master`** — returns `{ download_url: "https://..." }` to an xlsx purchase history export.

---

## `getVendorItemList` enhancement needed

Current `api.js` line 1083 strips `summary`, `by_restaurant`, and `total_amount` from the response (returns only `data[]`). Also missing filter params. Needs extension:

```javascript
// CURRENT (insufficient):
function _getVendorItemList(restaurantId, { fromDate, toDate } = {}) {
  // ... only passes from_date, to_date
  return client.get(...).then(resp => ({ ...resp, data: resp.data?.data || [] }));
}

// NEEDED for CR-051:
// - Add: vendorId?, ingredientId?, paymentType? params
// - Return: full response (data[], summary, by_restaurant, total_amount)
// - Add: exportPurchaseReport() → GET /inventory/export-inventory-master
```

---

## Code Reality

**NONE** — no `PurchaseReport.jsx` component exists. `getVendorItemList` exists but needs enhancement. `exportInventoryMaster` does not exist in api.js.

---

## Duplicate Check

**DISTINCT.** No existing CR covers a purchase history report screen.

Related:
- CR-047/048/049 (purchase forms — different flow)
- CR-052 (bulk import — same page, different button)

---

## Blast Radius

- New file: `frontend/src/components/central-inventory/PurchaseReport.jsx`
- Modify: `frontend/src/services/api.js` — extend `getVendorItemList` + add `exportInventoryMaster`
- Modify: `frontend/src/App.js` — add route `/reports/purchase`
- Modify: `frontend/src/lib/screenVisibility.js` (**FROZEN** — requires owner approval)
- Estimated scope: **SMALL** (~1-2 days)
- Hotspot: `api.js` (HIGH-RISK), `screenVisibility.js` (FROZEN)

---

## Severity

**P2 — MEDIUM**

No workaround exists inside the app for purchase history viewing. Data is available via API. Not a crash or data-loss issue.

---

## Owner Decisions

| Question | Answer |
|----------|--------|
| Export button Excel format | "Just build the button — Excel content can change based on feedback" ✅ |
| Visibility | All roles ✅ |
| `screenVisibility.js` edit approval | **PENDING** — FROZEN file requires explicit owner GO before code change |

---

## Open Questions

**OQ-1 — screenVisibility.js approval (FROZEN)**

Adding the "Purchase Report" nav item requires editing `screenVisibility.js` which is frozen (CI-R2). Owner must explicitly approve this edit before PLANNING can proceed.

Proposed addition:
```javascript
{ id: "purchase-report", screen: "scr-purchase-report", label: "Purchase Report",
  path: "/reports/purchase", icon: "ShoppingCart" }
```
Plus new screen key: `"scr-purchase-report": { master: FULL, central: FULL, franchise: FULL }`.

---

## Next Step

→ PLANNING agent: Impact Analysis (Gate 2) + Implementation Plan (Gate 3)
→ **Resolve OQ-1 first** — get owner approval for `screenVisibility.js` edit.
