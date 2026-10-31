# INVESTIGATION — PO Flow UX Audit (All Screens)

> **Date:** 2026-10-15  
> **Role:** INVESTIGATION  
> **Scope:** Complete PO lifecycle — all 6 screens where storekeeper enters data  
> **No code edits made.**  
> **Linked to:** CR-047 (Purchase Form UX Bundle)

---

## Full PO Lifecycle — 6 Screens

```
Screen 1: PO List          → /purchase/orders
Screen 2: Vendor Select    → /purchase/orders/new (step=select)
Screen 3: Items Entry      → /purchase/orders/new (step=items)   ← HEAVIEST DATA ENTRY
Screen 4: Review           → /purchase/orders/new (step=review)
Screen 5: PO Detail        → /purchase/orders/:id
Screen 6: Receive Goods    → /purchase/orders/:id (showReceive=true) ← HEAVIEST DATA ENTRY
```

---

## Screen-by-Screen Pain Points

---

### Screen 1 — PO List  (`PurchaseOrderList.jsx`)
**Storekeeper pain: LOW**
- Clean enough. KPI cards, status tabs, table.
- Minor: Total + Payment hidden for draft/sent — storekeeper can't see estimated value at a glance.
- Minor: No quick "Create PO" shortcut from within a row.

---

### Screen 2 — Vendor Select (`PurchaseOrderCreate.jsx` — step=select)
**Storekeeper pain: LOW-MEDIUM**
- 3-column vendor cards are clear.
- Pain: If store has 10+ vendors, storekeeper must scan cards visually. No type-to-search on vendor selection.
- Pain: Vendor cards show "Cheapest for X items" — useful for purchasing manager, confusing for storekeeper who just wants to pick their usual vendor fast.
- Improvement: A simple searchable vendor list or quick-select would be faster.

---

### Screen 3 — Items Entry (`PurchaseOrderCreate.jsx` — step=items)
**Storekeeper pain: CRITICAL — Same root problem as AddStockPurchaseForm**

#### What the storekeeper sees (from screenshot):
- ALL 266 items loaded by default, ALL pre-selected (checked), ALL pre-filled with qty=10
- Storekeeper must manually UNCHECK the 250+ items they don't want
- That's the opposite of the desired flow: storekeeper should only fill what they're ordering

#### Column overload (9 columns in the table):
```
✓ | Item | Last Rate | Avg Rate | Cheapest | Stock | DoC | Qty | Expected Rate | Expected Total
```
- DoC (Days of Cover) — storekeeper doesn't know what this means
- Last Rate / Avg Rate / Cheapest — useful for manager review, overwhelming for storekeeper entry
- Expected Rate column shows ₹0 for all rows (BUG-030: rate=0 sent to API by design) — confusing
- Expected Total shows "—" for most rows since rate=0 — useless

#### Qty input problems:
- `w-16` (64px) input, disabled unless item is checked
- No keyboard-driven flow: Tab through 266 rows is not possible
- No auto-progression: after entering qty, storekeeper must manually click next item's checkbox

#### The core problem — same as Add Stock:
The PO Items screen needs the same spreadsheet-row approach:
- Start with an EMPTY table, not a pre-filled list of 266 items
- Storekeeper types item name → selects → qty auto-suggests → Tab → new row
- Smart suggestion: items that are OOS or low stock appear as pre-loaded "suggested" rows at top

---

### Screen 4 — Review (`PurchaseOrderCreate.jsx` — step=review)
**Storekeeper pain: MEDIUM**

#### What's missing:
```
Current review shows:  Vendor | Delivery | Items count
                       Table: Item | Qty | Unit
Missing:               Expected Rate per item, Expected Total per item, Grand Total
```
- Storekeeper has no idea the financial scale of the PO they're about to create
- Same as Issue 7 from Add Stock investigation

---

### Screen 5 — PO Detail (`PurchaseOrderDetail.jsx`)
**Storekeeper pain: LOW-MEDIUM**
- Status timeline (draft → sent → received → closed) is clear
- Order Lines table is readable
- Pain: Rate/Total columns only visible AFTER receive. Storekeeper can't see "what did I order for?" in draft/sent state
- Pain: Action buttons (Approve, Send, Receive, Cancel, Delete) are at the bottom after scrolling past items — on mobile, hard to find
- "Receive Goods" button is green and stands out — good

---

### Screen 6 — Receive Goods (`PurchaseOrderDetail.jsx` — showReceive=true)
**Storekeeper pain: CRITICAL — Identical root problem as AddStockPurchaseForm**

#### Current layout:
- Card-per-line: each received item is a FULL CARD with:
  ```
  [Invoice Qty] [Rate] [Batch] [Expiry]
  + Rate Variance panel + Stock Impact panel
  ```
- For a 10-item PO → 10 tall cards to scroll through
- For a 20-item PO → 20 cards, storekeeper loses context

#### Same missing patterns as Add Stock:
| Gap | Detail |
|-----|--------|
| No auto-batch | Batch field is empty, manual. Same as Issue 4. |
| No auto-total | Rate × qty not shown live. Same as Issue 2. |
| No keyboard Tab→next row | Must click each card. Same as Issue 6. |
| No item search | Items are pre-loaded from PO lines (OK here — items fixed by PO) |
| Card layout vs table row | Same core UX issue |

#### What IS good on Receive Goods:
- Rate Variance mini-panel (useful — flags >10% variance)
- Stock Impact panel (current → after) — very useful
- Invoice duplicate check (CR-040 already wired)
- Skip checkbox (can defer a line)

#### What to keep, what to change:
- **Keep:** Variance + Stock Impact as inline row indicators (not full cards)
- **Change:** Collapse each item to a single table row. Variance/stock shown as small inline badges.

---

## The Unifying Pattern

Both Screen 3 (Items Entry) and Screen 6 (Receive Goods) have the exact same core UX problem as AddStockPurchaseForm:

> **Card/stacked layout → should be spreadsheet table rows**
> **Click-to-navigate → should be Tab/Enter keyboard flow**
> **All fields on separate lines → should be inline per row**

The design solution from CR-047 (spreadsheet table mockup) applies identically to:
1. PO Create — Items screen (Screen 3)
2. PO Receive Goods screen (Screen 6)

---

## Summary: Where Storekeeper Struggles Most

| Screen | Pain Level | Core Problem |
|--------|:----------:|-------------|
| 1. PO List | LOW | Minor: no estimated totals in draft view |
| 2. Vendor Select | LOW | Minor: no type-to-search |
| 3. Items Entry | **CRITICAL** | 266 pre-selected items, 9 columns, no keyboard flow, all qty=10 by default |
| 4. Review | MEDIUM | No financial totals shown before creating |
| 5. PO Detail | LOW-MEDIUM | Rates hidden pre-receive, action buttons far from top |
| 6. Receive Goods | **CRITICAL** | Card-per-item, no auto-batch, no keyboard flow, no live total |

---

## Recommended CR Scope

**CR-047 should cover ALL THREE data-entry screens as one unified redesign:**
- `AddStockPurchaseForm.jsx` — already in scope
- `PurchaseOrderCreate.jsx` (step=items) — add to scope
- `PurchaseOrderDetail.jsx` (receive form) — add to scope

**Common components to build once, reuse in all three:**
- `ItemSearchRow` — searchable combobox + inline fields as a table row
- `autoBatch(title, date)` — shared utility
- `computeTotal(qty, price)` — shared
- `KeyboardTableRow` — Tab/Enter navigation handler

Mockup: `/app/control/sessions/purchase_form_mockup_v2.html`
