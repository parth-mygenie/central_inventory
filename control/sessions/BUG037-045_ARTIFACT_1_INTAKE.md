# INTAKE BATCH — BUG-037 through BUG-045
> **Date:** 2026-07-10
> **Agent Role:** INTAKE
> **Source:** OWNER-REPORTED + INVESTIGATION session (same day)
> **Account used:** owner@hellskitchen.com (RID 803, master)

---

## BUG-037: Food Categories Not Showing (Product Catalog)

**Severity:** P1 HIGH (owner-confirmed)
**Duplicate check:** RELATED to CR-012 (P21 Food Category CRUD — CLOSED). CR-012 added CRUD. This bug is a data extraction error in `getFoodCategories()`. DISTINCT.
**Code reality:** CODE EXISTS — `getFoodCategories()` at api.js:729-732.

### Evidence
- **Screen:** `/product-catalog` → Categories tab
- **Symptom:** "No food categories" despite API returning 2 categories (Sides id=8269, Mains id=8268)
- **Curl:** API returns `{ "categories": [...] }` (dict). Code does `Array.isArray(r.data)` which is `false` → returns `[]`
- **Source:** AGENT-DISCOVERED during curl-probe. CONFIRMED.

### Root Cause
`api.js:729`: `return { ...r, data: Array.isArray(r.data) ? r.data : [] }` — doesn't extract `r.data.categories`

### Blast Radius
- SMALL — 1 line in api.js (line 731)
- Affects: FoodCategoriesTab (empty), FoodsTab category dropdown (empty in Add Food form)
- ~4 references total

---

## BUG-038: PO List Missing Item Count Column

**Severity:** P2 MEDIUM (owner-confirmed)
**Duplicate check:** DISTINCT — no existing item about PO list item count.
**Code reality:** CODE EXISTS — PurchaseOrderList.jsx:215 references `po.line_count`.

### Evidence
- **Screen:** `/purchase/orders` → Items column shows "—"
- **Curl:** PO list API returns 19 fields — NONE are `line_count`, `items_count`, `lines`, or `items`. Transfer history DOES have `items_count`+`line_count`.
- **Source:** OWNER-REPORTED (screenshot). CONFIRMED via curl.

### Root Cause
BACKEND GAP — POS API `purchase-order/list` does not include any item/line count field. Frontend code `po.line_count || po.lines?.length` always returns undefined.

### Blast Radius
- SMALL — 1 line in PurchaseOrderList.jsx
- No frontend fix possible without API change or N+1 detail calls

---

## BUG-039: Can't Pick Non-History Vendors in Item-Wise PO

**Severity:** P1 HIGH (owner-confirmed)
**Duplicate check:** RELATED to BUG-028 (PO Create UX — QA_PASS). BUG-028 fixed "vendor picker for no-history" (items with ZERO history). This bug is about items WITH partial history not showing OTHER vendors. DISTINCT scenario.
**Code reality:** CODE EXISTS — PurchaseOrderCreate.jsx:652-658.

### Evidence
- **Screen:** `/purchase/orders/new` → By Item Need → Best Vendor dropdown
- **Screenshot:** Chicken dropdown only shows "Metro Wholesale ₹20.45" — can't select Farm Direct
- **Source:** OWNER-REPORTED (screenshot). CONFIRMED via code trace.

### Root Cause
`PurchaseOrderCreate.jsx:652-658`: When `vendorOptions.length > 0`, the Select dropdown ONLY shows `vendorOptions` (vendors with purchase history for that specific item). All other vendors are excluded. The `else` branch (all vendors) only fires when `vendorOptions` is empty.

### Blast Radius
- SMALL — 1 conditional block in PurchaseOrderCreate.jsx (lines 652-669)
- Fix: Merge `vendorOptions` (with rates) + remaining `vendors` (without rates) into one dropdown

---

## BUG-040: Indirect Outlet Stores Show No Detail Info

**Severity:** P2 MEDIUM (owner-confirmed)
**Duplicate check:** DISTINCT — no existing item about nested/indirect outlets.
**Code reality:** CODE EXISTS — StoreManagement.jsx:126-131 creates shell objects.

### Evidence
- **Screen:** `/store-management` → expand HK Outlet North
- **Screenshot:** All fields show "—" (email, phone, date, address). Stock Health: "Loading health data...". Push History: "No push history available"
- **Source:** OWNER-REPORTED (screenshot). CONFIRMED via code+API trace.

### Root Cause
HK Outlet North (808) and HK Outlet South (807) are grandchildren (belong to Master Stores 804/805, not directly to 803). `franchise/list` returns only 3 direct children. Code merges outlets from `hierarchy-detail.restaurants[]` but creates shell objects with hardcoded `email: ""` and no phone/address/vendor data.

### Blast Radius
- MEDIUM — StoreManagement.jsx (lines 120-133) + expanded row rendering
- `restaurants` array only has: `restaurant_id, restaurant_name, restaurant_type, parent_restaurant_id`

---

## BUG-041: Transfer Detail FROM Block Empty (Outlet View)

**Severity:** P1 HIGH (owner-confirmed)
**Duplicate check:** RELATED to CR-033 (Action Screens Audit — QA). CR-033 notes say "TransferDetail FROM fix" using `restaurantMap`. Fix is INCOMPLETE — `restaurantMap` doesn't include parent stores for outlet users.
**Code reality:** CODE EXISTS — TransferDetail.jsx:317 + useRestaurantMap.js.

### Evidence
- **Screen:** `/transfer/:id` (viewed from HK Express, Outlet)
- **Screenshot:** FROM block shows "—" for TRF-803-2026-0020
- **Curl:** Transfer detail API returns `from_restaurant_id: 803` but NOT `from_restaurant_name`. Transfer HISTORY API DOES return both.
- **Source:** OWNER-REPORTED (screenshot). CONFIRMED via curl.

### Root Cause
1. BACKEND GAP: Transfer detail API missing `from_restaurant_name` and `to_restaurant_name`
2. FRONTEND INCOMPLETE: `useRestaurantMap` builds map from `hierarchy-summary` which returns **children** stores. For outlets (no children), map only has self. Parent (803) NOT in map.

### Blast Radius
- MEDIUM — TransferDetail.jsx (line 317) + useRestaurantMap.js
- Fix: Enhance `useRestaurantMap` to include parent restaurants, OR use `hierarchy-detail.restaurants[]` which has all hierarchy members

---

## BUG-042: Consumption Report Shows Parent's Stock for Child Rows

**Severity:** P1 HIGH (owner-confirmed)
**Duplicate check:** DISTINCT — no existing item about cross-restaurant stock lookup.
**Code reality:** CODE EXISTS — DailyConsumptionReport.jsx:155-161, 208-210.

### Evidence
- **Screen:** `/reports/consumption` (hierarchy view from parent, "Include all stores" ON)
- **Screenshot:** HK Express Olive Oil row shows Current Stock = 36.1 kg (parent's) instead of 1.98 ltr (child's actual)
- **Source:** OWNER-REPORTED (screenshot comparison). CONFIRMED via code trace.

### Root Cause
`DailyConsumptionReport.jsx:155-161`: `stockLookup` is built from `api.getStockInventory()` — the LOGGED-IN USER's own stock. When parent (803) views hierarchy report, the lookup has parent's stock. For child rows, name-based lookup `"olive oil"` resolves to parent's 36.1 kg instead of child's 1.98 ltr.

### Blast Radius
- SMALL — DailyConsumptionReport.jsx (lines 155-161, 208-210)
- Fix: In multi-store mode, use `row.closing_stock` (per-restaurant from API) for Current Stock instead of `stockLookup`

---

## BUG-043: PO Create Allows Negative Quantities

**Severity:** P2 MEDIUM (owner-confirmed)
**Duplicate check:** DISTINCT — no existing item about negative PO quantity.
**Code reality:** CODE EXISTS — PurchaseOrderCreate.jsx:527, 678 (Input type="number" without min="0").

### Evidence
- **Screen:** `/purchase/orders/new` → Qty input
- **Screenshot:** Lamb qty shows "-13"
- **Source:** OWNER-REPORTED (screenshot). CONFIRMED via code inspection.

### Root Cause
`PurchaseOrderCreate.jsx:527,678`: `<Input type="number" ...>` has no `min="0"` attribute. User can type negative values. The filter `Number(l.ordered_qty) > 0` at line 212 excludes negatives from submission but doesn't prevent UI display.

### Blast Radius
- SMALL — 2 Input elements in PurchaseOrderCreate.jsx

---

## BUG-044: Payment Info Visible Throughout PO Lifecycle (Should Only Be at Receive)

**Severity:** P2 MEDIUM (owner-confirmed)
**Duplicate check:** DISTINCT — no existing item about hiding payment from PO create/detail.
**Code reality:** CODE EXISTS across 3 files.

### Evidence
- **Screens:** PO Create (both modes), PO Review, PO List, PO Detail (draft/approved/sent)
- **Screenshots:** Payment dropdown visible during create, "Payment: Cash" in review, Payment column in PO list for draft status
- **Source:** OWNER-REPORTED (multiple screenshots). CONFIRMED via code trace.

### Owner Requirements (confirmed in detail):
1. **PO Create → By Vendor items page ONLY**: Rename "Total" → "Expected Total". REMOVE Payment dropdown.
2. **PO Create → By Item Need**: REMOVE Payment dropdown. No total column exists (keep as-is).
3. **PO Create → Review step**: REMOVE "Payment: Cash", REMOVE Rate/Total columns. Show only Item/Qty/Unit.
4. **PO List**: HIDE Payment column for draft/approved/sent. Show for received/closed. Rename Total header contextually.
5. **PO Detail (draft/approved/sent)**: HIDE Payment + Total from header. HIDE Rate/Total from line items.
6. **PO Detail (received/closed)**: Show Payment + Total (actual GRN data).
7. **Receive Goods form**: Keep as-is — the ONLY place user fills payment.
8. **API create payload**: REMOVE `payment_type` from creation.

### Blast Radius
- LARGE — 3 files: PurchaseOrderCreate.jsx, PurchaseOrderDetail.jsx, PurchaseOrderList.jsx
- ~9 payment references across these files

---

## BUG-045: No Dispatched/In-Transit Tab in Pending Queues

**Severity:** P2 MEDIUM (owner-confirmed)
**Duplicate check:** DISTINCT — no existing item about dispatched tab.
**Code reality:** NONE — `dispatch_pending` from API is not rendered in any tab.

### Evidence
- **Screen:** `/queues` — tabs: Approvals | Ready to Dispatch | Receives | My Requests
- **Screenshot:** After dispatching stock, no way to track "in transit" transfers from sender's perspective
- **Curl:** API `pending-queues` returns `dispatch_pending: []` field (exists but unused in UI)
- **Source:** OWNER-REPORTED (screenshot). CONFIRMED via code+API trace.

### Root Cause
`PendingQueues.jsx`: Only 4 tabs rendered. API's `dispatch_pending` field is not consumed. Also `dispatch_pending` may be empty — would need to also check transfer history for `status === "dispatched"` where user is sender.

### Blast Radius
- MEDIUM — PendingQueues.jsx (new tab + data binding)
- Add 5th tab between "Ready to Dispatch" and "Receives"
