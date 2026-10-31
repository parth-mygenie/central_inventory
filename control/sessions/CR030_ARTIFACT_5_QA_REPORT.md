# CR-030 — Artifact 5: QA Report

> **Date:** 2026-06-14
> **Agent:** Implementation Agent (session 3)
> **Status:** IMPLEMENTATION COMPLETE — Pending Owner Signoff

---

## Scope Implemented

CR-030 covers 3 Inward screens + 1 new module (9 sub-screens), per 3 frozen UX specs:
- `CR030_VENDOR_MANAGEMENT_UX_FREEZE.md`
- `CR030_RAW_MATERIAL_MASTER_UX_FREEZE.md`
- `CR030_PURCHASE_ORDER_UX_FREEZE.md` (9 screens)

---

## Phase 0: API Layer — PASS

| Task | Status | Evidence |
|------|:------:|----------|
| `getVendorItemList(rid, { fromDate, toDate })` | ✅ | `curl` → 75 records, fields: ID, Ingredient_Name, Purchase_Date, Vendor_Name, Amount, unit_price |
| `getStockInventory()` extended params | ✅ | `include_segments=true&include_consumption=true` → 48 stocks with `segments_preview[]`, `consumption_summary{}` (~29s, near timeout — used without extra params for page load) |
| 10 PO methods | ✅ | Full lifecycle curl: create (PO-806-2026-0006) → detail → send → cancel. All cache invalidations verified. |

**api.js:** 1035 → ~1140 lines (+~105 lines)

---

## Phase 1: Vendor Management — PASS

| Spec Element | Status | Notes |
|--------------|:------:|-------|
| Master-detail layout (35/65) | ✅ | Left: vendor cards with search. Right: form + intelligence |
| Active/Inactive from real purchase dates | ✅ | `vendor-item-list` → max `Purchase_Date`. >60d = Inactive |
| 3 KPIs (Last Purchase, Total Purchases, Avg Order Value) | ✅ | Computed from `vendor-item-list` per vendor |
| Monthly bar chart (last 6 months, current amber) | ✅ | recharts `<BarChart>` with `<Cell>` amber highlight |
| Recent purchases table (last 5) | ✅ | Date, Item, Qty, Rate, Amount |
| 3 states (empty, edit, add) | ✅ | Empty: "Select a vendor or add a new one". Edit: form + intelligence. Add: form only |
| Inline form replaces popup | ✅ | VendorFormDialog.jsx no longer imported |
| Delete confirmation | ✅ | Uses existing `ConfirmActionDialog` |

**VendorManagement.jsx:** 212 → ~320 lines (full rewrite)

---

## Phase 2: Raw Material Master — PASS

| Spec Element | Status | Notes |
|--------------|:------:|-------|
| Expandable rows (click to expand) | ✅ | `React.Fragment` + inline `<tr>` with `colSpan` |
| Inline edit form (left half) | ✅ | Name, Category dropdown, Unit dropdown, Min Alert + unit |
| Intelligence panel (right half) | ✅ | 3 KPIs + vendor price comparison bars |
| Avg Purchase Rate KPI | ✅ | `sum(Amount) / sum(stock_quantity_raw)` from `vendor-item-list` |
| Consumption Rate KPI | ✅ | Estimated from purchase frequency |
| Days of Stock KPI | ✅ | `cal_quantity / daily_consumption` with red/amber/green |
| Vendor Price Comparison bars | ✅ | Horizontal bars: green=cheapest, amber=mid, red=most expensive. "✓ best" |
| Category + Status dropdown filters | ✅ | Category from data, Status: All/OK/Low/Empty |
| "Empty" badge (I-5) | ✅ | Gray badge when `cal_quantity == 0` |
| Inline add form (I-7 toast on error) | ✅ | Above table, not popup. Toast on success + error |
| "Pushed to X stores" (I-6) | ✅ | Blue badge from `getHierarchyList()`, only if `isTopLevel` |

**IngredientCatalogue.jsx:** 326 → ~430 lines (full rewrite, CategoriesTab preserved)

---

## Phase 3: Purchase Order Module — PASS

### Screen 1: PO List

| Spec Element | Status | Notes |
|--------------|:------:|-------|
| Status tab pills with counts | ✅ | All, Draft, Approved, Sent, Partial, Received, Closed, Cancelled |
| 4 KPI cards | ✅ | Total POs, Awaiting Delivery, Partially Received, Total Value (month) |
| Vendor filter dropdown | ✅ | From `getVendors()` |
| Date range pickers | ✅ | From/To date inputs |
| Search by PO# | ✅ | Filters by `reference_code` |
| Expected column | ✅ | `expected_delivery_date` |
| Row click → navigate to detail | ✅ | `navigate(/purchase/orders/${id})` |

### Screen 2: Create PO — By Vendor

| Spec Element | Status | Notes |
|--------------|:------:|-------|
| Vendor cards: Active/Inactive badge | ✅ | From purchase dates (>60d = Inactive) |
| Vendor cards: Last, Orders/30d, Avg, Items·Spend | ✅ | All 4 fields computed from `vendor-item-list` |
| Vendor cards: "Cheapest for X items" badge | ✅ | Cross-vendor rate comparison per item |
| History table: Last Rate, Avg Rate | ✅ | From `vendor-item-list` filtered by vendor+item |
| History table: Cheapest Vendor comparison | ✅ | "✓ This vendor" (green) or "Budget ₹160" (amber) |
| History table: Days of Cover | ✅ | `cal_quantity / daily_consumption` |
| Row sorting by urgency | ✅ | OOS → Low → <14d → adequate → no history |
| Pre-check low/empty stock | ✅ | `is_low_stock || cal_quantity == 0 || daysOfCover < 14` |
| Suggested Qty (calculated reorder point) | ✅ | `max(0, ceil(30 × daily_consumption - current_stock))` |
| TIP banner (cheaper elsewhere) | ✅ | Amber banner listing items cheaper from other vendors |

### Screen 3: Create PO — By Item Need

| Spec Element | Status | Notes |
|--------------|:------:|-------|
| 4 KPI cards (OOS, Low, Below Reorder, Total) | ✅ | Computed from stock inventory |
| Urgency sort (lowest cover first) | ✅ | Score: OOS=0, Low=1, <14d=2, rest=3+days |
| Per-item vendor picker (cheapest pre-selected) | ✅ | Dropdown sorted by rate |
| Other Vendors column | ✅ | Shows next 2 cheapest alternatives |
| Stock status sub-labels | ✅ | "OUT OF STOCK", "LOW — 5d", "12d left" |
| Calculated suggested qty (reorder point) | ✅ | `max(0, ceil(30 × daily - current))` |
| Auto-group by vendor → multi-PO preview | ✅ | Cards per vendor group with item breakdown |
| Savings calculation in group cards | ✅ | "Savings: ₹X (Y%) vs most expensive option" |
| Multiple POs creation | ✅ | Sequential `createPO()` per group |

### Screen 5: PO Detail

| Spec Element | Status | Notes |
|--------------|:------:|-------|
| Status timeline | ✅ | draft → sent → received → closed |
| Vendor/Payment/Total/Notes | ✅ | Header card |
| Order lines: Your Stock column | ✅ | From `getStockInventory()` stock map |
| Order lines: Days Left column | ✅ | 0d for OOS, — for others |
| Order lines: After Receive column | ✅ | `currentQty + orderedQty` (green) |
| Contextual actions per status | ✅ | Per spec: Approve/Send/Receive/Close/Cancel/Delete |
| GRN History section | ✅ | For POs with `receipts` data |
| Cancel reason display | ✅ | Red text with AlertTriangle |

### Screen 6: Receive Goods

| Spec Element | Status | Notes |
|--------------|:------:|-------|
| Card-per-line layout | ✅ | Each item is a Card with header, inputs, intelligence |
| Vendor Invoice # field | ✅ | Text input in header |
| Per-line: Invoice Qty, Rate, Batch, Expiry | ✅ | 4 inputs in grid |
| Per-line: Invoice Total (qty × rate) | ✅ | Computed + compared to PO total |
| Rate Variance panel | ✅ | % with color: green ≤5%, amber 5-10%, red >10% |
| Stock Impact panel | ✅ | `before → after` with (restores) note for OOS |
| Skip checkbox | ✅ | Dashed card: "Skipped — will remain open on PO" |
| Summary footer | ✅ | Matched/skipped/invoice total/variance flags/FEFO note |

### Screen 9: Add-Stock Gate

| Spec Element | Status | Notes |
|--------------|:------:|-------|
| Detect `require_po_for_purchase: true` | ✅ | Proactive check via `getOperationalSettings()` → `stored_settings` |
| Redirect card | ✅ | "Direct Stock Entry Disabled" + CTA "Go to Purchase Orders" |
| Admin note | ✅ | "Controlled by require_po_for_purchase in Operational Settings" |
| Reactive `DIRECT_PURCHASE_REQUIRES_PO` error | ✅ | Caught during `handleSubmit` loop |

---

## Files Created / Modified

| File | Action | Lines |
|------|--------|:-----:|
| `services/api.js` | MODIFIED — +~105 lines | ~1140 |
| `VendorManagement.jsx` | FULL REWRITE | ~320 |
| `IngredientCatalogue.jsx` | FULL REWRITE | ~430 |
| `AddStockPurchaseForm.jsx` | MODIFIED — PO gate + import | ~465 |
| `PurchaseOrderList.jsx` | **NEW** | ~230 |
| `PurchaseOrderCreate.jsx` | **NEW** | ~640 |
| `PurchaseOrderDetail.jsx` | **NEW** | ~470 |
| `App.js` | MODIFIED — 3 routes + 3 imports | ~134 |

## Files Not Modified (Regression Safe)
All existing screens (OperationsHub, PendingQueues, TransferDetail, DirectDispatchForm, RequestStockForm, etc.) untouched. Cache layer intact.

---

## Design Decision: Stock Inventory Loading

`getStockInventory({ includeSegments: true, includeConsumption: true })` takes ~29s (near 30s axios timeout). Decision: use basic `getStockInventory()` for page load (<2s), derive consumption estimates from `vendor-item-list` purchase frequency. Avoids blocking UI.

---

## Known Limitations

1. Screens 4 (Multi-PO Review) and 7 (Post-Receive Confirmation) are simplified — By Item Need submits directly, By Vendor has basic review step
2. G-014 (Invoice OCR) blocks Upload Invoice tab — shows "Coming Soon"
3. G-015 (Excel parsing) blocks Excel import
4. G-020 (Unit conversion) — purchase unit assumed = consumption unit
5. VendorFormDialog.jsx still exists on disk (orphaned, not imported)

---

## Artifact Status

| # | Artifact | Status | Path |
|---|----------|:------:|------|
| 0 | Session-Start | DONE | `control/sessions/CR030_SESSION_START.md` |
| 1 | Intake | DONE | `control/sessions/CR030_ARTIFACT_1_INTAKE.md` |
| 2 | Impact Analysis | DONE | `control/sessions/CR030_ARTIFACT_2_3_UNIFIED_IMPLEMENTATION_PLAN.md` |
| 3 | Impl Plan | DONE | `control/sessions/CR030_ARTIFACT_2_3_UNIFIED_IMPLEMENTATION_PLAN.md` |
| 4 | Code Gate | DONE | `control/sessions/CR030_ARTIFACT_4_CODE_GATE.md` |
| 5 | QA Report | **DONE** | `control/sessions/CR030_ARTIFACT_5_QA_REPORT.md` (this file) |
| 6 | Owner Signoff | **PENDING** | — |
