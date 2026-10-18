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

## SECTION 3B — New API: add-purchase (Replaces add-stock) — CONFIRMED LIVE

> Full detail: `INVESTIGATION_20261016_ADD_PURCHASE_API.md`

### New Endpoint
```
POST /inventory/add-purchase  (through proxy: /proxy/v2/inventory/add-purchase)
```

### Key Differences from Old add-stock

| Aspect | Old `add-stock/{id}` | New `add-purchase` |
|--------|---------------------|---------------------|
| Items per call | 1 (loop required) | ALL items in one call |
| Item ID | URL path param | `purchase_items[].Ingredient` (capital I) |
| Unit price | `price` | `purchase_items[].rate` |
| Line total | `tot_amount` | `purchase_items[].Amount` (capital A) |
| Split payment | ❌ Not supported | ✅ `payment_type:"partial"` + `partial_payments[]` |
| Payment modes | Cash/Credit/Online | Cash/Credit/Online/UPI/Tab |
| Transaction ID | None | `PUR-{RID}-{DATE}-{ID}` in response |
| Proxy change needed | — | ❌ None — catch-all already works |

### Split Payment Contract (CONFIRMED WORKING)
```json
{
  "payment_type": "partial",
  "partial_payments": [
    { "payment_mode": "Cash", "amount": 1500 },
    { "payment_mode": "UPI",  "amount": 960, "transaction_id": "optional" }
  ]
}
```
⚠️ **Backend does NOT validate sum(amounts) == tot_amount. Frontend MUST enforce.**

### G-035 Status: CLOSED
G-035 was raised as a potential gap for split payment backend support.
**It is now RESOLVED** — the new endpoint natively supports `partial_payments[]`.
Remove G-035 from the open gaps register.

### Additional Items Added to CR-047 Scope

| # | New Finding | Change Required |
|---|-------------|----------------|
| F18 | New endpoint replaces old | Replace `addStockPurchase()` in `api.js` |
| F19 | All items in one request | `handleSubmit` loop → single-call |
| F20 | New required fields | Add `item_total`, `tot_fair:0`, `tot_tax:0` |
| F21 | Split payment now backend-supported | Add split payment UI to CR-047 |
| F22 | Transaction ID in response | Show `PUR-807-...` on success screen |
| F23 | Frontend must balance-check splits | Validate `sum(splits) === tot_amount` |

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

## SECTION 6 — Open Questions — ALL ANSWERED

| # | Question | **Owner Answer** | Impact on CR |
|---|----------|-----------------|-------------|
| Q1 | Default coverage days | **3 days + custom number input** | CR-048: default=3, add free-text field alongside pills |
| Q2 | Coverage days persistence | **B — stored via `operational-settings` API.** Key `po_coverage_days` pending from BE. Frontend falls back to `3` until key is live. Register **G-036**. | CR-048 + G-036 |
| Q3 | "Add to catalogue" trigger | **Inline modal (b)** | CR-047, CR-048: no navigation away |
| Q4 | PO Review rates | **Leave blank (b)** | CR-048: no rates on review screen |
| Q5 | Split payment on PO Receive | **Backlog — additive fields later** | CR-049 scope unchanged for now |
| Q6 | UPI transaction reference | **Optional (a)** | CR-047: no required field |
| Q7 | Payment modes | **Cash, Card, UPI, Bank Transfer, Others** | CR-047: 5 modes (not Cash/Credit/Online) |
| Q8 | Tax / Fare fields | **Hide tax. Fare exposed, default 0** | CR-047: `tot_tax`=0 hidden; `tot_fair` optional visible |
| Q9 | Transaction ID on success | **Yes — show on success screen (a)** | CR-047: display `PUR-807-...` |

---

### Q2 Detail — Coverage Days Preference: ANSWERED + Backend Gap Identified

**Owner answer:** B — Remember last choice, stored via `v2/inventory-transfer/operational-settings/get` — **mark pending from BE**

**What this means technically:**

#### Current state of operational-settings API (probed 2026-10-16)
```
POST /inventory-transfer/operational-settings/get → { stored_settings: { ... } }

Current keys in stored_settings (RID 807):
  allow_negative_stock, allow_over_receive, reserve_on_approve,
  near_expiry_alert_days, po_variance_alert_pct, require_po_for_purchase,
  po_auto_close_on_full_receive, fefo_consumption_enabled ...
  
  ❌ po_coverage_days — NOT PRESENT (backend needs to add it)
```

#### How updateOperationalSettings works in api.js (lines 751-759)
```javascript
// IMPORTANT: API does full-replace, not merge
// api.js already handles read-merge-write correctly:
async function updateOperationalSettings(restaurantId, settings) {
  const current = await _getOperationalSettings(restaurantId);
  const currentStored = current.data?.data?.stored_settings || {};
  const merged = { ...currentStored, ...settings };   // merge
  await client.post("/proxy/v2/inventory-transfer/operational-settings/update", {
    restaurant_id: restaurantId,
    settings: merged,  // full object sent back
  });
}
```

#### What frontend needs to do (CR-048 implementation)
```javascript
// On PO Create load:
const settings = await api.getOperationalSettings(restaurantId);
const savedDays = settings.data?.data?.stored_settings?.po_coverage_days;
const coverageDays = savedDays ?? 3;  // fallback to 3 if key missing (BE not deployed yet)

// On user changes coverage days:
await api.updateOperationalSettings(restaurantId, { po_coverage_days: newValue });
```

#### Backend gap to register alongside CR-048
New key `po_coverage_days` (integer, default 3) must be added to the operational-settings schema on the backend. Until BE deploys this key, the frontend silently falls back to 3.

**New backend gap:** `G-036 — po_coverage_days key missing from operational-settings schema`
- Frontend: ready (CR-048 will wire the read + write)
- Backend: key needs to be whitelisted and persisted in the settings store
- CR-048 frontend implementation is NOT blocked — falls back to 3 gracefully until BE ships

---

---

## SECTION 7 — Proposed CRs, BUGs, and Gaps for INTAKE

### Summary

| ID | Type | Title | File(s) | Severity | Est. Scope |
|----|------|-------|---------|:--------:|:----------:|
| **CR-047** | CR | Add Stock — Storekeeper Spreadsheet UX + new `add-purchase` API + split payment | `AddStockPurchaseForm.jsx`, `api.js` | P1 | MEDIUM |
| **CR-048** | CR | PO Create — Storekeeper Spreadsheet UX + Coverage Days Selector | `PurchaseOrderCreate.jsx` | P1 | MEDIUM |
| **CR-049** | CR | PO Receive Goods — Storekeeper Spreadsheet UX | `PurchaseOrderDetail.jsx` | P1 | SMALL |
| **BUG-049** | BUG | PO Create — Wrong Suggestion Fallback (`"10"` instead of `min_qty_alert`) | `PurchaseOrderCreate.jsx` | P2 | SMALL |
| **G-035** | Gap | Split payment backend support | — | — | **CLOSED** — `add-purchase` API supports `partial_payments[]` |
| **G-036** | Gap | `po_coverage_days` key missing from operational-settings schema | Backend only | P2 | SMALL (BE) |

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

**Problem:** `AddStockPurchaseForm.jsx` uses stacked card-per-item layout, no keyboard flow, and calls the deprecated `add-stock` endpoint one item at a time. No split payment. No auto-batch.

**Proposed Solution — ALL OWNER ANSWERS CONFIRMED:**
1. Spreadsheet table: Item search | Qty | Unit | Batch (auto) | Expiry | Unit Price | Total (computed)
2. Tab/Enter keyboard flow. Last field complete → new row auto-opens.
3. **Replace `add-stock` endpoint with new `add-purchase`** (all items in one call) (F18–F19)
4. Payment header: single-select **Cash / Card / UPI / Bank Transfer / Others** (Q7 ✅)
5. "+ Add payment" → split mode: `partial_payments[]` per row, optional UPI ref field (Q6 ✅)
6. Frontend validates `sum(partials) === tot_amount` (backend skips this check)
7. Fare field (`tot_fair`) exposed as optional, default 0. Tax (`tot_tax`) hidden, always 0. (Q8 ✅)
8. Success screen shows transaction ID `PUR-807-20261016-7996` (Q9 ✅)
9. "Add to catalogue" → **inline modal** (stays on form) (Q3 ✅)
10. Show unit price + total + grand total on confirm page (F7)

**Files WILL change:** `AddStockPurchaseForm.jsx`, `api.js` (new `addPurchase()` function replacing `addStockPurchase()`)
**Files will NOT touch:** `server.py`, `terminology.js`, `screenVisibility.js`
**Mockup:** `control/sessions/purchase_form_mockup.html`
**All owner questions resolved — ready for INTAKE Gate 1**

---

### CR-048 Brief — PO Create: Storekeeper Spreadsheet UX + Coverage Days

**Problem:** `PurchaseOrderCreate.jsx` loads all 266 inventory items pre-selected with qty=10, forcing storekeepers to uncheck 250+ items. Suggestion formula uses `TARGET_DAYS = 30` hardcoded — no way to order for different cover periods. Vendor selection is a card grid with no search.

**Proposed Solution — CONFIRMED ANSWERS:**
1. Start with empty table. Pre-populate SUGGESTED rows (orange) for OOS and low-stock items only.
2. Add coverage input in header: **quick-select pills `[3d] [7d] [10d] [30d]` + free-text number input** — default **3 days** (Q1 ✅)
3. Coverage days persisted via `operational-settings` API key `po_coverage_days` — **pending from BE (G-036)**. Frontend falls back to `3` until key is live. (Q2 ✅)
4. Formula: `orderQty = max(0, ceil(avgDaily × coverageDays − currentStock))` — ported from `RequestStockForm.jsx`
5. Fallback when no consumption: use `min_qty_alert` gap (ported from `RequestStockForm.jsx`) — (fixes BUG-049)
6. Exclude items with no need entirely (same as `RequestStockForm`)
7. Replace vendor card grid with type-to-search `Command` combobox
8. Same spreadsheet table row layout as CR-047
9. PO Review screen: show item name + qty only, **no rates** (Q4 ✅)

**Files WILL change:** `PurchaseOrderCreate.jsx`, `api.js` (add `po_coverage_days` read/write via `updateOperationalSettings`)
**Files will NOT touch:** `RequestStockForm.jsx`, `server.py`
**Reuse from CR-047:** `ItemSearchCombobox`, `autoBatch()`, `computeTotal()`, `KeyboardRowHandler`
**Mockup:** `control/sessions/po_flow_mockup.html` → Screen 3
**Blocked by:** G-036 (BE must add `po_coverage_days` to settings schema — non-blocking, graceful fallback)
**Dependency:** Implement after CR-047 ships (reuse components)

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

### G-036 Brief — Backend: `po_coverage_days` key missing from operational-settings

**Problem:** Owner decided coverage days preference should persist via `v2/inventory-transfer/operational-settings/get`. The key `po_coverage_days` does not currently exist in `stored_settings` (verified by live probe 2026-10-16).

**Current state (probed):**
```
POST /inventory-transfer/operational-settings/get
stored_settings: { allow_negative_stock, po_variance_alert_pct, ... }
❌ po_coverage_days — NOT PRESENT
```

**What backend needs to add:**
```
Key:     po_coverage_days
Type:    integer
Default: 3
Scope:   per-restaurant (like all other stored_settings keys)
```

**What frontend will do (CR-048):**
```javascript
// Read on PO Create load:
const days = settings?.stored_settings?.po_coverage_days ?? 3;

// Write when user changes:
api.updateOperationalSettings(rid, { po_coverage_days: newValue });
```

**Blocking CR-048?** NO — CR-048 frontend falls back to `3` gracefully until BE deploys this key. Implement CR-048 first; G-036 is a separate BE task.

---

## SECTION 9 — Blast Radius (UPDATED)

| Item | Files affected | Risk | Shared files touched? |
|------|:-------------:|:----:|:--------------------:|
| CR-047 | `AddStockPurchaseForm.jsx` + `api.js` | MEDIUM | `api.js` (new function) |
| CR-048 | `PurchaseOrderCreate.jsx` + `api.js` | MEDIUM | `api.js` (coverage days read/write) |
| CR-049 | `PurchaseOrderDetail.jsx` | LOW | No |
| BUG-049 | `PurchaseOrderCreate.jsx` | LOW | No (same file as CR-048) |
| G-036 | Backend only | LOW | No frontend changes |

> **Note to INTAKE:** CR-048 and BUG-049 both touch `PurchaseOrderCreate.jsx`. Register as related. BUG-049 applied within CR-048 implementation plan as inline fix.
> CR-047 and CR-048 both touch `api.js` — coordinate to avoid conflicts (implement CR-047 first, CR-048 adds to it).

---

## SECTION 10 — Implementation Order (FINAL)

```
Phase 1 (immediate — no dependencies):
  BUG-049 ── quick fix, PurchaseOrderCreate.jsx (< 1 hour)

Phase 2 (parallel):
  CR-047 ── Add Stock + new add-purchase API + split payment (3-4 days)
  CR-049 ── PO Receive Goods layout redesign (2-3 days)
  G-036  ── Backend: add po_coverage_days to operational-settings (BE team, 1 day)

Phase 3 (after CR-047 + G-036 ship):
  CR-048 ── PO Create redesign, reusing CR-047 components + operational-settings wire (3-4 days)
```

---

## Document Status

| Section | Status |
|---------|--------|
| All owner questions (Q1–Q9) | ✅ ANSWERED |
| CR-047 brief | ✅ COMPLETE — ready for INTAKE Gate 1 |
| CR-048 brief | ✅ COMPLETE — ready for INTAKE Gate 1 |
| CR-049 brief | ✅ COMPLETE — ready for INTAKE Gate 1 |
| BUG-049 brief | ✅ COMPLETE |
| G-036 brief | ✅ COMPLETE — backend task |
| G-035 | ✅ CLOSED (split payment confirmed working) |

*Prepared by INVESTIGATION agent. All Q&A complete. Ready for INTAKE handoff.*
*Mockups: `purchase_form_mockup.html` + `po_flow_mockup.html` (interactive)*
*Investigation sources: 4 separate investigation docs consolidated here.*
