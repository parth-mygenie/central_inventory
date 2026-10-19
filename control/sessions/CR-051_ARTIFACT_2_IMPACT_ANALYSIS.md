# CR-051 — Gate 2: Impact Analysis

> **ID:** CR-051
> **Artifact:** 2 — Impact Analysis
> **Role:** PLANNING
> **Date:** 2026-10-19
> **Credential used:** owner@mygenietest002.com / Qplazm@10 (RID 828, master type)
> **OQ-1 resolution:** Owner directed Gate 2 to proceed → `screenVisibility.js` edit approved
> **Feeds:** CR-051_ARTIFACT_3_IMPLEMENTATION_PLAN.md (Gate 3)

---

## Conflict Pre-Check (Step 1)

### L7 File Ownership

| File | Last Modifier | Last Item | Conflict? |
|------|--------------|-----------|-----------|
| `api.js` | CR-047 (2026-10-18) | `addPurchase()` | ✅ NONE — CR-047 IMPLEMENTED |
| `App.js` | CR-036-prod (2026-07) | Production routes | ✅ NONE — no open item |
| `screenVisibility.js` | CR-027-prod (2026-07) | Production screen | ✅ NONE — owner approved edit |
| `PurchaseReport.jsx` | — | NEW FILE | ✅ NONE |

**Conflict:** NONE. All existing items on these files are CLOSED/IMPLEMENTED. OQ-1 resolved by owner direction.

**HIGH-RISK:** `api.js` — requires extra care (CI-R5). `screenVisibility.js` — FROZEN, owner-approved for this change only.

---

## API Probes (Step 1b)

### Probe 1 — vendor-item-list full response shape
```
GET /api/proxy/v2/inventory/vendor-item-list?from_date=2026-10-01&to_date=2026-10-19
RID 828 (master) → data count: 1 | total_amount: 160.00

Response top keys: ['data', 'total_amount', 'summary', 'by_restaurant']

Record shape confirmed:
{
  "ID": 13786,
  "restaurant_id": 828,
  "ingredient_id": 20856,
  "Restaurant_Name": "Mygenietest002",
  "restaurant_type_flag": "master",
  "Ingredient_Name": "makkhan",
  "Purchase_Date": "2026-10-18",
  "Vendor_Name": "masala dairy",
  "vendor_id": 282,
  "Quantity": "2 kg",             ← display string
  "stock_quantity_raw": 2,         ← numeric
  "Amount": "160",                 ← display string (use line_total for math)
  "line_total": 160,               ← numeric ✅
  "unit_price": 0.08,              ← numeric
  "Payment_Type": "Cash",
  "transaction_id": "PUR-828-20261018-8005"
}

summary: {
  "applied_restaurant_ids": [828, 827],
  "total_records": 1,
  "actor_restaurant_type": "master",
  "scope_store_count": 2
}

by_restaurant: [{
  "restaurant_id": 828,
  "restaurant_name": "Mygenietest002",
  "restaurant_type_flag": "master",
  "total_amount": 0,               ← NOTE: 0 not 160 — trust top-level total_amount
  "line_count": 2
}]
```

### Probe 2 — vendor_id filter confirmed
```
GET ?vendor_id=282 → data count: 1 ✅
Filter params confirmed working: vendor_id, from_date, to_date
(ingredient_id, payment_type not re-probed — confirmed in intake)
```

### Probe 3 — export-inventory-master
```
GET /api/proxy/v2/inventory/export-inventory-master
→ { "status": "success", "message": "...", "download_url": "https://preprod.mygenie.online/storage/stock_report_XXXXXXXXXX.xlsx" }
download_url confirmed present ✅
```

### Important observation from probes
- `by_restaurant[].total_amount = 0` even when top-level `total_amount = 160` — do NOT trust `by_restaurant` totals for display; only use them for the accordion row count (`line_count`). Display total from top-level `total_amount`.
- `unit_price` = 0.08 (numerically correct). `Amount = "160"` (string). Always use `line_total` (numeric) for totalling.
- `amount` display: use `"₹" + Number(record.line_total).toLocaleString()` not `record.Amount`.

---

## Data Flow Trace (Step 2)

### Current flow (broken)
```
User wants purchase history
→ No screen in app → must export from POS backend directly → not accessible in Central Inventory
```

### New flow (CR-051)
```
Sidebar → Reports → Purchase Report → /reports/purchase

Page mount:
  → getVendorItemList({ fromDate: last30d, toDate: today }) [enhanced]
  → returns { data[], total_amount, summary, by_restaurant }

Filters (re-fetch on change, 400ms debounce):
  Date range  → DateRangePicker (same component as DailyConsumptionReport)
  Vendor      → <select> populated from data's unique Vendor_Name values
  Ingredient  → text search (client-side filter on Ingredient_Name)
  Payment type→ pills: All / Cash / Card / UPI / Bank Transfer / Others

Table renders data[] rows:
  Purchase Date | Store* | Ingredient | Vendor | Qty | Unit Price | Amount | Payment Type | Txn ID
  (* Store column: shown only when restaurantType === "master" or "central")

Summary bar:
  Total ₹{total_amount} · {summary.total_records} purchases · {summary.scope_store_count} stores

By-store accordion (master/central only):
  Collapsed by default. Expand to see per-store line_count

Export button:
  → exportInventoryMaster() → GET /inventory/export-inventory-master
  → { download_url } → window.open(download_url)
```

---

## Affected Files (Step 2)

### File 1: `api.js` — MODIFY (HIGH-RISK)

**Change A — Enhance `_getVendorItemList` (line 1090)**

Current:
```javascript
function _getVendorItemList(restaurantId, { fromDate, toDate } = {}) {
  const params = new URLSearchParams();
  params.set("restaurant_ids[]", restaurantId);
  if (fromDate) params.set("from_date", fromDate);
  if (toDate) params.set("to_date", toDate);
  return client.get(`/proxy/v2/inventory/vendor-item-list?${params.toString()}`).then((resp) => {
    return { ...resp, data: resp.data?.data || [] };  // ← STRIPS summary/by_restaurant/total_amount
  });
}
```

New:
```javascript
// CR-051 — enhanced: filter params + full response (summary, by_restaurant, total_amount)
function _getVendorItemList(restaurantId, { fromDate, toDate, vendorId, ingredientId, paymentType } = {}) {
  const params = new URLSearchParams();
  params.set("restaurant_ids[]", restaurantId);
  if (fromDate)     params.set("from_date", fromDate);
  if (toDate)       params.set("to_date", toDate);
  if (vendorId)     params.set("vendor_id", vendorId);
  if (ingredientId) params.set("ingredient_id", ingredientId);
  if (paymentType)  params.set("payment_type", paymentType);
  return client.get(`/proxy/v2/inventory/vendor-item-list?${params.toString()}`).then((resp) => {
    // Return full response — data[], total_amount, summary, by_restaurant
    return { ...resp, data: resp.data };
  });
}
```

**NOTE:** `_cached` key is derived from args — adding new optional params creates new cache keys. Existing callers that don't pass the new params continue to get the old cache key. **NO cache break.**

**Change B — Add `exportInventoryMaster` (insert after line 1099)**

```javascript
// CR-051 — Purchase Report export
function exportInventoryMaster() {
  return client.get("/proxy/v2/inventory/export-inventory-master");
}
```

**Change C — Export `exportInventoryMaster` in exports block (line ~1309)**

Add `exportInventoryMaster` to the `return { ... }` exports.

**Risk:** MEDIUM. `_getVendorItemList` currently returns `{ data: [] }` — changing it to return `{ data: { data[], total_amount, summary, by_restaurant } }`. MUST check all existing callers to ensure they don't break.

**Existing callers check:**
```bash
grep -rn "getVendorItemList" frontend/src/ --include="*.jsx" --include="*.js"
```
→ `VendorManagement.jsx` uses it. Must verify that component reads `resp.data` correctly after change.

---

### File 2: `PurchaseReport.jsx` — NEW FILE

**Path:** `frontend/src/components/central-inventory/PurchaseReport.jsx`

**Key sections:**
```
1. State:
   dateRange { from, to } — default: last 30 days
   vendorFilter, paymentFilter, searchText
   data[], totalAmount, summary, byRestaurant
   loading, error

2. Data fetch:
   useEffect on [dateRange, vendorFilter, paymentFilter] (400ms debounce)
   → api.getVendorItemList(restaurantId, { fromDate, toDate, vendorId, paymentType })
   → set data = resp.data?.data || []
   → set totalAmount = resp.data?.total_amount
   → set summary = resp.data?.summary
   → set byRestaurant = resp.data?.by_restaurant || []

3. Client-side filter:
   displayRows = data.filter(r => !searchText || r.Ingredient_Name.toLowerCase().includes(searchText.toLowerCase()))

4. Layout:
   [Date range picker] [Vendor select] [Payment type pills: All/Cash/Card/UPI/Bank/Others]
                                                                    [Export Excel button]
   Summary bar: Total ₹XX · N purchases · N stores
   [By-store accordion] (master/central only)
   Table: Purchase Date | Store* | Ingredient | Vendor | Qty | Unit Price | Amount | Payment | Txn ID

5. Export:
   onClick → api.exportInventoryMaster() → window.open(resp.data?.download_url)
```

**Pattern to follow:** `DailyConsumptionReport.jsx` — same `DateRangePicker` component, same layout skeleton.

---

### File 3: `App.js` — MODIFY

**Add import and route:**

```javascript
// Import (near other report imports)
import PurchaseReport from "@/components/central-inventory/PurchaseReport";

// Route (after existing /wastage/report)
<Route path="/reports/purchase" element={<PurchaseReport />} />
```

**Risk:** LOW. Simple import + route addition. Pattern identical to `WastageReport` and `DailyConsumptionReport`.

---

### File 4: `screenVisibility.js` — MODIFY (FROZEN — owner approved)

**Two additions:**

**A — SCREEN_VISIBILITY entry (after line 48):**
```javascript
"scr-purchase-report": { master: FULL, central: FULL, franchise: FULL },
```

**B — NAV_SECTIONS reports section (after wastage-report entry, line 115):**
```javascript
{ id: "purchase-report", screen: "scr-purchase-report", label: "Purchase Report", path: "/reports/purchase", icon: "Receipt" },
```

**Risk:** LOW. Additive-only changes. The frozen status means owner approval needed — given. `getVisibleNavSections` automatically picks up new items. No other code changes needed.

---

## Downstream Consumer Check

### `VendorManagement.jsx` — MUST VERIFY

Current call:
```javascript
// Find the exact call pattern
grep -n "getVendorItemList" frontend/src/components/central-inventory/VendorManagement.jsx
```
If it reads `resp.data` directly (expects `data[]`) the enhancement breaks it.

**Resolution:** The enhancement changes the return from `{ data: [] }` to `{ data: { data[], total_amount, summary, by_restaurant } }`. VendorManagement must read `resp.data?.data || []`. This is a breaking change if it currently reads `resp.data` as an array.

→ Must check before implementing. If VendorManagement reads `resp.data` as array: add a backwards-compat shim or create a second function `getVendorItemListFull`.

**Decision (no owner input needed):** Create `getVendorItemListFull()` as a new function that returns full response. Keep `getVendorItemList` unchanged (returns `data[]` for VendorManagement). CR-051 uses `getVendorItemListFull`. Zero risk of breaking VendorManagement.

---

## Scope Lock

**Files WILL change:**
1. `frontend/src/services/api.js` — add `getVendorItemListFull` + `exportInventoryMaster`; do NOT modify existing `getVendorItemList`
2. `frontend/src/components/central-inventory/PurchaseReport.jsx` — NEW FILE
3. `frontend/src/App.js` — 1 import + 1 route
4. `frontend/src/lib/screenVisibility.js` — 2 line additions (FROZEN, owner approved)

**Files will NOT touch:**
- `VendorManagement.jsx` — `getVendorItemList` unchanged, no impact
- `backend/server.py` — proxy-only
- Any other frozen files

---

## Risk Register

| # | Risk | Level | Mitigation |
|---|------|:-----:|-----------|
| R1 | `getVendorItemList` change breaks VendorManagement | HIGH | Resolved: create `getVendorItemListFull` instead, leave existing function intact |
| R2 | `by_restaurant[].total_amount = 0` misleads store breakdown | LOW | Use `line_count` only from `by_restaurant`; display total from top-level `total_amount` |
| R3 | `screenVisibility.js` edit introduces wrong screen key | LOW | Add to SCREEN_VISIBILITY AND NAV_SECTIONS — both required |
| R4 | `export-inventory-master` download URL opens in current tab | LOW | Use `window.open(url, '_blank')` |
| R5 | Large date range returns > 1000 records | LOW | Add client-side pagination OR limit display to 200 with "showing first 200" note |

---

## Open Questions

**None after OQ-1 resolution.** All owner decisions confirmed:
- `screenVisibility.js` edit: APPROVED (owner directed Gate 2)
- Export button scope: "just build it" ✅
- Visibility: all roles ✅

---

## Verification Matrix (seeds Gate 6 QA)

| # | Check | How |
|---|-------|-----|
| V1 | "Purchase Report" appears in sidebar under Reports | Login → sidebar → Reports section shows 3 items |
| V2 | All roles see it (master / central / franchise) | Login as each type → Reports section has Purchase Report |
| V3 | Route `/reports/purchase` loads without error | Navigate directly |
| V4 | Default date range: last 30 days | Page loads → date picker shows 30d range |
| V5 | Table populated with purchases | RID 828 → makkhan purchase shows in table |
| V6 | Summary bar shows total_amount | "Total ₹160.00 · 1 purchase" |
| V7 | Vendor filter narrows results | Select "masala dairy" → only makkhan rows |
| V8 | Ingredient text search narrows results | Type "mak" → only makkhan rows |
| V9 | Payment type pill "Cash" narrows results | makkhan has Payment_Type=Cash → shows |
| V10 | Store column visible for master accounts | RID 828 (master) → Restaurant_Name column present |
| V11 | By-store accordion visible for master/central | RID 828 → accordion shows Mygenietest002 |
| V12 | Export button opens download URL | Click Export → `window.open(download_url)` fires |
| V13 | `getVendorItemList` in VendorManagement unchanged | Open VendorManagement → no regression |
| V14 | `exportInventoryMaster` exported in api.js | `grep "exportInventoryMaster" api.js` → 2 hits (decl + export) |

---

## Gate 2 Summary

| Field | Value |
|-------|-------|
| Code reality | NONE — new screen, 2 api.js additions, 1 route, 1 nav entry |
| Conflict | NONE |
| Files WILL change | 4 (new PurchaseReport.jsx + api.js + App.js + screenVisibility.js) |
| Files NOT touching | VendorManagement.jsx (key decision: new function, not modify existing) |
| API probed | vendor-item-list ✅ export-inventory-master ✅ vendor_id filter ✅ |
| OQ-1 | RESOLVED — owner approved screenVisibility.js edit |
| Risks | 5 (R1 resolved by design: new function; rest LOW) |
| Verification checks | 14 |

**→ Gate 2 COMPLETE. Ready for Gate 3.**
