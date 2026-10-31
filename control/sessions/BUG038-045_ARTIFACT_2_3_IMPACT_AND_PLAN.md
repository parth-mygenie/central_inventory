# Gate 2+3: Impact Analysis & Implementation Plan — BUG-038 through BUG-045
> **Date:** 2026-07-10
> **Agent Role:** PLANNING
> **Items:** BUG-038, BUG-039, BUG-040, BUG-041, BUG-042, BUG-043, BUG-044, BUG-045

---

## Conflict Pre-Check

| File | Other Active Items | Conflict? |
|------|-------------------|:---------:|
| PurchaseOrderCreate.jsx | BUG-028 (QA_PASS), BUG-030 (IMPLEMENTED) | SAFE — those are closed/done |
| PurchaseOrderList.jsx | CR-030 (QA) | SAFE — different scope |
| PurchaseOrderDetail.jsx | CR-030 (QA) | SAFE — different scope |
| TransferDetail.jsx | CR-033 (QA) | RELATED — BUG-041 extends CR-033's incomplete fix |
| useRestaurantMap.js | CR-023 (CLOSED) | SAFE — extending, not conflicting |
| DailyConsumptionReport.jsx | None active | SAFE |
| StoreManagement.jsx | None active | SAFE |
| PendingQueues.jsx | None active | SAFE |

**No blocking conflicts. All files safe to modify.**

---

## Execution Sequence (dependency order)

```
1. BUG-041 (useRestaurantMap.js)     — foundational, unblocks TransferDetail
2. BUG-042 (DailyConsumptionReport)  — independent
3. BUG-039 (PurchaseOrderCreate)     — independent
4. BUG-043 (PurchaseOrderCreate)     — same file as 039, do together
5. BUG-044 (PO Create+Detail+List)   — largest, 3 files
6. BUG-038 (PurchaseOrderList)       — part of 044 scope (Items column)
7. BUG-040 (StoreManagement)         — independent
8. BUG-045 (PendingQueues)           — independent
```

---

## BUG-038: PO List Items Column Empty

### Impact Analysis
- **Data flow:** `api.listPOs()` → `PurchaseOrderList` → `po.line_count || po.lines?.length`
- **API reality:** PO list has NO item count field. Backend gap — cannot fix in frontend without N+1.
- **Risk:** LOW — removing column is safe, no downstream consumers

### Implementation Plan
**Strategy:** Remove "Items" column entirely (backend gap, no data available)

| # | File | Line | Current | New | Verify |
|---|------|:----:|---------|-----|--------|
| 1 | PurchaseOrderList.jsx | 197 | `<TableHead>Items</TableHead>` | DELETE line | Column gone |
| 2 | PurchaseOrderList.jsx | 215 | `<TableCell>...line_count...</TableCell>` | DELETE line | Cell gone |

---

## BUG-039: Can't Pick Non-History Vendors

### Impact Analysis
- **Data flow:** `getCheapestVendor()` → `vendorRates` → `vendorOptions` → `<Select>` dropdown
- **Current:** When `vendorOptions.length > 0`, ONLY history vendors shown (line 653-658)
- **Else branch** (line 660-668): ALL vendors shown — but only when vendorOptions is empty
- **Risk:** LOW — merging vendors into one dropdown doesn't change data model

### Implementation Plan
**Strategy:** Merge history vendors (with rates) + remaining vendors (no rate) into one Select

| # | File | Line | Current | New | Verify |
|---|------|:----:|---------|-----|--------|
| 1 | PurchaseOrderCreate.jsx | 652-669 | Two separate `<Select>` blocks (if/else) | Single `<Select>` with merged options: `vendorOptions` first (with rate), then remaining `vendors` not in vendorOptions (with "No history" label) | Dropdown shows all vendors, history ones first with rate |

**Exact edit (lines 652-669):** Replace the entire if/else with:
```jsx
<TableCell className="py-1.5">
  <Select value={l.selectedVendorId} onValueChange={(v) => updateNeedLine(idx, "selectedVendorId", v)}>
    <SelectTrigger className="h-7 text-[10px] w-40"><SelectValue placeholder="Select vendor" /></SelectTrigger>
    <SelectContent>
      {l.vendorOptions.map((vo) => (
        <SelectItem key={vo.vendorId} value={String(vo.vendorId)}>{vo.vendorName} {formatCurrency(vo.rate)}</SelectItem>
      ))}
      {vendors.filter(v => !l.vendorOptions.some(vo => String(vo.vendorId) === String(v.id))).map(v => (
        <SelectItem key={v.id} value={String(v.id)}>{v.vendor_name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</TableCell>
```

---

## BUG-040: Indirect Outlets Show No Detail

### Impact Analysis
- **Data flow:** `franchise/list` → 3 direct children → `hierarchy-detail.restaurants[]` → 2 indirect outlets merged with shell objects
- **Shell object** (line 126-131): Only has `id, name, restaurantTypeFlag, email:""`
- **Expanded row** (line 488-494): Reads `child.email, child.phone, child.address, child.createdAt, child.vendor`
- **Risk:** LOW — adding indicator text for nested outlets

### Implementation Plan
**Strategy:** For `isNested` outlets, show "Managed by {parent}" label instead of empty fields. Add `parent_restaurant_id` from `restaurants[]` to enable parent name resolution.

| # | File | Line | Current | New | Verify |
|---|------|:----:|---------|-----|--------|
| 1 | StoreManagement.jsx | 125-131 | Shell object with `email:""` | Add `parentRestaurantId: s.parent_restaurant_id` to shell object | Parent ID available |
| 2 | StoreManagement.jsx | 488-494 | Shows empty fields for all children | Wrap in `child.isNested` check: show "Indirect outlet" + parent name | Nested outlets show label |

---

## BUG-041: Transfer FROM Block Empty (Outlet View)

### Impact Analysis
- **Data flow:** `api.getTransferDetails()` → `normalizeTransfer()` → `TransferDetail` → `restaurantMap[from_restaurant_id]`
- **useRestaurantMap** (line 23-25): Calls `getHierarchySummary(franchise)` + `getHierarchySummary(central)` — returns CHILDREN only
- **Outlet (806):** Has no children → map only has self (806). Parent (803) NOT in map.
- **Detail API:** Returns `from_restaurant_id` but NOT `from_restaurant_name`
- **Risk:** MEDIUM — changing useRestaurantMap affects 4 consumers (OperationsHub, PendingQueues, TransferDetail, HistoryLedger) but adding entries is additive/safe

### Implementation Plan
**Strategy:** Enhance `useRestaurantMap` to also fetch `hierarchy-detail` for self, which returns ALL restaurants in hierarchy (includes parent + siblings). This is a single additional API call.

| # | File | Line | Current | New | Verify |
|---|------|:----:|---------|-----|--------|
| 1 | useRestaurantMap.js | 22-60 | Fetches `hierarchy-summary(franchise)` + `hierarchy-summary(central)` | Add 3rd call: `api.getHierarchyDetail({ storeRestaurantId: restaurantId })` → merge `data.restaurants[]` into map | Parent appears in map |

**Exact edit — add after line 59 (after central merge), before `setRestaurantMap(map)`:**
```javascript
// BUG-041: Also fetch hierarchy-detail for self to get parent + all hierarchy members
try {
  const detailResp = await api.getHierarchyDetail({ storeRestaurantId: restaurantId });
  const detailData = detailResp.data?.data || detailResp.data;
  (detailData?.restaurants || []).forEach((r) => {
    if (r.restaurant_id && !map[String(r.restaurant_id)]) {
      map[String(r.restaurant_id)] = {
        name: r.restaurant_name,
        type: r.restaurant_type,
      };
    }
  });
} catch { /* non-critical — existing map still works for most cases */ }
```

---

## BUG-042: Consumption Report Shows Parent's Stock for Child Rows

### Impact Analysis
- **Data flow:** `api.getStockInventory()` → `stockInventory` → `stockLookup` (keyed by name) → Current Stock column
- **Bug:** In multi-store mode, child row "olive oil" resolves to PARENT's stock via name lookup
- **API data:** `row.closing_stock` already has per-restaurant correct value (e.g., "1.98 ltr")
- **Risk:** LOW — `closing_stock` is already in the data, just need to use it

### Implementation Plan
**Strategy:** In multi-store mode, use `row.closing_stock` (per-restaurant) for Current Stock instead of `stockLookup`. Parse value and unit from the string.

| # | File | Line | Current | New | Verify |
|---|------|:----:|---------|-----|--------|
| 1 | DailyConsumptionReport.jsx | 208-210 | `stockItem = stockLookup[name]; currentStock = stockItem.display_qty; currentUnit = stockItem.display_unit` | When `isMultiStore && row.closing_stock`: parse `closing_stock` string for value+unit. Else: use existing stockLookup. | HK Express row shows 1.98 ltr |

**Exact edit (lines 207-210):**
```javascript
// BUG-042: In multi-store mode, use per-restaurant closing_stock instead of parent's stockLookup
const stockItem = stockLookup[(row.ingredient_name || "").toLowerCase()];
let currentStock, currentUnit;
if (isMultiStore && row.closing_stock) {
  const parsed = parseQtyValue(row.closing_stock);
  const parts = String(row.closing_stock).trim().split(/\s+/);
  currentStock = parsed;
  currentUnit = parts[1] || stockItem?.display_unit || "";
} else {
  currentStock = stockItem ? stockItem.display_qty : null;
  currentUnit = stockItem?.display_unit || "";
}
```

Note: `parseQtyValue` is already imported/used at line 206.

---

## BUG-043: PO Qty Allows Negative Values

### Impact Analysis
- **Lines 527, 678:** `<Input type="number">` without `min="0"`
- **Risk:** ZERO — adding `min` attribute is purely additive

### Implementation Plan

| # | File | Line | Current | New | Verify |
|---|------|:----:|---------|-----|--------|
| 1 | PurchaseOrderCreate.jsx | 527 | `<Input type="number" value={l.ordered_qty} onChange={...}` | Add `min="0"` | Can't type negative |
| 2 | PurchaseOrderCreate.jsx | 678 | `<Input type="number" value={l.ordered_qty} onChange={...}` | Add `min="0"` | Can't type negative |

---

## BUG-044: Payment Visible Before Receive Goods

### Impact Analysis
- **Scope:** 3 files, ~9 payment references
- **Owner rule:** Payment + Total only visible at Receive Goods. Exception: By Vendor items page shows "Expected Total" column header.
- **Risk:** MEDIUM — touching 3 files, but all changes are deletions/conditionals

### Implementation Plan

#### File 1: PurchaseOrderCreate.jsx

| # | Line | Current | New |
|---|:----:|---------|-----|
| 1 | 471-475 | Payment dropdown (By Vendor header) | REMOVE entire `<div>` block. Change grid from `grid-cols-4` → `grid-cols-3` (Delivery + Notes + col-span-1) |
| 2 | 499 | `<TableHead>Total</TableHead>` | Rename → `Expected Total` |
| 3 | 315 | `payment_type: paymentType,` in vendor submit payload | DELETE line |
| 4 | 343 | `payment_type: paymentType,` in need submit payload | DELETE line |
| 5 | 566-570 | Review step summary: `Payment: {paymentType}` in grid | REMOVE payment div. Change grid-cols-4 → grid-cols-3 (Vendor + Delivery + Items) |
| 6 | 573 | Review table: `Rate` + `Total` column headers | REMOVE both columns |
| 7 | 576 | Review table: Rate + Total cells per row | REMOVE both cells |
| 8 | 579 | Review footer: `Total: {formatCurrency(vendorTotal)}` | REMOVE |
| 9 | 716-723 | By Item Need: Payment dropdown + grid | REMOVE payment div. Change grid-cols-3 → grid-cols-2 (Delivery + Notes) |
| 10 | 729 | By Item Need footer: `Total: {formatCurrency(needTotal)}` | REMOVE |

#### File 2: PurchaseOrderDetail.jsx

| # | Line | Current | New |
|---|:----:|---------|-----|
| 1 | 204-208 | Header grid always shows Payment + Total | Conditional: hide Payment + Total for `["draft","approved","sent"].includes(status)`. Show for received/closed/partially_received. |
| 2 | 232-233 | Line table: Rate + Total columns | For pre-receive statuses: rename to "Expected Rate" / "Expected Total" OR hide |

#### File 3: PurchaseOrderList.jsx

| # | Line | Current | New |
|---|:----:|---------|-----|
| 1 | 198 | `<TableHead>Total</TableHead>` | Show conditionally: hide for draft/approved/sent filter. For "all" tab, show as "Total" (mixed statuses). |
| 2 | 201 | `<TableHead>Payment</TableHead>` | Hide for pre-receive status filters (draft/approved/sent) |
| 3 | 216 | `{formatCurrency(po.tot_amount)}` | Hide for pre-receive rows |
| 4 | 223 | `{po.payment_type \|\| "—"}` | Hide for pre-receive rows |

**Simplest approach for PO List:** Define `const isPreReceiveFilter = ["draft","approved","sent"].includes(statusFilter);` and conditionally render Payment/Total columns.

---

## BUG-045: No Dispatched Tab in Pending Queues

### Impact Analysis
- **Data flow:** `api.getPendingQueues()` → `data.dispatch_pending` (exists but unused)
- **Fallback:** Also check `api.getTransferHistory()` for `status === "dispatched"` where `from_restaurant_id === restaurantId`
- **Risk:** LOW — adding a new tab is additive

### Implementation Plan

| # | File | Line | Current | New |
|---|------|:----:|---------|-----|
| 1 | PendingQueues.jsx | 47 | `const [readyToDispatch, ...]` | Add `const [dispatched, setDispatched] = useState([]);` |
| 2 | PendingQueues.jsx | 115-127 | Ready-to-dispatch logic | Add dispatched logic after: filter history for `status === "dispatched" && from_restaurant_id === restaurantId` |
| 3 | PendingQueues.jsx | 400-401 | After Ready to Dispatch tab trigger | Add new TabsTrigger `value="dispatched"` with Truck icon + count badge |
| 4 | PendingQueues.jsx | 457-458 | After Ready to Dispatch TabsContent | Add new TabsContent `value="dispatched"` rendering dispatched items with `renderSimpleCard` |

---

## Verification Matrix

| # | Bug | File(s) | How to Verify | Automated? |
|---|-----|---------|---------------|:---:|
| 1 | BUG-038 | PurchaseOrderList | `/purchase/orders` → no Items column | NO — browser |
| 2 | BUG-039 | PurchaseOrderCreate | By Item Need → Best Vendor dropdown shows ALL vendors | NO — browser |
| 3 | BUG-040 | StoreManagement | Expand HK Outlet North → shows "Indirect outlet" label | NO — browser |
| 4 | BUG-041 | useRestaurantMap | Login as outlet → Transfer detail → FROM shows name | NO — browser |
| 5 | BUG-042 | DailyConsumptionReport | Hierarchy view → HK Express Olive Oil → Current Stock = 1.98 ltr | NO — browser |
| 6 | BUG-043 | PurchaseOrderCreate | Qty input → can't type negative | NO — browser |
| 7 | BUG-044 | PO Create+Detail+List | No payment/total on create/draft/approved/sent | NO — browser |
| 8 | BUG-045 | PendingQueues | After dispatch → "Dispatched" tab shows transfer | NO — browser |

## Scope Lock

**Files WILL change:**
- `frontend/src/components/central-inventory/PurchaseOrderCreate.jsx`
- `frontend/src/components/central-inventory/PurchaseOrderDetail.jsx`
- `frontend/src/components/central-inventory/PurchaseOrderList.jsx`
- `frontend/src/components/central-inventory/DailyConsumptionReport.jsx`
- `frontend/src/components/central-inventory/StoreManagement.jsx`
- `frontend/src/components/central-inventory/PendingQueues.jsx`
- `frontend/src/hooks/useRestaurantMap.js`

**Files will NOT touch:**
- `api.js` (HIGH-RISK — no changes needed)
- `terminology.js` (FROZEN)
- `screenVisibility.js` (FROZEN)
- `server.py` (PROXY-ONLY)
- All other components

## Post-Code Registry Checklist (for IMPLEMENTATION agent)
- [ ] registry.json: BUG-038→045 → status: IMPLEMENTED
- [ ] L3/L4: rows updated
- [ ] L7: every modified file listed
- [ ] Code markers: `// BUG-0XX` in every modified file
- [ ] Dashboard drift check: `node control/gen_dashboard_data.js --check` → PASS
