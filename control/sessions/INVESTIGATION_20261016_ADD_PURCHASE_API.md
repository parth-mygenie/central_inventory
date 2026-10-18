# INVESTIGATION — New add-purchase API Endpoint (Replaces add-stock)

> **Date:** 2026-10-16
> **Role:** INVESTIGATION
> **Scope:** Manual purchase API migration + split payment support
> **Credential used:** manager@testcentral.com / Qplazm@10 (RID 807)
> **No code edits made.**
> **Feeds into:** CR-047 (Add Stock Storekeeper UX), update BUG-049 scope

---

## TL;DR

| Aspect | Finding |
|--------|---------|
| New endpoint live? | ✅ `POST /api/v2/vendoremployee/inventory/add-purchase` |
| Works through existing proxy? | ✅ No `server.py` changes needed |
| Single payment supported? | ✅ `payment_type: "Cash"/"Credit"/"Online"/"UPI"` |
| Split payment supported? | ✅ `payment_type: "partial"` + `partial_payments[]` |
| All items in ONE request? | ✅ vs old: one API call per item |
| Date format `YYYY-MM-DD`? | ✅ Accepted and stored correctly |
| Breaking change on response? | ✅ Response shape is completely different |

---

## Curl Evidence

### Probe 1 — Single Payment (PASS)
```
POST https://preprod.mygenie.online/api/v2/vendoremployee/inventory/add-purchase
payload: { vendor_id:269, payment_type:"Cash", purchase_items:[{Ingredient:18273, quantity:1, rate:50, Amount:50, ...}] }
response: { purchase_details: { id:7995, transaction_id:"PUR-807-20261016-7995", payment_type:"Cash" }, added_items:[{...}] }
```

### Probe 2 — Split Payment (PASS)
```
payload: { payment_type:"partial", partial_payments:[{payment_mode:"Cash",amount:60},{payment_mode:"UPI",amount:40,transaction_id:"UPI-TEST-001"}] }
response: { purchase_details: { id:7996, payment_type:"partial" }, added_items:[{...}] }
```

### Probe 3 — Split amounts don't match tot_amount (PASS — no server validation)
```
tot_amount:100, partial_payments:[{Cash:30},{UPI:30}] → API accepts silently (sum=60, tot_amount=100)
⚠ FINDING: Backend does NOT validate that sum(partial_payments.amount) == tot_amount
   Frontend MUST enforce this validation
```

### Probe 4 — Date format `YYYY-MM-DD` (PASS)
```
purchase_date:"2026-10-16" → stored as "2026-10-16" ✅ (no conversion needed)
```

### Probe 5 — Proxy passthrough (PASS — no server.py changes needed)
```
POST /api/proxy/v2/inventory/add-purchase → transaction_id: PUR-807-20261016-8001 ✅
```

---

## API Contract Comparison — OLD vs NEW

### OLD: `POST /inventory/add-stock/{inventoryMasterId}`
```javascript
// One API call per item (loop in handleSubmit)
POST /inventory/add-stock/18281
{
  "quantity": 50,
  "unit": "kg",
  "vendor_id": 278,
  "batch": "MAIDA-OCT-15",
  "expiry_date": "2027-04-15",
  "purchase_date": "2026-10-16",
  "payment_type": "Cash",         // single type only
  "price": 42.00,                 // unit price
  "tot_amount": 2100              // line total
}
// Response: single stock_item added
```

### NEW: `POST /inventory/add-purchase`
```javascript
// ONE call for ALL items
POST /inventory/add-purchase
{
  "vendor_id": 269,
  "purchase_date": "2026-10-16",     // YYYY-MM-DD ✅ or DD-MM-YYYY
  "payment_type": "Cash",            // OR "partial" for split
  "tot_amount": 2460,                // grand total of all items
  "item_total": 2460,                // same as tot_amount (pre-tax)
  "tot_fair": 0,                     // fare/shipping (future)
  "tot_tax": 0,                      // tax (future)

  // FOR SPLIT PAYMENT ONLY:
  "partial_payments": [
    { "payment_mode": "Cash", "amount": 1500 },
    { "payment_mode": "UPI",  "amount": 960, "transaction_id": "UPI-REF-OPT" }
  ],

  "purchase_items": [
    {
      "Ingredient": 18281,           // inventory_master_id (capital I)
      "Unit": "kg",                  // unit (capital U)
      "quantity": 50,
      "rate": 42.00,                 // unit price (was "price")
      "Amount": 2100,                // line total (capital A)
      "batch": "MAIDA-OCT-15",
      "expiry_date": "2027-04-15"
    },
    {
      "Ingredient": 18282,
      "Unit": "kg",
      "quantity": 20,
      "rate": 18.00,
      "Amount": 360,
      "batch": "ONION-OCT-15",
      "expiry_date": "2026-12-15"
    }
  ]
}

// Response:
{
  "purchase_details": {
    "id": 7996,
    "transaction_id": "PUR-807-20261016-7996",
    "tot_amount": 2460,
    "payment_type": "Cash",         // "partial" if split
    "purchase_date": "2026-10-16",
    "vendor_id": 269,
    "restaurant_id": 807
  },
  "transaction_id": "PUR-807-20261016-7996",
  "added_items": [
    {
      "id": 13781,
      "ingredient": 18281,
      "stock_quantity": 50,
      "price": 2100,                // line total (NOT unit price)
      "sunit": "kg",
      "purchase_id": 7996,
      "batch": "MAIDA-OCT-15",
      "expiry_date": "2027-04-15"
    }
  ]
}
```

---

## Field Mapping Table (Old → New)

| Old Field | Old Location | New Field | New Location | Notes |
|-----------|-------------|-----------|-------------|-------|
| URL param `/{id}` | URL | `Ingredient` | `purchase_items[]` | Capital I |
| `quantity` | body | `quantity` | `purchase_items[]` | unchanged |
| `unit` | body | `Unit` | `purchase_items[]` | Capital U |
| `batch` | body | `batch` | `purchase_items[]` | unchanged |
| `expiry_date` | body | `expiry_date` | `purchase_items[]` | unchanged |
| `price` | body | `rate` | `purchase_items[]` | renamed |
| `tot_amount` (line) | body | `Amount` | `purchase_items[]` | Capital A; also top-level `tot_amount` = grand total |
| `vendor_id` | body | `vendor_id` | top-level | unchanged |
| `purchase_date` | body | `purchase_date` | top-level | unchanged |
| `payment_type` | body | `payment_type` | top-level | + new value `"partial"` |
| N/A | — | `item_total` | top-level | sum of all `Amount` |
| N/A | — | `tot_fair` | top-level | always `0` for now |
| N/A | — | `tot_tax` | top-level | always `0` for now |
| N/A | — | `partial_payments[]` | top-level | only when `payment_type: "partial"` |

---

## Impact Analysis

### Files that MUST change

| File | What changes | Risk |
|------|-------------|------|
| `frontend/src/services/api.js` line 790 | Replace `addStockPurchase()` with new `addPurchase()` function | LOW (isolated) |
| `frontend/src/components/central-inventory/AddStockPurchaseForm.jsx` | `handleSubmit()`: loop → single call; payload construction; add split payment UI | MEDIUM |

### Files that do NOT change

| File | Reason |
|------|--------|
| `backend/server.py` | Proxy catch-all `PREPROD_V2/{path}` already handles `/inventory/add-purchase` ✅ |
| `PurchaseOrderCreate.jsx` | PO flow explicitly stays untouched (owner instruction) |
| `PurchaseOrderDetail.jsx` | Receive Goods uses PO-specific endpoint — unchanged |
| `terminology.js` | Frozen — no touch |

---

## Split Payment — Full UI Specification

### Payment mode options — OWNER CONFIRMED
```
For single payment: Cash | Card | UPI | Bank Transfer | Others
For split legs:     each partial_payments[].payment_mode = one of the above
"partial" is payment_type value (not a mode)
```
(Note: old UI had Cash/Credit/Online — now replaced with Cash/Card/UPI/Bank Transfer/Others)

### UI behaviour — OWNER CONFIRMED
```
Single payment (default):
  [Payment ▼: Cash / Card / UPI / Bank Transfer / Others]
  → send: { payment_type: "Cash" }

Split payment (user clicks "+ Add payment"):
  [Cash ▼] [₹1,500  ]  ✕
  [UPI  ▼] [₹960    ] [Ref # optional]  ✕
  + Add payment type
  ─────────────────────────────────────
  Entered: ₹2,460  |  Total: ₹2,460  ✓ balanced
  → send: { payment_type: "partial", partial_payments: [{payment_mode:"Cash",amount:1500},{payment_mode:"UPI",amount:960}] }

UPI ref field: OPTIONAL (Q6 answer = a)
Frontend must validate sum(partials) === tot_amount (backend skips this)
```

---

## Response Change Impact

### Old response (per item)
```json
{ "stock_id": 123, "purchase_id": 456, "ingredient_name": "Maida", "added_quantity": 50, ... }
```

### New response (all items)
```json
{
  "purchase_details": { "id": 7996, "transaction_id": "PUR-807-...", "tot_amount": 2460 },
  "added_items": [ { "id": 13781, "ingredient": 18281, "stock_quantity": 50, ... } ]
}
```

**Impact on success toast / PostSubmitConfirmation:**
- Old: `successCount++` per item in loop → toast: "2 items added"
- New: check `added_items.length` from single response → toast: "2 items added to stock — PUR-807-..."
- Enhancement: can now show the transaction ID on the success screen

---

## Updated BUG-049 / CR-047 Scope Additions

### For CR-047 (AddStockPurchaseForm.jsx) — add to scope:

**New item (from this investigation):**

| # | Change | Reason |
|---|--------|--------|
| F18 | Replace `addStockPurchase()` in `api.js` with new `addPurchase()` | New endpoint |
| F19 | Change `handleSubmit` from per-item loop → single-call with `purchase_items[]` | New endpoint |
| F20 | Add `item_total`, `tot_fair:0`, `tot_tax:0` to payload | New required fields |
| F21 | Add split payment UI — `partial_payments[]` when user adds 2nd payment type | Backend now supports it |
| F22 | Show `transaction_id` (e.g. `PUR-807-20261016-7996`) on success screen | New response field |
| F23 | Frontend must validate `sum(partial_payments) === tot_amount` | Backend skips this check |

**Previous F3 status change:**
- F3 was classified as "Frontend gap + potential backend gap (G-035)"
- G-035 is now **RESOLVED** — backend fully supports `partial_payments[]`
- Remove G-035 from gap register — not needed

---

## Open Questions — ALL ANSWERED

| # | Question | **Owner Answer** |
|---|----------|-----------------|
| Q6 | UPI transaction ref | **Optional (a)** — API doesn't enforce; server assigns `PUR-{rid}-{date}-{id}` as master ref |
| Q7 | Payment modes | **Cash, Card, UPI, Bank Transfer, Others** — "partial" is `payment_type` not a mode |
| Q8 | Tax / Fare | **Hide tax (`tot_tax`=0 always). Fare (`tot_fair`) exposed as optional field, default 0** |
| Q9 | Transaction ID on success | **Yes — display as reference (a)** |
| Q1 | Default coverage days | **3 days + custom number input box** |
| Q2 | Coverage preference | **Pending — see clarification in master doc** |
| Q3 | Add to catalogue | **Inline modal (b)** |
| Q4 | PO Review rates | **Leave blank (b)** |
| Q5 | Split on Receive Goods | **Backlog — additive fields, API unchanged for now** |

---

*All 9 questions answered. Q2 awaiting clarification choice (A/B/C). INTAKE can proceed with CR-047 Gate 1.*
*Full context in: `INVESTIGATION_MASTER_PURCHASE_UX_OVERHAUL.md`*
