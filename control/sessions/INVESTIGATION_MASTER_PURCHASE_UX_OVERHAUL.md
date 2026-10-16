# INVESTIGATION MASTER DOCUMENT — Storekeeper Purchase UX Overhaul

> **Date:** 2026-10-15 / 2026-10-16
> **Agent Role:** INVESTIGATION
> **Prepared for:** INTAKE role — use this document to register CRs and BUGs
> **Source documents consolidated:**
>   - `INVESTIGATION_20261015_PURCHASE_FORM_UX.md`
>   - `INVESTIGATION_20261015_PO_FLOW_AUDIT.md`
>   - `INVESTIGATION_20261015_PO_COVERAGE_DAYS.md`
> **Mockups produced:**
>   - `control/sessions/purchase_form_mockup.html` (Add Stock form — interactive)
>   - `control/sessions/po_flow_mockup.html` (PO flow — 6 screens, interactive)
> **No code edits made.**

---

## Context

Owner identified that the current procurement UI is not optimised for storekeepers who enter 10–30 items daily by hand. The entire design across three entry screens needs to shift from a card/accordion pattern to a **keyboard-driven spreadsheet-row pattern**. Investigation covered:

1. `AddStockPurchaseForm.jsx` — direct vendor purchase (no PO required)
2. `PurchaseOrderCreate.jsx` — PO creation (vendor selection + item entry)
3. `PurchaseOrderDetail.jsx` (receive form) — Receive Goods against a PO

A fourth issue was discovered mid-investigation: the PO suggestion logic uses a hardcoded 30-day target whereas the equivalent `RequestStockForm.jsx` already has a working 3/7/10/30-day selector.

---

## SECTION 1 — Add Stock Purchase Form (`AddStockPurchaseForm.jsx`)

### Design Confirmed by Owner

**Target UX:** Single shared header (Vendor + Date + Payment Type) + spreadsheet table below. All item fields — Item (search), Qty, Unit (auto), Batch (auto), Expiry, Unit Price, Total (computed) — on one horizontal row. Tab/Enter navigates forward; completing the last field auto-opens the next row.

**Owner confirmed:** Suggested quantities are editable.

### 7 Findings

| # | Finding | Classification | File | Lines |
|---|---------|---------------|------|-------|
| F1 | Vendor is shared at top level — correct. No per-line vendor needed. | ✅ Design confirmed (Issue 1 resolved differently than originally proposed) | `AddStockPurchaseForm.jsx` | 42 |
| F2 | Total Amount = Unit Price × Qty not auto-computed | Frontend gap | `AddStockPurchaseForm.jsx` | 491–497 |
| F3 | Payment type is single select — no split. Backend API only accepts one `payment_type` string. | Frontend gap + potential backend gap | `AddStockPurchaseForm.jsx` | 516–524 |
| F4 | Batch label is manual — no auto-generation from item name + date | Frontend gap | `AddStockPurchaseForm.jsx` | 478 |
| F5 | Item field is a `<Select>` with no search. 100+ items, no filter. | Frontend gap | `AddStockPurchaseForm.jsx` | 443–454 |
| F6 | New item row only opens on button click — no auto-progression | Frontend gap | `AddStockPurchaseForm.jsx` | 114, 503 |
| F7 | Confirm/Review page shows no prices, no grand total | Frontend gap | `AddStockPurchaseForm.jsx` | 217–237 |

### Current vs Proposed Layout

```
CURRENT (card per item):
  [Vendor dropdown — top of page]
  Card: Item | Qty | Batch | Expiry
        Unit Price | Total Amount (manual)
  "Show Commercial Fields" toggle

PROPOSED (spreadsheet table):
  Header: [Vendor ▼] [Date] [Payment ▼]
  ┌──────────────┬─────┬──────┬──────────────┬────────┬────────────┬────────┐
  │ Item (search)│ Qty │ Unit │ Batch (auto) │ Expiry │ Unit Price │ Total  │
  ├──────────────┼─────┼──────┼──────────────┼────────┼────────────┼────────┤
  │ Maida (kg)   │  50 │  kg  │ MAIDA-OCT-15 │Apr-27  │    42.00   │ ₹2,100 │
  │ [type here…] │     │      │              │        │            │        │
  └──────────────┴─────┴──────┴──────────────┴────────┴────────────┴────────┘
                                                      Grand Total   ₹2,100
  Tab order: Item → Qty → Expiry → Unit Price → [Enter = new row]
  Unit and Batch: auto-filled, skipped by Tab
```

### Auto-Batch Formula
```
{ITEM_NAME_FIRST_WORD_UPPERCASE}-{MON}-{DD}
e.g. "Maida" + "2026-10-15" → "MAIDA-OCT-15"
Regenerates when item or date changes. User can override.
```

### Auto-Total Formula
```
total = unit_price × quantity  (read-only, recomputed live)
User can override total (e.g. for discount)
```

### Payment — Partial Split (Owner confirmed: single type for now)
API only accepts `payment_type: string`. No split support on backend.
Frontend can show Cash/Credit/Online/Tab as single select.
File G-035 if owner needs proper split payment recording later.

---

## SECTION 2 — PO Create: Items Entry (`PurchaseOrderCreate.jsx` — step=items)

### Design Confirmed by Owner

Same spreadsheet-row layout as Add Stock. Start empty. OOS/low-stock items pre-populated as "SUGGESTED" orange rows. Storekeeper adds additional items via search. **Coverage days selector (3d/7d/10d/30d)** drives the suggested quantities.

### Findings

| # | Finding | Classification | File | Lines |
|---|---------|---------------|------|-------|
| F8 | All 266 items pre-loaded and pre-selected — storekeeper must uncheck 250+ | Frontend design gap | `PurchaseOrderCreate.jsx` | 229, 526 |
| F9 | `TARGET_DAYS = 30` hardcoded — no user selector for 7d/10d/30d coverage | Frontend gap (missing feature) | `PurchaseOrderCreate.jsx` | 215, 268 |
| F10 | Fallback when no consumption data uses `"10"` (arbitrary) instead of `min_qty_alert` | **Bug** (wrong calculation) | `PurchaseOrderCreate.jsx` | 227 |
| F11 | 9-column table (Last Rate / Avg Rate / Cheapest / DoC) — overloads storekeeper | UX design gap | `PurchaseOrderCreate.jsx` | 513–524 |
| F12 | Vendor selection uses 3-column card grid — no type-to-search | UX design gap | `PurchaseOrderCreate.jsx` | 434–482 |

### Coverage Days — Key Evidence

`RequestStockForm.jsx` already has the correct implementation:
```javascript
const COVERAGE_OPTIONS = [
  { value: 3, label: "3 days" },
  { value: 7, label: "7 days" },   ← default
  { value: 10, label: "10 days" },
  { value: 30, label: "30 days" },
];
const [coverageDays, setCoverageDays] = useState(7);
// Formula: orderQty = max(0, ceil(avgDaily × coverageDays − currentStock))
// Fallback: if no consumption → gap to min_qty_alert threshold
// Exclude: items with orderQty = 0 entirely
```

`PurchaseOrderCreate.jsx` has:
```javascript
const TARGET_DAYS = 30; // hardcoded — no selector
// Fallback: suggestedQty || "10"  ← arbitrary, ignores min_qty_alert
```

### Impact of Hardcoded 30d vs User-Selected 7d

| Item | 7-day suggestion (correct) | 30-day (current hardcoded) |
|------|:--------------------------:|:--------------------------:|
| Maida (4.2 kg/day, 0 stock) | **29 kg** | 126 kg |
| Onion (4.1 kg/day, 12.4 stock) | **17 kg** | 111 kg |
| Oil (no consumption, min=5, stock=2) | **3 ltr** (threshold gap) | **10** (wrong) |

### Suggested Quantities Are Editable
Confirmed: `ordered_qty` is a user-editable input (line 551). The suggestion is a pre-fill only. Storekeeper overrides freely.

### Proposed Header (Screen 3)
```
[Vendor: Fresh Farms] [Delivery: date] [Notes: ...]  [ORDER COVER: 3d | 7d | 10d | 30d]
```
Coverage pills drive live recalculation of all SUGGESTED row quantities instantly on click.

---

## SECTION 3 — PO Receive Goods (`PurchaseOrderDetail.jsx` — receive form)

### Same Core Problem as Sections 1 & 2

Current: card-per-item (for a 10-item PO = 10 tall scrollable cards).
Proposed: one row per item in same spreadsheet table pattern.

### Findings

| # | Finding | Classification | File | Lines |
|---|---------|---------------|------|-------|
| F13 | Card-per-item layout — no keyboard flow possible | UX design gap | `PurchaseOrderDetail.jsx` | 421–503 |
| F14 | Batch field is empty manual entry — no auto-generation | Frontend gap | `PurchaseOrderDetail.jsx` | 472 |
| F15 | Rate × qty not computed — total not shown per line | Frontend gap | `PurchaseOrderDetail.jsx` | 479–482 (commented out) |
| F16 | Rate Variance shown as large panel card — should be inline badge | UX design gap | `PurchaseOrderDetail.jsx` | 484–499 |
| F17 | No grand total bar comparing invoice total vs PO estimate | Frontend gap | `PurchaseOrderDetail.jsx` | 506–527 |

### What to Keep
- Rate Variance detection (>10% flag) — keep as inline badge in "Var" column
- Stock impact (current → after) — keep as single line under item name
- Invoice duplicate check (CR-040) — already working, keep as-is
- Skip checkbox per line — keep

### Proposed Layout (Screen 6)
```
Header: [Invoice Date] [Invoice #] [Payment ▼]  ← shared
┌──────────┬────────┬──────┬─────────┬────────┬──────────────┬────────┬──────┬────────┐
│ Item     │ PO Qty │ Unit │ Rcv Qty │ Var    │ Rate         │ Batch  │Expiry│ Total  │
├──────────┼────────┼──────┼─────────┼────────┼──────────────┼────────┼──────┼────────┤
│ Maida    │  126   │  kg  │   126   │  0% ✓  │    42.00     │AUTO    │Apr-27│ ₹5,292 │
│ Onion    │  111   │  kg  │   108   │ +23% ⚠ │    22.20 ⚠  │AUTO    │Dec-26│ ₹2,397 │
│ Oil      │   27   │  ltr │ [input] │   —    │  [input]     │AUTO    │      │   —    │
└──────────┴────────┴──────┴─────────┴────────┴──────────────┴────────┴──────┴────────┘
                                              Invoice Total ₹7,689 | PO est ₹7,290 | +₹399
```

---

## SECTION 4 — Confirmed Behaviour (Not a Bug)

| Item | Finding |
|------|---------|
| Suggested quantities are editable | ✅ Confirmed. `ordered_qty` has `onChange` on line 551. Suggestions are pre-fills only. |
| Vendor is shared (not per-line) | ✅ Confirmed by owner. One vendor per purchase session. |
| Payment type is shared | ✅ Confirmed by owner. One payment type per session. |

---

## SECTION 5 — Shared Components (Build Once, Use in All Three Screens)

All three screens share the same row pattern. PLANNING should design these as shared components:

| Component | Used in | Description |
|-----------|---------|-------------|
| `ItemSearchCombobox` | All 3 | Type-to-search with fuzzy match + "Add to catalogue" option |
| `autoBatch(title, date)` | All 3 | `{SLUG}-{MON}-{DD}` generator |
| `computeTotal(qty, price)` | All 3 | `qty × price`, read-only |
| `KeyboardRowHandler` | All 3 | Tab/Enter → next field → next row |
| `InlineVarianceBadge` | Screen 6 only | Shows `+23% ⚠` or `0% ✓` |

---

## SECTION 6 — Open Questions for Owner (INTAKE must resolve)

| # | Question | Impacts |
|---|----------|---------|
| Q1 | Default coverage days for PO Create: **7d** (like RequestStockForm) or different? | CR-048 formula default |
| Q2 | Should the coverage days preference be saved per-user or per-session only? | CR-048 — if saved: needs API change |
| Q3 | Partial payment split (Cash + Tab): store in notes field for now, or block until G-035 backend? | CR-047 scope |
| Q4 | "Add to catalogue" from item search: open catalogue page, or inline modal? | CR-047, CR-048 |
| Q5 | PO Review page (Screen 4): show estimated prices from last-known rate or leave blank? | CR-048 |

---

## SECTION 7 — Proposed CRs and BUGs for INTAKE

### Summary

| ID | Type | Title | File(s) | Severity | Est. Scope |
|----|------|-------|---------|:--------:|:----------:|
| **CR-047** | CR | Add Stock — Storekeeper Spreadsheet UX | `AddStockPurchaseForm.jsx` | P1 | MEDIUM |
| **CR-048** | CR | PO Create — Storekeeper Spreadsheet UX + Coverage Days Selector | `PurchaseOrderCreate.jsx` | P1 | MEDIUM |
| **CR-049** | CR | PO Receive Goods — Storekeeper Spreadsheet UX | `PurchaseOrderDetail.jsx` | P1 | SMALL |
| **BUG-049** | BUG | PO Create — Wrong Suggestion Fallback (`"10"` instead of `min_qty_alert`) | `PurchaseOrderCreate.jsx` | P2 | SMALL |

### Rationale for Splitting into 3 CRs

1. **Different files, different logic** — Each screen is self-contained. They can be implemented and QA'd independently.
2. **Different risk levels** — CR-047 (Add Stock) is standalone. CR-048 (PO Create) has more business logic (coverage days + suggestion engine). CR-049 (Receive) is simpler (layout-only, no logic change).
3. **Parallel implementation possible** — Different agents can work on CR-047 and CR-049 simultaneously.
4. **Incremental delivery** — Owner can ship CR-047 first, review, then proceed to CR-048.

### Why BUG-049 is Separate from CR-048

The `"10"` fallback (finding F10) is a **calculation error** — it returns wrong data regardless of the UX redesign. It should be fixed even if CR-048 is deferred. Separating it ensures it can be fast-tracked.

---

## SECTION 8 — CR Brief Sheets (for INTAKE to copy into Gate 1 Artifacts)

---

### CR-047 Brief — Add Stock: Storekeeper Spreadsheet UX

**Problem:** `AddStockPurchaseForm.jsx` uses a stacked card-per-item layout that requires mouse-click navigation. Storekeepers entering 20+ items daily cannot use keyboard-only flow. Fields scattered across lines make entry slow and error-prone.

**Proposed Solution:** Redesign as a single-page spreadsheet table. All 7 item fields (Item search, Qty, Unit, Batch, Expiry, Unit Price, Total) on one horizontal row. Tab/Enter drives forward. Completing the last field opens a new row automatically.

**Key Changes:**
1. Replace `<Select>` item picker with searchable `Command` combobox
2. Auto-generate batch: `{ITEM_SLUG}-{MON}-{DD}`
3. Auto-compute total: `unit_price × qty` (read-only, overridable)
4. Auto-open next row when last field of current row is filled
5. Show unit price + total + grand total on confirm/review page
6. Payment type stays single select at top (no split for now)

**Files WILL change:** `AddStockPurchaseForm.jsx`
**Files will NOT touch:** `api.js`, `server.py`, `terminology.js`, `screenVisibility.js`
**Mockup:** `control/sessions/purchase_form_mockup.html`
**Owner questions:** Q3, Q4

---

### CR-048 Brief — PO Create: Storekeeper Spreadsheet UX + Coverage Days

**Problem:** `PurchaseOrderCreate.jsx` loads all 266 inventory items pre-selected with qty=10, forcing storekeepers to uncheck 250+ items. Suggestion formula uses `TARGET_DAYS = 30` hardcoded — no way to order for 7-day or 10-day cover. Vendor selection is a card grid with no search.

**Proposed Solution:**
1. Start with empty table. Pre-populate SUGGESTED rows (orange) for OOS and low-stock items only.
2. Add `[3d] [7d] [10d] [30d]` coverage pills in header (default 7d). Pills drive live recalculation of all suggested quantities.
3. Formula: `orderQty = max(0, ceil(avgDaily × coverageDays − currentStock))` — ported from `RequestStockForm.jsx`
4. Fallback when no consumption: use `min_qty_alert` gap (ported from `RequestStockForm.jsx`)
5. Exclude items with no need entirely (same as `RequestStockForm`)
6. Replace vendor card grid with type-to-search (same `Command` combobox)
7. Same spreadsheet table row layout as CR-047

**Files WILL change:** `PurchaseOrderCreate.jsx`
**Files will NOT touch:** `api.js`, `RequestStockForm.jsx`, `server.py`
**Reuse from CR-047:** `ItemSearchCombobox`, `autoBatch()`, `computeTotal()`, `KeyboardRowHandler`
**Mockup:** `control/sessions/po_flow_mockup.html` → Screen 3
**Owner questions:** Q1, Q2, Q4, Q5
**Dependency:** Can be implemented after CR-047 ships (reuse components)

---

### CR-049 Brief — PO Receive Goods: Storekeeper Spreadsheet UX

**Problem:** `PurchaseOrderDetail.jsx` receive form shows each item as a tall card (Invoice Qty + Rate + Batch + Expiry + Variance panel + Stock Impact panel). For a 10-item PO = 10 cards to scroll. No keyboard flow. No auto-batch. No live total per line.

**Proposed Solution:**
1. Replace card-per-item with one table row per item
2. Columns: Item | PO Qty | Unit | Rcv Qty | Var (badge) | Rate | Batch (auto) | Expiry | Total
3. Inline `Var` column: `+23% ⚠` or `0% ✓` badge (replaces the full card panel)
4. Stock impact: single line under item name (`0 → 126 kg after`)
5. Grand total bar: Invoice Total vs PO Estimate + delta
6. Auto-batch: same `autoBatch()` utility as CR-047/CR-048
7. Tab/Enter keyboard flow (same as CR-047/CR-048)
8. Keep: invoice duplicate check (CR-040), skip checkbox, variance flag

**Files WILL change:** `PurchaseOrderDetail.jsx`
**Files will NOT touch:** `api.js`, `server.py`
**Reuse from CR-047:** `autoBatch()`, `computeTotal()`, `KeyboardRowHandler`
**Mockup:** `control/sessions/po_flow_mockup.html` → Screen 6
**Dependency:** Can be implemented in parallel with CR-047

---

### BUG-049 Brief — PO Create: Wrong Suggestion Fallback

**Problem:** When an item has no consumption history but has a `min_qty_alert` threshold set, `PurchaseOrderCreate.jsx` fills the suggestion with the arbitrary value `"10"` instead of the correct gap-to-threshold quantity.

**Evidence:**
```javascript
// Line 227 — current (WRONG)
ordered_qty: isLow ? (suggestedQty || "10") : suggestedQty

// Correct (from RequestStockForm.jsx lines 188–192)
} else if (minQty > 0 && currentStock < minQty) {
  orderQty = ceil(minQty - currentStock); // gap to min threshold
}
```

**Example:** Oil: stock 2 ltr, `min_qty_alert` = 5 ltr → correct suggestion = **3 ltr**, current shows = **10**.

**Fix location:** `PurchaseOrderCreate.jsx` lines 215–229 (by-vendor mode) and lines 267–285 (by-item mode)
**Risk:** LOW — isolated calculation change, no API impact
**Severity:** P2 — wrong data shown but storekeeper can override

---

## SECTION 9 — Blast Radius

| Item | Files affected | Risk | Shared files touched? |
|------|:-------------:|:----:|:--------------------:|
| CR-047 | 1 (`AddStockPurchaseForm.jsx`) | LOW | No |
| CR-048 | 1 (`PurchaseOrderCreate.jsx`) | MEDIUM | No |
| CR-049 | 1 (`PurchaseOrderDetail.jsx`) | LOW | No |
| BUG-049 | 1 (`PurchaseOrderCreate.jsx`, same as CR-048) | LOW | No |

> **Note to INTAKE:** CR-048 and BUG-049 both touch `PurchaseOrderCreate.jsx`. Register them as related. BUG-049 should be applied within the CR-048 implementation plan as an inline fix — no separate implementation session needed.

---

## SECTION 10 — Implementation Order (Recommendation)

```
Phase 1 (can start immediately):
  BUG-049 ── quick fix in PurchaseOrderCreate.jsx (< 1 hour)

Phase 2 (parallel):
  CR-047 ── Add Stock redesign (3-4 days)
  CR-049 ── Receive Goods redesign (2-3 days) — can run in parallel with CR-047

Phase 3 (after CR-047 ships):
  CR-048 ── PO Create redesign, reusing shared components from CR-047 (3-4 days)
```

---

*Prepared by INVESTIGATION agent. Approved for INTAKE handoff.*
*Mockups verified as screenshots: 2026-10-15/16.*
