# CR-030 — Purchase Order Module UX Freeze

> **Date:** 2026-06-14
> **Status:** FROZEN — Owner approved
> **Scope:** Purchase Order lifecycle (List, Create, Detail, Receive, GRN History, Add-Stock Gate)
> **Mock:** `/__dev/previews/P35_purchase_order_FINAL_FREEZE.html` (9 screens)
> **API Contract:** `AI/Plans/phase3/P35_purchase_order_api_contract.md`
> **Replaces:** Previous AddStockPurchaseForm direct entry for hierarchy stores

---

## Overview

Hierarchy stores (master/central) require a **purchase order** before vendor stock intake (`require_po_for_purchase: true`). The PO module replaces direct `add-stock` with a structured lifecycle:

```
Create PO → [Approve] → Send to Vendor → Receive Goods (GRN) → Close
```

Two creation modes: **By Vendor** (repeat order from known supplier) and **By Item Need** (restock-driven, auto-groups by cheapest vendor into multiple POs).

---

## Screen 1: PO List (`/purchase/orders`)

### Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ Purchase Orders                                       [+ Create PO]  │
│ german fluid · Manage vendor purchase orders                         │
│                                                                      │
│ [All 7] [Draft 1] [Sent 2] [Partial 1] [Received 1] [Closed 1] [X] │
│                                                                      │
│ [Vendor ▾] [From ___] to [To ___] [Search PO#...]                   │
│                                                                      │
│ ┌─────────┐ ┌──────────────┐ ┌─────────────────┐ ┌────────────────┐│
│ │ 7       │ │ 3            │ │ 1               │ │ ₹24,615        ││
│ │Total POs│ │Awaiting Deliv│ │Partially Received│ │Total Value(mo) ││
│ └─────────┘ └──────────────┘ └─────────────────┘ └────────────────┘│
│                                                                      │
│ PO REF         │VENDOR          │ITEMS│TOTAL  │EXPECTED│STATUS │DATE │
│ PO-806-2026-008│Premium Organics│ 2   │₹3,530 │22 Jun  │Draft  │14Jun│
│ PO-806-2026-007│Budget Ingredien│ 4   │₹6,900 │20 Jun  │Sent   │14Jun│
│ ...                                                                  │
└──────────────────────────────────────────────────────────────────────┘
```

### Elements

| Element | Spec |
|---------|------|
| Status tab pills | All, Draft, Sent, Partial, Received, Closed, Cancelled — with counts |
| Vendor filter | Dropdown from `getVendors()` |
| Date range | From/To date pickers |
| Search | By PO reference number |
| KPI cards | Total POs, Awaiting Delivery, Partially Received, Total Value (month) |
| Table columns | PO Ref (mono, bold), Vendor, Items count, Total (mono), Expected date, Status (badge), Created, View button |
| Row click | Navigate to PO Detail |
| "+ Create PO" | Navigate to Create screen |

### Status Badge Colors

| Status | Background | Text |
|--------|-----------|------|
| Draft | gray-100 | gray-700 |
| Approved | blue-50 | blue-700 |
| Sent | blue-100 | blue-800 |
| Partially Received | amber-100 | amber-800 |
| Received | green-100 | green-800 |
| Closed | gray-200 | gray-600 |
| Cancelled | red-100 | red-800 |

### API

| Call | When | Cache |
|------|------|:-----:|
| `listPOs({ status, vendorId, fromDate, toDate, limit, offset })` | Page load + filter change | SHORT 30s |

---

## Screen 2: Create PO — By Vendor (`/purchase/orders/new?mode=vendor`)

### Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Back    New Purchase Order                                         │
│            german fluid · Select a mode to build your order          │
│                                                                      │
│ [By Vendor ●] [By Item Need ○]                                       │
│                                                                      │
│ STEP 1 — SELECT VENDOR                                               │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐         │
│ │ Premium Organics │ │ Budget Ingredien│ │ bakery raw wala │         │
│ │ ■ SELECTED       │ │ Cheapest for 8  │ │ Inactive 45d   │         │
│ │ Last: 2d ago     │ │ Last: 2d ago    │ │ Last: 45d ago  │         │
│ │ 28 orders/30d    │ │ 22 orders/30d   │ │ 20 orders/30d  │         │
│ │ Avg: ₹4,200      │ │ Avg: ₹2,800     │ │ Avg: ₹3,100    │         │
│ │ 15 items · ₹117K │ │ 12 items · ₹61K │ │ 10 items · ₹62K│         │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘         │
│                                                                      │
│ STEP 2 — YOUR HISTORY WITH [SELECTED VENDOR]     15 items · Last 30d│
│ ┌────────────────────────────────────────────────────────────────── │
│ │ ✓ │ Item         │Last │Avg  │Cheapest Vendor │Stock  │DoC │Qty  │
│ │ ✓ │ Sesame ⬤RED  │₹190 │₹185 │Budget ₹160 18%↑│3.97kg │ 5d │ 20  │
│ │ ✓ │ Jaggery ⬤AMB │₹140 │₹135 │Budget ₹120 17%↑│3.85kg │12d │ 15  │
│ │ ✓ │ Wheat Fl ⬤GRN│₹55  │₹52  │✓ This vendor   │8.83kg │32d │ 30  │
│ │ + │ Almonds      │₹1400│₹1200│Budget ₹1000 40%↑│2 kg   │ — │ —   │
│ └────────────────────────────────────────────────────────────────── │
│ TIP: Sesame & Jaggery are cheaper from Budget. Consider splitting.   │
│                                                                      │
│ STEP 3 — ORDER DETAILS                                               │
│ Expected Delivery: [____]  Payment: [Cash ▾]  Notes: [_____]        │
│                                                                      │
│ 3 items · ₹6,550               [Save Draft] [Review →]              │
└──────────────────────────────────────────────────────────────────────┘
```

### Vendor Cards

| Field | Source |
|-------|--------|
| Name | `vendor_name` from `getVendors()` |
| Active/Inactive | From `vendor-item-list`: if max `Purchase_Date` > 60d ago → Inactive |
| Last Order | Most recent `Purchase_Date` → relative time |
| Orders (30d) | Count of records in last 30 days |
| Avg Order | `sum(Amount) / count(distinct Purchase_Date)` |
| Total items / spend | Count distinct `Ingredient_Name`, sum `Amount` |
| "Cheapest for X items" | Count items where this vendor has lowest avg rate |

### History Table Columns

| Column | Source | Display |
|--------|--------|---------|
| Checkbox | User selection | ✓ (checked, qty editable) or + (unchecked, qty disabled) |
| Item | `Ingredient_Name` from `vendor-item-list` | Bold, with stock status badge below |
| Last Rate | Most recent `unit_price` for this vendor+item | "₹190/kg" (mono) |
| Avg Rate | Average `Amount/stock_quantity_raw` | "₹185/kg" (mono) |
| Cheapest Vendor | Across all vendors, who has lowest avg rate for this item | Green "✓ This vendor" or "Budget ₹160/kg — you pay 18% more" |
| Your Stock | `getStockInventory()` for this item | qty + stock bar (red/amber/green) |
| Days of Cover | `cal_quantity / daily_consumption` | "5d" (red), "12d" (amber), "32d" (green), "—" |
| Suggested Qty | Pre-filled based on purchase frequency | Editable number input |
| Frequency | Count of purchases in 30d | "8× / 30d" |

### Row Sorting
1. Critical stock first (red — low/out of stock)
2. Moderate stock (amber — < 14d cover)
3. Adequate stock (green)
4. Within each group: by purchase frequency desc

### Pre-check Logic
Auto-check items where: `is_low_stock = true` OR `cal_quantity = 0` OR `days_of_cover < 14`

### API Calls

| Call | When |
|------|------|
| `getVendors()` | Page load (vendor cards) |
| `getVendorItemList(rid, { fromDate: 1yr, toDate: today })` | Page load (history + rates) |
| `getStockInventory({ includeConsumption: true })` | Page load (stock context) |

---

## Screen 3: Create PO — By Item Need (`/purchase/orders/new?mode=item`)

### Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Back    New Purchase Order                                         │
│            german fluid · Items that need restocking                 │
│                                                                      │
│ [By Vendor ○] [By Item Need ●]                                       │
│                                                                      │
│ ┌────┐ ┌─────────┐ ┌──────────────┐ ┌────────┐                     │
│ │ 3  │ │ 5       │ │ 12           │ │ 48     │                     │
│ │OOS │ │Low(<7d) │ │Below Reorder │ │Total   │                     │
│ └─RED┘ └──AMBER──┘ └────BLUE─────┘ └────────┘                     │
│                                                                      │
│ ITEMS NEEDING PURCHASE          Sorted by urgency (lowest cover first)│
│ ┌────────────────────────────────────────────────────────────────── │
│ │ ✓ │ Item          │Stock │Daily│Days│Best Vendor      │Rate │Qty  │
│ │ ✓ │ Carrot OOS    │0 kg  │ —   │ 0d │[Budget ✓ ▾]    │₹80  │ 10  │
│ │ ✓ │ Coconut OOS   │0 kg  │ —   │ 0d │[Budget ✓ ▾]    │₹220 │  5  │
│ │ ✓ │ Sesame LOW    │3.97kg│0.8  │ 5d │[Budget ✓ ▾]    │₹160 │ 20  │
│ │ ✓ │ Jaggery       │3.85kg│0.32 │12d │[Budget ✓ ▾]    │₹120 │ 15  │
│ │ ✓ │ Raisins       │1.5kg │0.1  │14d │[Premium ✓ ▾]   │₹180 │  5  │
│ └────────────────────────────────────────────────────────────────── │
│                                                                      │
│ AUTO-GROUP BY VENDOR (5 items → 2 POs)                               │
│ ┌─── PO #1 Budget ──────────┐ ┌─── PO #2 Premium ─────────┐       │
│ │ Carrot   10kg  ₹800       │ │ Raisins  5kg  ₹900        │       │
│ │ Coconut   5kg  ₹1,100     │ │                            │       │
│ │ Sesame   20kg  ₹3,200     │ │ Subtotal: ₹900             │       │
│ │ Jaggery  15kg  ₹1,800     │ │ Cheapest for Raisins       │       │
│ │ Subtotal: ₹6,900          │ └────────────────────────────┘       │
│ │ Savings vs Premium: 25%   │                                       │
│ └────────────────────────────┘                                       │
│                                                                      │
│ 5 items → 2 POs · ₹7,800          [Save Drafts] [Review 2 POs →]   │
└──────────────────────────────────────────────────────────────────────┘
```

### Vendor Picker (per item)

Dropdown per row showing all vendors who have sold this item, sorted by rate:
```
[Budget ✓ cheapest ₹80/kg]
[Premium Organics ₹120/kg]
```

Pre-selects cheapest vendor. User can override per item.

### Auto-Group Logic

```javascript
// Group selected items by their chosen vendor
const groups = {};
selectedItems.forEach(item => {
  const vendorId = item.selectedVendorId;
  if (!groups[vendorId]) groups[vendorId] = { vendor, items: [], total: 0 };
  groups[vendorId].items.push(item);
  groups[vendorId].total += item.qty * item.rate;
});
// Each group becomes a separate PO
```

### Multiple POs

When items are split across vendors, the system creates **separate POs per vendor** — each with its own `reference_code`, submitted as independent API calls.

---

## Screen 4: Review — Multi-PO (`/purchase/orders/new/review`)

### Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Edit    Review — 2 Purchase Orders                                 │
│                                                                      │
│ ┌─ PO #1 — Budget Ingredients Co ──── 4 items · ₹6,900 ───────────┐│
│ │ Will be PO-806-2026-0009                                          ││
│ │ Item          │Qty │Unit│Rate │Total │Stock Impact                ││
│ │ Carrot        │ 10 │kg  │₹80  │₹800  │0 → 10 kg (restores)      ││
│ │ Coconut Powder│  5 │kg  │₹220 │₹1,100│0 → 5 kg                  ││
│ │ Sesame Till   │ 20 │kg  │₹160 │₹3,200│3.97 → 23.97 kg (+25d)   ││
│ │ Jaggery Powder│ 15 │kg  │₹120 │₹1,800│3.85 → 18.85 kg (+47d)   ││
│ │ Subtotal: ₹6,900                                                  ││
│ │ Savings: ₹2,350 (25%) vs Premium Organics                        ││
│ └────────────────────────────────────────────────────────────────── ││
│                                                                      │
│ ┌─ PO #2 — Premium Organics Ltd ──── 1 item · ₹900 ───────────────┐│
│ │ Will be PO-806-2026-0010                                          ││
│ │ Raisins       │  5 │kg  │₹180 │₹900  │1.5 → 6.5 kg (+50d)      ││
│ │ Subtotal: ₹900                                                    ││
│ └────────────────────────────────────────────────────────────────── ││
│                                                                      │
│ Combined: ₹7,800 · 2 POs · 5 items                                  │
│ ☑ Send both POs immediately     Delivery: 22 Jun 2026               │
│                                  [Save All as Drafts] [Create & Send]│
└──────────────────────────────────────────────────────────────────────┘
```

### Stock Impact Column

Per line: `current_stock → after_receive` with days-of-cover delta:
- "0 → 10 kg (restores)" — for out-of-stock items
- "3.97 → 23.97 kg (+25d cover)" — with days added

### Submit Options

| Action | API Calls |
|--------|-----------|
| Save All as Drafts | `createPO(payload1)`, `createPO(payload2)` — both status=draft |
| Create & Send | `createPO(p1)` → `sendPO(id1)`, `createPO(p2)` → `sendPO(id2)` — sequential |

---

## Screen 5: PO Detail (`/purchase/orders/:id`)

### Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Back    PO-806-2026-0007    [Sent]    Budget Ingredients Co       │
│           Sent 14 Jun · Expected 20 Jun (6 days)                     │
│                                                                      │
│ Vendor: Budget Ingredients Co  Expected: 20 Jun  Payment: Cash      │
│ Total: ₹6,900  Notes: Monthly cookie ingredients                     │
│                                                                      │
│ STATUS TIMELINE                                                      │
│ ● Created → ● Sent → ○ Received → ○ Closed                         │
│ 14Jun 10:30  14Jun 10:32  Pending     —                              │
│                                                                      │
│ ORDER LINES (4 items)                                                │
│ Item          │Ordered│Rate│Total│Your Stock│Days│After Recv│Status  │
│ Carrot OOS    │10 kg  │₹80 │₹800 │0 kg ▬RED │ 0d │10 kg     │Open   │
│ Coconut OOS   │ 5 kg  │₹220│₹1.1K│0 kg ▬RED │ 0d │5 kg      │Open   │
│ Sesame LOW    │20 kg  │₹160│₹3.2K│3.97 ▬AMB │ 5d │23.97 +30d│Open   │
│ Jaggery       │15 kg  │₹120│₹1.8K│3.85 ▬AMB │12d │18.85 +47d│Open   │
│                                                                      │
│ [✓ Receive Goods]  [Cancel PO]                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Contextual Actions Per Status

| PO Status | Actions Shown |
|-----------|---------------|
| `draft` | Edit, Approve (if `require_po_approval`), Send (if approval not required), Delete |
| `approved` | Send, Cancel |
| `sent` | **Receive Goods**, Cancel |
| `partially_received` | **Receive Goods** (remaining), Close (accept partial), Cancel |
| `received` | Close |
| `closed` | None (read-only) |
| `cancelled` | None (read-only, show `cancel_reason`) |

### Status Timeline

Visual timeline showing: Created → Approved (optional) → Sent → Received → Closed
- Completed steps: green dot + timestamp
- Current step: amber dot + "Awaiting"
- Future steps: gray dot

---

## Screen 6: Receive Goods (`/purchase/orders/:id/receive`)

### Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Back to PO    Receive Goods — PO-806-2026-0007                    │
│                  Budget Ingredients Co                                │
│ Match the vendor invoice against PO lines. Record actual delivery.   │
│                                                                      │
│ [Manual Entry (Match Physical Invoice) ●] [Upload Invoice ○ SOON]   │
│                                                                      │
│ ℹ Enter quantities and rates from the vendor's physical invoice.     │
│   The system compares against PO expected rates and flags variances. │
│                                                                      │
│ Invoice Date: [____]  Vendor Invoice #: [INV-BUD-0456]  Payment: [▾]│
│                                                                      │
│ ┌─ Carrot · PO: 10 kg @ ₹80/kg = ₹800 ──────── [OUT OF STOCK] ──┐ │
│ │ Invoice Qty: [10]  Rate: [82]  Batch: [CARROT-JUN-001]  Exp:[..]│ │
│ │ Invoice Total: ₹820 (PO: ₹800)                                  │ │
│ │ ┌VARIANCE─────┐ ┌RATE HISTORY────────┐ ┌STOCK IMPACT─────────┐  │ │
│ │ │ +2.5% ✓ OK  │ │Last₹80 Avg₹78     │ │0 kg → 10 kg         │  │ │
│ │ │ Within 10%  │ │Best₹75 ▇▇▇▇▇▇▓▓██│ │Restores from OOS    │  │ │
│ │ └─────────────┘ └────────────────────┘ └─────────────────────┘  │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌─ Sesame Till · PO: 20 kg @ ₹160/kg ──── [⚠ VARIANCE FLAGGED] ──┐ │
│ │ Invoice Qty: [20]  Rate: [185]  Batch: [SES-JUN-001]  Exp: [..] │ │
│ │ Invoice Total: ₹3,700 (PO: ₹3,200)                              │ │
│ │ ┌VARIANCE─────────┐ ┌RATE HISTORY────────┐ ┌STOCK IMPACT──────┐ │ │
│ │ │ +15.6% ⚠ EXCEEDS│ │Last₹160 Avg₹155    │ │3.97 → 23.97 kg  │ │ │
│ │ │ Threshold: 10%  │ │Best₹150 ▇▇▇▓▓█████│ │+30d cover        │ │ │
│ │ │ Highest ever!   │ │"Highest rate ever"  │ │                  │ │ │
│ │ └─────────────────┘ └────────────────────┘ └──────────────────┘ │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌─ Jaggery · PO: 15 kg @ ₹120/kg ──────────── [Good deal] ───────┐ │
│ │ Invoice Qty: [15]  Rate: [118]  Batch: [JAG-JUN-001]  Exp: [..] │ │
│ │ VARIANCE: -1.7% ✓ Below expected                                 │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌─ Coconut Powder · PO: 5 kg @ ₹220 ─────── [☐ Skip — not sent] ─┐ │
│ │ Vendor didn't include. Will remain open on PO.                    │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ SUMMARY: 3 matched · 1 skipped · ₹6,290 invoice · 1 variance flag   │
│ ⚠ Sesame: ₹185 vs ₹160 (+15.6%) — exceeds 10% threshold            │
│ FEFO: New batches enter after existing segments in expiry queue       │
│ PO will move to "Partially Received" (Coconut pending)               │
│                                         [Cancel] [Confirm & Receive] │
└──────────────────────────────────────────────────────────────────────┘
```

### Tab: Upload Invoice (Phase 2 — Coming Soon)

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Manual Entry ○] [Upload Invoice ● — Coming Soon]                    │
│                                                                      │
│         ┌─────────────────────────────────┐                          │
│         │    📄                            │                          │
│         │                                 │                          │
│         │  Upload Invoice / Challan       │                          │
│         │  Take a photo or upload PDF     │                          │
│         │                                 │                          │
│         │  [Choose File] or drag & drop   │                          │
│         │                                 │                          │
│         │  Coming Soon — G-014            │                          │
│         │  AI will auto-extract items,    │                          │
│         │  quantities, and rates from     │                          │
│         │  your vendor invoice.           │                          │
│         └─────────────────────────────────┘                          │
└──────────────────────────────────────────────────────────────────────┘
```

### Per-Line Intelligence (3 panels)

| Panel | Data Source | Display |
|-------|-----------|---------|
| **Rate Variance** | `(actual_rate - expected_rate) / expected_rate × 100` | % with color: green ≤5%, amber 5-10%, red >10% (threshold from `po_variance_alert_pct` setting). "EXCEEDS THRESHOLD" badge if flagged. |
| **Rate History** | `vendor-item-list` filtered by vendor + item | Last rate, avg rate, best rate. Bar chart comparing. "Highest rate ever" warning if applicable. |
| **Stock Impact** | `getStockInventory()` current qty + received qty | `before → after` with stock bar. Days of cover delta. "Restores from OOS" or "+Xd cover". |

### Receive Form Fields (per line)

| Field | Type | Source | Validation |
|-------|------|--------|-----------|
| Received Qty | Number | User enters from invoice | ≤ remaining_qty (API enforces `PO_LINE_OVER_RECEIVE`) |
| Actual Rate | Number | User enters from invoice | Variance auto-calculated |
| Batch | Text | User enters from invoice/label | Required |
| Expiry Date | Date | User enters from label | Must be future (API enforces) |
| Skip checkbox | Boolean | User toggles | Skipped lines remain "open" on PO |

### Variance Thresholds

| Variance | Color | Label |
|----------|-------|-------|
| ≤ 5% | Green | OK |
| 5% — `po_variance_alert_pct` | Amber | Warning |
| > `po_variance_alert_pct` | Red | EXCEEDS THRESHOLD — flagged on GRN |

---

## Screen 7: Post-Receive Confirmation

Success card showing:
- GRN reference + vendor
- KPIs: Lines Received, GRN Total, Variance Flags
- Stock impact summary per item (before → after)
- Pending items note (if partial)
- Navigation: View PO, Stock Inventory, Back to PO List

---

## Screen 8: GRN History (on PO Detail — closed PO)

### Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ PO-806-2026-0005    [Closed]    2 GRN events                        │
│                                                                      │
│ FINAL LINE STATUS                                                    │
│ Item     │Ordered│Received│Avg Rate│Cost  │Variance│GRNs│Status      │
│ Carrot   │10 kg  │10 kg   │₹82     │₹820  │+2.5%   │ 1  │Done       │
│ Sesame   │20 kg  │20 kg   │₹180    │₹3,600│+12.5%⚠ │ 2  │Done       │
│ Jaggery  │15 kg  │15 kg   │₹118    │₹1,770│-1.7%   │ 1  │Done       │
│ Coconut  │ 5 kg  │ 5 kg   │₹225    │₹1,125│+2.3%   │ 1  │Done       │
│ Grand Total:                        ₹7,315  Expected ₹6,900 (+6%)   │
│                                                                      │
│ GRN #1 — 18 Jun · 3 lines · ₹5,365 · Invoice: INV-BUD-0456        │
│   Carrot 10kg @₹82 CARROT-JUN-001 +2.5% ✓                          │
│   Sesame 15kg @₹185 SES-JUN-001 +15.6% ⚠                           │
│   Jaggery 15kg @₹118 JAG-JUN-001 -1.7% ✓                           │
│                                                                      │
│ GRN #2 — 22 Jun · 2 lines · ₹1,950 · Invoice: INV-BUD-0461 FINAL  │
│   Sesame 5kg @₹165 SES-JUN-002 +3.1% ✓                             │
│   Coconut 5kg @₹225 COCO-JUN-001 +2.3% ✓                           │
│   All lines complete → PO auto-closed                                │
│                                                                      │
│ COST ANALYSIS                                                        │
│ Expected: ₹6,900  Actual: ₹7,315  Variance: +₹415 (+6%)            │
│ Sesame accounted for 89% of overrun. Negotiate rate next PO.         │
└──────────────────────────────────────────────────────────────────────┘
```

### Cost Analysis

| Metric | Computation |
|--------|------------|
| Expected Total | Sum of `ordered_qty × expected_rate` per line |
| Actual Total | Sum of `received_qty × actual_rate` across all GRN events per line |
| Avg Rate per line | `total_actual_cost / total_received_qty` |
| Variance per line | `(avg_actual_rate - expected_rate) / expected_rate × 100` |
| Overrun attribution | Which line contributed most to cost difference |

---

## Screen 9: Add-Stock Gate

Shown when hierarchy store attempts direct `add-stock` and gets `DIRECT_PURCHASE_REQUIRES_PO`:

```
┌────────────────────────────────┐
│          ⚠                     │
│  Direct Stock Entry Disabled   │
│                                │
│  Your store requires purchase  │
│  orders for vendor stock       │
│  intake. Create a PO, send it  │
│  to your vendor, and receive   │
│  goods against it.             │
│                                │
│  [Go to Purchase Orders →]     │
│                                │
│  Admin: Operational Settings   │
│  require_po_for_purchase       │
└────────────────────────────────┘
```

---

## Settings Integration

PO behavior is controlled by operational settings (editable in Settings screen by master store):

| Setting | Default | Effect |
|---------|---------|--------|
| `require_po_for_purchase` | `true` | Gates direct `add-stock`. When false, old flow works. |
| `require_po_approval` | `false` | When true, PO must be approved before sending. Shows Approve button on draft. |
| `po_auto_close_on_full_receive` | `true` | Auto-closes PO when all lines fully received. |
| `po_variance_alert_pct` | `10` | Threshold for flagging rate variance on receive. |

---

## Role Gates

| Role | PO Access |
|------|-----------|
| Central Store (master) | Full lifecycle — create, approve, send, receive, close, cancel |
| Master Store (central) | Full lifecycle (if `allow_child_direct_vendor_purchase` enabled) |
| Outlet (franchise) | **Blocked** — `VENDOR_PURCHASE_NOT_ALLOWED`. Shows blocked state. |

---

## New Files

| File | Purpose | Est Lines |
|------|---------|:---------:|
| `PurchaseOrderList.jsx` | Screen 1 — PO list with filters | ~300 |
| `PurchaseOrderCreate.jsx` | Screens 2+3+4 — By Vendor + By Item Need + Review | ~600 |
| `PurchaseOrderDetail.jsx` | Screens 5+6+7+8 — Detail + Receive + Post-receive + GRN | ~500 |

## Modified Files

| File | Change |
|------|--------|
| `services/api.js` | Add 10 PO methods |
| `AddStockPurchaseForm.jsx` | Add gate redirect for hierarchy stores |
| `App.js` | Add PO routes |

---

## API Methods (10 new in api.js)

| Method | Endpoint | Type |
|--------|----------|------|
| `createPO(payload)` | `POST /inventory/purchase-order/create` | Write |
| `listPOs(filters)` | `GET /inventory/purchase-order/list?...` | Read |
| `getPODetail(id)` | `GET /inventory/purchase-order/{id}` | Read |
| `updatePO(id, payload)` | `PUT /inventory/purchase-order/{id}/update` | Write (draft only) |
| `deletePO(id)` | `DELETE /inventory/purchase-order/{id}` | Write (draft only) |
| `approvePO(id)` | `POST /inventory/purchase-order/{id}/approve` | Write |
| `sendPO(id)` | `POST /inventory/purchase-order/{id}/send` | Write |
| `receivePO(id, payload)` | `POST /inventory/purchase-order/{id}/receive` | Write |
| `cancelPO(id, reason)` | `POST /inventory/purchase-order/{id}/cancel` | Write |
| `closePO(id)` | `POST /inventory/purchase-order/{id}/close` | Write |

---

## Error Handling

| Error Code | Screen | UX |
|-----------|--------|-----|
| `DIRECT_PURCHASE_REQUIRES_PO` | AddStockPurchaseForm | Screen 9 gate redirect |
| `PO_INVALID_STATUS` | PO Detail actions | Toast: "This action is not available for {status} POs" |
| `PO_LINE_OVER_RECEIVE` | Receive form | Inline error on qty field: "Exceeds remaining qty" |
| `VENDOR_PURCHASE_NOT_ALLOWED` | Create PO | Blocked state: "Direct vendor purchase disabled for your store" |
| `PO_NOT_DELETABLE` | PO Detail | Toast: "Only draft POs can be deleted" |
| `PO_APPROVAL_REQUIRED` | PO Detail send | Toast: "PO must be approved before sending" + show Approve button |
| `VALIDATION_FAILED` | Receive form | Inline field errors (e.g. past expiry) |

---

## Mock References

| Mock | URL |
|------|-----|
| Final Freeze (9 screens) | `/__dev/previews/P35_purchase_order_FINAL_FREEZE.html` |
| Create flow v2 (intelligence) | `/__dev/previews/P35_purchase_order_mock_v2.html` |
| Receive flow (intelligence) | `/__dev/previews/P35_receive_flow_mock.html` |

---

*This document is FROZEN. Implementation proceeds against this spec. Changes require owner re-approval.*
