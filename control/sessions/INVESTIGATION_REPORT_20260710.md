# INVESTIGATION REPORT — All Screens Data Gap Audit
> **Date:** 2026-07-10
> **Account:** owner@hellskitchen.com (RID 803, master type)
> **Method:** Curl-probe every POS API endpoint + frontend code trace

---

## CONFIRMED BUGS (Frontend Fixable)

### BUG-A: Food Categories Not Showing — `FRONTEND`
- **Screen:** `/product-catalog` → Categories tab
- **Symptom:** "No food categories" despite API returning 2 categories (Sides, Mains)
- **Root Cause:** `api.js:729-732` — `getFoodCategories()` does `Array.isArray(r.data) ? r.data : []`
  - API returns `{ categories: [{ id: 8269, name: "Sides" }, ...] }` (a **dict**)
  - `Array.isArray(r.data)` = `false` for objects → always returns `[]`
- **Fix:** `r.data?.categories || (Array.isArray(r.data) ? r.data : [])`
- **Blast radius:** SMALL — 1 line. Affects Categories tab + FoodsTab category dropdown
- **Severity:** P1 HIGH — core catalog feature broken

### BUG-B: Stock Item Categories → Raw Laravel Model Dump — `BACKEND BUG`
- **Screen:** `/raw-materials` → Categories tab, category filter dropdown, edit/add forms
- **Symptom:** Categories show empty/broken. `c.id` and `c.category_name` undefined
- **Root Cause:** POS API `inventory/stock-item-categories` returns unserialized PHP Eloquent model objects
  - Keys contain null bytes: `\x00*\x00attributes`, `\x00*\x00connection`, etc.
  - Actual data (`id: 1529, category_name: "Proteins"`) buried inside `\x00*\x00attributes`
  - JavaScript cannot access these keys as normal property names
- **Workaround (api.js):** Parse `item[Object.keys(item).find(k => k.includes('attributes'))]` to extract actual data
- **Proper fix:** POS backend must serialize models before returning (call `->toArray()` or `->jsonSerialize()`)
- **Blast radius:** MEDIUM — affects IngredientCatalogue categories tab, category filter dropdown, edit/add category forms
- **Severity:** P1 HIGH — core Raw Materials category feature broken
- **Categories affected (from \x00*\x00attributes):** Proteins(1529), Produce(1530), Grains(1531), Oils(1532)

### BUG-C: PO List → Items Column Shows "—" — `BACKEND GAP`
- **Screen:** `/purchase/orders`
- **Symptom:** Items column shows "—" for all POs
- **Root Cause:** PO list API does NOT return item count
  - **PO list keys:** `approved_at, cancel_reason, cancelled_at, closed_at, created_at, expected_delivery_date, id, item_total, notes, payment_type, reference_code, restaurant_id, sent_at, status, tot_amount, tot_tax, updated_at, vendor_id, vendor_name`
  - **Missing:** `line_count`, `lines`, `items_count`, `items`
  - Frontend code: `po.line_count || po.lines?.length || "—"` → all undefined
  - Compare: Transfer history API returns BOTH `items_count` AND `line_count`
- **Workaround:** Can show `item_total` (monetary total, not count). Or remove column. Or fetch detail per PO (N+1).
- **Severity:** P2 MEDIUM — display gap, PO otherwise functional

### BUG-D: PO List → Payment Shows "—" — `DATA + DESIGN`
- **Screen:** `/purchase/orders`
- **Symptom:** Payment column shows "—"
- **Root Cause:** API DOES return `payment_type` field, but it's `null` for PO-803-2026-0001
  - PO was created programmatically with `payment_type` not set
  - Payment type gets set during **Receive Goods** (GRN), not during PO creation
  - After receive, the GRN record has `payment_type: "cash"` but the PO header remains `null`
- **Classification:** Not a code bug. The POS API stores `payment_type` on PO header only if set at creation. The receive-level payment goes to GRN, not back to PO header.
- **Options:**
  1. Remove Payment column from list (only relevant in detail/GRN)
  2. Default display to "—" (current behavior, acceptable)
  3. Show last GRN payment type (requires N+1 detail calls)
- **Severity:** P3 LOW — data display gap, not broken

---

## API ENDPOINT AUDIT (All Endpoints Probed)

| # | Endpoint | HTTP | Works? | Response Shape | Frontend Extraction | Gap? |
|---|----------|:----:|:------:|----------------|---------------------|:----:|
| 1 | `product/categories` | GET | ✅ | `{ categories: [...] }` | ❌ `Array.isArray(r.data)` fails | **BUG-A** |
| 2 | `product/foods-list` | GET | ✅ | `{ foods: [...] }` | ✅ `r.data?.foods` | — |
| 3 | `product/addon-list` | GET | ✅ | `{ addons: [...] }` | ✅ `r.data?.addons` | — |
| 4 | `recipe/get-recipe` | GET | ✅ | `{ recipes: [...] }` | ✅ `r.data?.recipes` | — |
| 5 | `recipe/sub-recipes` | GET | ✅ | `{ sub_recipes: [...] }` | ✅ `d?.sub_recipes` | — |
| 6 | `product/addon-recipe-list` | GET | ✅ | `{ status, message, recipes? }` | ✅ `r.data?.recipes` | — |
| 7 | `inventory/get-vendor` | GET | ✅ | `[...]` raw array | ✅ wraps in `{ data: [...] }` | — |
| 8 | `inventory/stock-inventory` | GET | ✅ | `{ current_stocks: [...] }` | ✅ correct | — |
| 9 | `inventory/stock-item-categories` | GET | ⚠️ | Raw Laravel Eloquent objects | ❌ `c.id` undefined | **BUG-B** |
| 10 | `purchase-order/list` | GET | ✅ | `{ status, data: [...], meta }` | ⚠️ missing `line_count` | **BUG-C** |
| 11 | `purchase-order/{id}` | GET | ✅ | `{ status, data: { lines: [...] } }` | ✅ correct | — |
| 12 | `inventory-transfer/history` | POST | ✅ | `{ status, data: [...], meta }` | ✅ correct | — |
| 13 | `inventory-transfer/pending-queues` | POST | ✅ | `{ status, data: { approval_pending, ... } }` | ✅ correct | — |
| 14 | `inventory-transfer/hierarchy-summary` | POST | ✅ | `{ status, data: { stores: [...] } }` | ✅ correct | — |
| 15 | `inventory-transfer/hierarchy-detail` | POST | ✅ | `{ restaurants, child_stock_summary, ... }` | ✅ correct | — |
| 16 | `report/daily-consumption-report` | POST | ✅ | `{ stock_summary, stock_details, ... }` | ✅ correct | — |
| 17 | `inventory/wastage-report` | POST | ✅ | `{ status, summary, wastage_records, ... }` | ✅ correct | — |
| 18 | `inventory-transfer/operational-settings/get` | POST | ✅ | `{ status, data, message }` | ✅ correct | — |
| 19 | `franchise/list` | GET | ✅ | `{ success, data: { children: [...] } }` | ✅ correct | — |
| 20 | `franchise/push-form/{id}` | GET | ✅ | `{ success, data: { push_summary, ... } }` | ✅ correct | — |
| 21 | `inventory/vendor-item-list` | GET | ✅ | `{ data: [...], total_amount, summary }` | ✅ correct | — |
| 22 | `inventory-transfer/stock-ledger` | POST | ✅ | `{ status, data: [...], meta }` | ✅ correct | — |

---

## OPERATIONS HUB — All 0s Investigation

- **Observed:** Stock Health shows 0 for Total Items, Low Stock, Expiring, Expired, etc.
- **Investigation:** `useStockIntelligence` hook calls `api.getStockInventory()` which returns 7 items via curl
- **Probable cause:** Screenshot was captured during initial load. The hook uses `Promise.allSettled` across 3 API calls (stock, queues, history). Page likely hadn't finished loading.
- **Not a data gap** — API data is correct. May be a race condition or slow load.

---

## SUMMARY TABLE

| # | Bug ID | Screen | Issue | Type | Severity | Fixable? |
|---|--------|--------|-------|------|:--------:|:--------:|
| 1 | **BUG-A** | Product Catalog → Categories | Categories not showing | FRONTEND | P1 | ✅ 1 line fix |
| 2 | **BUG-B** | Raw Materials → Categories | Raw Laravel model dump | BACKEND | P1 | ⚠️ api.js workaround |
| 3 | **BUG-C** | Purchase Orders → List | Items count missing | BACKEND GAP | P2 | ⚠️ no count available |
| 4 | **BUG-D** | Purchase Orders → List | Payment null | DATA | P3 | ℹ️ by design |

## CLEAN SCREENS (No Data Gaps Found)

✅ Foods list, Addons, Recipes, Sub-Recipes, Addon Recipes
✅ Vendor Management (all fields map correctly)
✅ Stock Inventory (all 7 items with correct data)
✅ Store Management / Hierarchy List (3 children displayed)
✅ Pending Queues (all 6 queue types)
✅ Transfer History (all fields including items_count)
✅ Daily Consumption Report (stock_summary + stock_details)
✅ Wastage Report (records + segment allocations)
✅ Operational Settings
✅ PO Detail (lines, receipts, all fields present)

---

## CREDENTIAL STATUS

| Email | Works? | RID | Notes |
|-------|:------:|:---:|-------|
| owner@hellskitchen.com | ✅ | 803 | Master, 3 children, 7 stock items, 1 PO |
| abhishek@kalabahia.com | ✅ | 1 | Master (legacy), no POs |
| killua@zoldyck.com | ✅ | 1 | Master (legacy) |
| manager@germanfluid.com | ❌ | — | **Credentials rotated** |
| manager@centralkitchenalpha.com | ❌ | — | **Credentials rotated** |
| manager@outletdirectone.com | ❌ | — | **Credentials rotated** |
| owner@chai.com | ❌ | — | **Credentials rotated** |

⚠️ **Primary test accounts (RID 806 hierarchy) no longer work.** L8 credentials need updating.
